from flask import Flask, request, jsonify, Blueprint, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    get_jwt_identity,
    get_jwt,
    jwt_required
)
from werkzeug.utils import secure_filename
from pypdf import PdfReader
import bcrypt
import os
import json
import re
import html
from io import BytesIO
from pathlib import Path
from datetime import timedelta
from functools import wraps
from dotenv import load_dotenv
import base64
import shutil
from flask import send_from_directory

load_dotenv()

app = Flask(__name__)

# --- Database configuration ---
db_url = os.getenv('DATABASE_URL')
if not db_url:
    print("--- \u65e0\u6cd5\u5728 .env \u4e2d\u627e\u5230 DATABASE_URL \u914d\u7f6e ---")
    print("--- \u8bf7\u786e\u4fdd backend \u76ee\u5f55\u4e0b\u5b58\u5728 .env \u5e76\u8bbe\u7f6e DATABASE_URL ---")
    raise SystemExit(1)

app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', app.config['SECRET_KEY'])
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=int(os.getenv('JWT_EXPIRES_HOURS', '24')))
print(f"--- \u5c1d\u8bd5\u8fde\u63a5\u6570\u636e\u5e93: {db_url.split('@')[-1]} ---")

db = SQLAlchemy(app)
jwt = JWTManager(app)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:8080", "http://127.0.0.1:8080"]}})
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD')
if not ADMIN_EMAIL or not ADMIN_PASSWORD:
    raise SystemExit("请在 .env 中配置 ADMIN_EMAIL 与 ADMIN_PASSWORD 以启用后台管理登录。")

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')
ALLOWED_ORIGINS = {"http://localhost:8080", "http://127.0.0.1:8080"}


def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if not claims.get('is_admin'):
            return jsonify({'error': 'Forbidden'}), 403
        return fn(*args, **kwargs)
    return wrapper


@admin_bp.after_request
def add_admin_cors(response):
    origin = request.headers.get('Origin')
    if origin in ALLOWED_ORIGINS:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response


@admin_bp.route('/<path:_dummy>', methods=['OPTIONS'])
def admin_options(_dummy: str):
    resp = jsonify({'status': 'ok'})
    return add_admin_cors(resp), 200

# --- Database models ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    api_key = db.Column(db.String(255))
    current_book_id = db.Column(db.String(100))
    current_page = db.Column(db.Integer, default=1)
    reading_progress = db.Column(db.Text)

    def set_password(self, password: str) -> None:
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password: str) -> bool:
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))


