import json
from app import app, db, User, Dictionary, Book, BookPage

# --- 词典数据 (从 app.py 迁移过来) ---
dictionaries_data = {
    'api521_dict': { 
        'name': 'API 521 专业词典', 
        'data': { 
            "api": "美国石油学会", "standard": "标准", "relieving": "泄压", "rates": "速率", 
            "conditions": "工况", "failure": "故障", "reflux": "回流", "cooling": "冷却", 
            "reactors": "反应器", "agitation": "搅拌", "stream": "流", "vapor": "蒸气", 
            "generation": "产生", "runaway": "失控", "reaction": "反应", "exchangers": "交换器", 
            "pressure": "压力", "operating": "操作", "estimation": "估算", "outlet": "出口", 
            "loads": "负荷", "manual": "手动的", "operated": "操作的", "closure": "关闭", 
            "overpressure": "超压", "condensation": "冷凝", "process": "工艺", "vessels": "容器", 
            "condenser": "冷凝器", "flooding": "液泛", "coolant": "冷却剂", "piping": "管道", 
            "surroundings": "环境" 
        }
    },
    'sherlock_dict': { 
        'name': '福尔摩斯词典', 
        'data': { 
            'sherlock': '夏洛克', 'holmes': '福尔摩斯', 'watson': '华生', 'client': '客户', 
            'case': '案件', 'extraordinary': '非凡的', 'league': '联盟', 'red-headed': '红发的', 
            'gentleman': '绅士', 'pawnbroker': '当铺老板', 'advertisement': '广告', 
            'vacancy': '职位空缺', 'salary': '薪水', 'duties': '职责', 'peculiar': '古怪的', 
            'friend': '朋友', 'conversation': '交谈', 'stout': '肥胖的', 'florid-faced': '脸色通红的', 
            'elderly': '年长的', 'fiery': '火红的', 'hair': '头发', 'apology': '道歉', 
            'intrusion': '闯入', 'withdraw': '退出', 'abruptly': '突然地', 'cordially': '亲切地', 
            'engaged': '忙碌的', 'partner': '伙伴', 'helper': '助手', 'successful': '成功的', 
            'utmost': '极大的', 'greeting': '问候', 'questioning': '疑问的', 'glance': '一瞥', 
            'fat-encircled': '被脂肪包围的', 'settee': '长椅', 'relapsing': '回到', 
            'armchair': '扶手椅', 'fingertips': '指尖', 'custom': '习惯', 'judicial': '判断的', 
            'moods': '情绪' 
        }
    }
}

