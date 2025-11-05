from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import bcrypt
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
# 数据库配置
# 确保实例目录存在
instance_dir = os.path.join(os.path.dirname(__file__), 'instance')
if not os.path.exists(instance_dir):
    os.makedirs(instance_dir)

# 使用绝对路径确保SQLite正常工作
db_path = os.path.abspath(os.path.join(instance_dir, 'users.db'))
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')

db = SQLAlchemy(app)
CORS(app)

# 用户模型
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

# 创建数据库表
with app.app_context():
    db.create_all()

# 用户注册
@app.route('/api/register', methods=['POST'])
def register():
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