class Dictionary(db.Model):
    id = db.Column(db.String(100), primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    data = db.Column(db.Text, nullable=False)


class Book(db.Model):
    id = db.Column(db.String(100), primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    default_dictionary_id = db.Column(db.String(100), db.ForeignKey('dictionary.id'))
    origin = db.Column(db.String(50), nullable=False, default='default')
    pages = db.relationship('BookPage', backref='book', lazy='dynamic', order_by='BookPage.page_number')
    chapters = db.relationship('BookChapter', backref='book', lazy=True, order_by='BookChapter.chapter_number')


class BookChapter(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    book_id = db.Column(db.String(100), db.ForeignKey('book.id'), nullable=False)
    chapter_number = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(255), nullable=False)
    summary = db.Column(db.Text)
    start_page = db.Column(db.Integer, default=0)


class BookPage(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    book_id = db.Column(db.String(100), db.ForeignKey('book.id'), nullable=False)
    page_number = db.Column(db.Integer, nullable=False)
    html_content = db.Column(db.Text, nullable=False)
    chapter_id = db.Column(db.Integer, db.ForeignKey('book_chapter.id'))
    chapter = db.relationship('BookChapter', backref='pages')


TAG_RE = re.compile(r'<[^>]+>')


def strip_tags(html: str) -> str:
    return TAG_RE.sub(' ', html or '')


def _slugify(text: str) -> str:
    base = (text or '').lower()
    base = re.sub(r'[^a-z0-9]+', '_', base)
    base = base.strip('_')
    return base or 'book'


def generate_unique_book_id(base_title: str) -> str:
    slug = _slugify(base_title)
    candidate = slug
    counter = 1
    while Book.query.get(candidate):
        candidate = f'{slug}_{counter}'
        counter += 1
    return candidate


def pdf_text_to_html(text: str, page_number: int) -> str:
    sanitized = html.escape((text or '').replace('\x00', ' '))
    paragraphs = []
    for chunk in re.split(r'\n\s*\n', sanitized):
        chunk = chunk.strip()
        if not chunk:
            continue
        paragraphs.append(f"<p>{chunk.replace('\\n', '<br />')}</p>")
    if not paragraphs:
        paragraphs = ['<p class=\"text-gray-500\">（该页为空或未能识别文本）</p>']
    body = ''.join(paragraphs)
    return f'<article class=\"pdf-source-page\" data-origin-page=\"{page_number}\">{body}</article>'


def extract_pdf_pages(file_storage) -> list[str]:
    raw_bytes = file_storage.read()
    if not raw_bytes:
        raise ValueError('PDF 文件内容为空')
    reader = PdfReader(BytesIO(raw_bytes))
    if getattr(reader, 'is_encrypted', False):
        try:
            reader.decrypt('')
        except Exception as exc:  # noqa: BLE001
            raise ValueError('PDF 已加密，暂不支持解析') from exc
    pages_html: list[str] = []
    for idx, page in enumerate(reader.pages, start=1):
        try:
            text = page.extract_text() or ''
        except Exception:  # noqa: BLE001
            text = ''
        pages_html.append(pdf_text_to_html(text, idx))
    if not pages_html:
        raise ValueError('未能从 PDF 中解析出任何页面')
    return pages_html

def save_base64_images(html_content: str, book_id: str, page_index: int, base_url: str | None = None) -> str:
    """
    将 html_content 中的 data:image/...;base64,... 图片提取为文件，
    保存至 backend/src/{book_id}/{page_index}/ 并替换 src 为文件路径。
    """
    storage_root = Path(__file__).resolve().parent / 'src'
    pattern = re.compile(r'<img([^>]+)src="data:image/([^;]+);base64,([A-Za-z0-9+/=]+)"([^>]*)>', re.IGNORECASE)
    counter = 1

    def replace(match: re.Match) -> str:
        nonlocal counter
        attrs_before = match.group(1) or ''
        mime = (match.group(2) or '').lower()
        data_b64 = match.group(3) or ''
        attrs_after = match.group(4) or ''

        ext_map = {
            'jpeg': 'jpg',
            'jpg': 'jpg',
            'png': 'png',
            'gif': 'gif',
            'webp': 'webp',
            'bmp': 'bmp',
        }
        ext = ext_map.get(mime.split('/')[-1], 'png')

        dir_path = storage_root / book_id / str(page_index)
        dir_path.mkdir(parents=True, exist_ok=True)
        filename = f'img_{counter}.{ext}'
        counter += 1
        try:
            (dir_path / filename).write_bytes(base64.b64decode(data_b64))
        except Exception:
            return match.group(0)  # 失败时保留原样

        rel_path = f"/src/{book_id}/{page_index}/{filename}"
        img_tag = f'<img{attrs_before}src="{rel_path}"{attrs_after}>'
        return f'<div class="pdf-image-wrapper" style="text-align:center;">{img_tag}</div>'

    return pattern.sub(replace, html_content or '')


def rewrite_src_to_absolute(html_content: str, base_url: str) -> str:
    """
    �� src="/src/..." �� src="src/..." ͳһ�滻Ϊ����������ľ��Ե�ַ������ǰ������ 404��
    �����Ѿ����� http://127.0.0.1:5000/src/... ��ȫ·�����м�，Ҳһ����ǰ����ؾ���·��
    """
    if not html_content:
        return html_content
    base = base_url.rstrip('/')
    pattern_relative = re.compile(r'src=[\'"]/?src/([^\'"]+)[\'"]', flags=re.IGNORECASE)
    pattern_absolute = re.compile(r'src=[\'"]https?://[^\'"]+/src/([^\'"]+)[\'"]', flags=re.IGNORECASE)
    rewritten = pattern_absolute.sub(lambda m: f'src="{base}/src/{m.group(1)}"', html_content)
    return pattern_relative.sub(lambda m: f'src="{base}/src/{m.group(1)}"', rewritten)
def serialize_user(user: User) -> dict:
    return {
        'id': user.id,
        'email': user.email,
        'api_key': user.api_key,
        'current_book_id': user.current_book_id,
        'current_page': user.current_page,
        'reading_progress': user.reading_progress,
    }


def serialize_book_metadata(book: Book) -> dict:
    page_count = book.pages.count() if hasattr(book.pages, 'count') else len(book.pages or [])
    chapters = [
        {
            'id': chapter.id,
            'title': chapter.title,
            'chapterNumber': chapter.chapter_number,
            'startPage': chapter.start_page
        }
        for chapter in book.chapters
    ]
    return {
        'title': book.title,
        'description': book.description,
        'defaultDictionaryId': book.default_dictionary_id,
        'origin': book.origin or 'default',
        'pageCount': page_count,
        'chapters': chapters
    }


# --- Admin APIs ---
@admin_bp.post('/login')
def admin_login():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip()
    password = data.get('password') or ''

    if email != ADMIN_EMAIL or password != ADMIN_PASSWORD:
        return jsonify({'error': '管理员邮箱或密码错误'}), 401

    token = create_access_token(
        identity=f'admin:{email}',
        additional_claims={'is_admin': True}
    )
    return jsonify({'message': '管理员登录成功', 'token': token}), 200


@admin_bp.get('/books')
@admin_required
def admin_list_books():
    books = Book.query.all()
    items = []
    for book in books:
        items.append({
            'id': book.id,
            'title': book.title,
            'description': book.description,
            'defaultDictionaryId': book.default_dictionary_id,
            'origin': book.origin or 'default',
            'pageCount': book.pages.count() if hasattr(book.pages, 'count') else len(book.pages or []),
            'chapterCount': len(book.chapters or [])
        })
    return jsonify({'items': items}), 200


@admin_bp.post('/books/upload_pdf')
@admin_required
def admin_upload_pdf_book():
    origin_value = (request.form.get('origin') or '').strip() or 'default'
    origin = origin_value[:50] or 'default'
    origin_lower = origin.lower()

    allow_append = (request.form.get('allow_append') or '').lower() in {'1', 'true', 'yes', 'y', 'on'}
    overwrite_conflicts = (request.form.get('overwrite_conflicts') or '').lower() in {'1', 'true', 'yes', 'y', 'on'}

    files = request.files.getlist('file') or []
    if not files:
        return jsonify({'error': '请上传文件'}), 400

    dictionary_id = (request.form.get('default_dictionary_id') or '').strip() or None
    if dictionary_id and not Dictionary.query.get(dictionary_id):
        return jsonify({'error': '默认词典 ID 不存在'}), 400

    provided_book_id = (request.form.get('book_id') or '').strip()
    book_id = None
    book_title = ''
    book_description = ''

    pages_data: list[dict] = []
    chapter_title = ''
    chapter_summary = ''

    if origin_lower == 'mineru':
        bad = [f for f in files if not (f.filename or '').lower().endswith(('.html', '.htm'))]
        if bad:
            return jsonify({'error': 'MinerU 仅支持上传 HTML 文件'}), 400

        def _num_key(name: str):
            lowered = (name or '').lower()
            m = re.search(r'(\d+)', lowered)
            num = int(m.group(1)) if m else 10**9
            return (num, lowered)

        files.sort(key=lambda f: _num_key(f.filename))

        first_name = secure_filename(files[0].filename or '') or '未知文件'
        inferred_title = Path(first_name).stem or '自动导入图书'
        book_title = (request.form.get('title') or inferred_title).strip() or inferred_title
        book_description = (request.form.get('description') or f'来源 HTML {first_name} 导入').strip() or f'来源 HTML {first_name} 导入'
        book_id = provided_book_id or generate_unique_book_id(book_title)
        chapter_title = f'{book_title} - MinerU 导入'
        chapter_summary = '管理员通过 MinerU HTML 导入书籍'

        base_url = request.host_url.rstrip('/') if request else ''
        for file_storage in files:
            raw_bytes = file_storage.read()
            if not raw_bytes:
                continue
            try:
                html_text = raw_bytes.decode('utf-8', errors='ignore')
            except Exception:
                html_text = raw_bytes.decode(errors='ignore')
            match = re.search(r'<body[^>]*>(.*?)</body>', html_text, flags=re.IGNORECASE | re.DOTALL)
            body_html = (match.group(1).strip() if match else html_text.strip())
            if not body_html:
                continue
            num_match = re.search(r'(\d+)', file_storage.filename or '')
            page_number = int(num_match.group(1)) if num_match else len(pages_data)
            pages_data.append({
                'page_number': page_number,
                'body_html': body_html,
                'base_url': base_url
            })

        if not pages_data:
            return jsonify({'error': '未提取到有效的 HTML 内容'}), 400

    else:
        file_storage = files[0]
        filename = secure_filename(file_storage.filename)
        if not filename.lower().endswith('.pdf'):
            return jsonify({'error': '仅支持上传 PDF 文件'}), 400
        try:
            pages_html = extract_pdf_pages(file_storage)
        except ValueError as exc:
            return jsonify({'error': str(exc)}), 400
        except Exception:  # noqa: BLE001
            return jsonify({'error': '处理 PDF 时出现未知错误'}), 500

        inferred_title = Path(filename).stem or '自动导入图书'
        book_title = (request.form.get('title') or inferred_title).strip() or inferred_title
        book_description = (request.form.get('description') or f'来源 PDF {filename} 的自动分页导入').strip() or f'来源 PDF {filename} 的自动分页导入'
        book_id = provided_book_id or generate_unique_book_id(book_title)
        chapter_title = f'{book_title} - 原始扫描页'
        chapter_summary = '由管理员上传的 PDF 自动生成章节'

        pages_data = [
            {'page_number': idx, 'html_content': html_content}
            for idx, html_content in enumerate(pages_html)
        ]

    existing_book = Book.query.get(book_id) if book_id else None
    if existing_book and not allow_append:
        return jsonify({'error': '已有此书籍，是否增补上传？', 'needsAppendConfirm': True}), 409

    try:
        if existing_book and allow_append:
            book = existing_book
        else:
            book = Book(
                id=book_id,
                title=book_title,
                description=book_description,
                default_dictionary_id=dictionary_id,
                origin=origin
            )
            db.session.add(book)
            db.session.flush()

        chapter = BookChapter.query.filter_by(book_id=book.id).order_by(BookChapter.chapter_number.asc()).first()
        if not chapter:
            chapter = BookChapter(
                book=book,
                chapter_number=1,
                title=chapter_title or (book.title + ' - 导入'),
                summary=chapter_summary or '管理员导入',
                start_page=0
            )
            db.session.add(chapter)
            db.session.flush()

        existing_pages = BookPage.query.filter_by(book_id=book.id).with_entities(BookPage.page_number).all()
        existing_numbers = {p[0] if not hasattr(p, 'page_number') else p.page_number for p in existing_pages}
        conflict_numbers = [
            entry['page_number']
            for entry in pages_data
            if entry['page_number'] in existing_numbers
        ]

        if conflict_numbers and not overwrite_conflicts:
            return jsonify({
                'error': '存在页码冲突，是否覆盖？',
                'conflicts': sorted(conflict_numbers),
                'needsOverwriteConfirm': True
            }), 409

        storage_root = Path(__file__).resolve().parent / 'src'

        if conflict_numbers and overwrite_conflicts:
            BookPage.query.filter(BookPage.book_id == book.id, BookPage.page_number.in_(conflict_numbers)).delete(synchronize_session=False)
            for pn in conflict_numbers:
                dir_path = storage_root / book.id / str(pn)
                if dir_path.exists():
                    shutil.rmtree(dir_path, ignore_errors=True)

        for entry in pages_data:
            page_number = entry['page_number']
            html_content = entry.get('html_content')
            if html_content is None:
                base_url_entry = entry.get('base_url') or (request.host_url.rstrip('/') if request else '')
                processed = save_base64_images(entry.get('body_html') or '', book.id, page_number, base_url=base_url_entry)
                html_content = f'<article class=\"pdf-source-page\" data-origin-page=\"{page_number}\">{processed}</article>'
            db.session.add(BookPage(
                book=book,
                chapter=chapter,
                page_number=page_number,
                html_content=html_content
            ))

        db.session.commit()
    except Exception:  # noqa: BLE001
        db.session.rollback()
        app.logger.exception('Admin import failed')
        return jsonify({'error': '写入数据库失败，请查看服务器日志'}), 500

    total_pages = BookPage.query.filter_by(book_id=book.id).count()
    return jsonify({
        'message': '导入成功',
        'book': {
            'id': book.id,
            'title': book.title,
            'pageCount': total_pages
        }
    }), 201
@admin_bp.delete('/books/<book_id>')
@admin_required

def admin_delete_book(book_id: str):
    book = Book.query.get(book_id)
    if not book:
        return jsonify({'error': '�鼮������'}), 404

    storage_root = Path(__file__).resolve().parent / 'src'
    book_storage_dir = storage_root / book_id

    try:
        removed_pages = BookPage.query.filter_by(book_id=book_id).delete(synchronize_session=False)
        removed_chapters = BookChapter.query.filter_by(book_id=book_id).delete(synchronize_session=False)
        affected_users = (
            User.query.filter(User.current_book_id == book_id)
            .update({
                User.current_book_id: None,
                User.current_page: 1,
                User.reading_progress: None,
            }, synchronize_session=False)
        )
        db.session.delete(book)
        # �����յ�����Ӧ����ݺ�ɾ��ͼƬ/HTML �ļ�Ŀ¼��ɾ��ʧ�ܲ�����ʧ������ݿ�
        if book_storage_dir.exists():
            shutil.rmtree(book_storage_dir, ignore_errors=True)
        db.session.commit()
    except Exception:  # noqa: BLE001
        db.session.rollback()
        app.logger.exception('Admin delete book failed')
        return jsonify({'error': 'ɾ���鼮ʱ��������'}), 500

    return jsonify({
        'message': '�鼮��ɾ��',
        'book_id': book_id,
        'removed': {
            'pages': removed_pages,
            'chapters': removed_chapters,
            'affectedUsers': affected_users,
        }
    }), 200


@admin_bp.get('/books/<book_id>/page_numbers')
@admin_required
def admin_list_book_page_numbers(book_id: str):
    book = Book.query.get(book_id)
    if not book:
        return jsonify({'error': '�鼮������'}), 404
    pages = (
        BookPage.query.filter_by(book_id=book_id)
        .with_entities(BookPage.page_number)
        .order_by(BookPage.page_number.asc())
        .all()
    )
    numbers = [p[0] if not hasattr(p, 'page_number') else p.page_number for p in pages]
    return jsonify({'bookId': book_id, 'pageNumbers': numbers}), 200


@admin_bp.delete('/books/<book_id>/pages')
@admin_required
def admin_delete_selected_pages(book_id: str):
    book = Book.query.get(book_id)
    if not book:
        return jsonify({'error': '�鼮������'}), 404

    data = request.get_json(silent=True) or {}
    raw_numbers = data.get('page_numbers')
    if not isinstance(raw_numbers, list) or not raw_numbers:
        return jsonify({'error': '��ѡ��Ҫɾ����ҳ��'}), 400

    try:
        page_numbers = sorted({int(num) for num in raw_numbers})
    except (TypeError, ValueError):
        return jsonify({'error': 'ҳ������Ч�������ж��ֽ�'}), 400

    pages_query = (
        BookPage.query.filter_by(book_id=book_id)
        .filter(BookPage.page_number.in_(page_numbers))
    )
    found_pages = pages_query.all()
    if not found_pages:
        return jsonify({'error': 'δ�ҵ���Щҳ������ɾ��'}), 404

    storage_root = Path(__file__).resolve().parent / 'src'

    try:
        for page in found_pages:
            dir_path = storage_root / book_id / str(page.page_number)
            if dir_path.exists():
                shutil.rmtree(dir_path, ignore_errors=True)
            db.session.delete(page)
        db.session.commit()
    except Exception:  # noqa: BLE001
        db.session.rollback()
        app.logger.exception('Admin delete specific pages failed')
        return jsonify({'error': 'ɾ��ָ��ҳʱ��������'}), 500

    return jsonify({
        'message': 'ָ��ҳ�Ѿ�ɾ��',
        'book_id': book_id,
        'removedPageNumbers': page_numbers
    }), 200


@admin_bp.get('/books/<book_id>/page_numbers')
@admin_required
def admin_get_book_page_numbers(book_id: str):
    book = Book.query.get(book_id)
    if not book:
        return jsonify({'error': '图书不存在'}), 404
    pages = (
        BookPage.query.filter_by(book_id=book_id)
        .with_entities(BookPage.page_number)
        .order_by(BookPage.page_number.asc())
        .all()
    )
    numbers = [p[0] if not hasattr(p, 'page_number') else p.page_number for p in pages]
    return jsonify({'bookId': book_id, 'pageNumbers': numbers}), 200


@admin_bp.delete('/books/<book_id>/pages')
@admin_required
def admin_delete_book_pages(book_id: str):
    book = Book.query.get(book_id)
    if not book:
        return jsonify({'error': '图书不存在'}), 404

    data = request.get_json(silent=True) or {}
    raw_numbers = data.get('page_numbers')
    if not isinstance(raw_numbers, list) or not raw_numbers:
        return jsonify({'error': '请提供要删除的页码列表'}), 400

    try:
        page_numbers = sorted({int(num) for num in raw_numbers})
    except (TypeError, ValueError):
        return jsonify({'error': '页码必须为整数'}), 400

    pages_query = (
        BookPage.query.filter_by(book_id=book_id)
        .filter(BookPage.page_number.in_(page_numbers))
    )
    found_pages = pages_query.all()
    if not found_pages:
        return jsonify({'error': '未找到对应的页码'}), 404

    storage_root = Path(__file__).resolve().parent / 'src'

    try:
        for page in found_pages:
            dir_path = storage_root / book_id / str(page.page_number)
            if dir_path.exists():
                shutil.rmtree(dir_path, ignore_errors=True)
            db.session.delete(page)
        db.session.commit()
    except Exception:  # noqa: BLE001
        db.session.rollback()
        app.logger.exception('Admin delete specific pages failed')
        return jsonify({'error': '删除指定页时发生错误'}), 500

    return jsonify({
        'message': '指定页已删除',
        'book_id': book_id,
        'removedPageNumbers': page_numbers
    }), 200


@admin_bp.get('/books/<book_id>/chapters')
@admin_required
def admin_list_book_chapters(book_id: str):
    book = Book.query.get(book_id)
    if not book:
        return jsonify({'error': '图书不存在'}), 404
    chapters = (
        BookChapter.query.filter_by(book_id=book_id)
        .order_by(BookChapter.chapter_number.asc())
        .all()
    )
    items = [{
        'id': chapter.id,
        'chapterNumber': chapter.chapter_number,
        'title': chapter.title,
        'summary': chapter.summary,
        'startPage': chapter.start_page
    } for chapter in chapters]
    return jsonify({'bookId': book_id, 'chapters': items}), 200


@admin_bp.post('/books/<book_id>/chapters')
@admin_required
def admin_save_book_chapter_details(book_id: str):
    book = Book.query.get(book_id)
    if not book:
        return jsonify({'error': '图书不存在'}), 404

    data = request.get_json(silent=True) or {}
    chapter_id = data.get('chapter_id')
    chapter_number = data.get('chapter_number')
    title = (data.get('title') or '').strip()
    summary = (data.get('summary') or '').strip()
    start_page = data.get('start_page')

    try:
        chapter_number = int(chapter_number)
        start_page = int(start_page)
    except (TypeError, ValueError):
        return jsonify({'error': '章节号与起始页必须为整数'}), 400

    if chapter_number < 0 or start_page < 0:
        return jsonify({'error': '章节号与起始页必须为非负整数'}), 400
    if not title:
        return jsonify({'error': '标题不能为空'}), 400

    if chapter_id:
        chapter = BookChapter.query.filter_by(id=chapter_id, book_id=book_id).first()
        if not chapter:
            return jsonify({'error': '指定章节不存在'}), 404
    else:
        chapter = BookChapter(book=book)
        db.session.add(chapter)

    chapter.chapter_number = chapter_number
    chapter.title = title
    chapter.summary = summary
    chapter.start_page = start_page

    try:
        db.session.commit()
    except Exception:  # noqa: BLE001
        db.session.rollback()
        app.logger.exception('Admin save chapter failed')
        return jsonify({'error': '章节保存失败'}), 500

    return jsonify({
        'message': '章节已保存',
        'chapter': {
            'id': chapter.id,
            'chapterNumber': chapter.chapter_number,
            'title': chapter.title,
            'summary': chapter.summary,
            'startPage': chapter.start_page
        }
    }), 200

@admin_bp.get('/dictionaries')
@admin_required
def admin_list_dictionaries():
    dictionaries = Dictionary.query.all()
    items = []
    for dic in dictionaries:
        try:
            parsed = json.loads(dic.data)
        except Exception:
            parsed = {}
        data_preview = list(parsed.items())[:5]
        items.append({
            'id': dic.id,
            'name': dic.name,
            'entryCount': len(parsed),
            'preview': data_preview
        })
    return jsonify({'items': items}), 200


@admin_bp.get('/users')
@admin_required
def admin_list_users():
    users = User.query.order_by(User.id.asc()).all()
    items = [{
        'id': user.id,
        'email': user.email,
        'currentBookId': user.current_book_id,
        'currentPage': user.current_page
    } for user in users]
    return jsonify({'items': items}), 200


# --- Library APIs ---
@app.route('/api/library', methods=['GET'])
@jwt_required()
def get_library():
    try:
        books = Book.query.all()
        library_data = {}
        for book in books:
            library_data[book.id] = serialize_book_metadata(book)
        return jsonify(library_data), 200
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


@app.route('/api/dictionaries', methods=['GET'])
@jwt_required()
def get_dictionaries():
    try:
        dictionaries = Dictionary.query.all()
        dict_data = {}
        for item in dictionaries:
            dict_data[item.id] = {
                'name': item.name,
                'data': json.loads(item.data),
            }
        return jsonify(dict_data), 200
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


@app.route('/api/books/<book_id>/pages/<int:page_number>', methods=['GET'])
@jwt_required()
def get_book_page(book_id: str, page_number: int):
    try:
        count = int(request.args.get('count', 1))
    except ValueError:
        return jsonify({'error': 'count 参数必须为整数'}), 400
    count = max(1, min(count, 10))
    count = max(1, min(count, 10))
    pages_query = BookPage.query.filter_by(book_id=book_id)
    pages = (
        pages_query
        .filter(BookPage.page_number >= page_number, BookPage.page_number < page_number + count)
        .order_by(BookPage.page_number.asc())
        .all()
    )
    if not pages:
        first_page = pages_query.order_by(BookPage.page_number.asc()).first()
        if first_page and page_number < first_page.page_number:
            pages = (
                pages_query
                .filter(BookPage.page_number >= first_page.page_number, BookPage.page_number < first_page.page_number + count)
                .order_by(BookPage.page_number.asc())
                .all()
            )
        if not pages:
            return jsonify({'error': 'δ�ҵ���Ӧҳ'}), 404

    base_url = request.host_url.rstrip('/')
    response = [
        {
            'pageNumber': page.page_number,
            'htmlContent': rewrite_src_to_absolute(page.html_content, base_url),
            'chapterTitle': page.chapter.title if page.chapter else None
        }
        for page in pages
    ]
    return jsonify({'bookId': book_id, 'pages': response}), 200




@app.route('/api/books/<book_id>/page_numbers', methods=['GET'])
@jwt_required()
def get_book_page_numbers(book_id: str):
    pages = (
        BookPage.query.filter_by(book_id=book_id)
        .with_entities(BookPage.page_number)
        .order_by(BookPage.page_number.asc())
        .all()
    )
    nums = [p[0] if not hasattr(p, 'page_number') else p.page_number for p in pages]
    if not nums:
        return jsonify({'error': '未找到对应页'}), 404
    return jsonify({'bookId': book_id, 'pageNumbers': nums}), 200
@app.route('/api/books/<book_id>/search', methods=['GET'])
@jwt_required()
def search_book(book_id: str):
    query = (request.args.get('q') or '').strip()
    if len(query) < 2:
        return jsonify({'error': '搜索关键词至少需要 2 个字符'}), 400

    like_expr = f"%{query}%"
    pages = (
        BookPage.query.filter_by(book_id=book_id)
        .filter(BookPage.html_content.ilike(like_expr))
        .order_by(BookPage.page_number.asc())
        .limit(20)
        .all()
    )
    results = []
    for page in pages:
        text_content = strip_tags(page.html_content)
        snippet_index = text_content.lower().find(query.lower())
        if snippet_index == -1:
            snippet = text_content[:160]
        else:
            start = max(snippet_index - 60, 0)
            end = min(snippet_index + len(query) + 60, len(text_content))
            snippet = text_content[start:end]
        results.append({
            'pageNumber': page.page_number,
            'chapterTitle': page.chapter.title if page.chapter else None,
            'snippet': snippet.strip()
        })
    return jsonify({'results': results}), 200


# --- User APIs ---
@app.route('/api/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({'error': '\u7528\u6237\u4e0d\u5b58\u5728'}), 404
    return jsonify({'user': serialize_user(user)}), 200


@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip()
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': '\u90ae\u7bb1\u548c\u5bc6\u7801\u662f\u5fc5\u586b\u9879'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': '\u8d26\u53f7\u5df2\u5b58\u5728'}), 400

    user = User(email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({
        'message': '\u7528\u6237\u6ce8\u518c\u6210\u529f',
        'user': serialize_user(user),
        'token': token,
    }), 201


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip()
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': '\u90ae\u7bb1\u548c\u5bc6\u7801\u662f\u5fc5\u586b\u9879'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': '\u90ae\u7bb1\u6216\u5bc6\u7801\u9519\u8bef'}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({
        'message': '\u767b\u5f55\u6210\u529f',
        'user': serialize_user(user),
        'token': token,
    }), 200


@app.route('/api/user/api_key', methods=['PUT'])
@jwt_required()
def update_api_key():
    data = request.get_json(silent=True) or {}
    api_key = (data.get('api_key') or '').strip()

    if not api_key:
        return jsonify({'error': 'API \u5bc6\u94a5\u662f\u5fc5\u586b\u9879'}), 400

    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({'error': '\u7528\u6237\u4e0d\u5b58\u5728'}), 404

    user.api_key = api_key
    db.session.commit()
    return jsonify({'message': 'API \u5bc6\u94a5\u66f4\u65b0\u6210\u529f'}), 200


@app.route('/api/user/progress', methods=['PUT'])
@jwt_required()
def update_progress():
    data = request.get_json(silent=True) or {}
    book_id = data.get('book_id')
    current_page = data.get('current_page')
    reading_progress = data.get('reading_progress')

    if not book_id:
        return jsonify({'error': '\u4e66\u7c4d ID \u662f\u5fc5\u586b\u9879'}), 400

    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({'error': '\u7528\u6237\u4e0d\u5b58\u5728'}), 404

    user.current_book_id = book_id
    try:
        page_value = int(current_page)
        if page_value <= 0:
            page_value = 1
    except (TypeError, ValueError):
        page_value = 1
    user.current_page = page_value
    user.reading_progress = reading_progress
    db.session.commit()

    return jsonify({'message': '\u9605\u8bfb\u8fdb\u5ea6\u66f4\u65b0\u6210\u529f'}), 200


@app.route('/api/user/progress/<int:user_id>', methods=['GET'])
@jwt_required()
def get_progress(user_id: int):
    current_user_id = int(get_jwt_identity())
    if current_user_id != user_id:
        return jsonify({'error': '\u65e0\u6743\u8bbf\u95ee\u8be5\u7528\u6237\u8fdb\u5ea6'}), 403

    user = User.query.get(current_user_id)
    if not user:
        return jsonify({'error': '\u7528\u6237\u4e0d\u5b58\u5728'}), 404

    return jsonify({
        'current_book_id': user.current_book_id,
        'current_page': user.current_page,
        'reading_progress': user.reading_progress,
    }), 200


app.register_blueprint(admin_bp)


@app.route('/src/<path:filename>')
def serve_mineru_asset(filename: str):
    base_dir = Path(__file__).resolve().parent / 'src'
    target = base_dir / filename
    if not target.exists():
        return jsonify({'error': '文件不存在'}), 404
    return send_from_directory(base_dir, filename)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