# --- 书籍数据 (从 app.py 迁移过来) ---
# --- 修复：将 ` (反引号) 替换为 """ (三个双引号) ---
library_data = {
    'api521': {
        'title': 'API Standard 521',
        'description': '美国石油学会关于泄压和减压系统的标准。',
        'defaultDictionaryId': 'api521_dict',
        'content': [
            """<h3>API STANDARD 521</h3><h4>Table 1 - Guidance for Required Relieving Rates Under Selected Conditions (continued)</h4><table><thead><tr><th>Condition</th><th>Section</th><th>Vapor-relief / Liquid-relief Guidance</th></tr></thead><tbody><tr><td rowspan="5">Power failure (steam, electric, or other)</td><td rowspan="5">4.4.15</td><td>Study the installation to determine the effect of power failure; size the relief valve for the worst condition that can occur.</td></tr><tr><td><b>a) Fractionators</b><br>Loss of all pumps, with the result that reflux and cooling water would fail.</td></tr><tr><td><b>b) Reactors</b><br>Consider failure of agitation or stirring, quench or retarding stream; size the valves for vapor generation from a runaway reaction.</td></tr><tr><td><b>c) Air-cooled heat exchangers</b><br>Fan failure; size valves for the difference between normal and emergency duty.</td></tr><tr><td><b>d) Surge vessels</b><br>Maximum liquid inlet rate.</td></tr><tr><td>Maintenance</td><td>4.4.16</td><td>Consideration can be given to the reduction of the relief rate as the result of the relieving pressure being above operating pressure.</td></tr></tbody></table>""",
            """<h4>4.4.2.4 Relieving Rate Estimation for a Closed Outlet</h4><p>For determining relief loads, it may be assumed that manual or remotely operated valves that are normally open and functioning at the time of inadvertent closure or failure and that are not affected by the primary cause of failure remain in operation at their normal operating positions. A check of possible common mode failures that can affect multiple valves simultaneously (e.g. control systems, electrical equipment, etc.) should be made to assure that the valves are independent and would not be affected by the primary failure.</p><p>The quantity of material to be relieved should be determined at conditions that correspond to relieving conditions instead of at normal operating conditions. The required relieving rate is often reduced appreciably when this difference in conditions is considered. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered  The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate.in determining the required relieving rate.</p>""",
        ]
    },
    'sherlock': {
        'title': '福尔摩斯探案集：红发会',
        'description': '柯南·道尔的经典侦探小说。',
        'defaultDictionaryId': 'sherlock_dict',
        'content': [
            """<h3>The Red-Headed League</h3><p>I had called upon my friend, Mr. Sherlock Holmes, one day in the autumn of last year and found him in deep conversation with a very stout, florid-faced, elderly gentleman with fiery red hair. With an apology for my intrusion, I was about to withdraw when Holmes pulled me abruptly into the room and closed the door behind me.</p><p>"You could not possibly have come at a better time, my dear Watson," he said cordially.</p><p>"I was afraid that you were engaged."</p><p>"So I am. Very much so."</p>""",
            """<p>"Then I can wait in the next room."</p><p>"Not at all. This gentleman, Mr. Wilson, has been my partner and helper in many of my most successful cases, and I have no doubt that he will be of the utmost use to me in yours also."</p><p>The stout gentleman half rose from his chair and gave a bob of greeting, with a quick little questioning glance from his small fat-encircled eyes. "Try the settee," said Holmes, relapsing into his armchair and putting his fingertips together, as was his custom when in judicial moods.</p>"""
        ]
    }
}

# --- 数据库填充函数 (从 app.py 迁移过来) ---
def seed_database():
    # 检查词典表是否为空
    if Dictionary.query.count() == 0:
        print("--- 数据库为空，正在填充词典数据... ---")
        for dict_id, d in dictionaries_data.items():
            new_dict = Dictionary(
                id=dict_id,
                name=d['name'],
                data=json.dumps(d['data']) # 序列化为 JSON 字符串
            )
            db.session.add(new_dict)
        db.session.commit()
    else:
        print("--- 词典数据已存在，跳过填充。 ---")

    # 检查书籍表是否为空
    if Book.query.count() == 0:
        print("--- 数据库为空，正在填充书库数据... ---")
        for book_id, b in library_data.items():
            new_book = Book(
                id=book_id,
                title=b['title'],
                description=b['description'],
                default_dictionary_id=b['defaultDictionaryId']
            )
            db.session.add(new_book)
            # 为每本书添加书页
            for i, page_html in enumerate(b['content']):
                new_page = BookPage(
                    book=new_book, # 自动关联 book_id
                    page_number=i, # 0-indexed page number
                    html_content=page_html
                )
                db.session.add(new_page)
        db.session.commit()
    else:
        print("--- 书库数据已存在，跳过填充。 ---")
    print("--- 数据库填充检查完毕 ---")


# --- 脚本执行入口 ---
if __name__ == '__main__':
    # 使用 app.app_context() 来确保 SQLAlchemy 能正确连接到数据库
    with app.app_context():
        print("--- 正在创建所有数据库表 (如果不存在)... ---")
        # db.create_all() 会创建所有继承自 db.Model 的表
        # (User, Dictionary, Book, BookPage)
        db.create_all()
        print("--- 表创建完毕。 ---")
        
        # 调用填充函数
        seed_database()
        
    print("--- 数据库初始化和数据填充完成！---")