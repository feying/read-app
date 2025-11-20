import json
import sys
from pathlib import Path
from textwrap import dedent

ROOT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = ROOT_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app import create_app  # noqa: E402
from backend.extensions import db  # noqa: E402
from backend.models import Dictionary, Book, BookPage, BookChapter  # noqa: E402


dictionaries_data = {
    'process_safety_dict': {
        'name': '化工安全词典',
        'data': {
            'relief': '泄压',
            'flare': '火炬',
            'setpoint': '设定值',
            'trip': '联锁切断',
            'compressor': '压缩机',
            'discharge': '排出',
            'temperature': '温度',
            'pressure': '压力',
            'inventory': '物料库存',
            'mitigation': '缓解措施',
            'containment': '围堵',
            'evacuation': '疏散',
            'ignition': '点火',
            'dispersion': '扩散',
            'scenario': '情景',
            'assessment': '评估'
        }
    }
}


book_blueprints = [
    {
        'id': 'process_safety_primer',
        'title': 'Process Safety Primer',
        'description': '供生产工程师快速回顾过程安全理念，含泄压、火炬、应急等',
        'defaultDictionaryId': 'process_safety_dict',
        'origin': 'default',
        'chapters': [
            {
                'title': 'Chapter 1 · Relief Philosophy',
                'summary': '介绍泄压设计的常见场景与路径',
                'pages': [
                    dedent('''
                    <h3>Designing Reliable Relief Systems</h3>
                    <p>Modern production units rely on layered protection to guarantee safe operations. When credible scenarios such as blocked discharge or runaway heat release exceed instrumented safeguards, engineers must provide mechanical relief paths.</p>
                    <p>Relief sizing starts with establishing the controlling scenario. Practitioners estimate process <b>inventory</b>, heat input and the maximum allowable working <b>pressure</b>. For hydrocarbon services, routing to a <b>flare</b> header with adequate knock-out drums prevents liquid carryover.</p>
                    '''),
                    dedent('''
                    <h4>Coordination with Instrumented Systems</h4>
                    <p>Pressure safety valves complement shutdown systems. When a compressor loses cooling, the shutdown may trip at the high pressure <b>setpoint</b>, but a delayed trip could still force the valve open.</p>
                    <p>Good practice documents the expected <b>discharge</b> temperature, relieving composition and downstream restrictions. This documentation later feeds dispersion modeling used during emergency planning.</p>
                    ''')
                ]
            },
            {
                'title': 'Chapter 2 · Instrumented Protection',
                'summary': '安全仪表等级、逻辑、测试与治理',
                'pages': [
                    dedent('''
                    <h3>Understanding Safety Instrumented Functions</h3>
                    <p>Before specifying logic solvers, teams must classify scenarios by required risk reduction. A high consequence <b>scenario</b> such as reactor thermal runaway demands redundant sensors and proof tests aligned with the process cycle.</p>
                    <p>Operators frequently combine high-pressure trips with permissives that verify pump status. When the logic detects conflicting signals, it enters a latched state and directs the field team to investigate before restart.</p>
                    '''),
                    dedent('''
                    <h4>Maintenance and Bypass Governance</h4>
                    <p>Every bypass should be risk assessed, even during short maintenance windows. Written procedures define compensating measures such as additional field rounds or temporary pressure watches.</p>
                    <p>Audit findings often reveal forgotten bypasses. Embedding smart alerts inside the control system shortens response time and keeps the digital twin synchronized with real plant conditions.</p>
                    ''')
                ]
            },
            {
                'title': 'Chapter 3 · Emergency Response',
                'summary': '事件识别、扩散、应急响应',
                'pages': [
                    dedent('''
                    <h3>From Detection to Mitigation</h3>
                    <p>Once a release is detected, the incident commander validates weather data and determines potential <b>dispersion</b> corridors. Mobile monitoring teams feed measurements back to the command post.</p>
                    <p>If off-site impact is likely, planners initiate staged <b>evacuation</b> while ensuring critical utilities remain powered. Coordination with municipal responders keeps messaging consistent.</p>
                    '''),
                    dedent('''
                    <h4>Post Event Learning</h4>
                    <p>After containment, investigators gather data for root cause <b>assessment</b>. They examine equipment condition, alarm timelines and organizational factors.</p>
                    <p>Action tracking systems prevent recommendations from stalling. Sharing sanitized lessons with industry peers accelerates collective learning and improves future hazard reviews.</p>
                    ''')
                ]
            }
        ]
    }
]


def seed_database():
    if Dictionary.query.count() == 0:
        for dict_id, payload in dictionaries_data.items():
            db.session.add(Dictionary(id=dict_id, name=payload['name'], data=json.dumps(payload['data'])))
        db.session.commit()

    if Book.query.count() == 0:
        for book_data in book_blueprints:
            book = Book(
                id=book_data['id'],
                title=book_data['title'],
                description=book_data['description'],
                default_dictionary_id=book_data['defaultDictionaryId'],
                origin=book_data.get('origin', 'default')
            )
            db.session.add(book)
            db.session.flush()

            page_counter = 0
            for idx, chapter in enumerate(book_data['chapters'], start=1):
                book_chapter = BookChapter(
                    book=book,
                    chapter_number=idx,
                    title=chapter['title'],
                    summary=chapter['summary'],
                    start_page=page_counter
                )
                db.session.add(book_chapter)
                db.session.flush()

                for page_html in chapter['pages']:
                    db.session.add(BookPage(
                        book=book,
                        chapter=book_chapter,
                        page_number=page_counter,
                        html_content=page_html.strip()
                    ))
                    page_counter += 1
        db.session.commit()


if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        db.create_all()
        seed_database()
        print('--- 例子数据已准备 ---')
