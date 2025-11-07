from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import bcrypt
import os
import json # 导入 json 模块
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# --- 数据库配置 (只使用 MySQL) ---
db_url = os.getenv('DATABASE_URL')
if not db_url:
    print("--- 错误：未在 .env 文件中找到 DATABASE_URL 配置。---")
    print("--- 请确保 .env 文件在 backend 目录下，并包含 DATABASE_URL。 ---")
    exit() 

app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
print(f"--- 正在尝试连接到数据库: {db_url.split('@')[-1]} ---")

db = SQLAlchemy(app)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:8080", "http://127.0.0.1:8080"]}})

# --- 数据库模型 ---

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    api_key = db.Column(db.String(255))
    current_book_id = db.Column(db.String(100))
    current_page = db.Column(db.Integer, default=1)
    reading_progress = db.Column(db.Text)  # JSON字符串存储阅读进度

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

# --- 新增：词典模型 ---
class Dictionary(db.Model):
    id = db.Column(db.String(100), primary_key=True) # e.g., 'api521_dict'
    name = db.Column(db.String(255), nullable=False) # e.g., 'API 521 专业词典'
    data = db.Column(db.Text, nullable=False) # 存储为 JSON 字符串

# --- 新增：书籍模型 ---
class Book(db.Model):
    id = db.Column(db.String(100), primary_key=True) # e.g., 'api521'
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    default_dictionary_id = db.Column(db.String(100), db.ForeignKey('dictionary.id'))
    
    # 建立与 BookPage 的一对多关系
    pages = db.relationship('BookPage', backref='book', lazy=True, order_by='BookPage.page_number')

# --- 新增：书页模型 ---
class BookPage(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    book_id = db.Column(db.String(100), db.ForeignKey('book.id'), nullable=False)
    page_number = db.Column(db.Integer, nullable=False)
    html_content = db.Column(db.Text, nullable=False)


# --- (已删除：庞大的 seed_database 函数和数据) ---


# --- (已删除：启动时自动运行的 db.create_all() 和 seed_database()) ---


# --- API：获取书库 ---
@app.route('/api/library', methods=['GET'])
def get_library():
    try:
        books = Book.query.all()
        library_data = {}
        for book in books:
            # 按页码顺序获取书页内容
            book_pages = [page.html_content for page in book.pages]
            library_data[book.id] = {
                'title': book.title,
                'description': book.description,
                'defaultDictionaryId': book.default_dictionary_id,
                'content': book_pages
            }
        return jsonify(library_data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- API：获取词典 ---
@app.route('/api/dictionaries', methods=['GET'])
def get_dictionaries():
    try:
        dictionaries = Dictionary.query.all()
        dict_data = {}
        for d in dictionaries:
            dict_data[d.id] = {
                'name': d.name,
                'data': json.loads(d.data) # 反序列化 JSON 字符串
            }
        return jsonify(dict_data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# --- 用户 API 路由 ---

@app.route('/api/register', methods=['POST'])
def register():
# ... (此部分及以下的用户路由与你现有的代码保持一致) ...
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': '邮箱和密码是必需的'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': '邮箱已存在'}), 400

    user = User(email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify({'message': '用户注册成功'}), 201

# 用户登录
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': '邮箱和密码是必需的'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': '邮箱或密码错误'}), 401

    # 返回用户信息（不包括密码）
    user_data = {
        'id': user.id,
        'email': user.email,
        'api_key': user.api_key,
        'current_book_id': user.current_book_id,
        'current_page': user.current_page,
        'reading_progress': user.reading_progress
    }

    return jsonify({'message': '登录成功', 'user': user_data}), 200

# 更新用户API密钥
@app.route('/api/user/api_key', methods=['PUT'])
def update_api_key():
    data = request.get_json()
    user_id = data.get('user_id')
    api_key = data.get('api_key')

    if not user_id or not api_key:
        return jsonify({'error': '用户ID和API密钥是必需的'}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': '用户不存在'}), 404

    user.api_key = api_key
    db.session.commit()

    return jsonify({'message': 'API密钥更新成功'}), 200

# 更新阅读进度
@app.route('/api/user/progress', methods=['PUT'])
def update_progress():
    data = request.get_json()
    user_id = data.get('user_id')
    book_id = data.get('book_id')
    current_page = data.get('current_page')
    reading_progress = data.get('reading_progress')

    if not user_id or not book_id:
        return jsonify({'error': '用户ID和书籍ID是必需的'}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': '用户不存在'}), 404

    user.current_book_id = book_id
    user.current_page = current_page or 1
    user.reading_progress = reading_progress
    db.session.commit()

    return jsonify({'message': '阅读进度更新成功'}), 200

# 获取用户进度
@app.route('/api/user/progress/<int:user_id>', methods=['GET'])
def get_progress(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': '用户不存在'}), 404

    progress_data = {
        'current_book_id': user.current_book_id,
        'current_page': user.current_page,
        'reading_progress': user.reading_progress
    }

    return jsonify(progress_data), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)