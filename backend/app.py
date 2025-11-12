from flask import Flask, request, jsonify, Blueprint
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    get_jwt_identity,
    get_jwt,
    jwt_required
)
import bcrypt
import os
import json
import re
from datetime import timedelta
from functools import wraps
from dotenv import load_dotenv

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


def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if not claims.get('is_admin'):
            return jsonify({'error': 'Forbidden'}), 403
        return fn(*args, **kwargs)
    return wrapper

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
            'pageCount': book.pages.count() if hasattr(book.pages, 'count') else len(book.pages or []),
            'chapterCount': len(book.chapters or [])
        })
    return jsonify({'items': items}), 200


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
    if page_number < 0:
        return jsonify({'error': '页码必须大于等于 0'}), 400

    pages = (
        BookPage.query.filter_by(book_id=book_id)
        .filter(BookPage.page_number >= page_number, BookPage.page_number < page_number + count)
        .order_by(BookPage.page_number.asc())
        .all()
    )
    if not pages:
        return jsonify({'error': '未找到对应页'}), 404

    response = [
        {
            'pageNumber': page.page_number,
            'htmlContent': page.html_content,
            'chapterTitle': page.chapter.title if page.chapter else None
        }
        for page in pages
    ]
    return jsonify({'bookId': book_id, 'pages': response}), 200


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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
