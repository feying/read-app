from flask import request, jsonify
from flask_jwt_extended import jwt_required, create_access_token, get_jwt_identity
from datetime import datetime, timedelta

from backend.api import user_bp
from backend.extensions import db
from backend.models import User


def resolve_user_name(user: User) -> str:
    if user.user_name:
        return user.user_name
    if user.email:
        return user.email.split('@', 1)[0]
    return f'user_{user.id or "anon"}'


def serialize_user(user: User) -> dict:
    return {
        'id': user.id,
        'email': user.email,
        'user_name': resolve_user_name(user),
        'api_key': user.api_key,
        'current_book_id': user.current_book_id,
        'current_page': user.current_page,
        'reading_progress': user.reading_progress,
        'username_updated_at': user.username_updated_at.isoformat() if user.username_updated_at else None,
        'is_suspended': getattr(user, 'is_suspended', False),
    }


@user_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    if getattr(user, 'is_suspended', False):
        return jsonify({'error': '账户已被暂停'}), 403
    return jsonify({'user': serialize_user(user)}), 200


@user_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip()
    password = data.get('password')
    user_name = (data.get('user_name') or '').strip()

    if not email or not password or not user_name:
        return jsonify({'error': '邮箱、密码、用户名都是必填项'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': '账号已存在'}), 400

    user = User(email=email)
    user.set_password(password)
    user.user_name = user_name
    user.username_updated_at = datetime.utcnow()
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({
        'message': '用户注册成功',
        'user': serialize_user(user),
        'token': token,
    }), 201


@user_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip()
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': '邮箱和密码是必填项'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': '邮箱或密码错误'}), 401
    if getattr(user, 'is_suspended', False):
        return jsonify({'error': '账户已被暂停，请联系管理员'}), 403

    token = create_access_token(identity=str(user.id))
    return jsonify({
        'message': '登录成功',
        'user': serialize_user(user),
        'token': token,
    }), 200


@user_bp.route('/user/username', methods=['PUT'])
@jwt_required()
def update_username():
    data = request.get_json(silent=True) or {}
    new_name = (data.get('user_name') or '').strip()
    if not new_name:
        return jsonify({'error': '用户名不能为空'}), 400

    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    if getattr(user, 'is_suspended', False):
        return jsonify({'error': '账户已被暂停，无法修改用户名'}), 403

    now = datetime.utcnow()
    if user.username_updated_at:
        delta = now - user.username_updated_at
        if delta < timedelta(days=180):
            left = timedelta(days=180) - delta
            days_left = max(1, left.days)
            return jsonify({'error': f'用户名半年内仅可修改一次，剩余 {days_left} 天后可再修改'}), 400

    user.user_name = new_name
    user.username_updated_at = now
    db.session.commit()
    return jsonify({'message': '用户名已更新', 'user': serialize_user(user)}), 200


@user_bp.route('/user/api_key', methods=['PUT'])
@jwt_required()
def update_api_key():
    data = request.get_json(silent=True) or {}
    api_key = (data.get('api_key') or '').strip()

    if not api_key:
        return jsonify({'error': 'API 密钥是必填项'}), 400

    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    if getattr(user, 'is_suspended', False):
        return jsonify({'error': '账户已被暂停，无法更新密钥'}), 403

    user.api_key = api_key
    db.session.commit()
    return jsonify({'message': 'API 密钥更新成功'}), 200


@user_bp.route('/user/progress', methods=['PUT'])
@jwt_required()
def update_progress():
    data = request.get_json(silent=True) or {}
    book_id = data.get('book_id')
    current_page = data.get('current_page')
    reading_progress = data.get('reading_progress')

    if not book_id:
        return jsonify({'error': '书籍 ID 是必填项'}), 400

    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    if getattr(user, 'is_suspended', False):
        return jsonify({'error': '账户已被暂停，无法更新进度'}), 403

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

    return jsonify({'message': '阅读进度更新成功'}), 200


@user_bp.route('/user/progress/<int:user_id>', methods=['GET'])
@jwt_required()
def get_progress(user_id: int):
    current_user_id = int(get_jwt_identity())
    if current_user_id != user_id:
        return jsonify({'error': '无权访问该用户进度'}), 403

    user = User.query.get(current_user_id)
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    if getattr(user, 'is_suspended', False):
        return jsonify({'error': '账户已被暂停'}), 403

    return jsonify({
        'current_book_id': user.current_book_id,
        'current_page': user.current_page,
        'reading_progress': user.reading_progress,
    }), 200
