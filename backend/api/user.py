from flask import request, jsonify
from flask_jwt_extended import jwt_required, create_access_token, get_jwt_identity

from backend.api import user_bp
from backend.extensions import db
from backend.models import User


def serialize_user(user: User) -> dict:
    return {
        'id': user.id,
        'email': user.email,
        'api_key': user.api_key,
        'current_book_id': user.current_book_id,
        'current_page': user.current_page,
        'reading_progress': user.reading_progress,
    }


@user_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    return jsonify({'user': serialize_user(user)}), 200


@user_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip()
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': '邮箱和密码是必填项'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': '账号已存在'}), 400

    user = User(email=email)
    user.set_password(password)
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

    token = create_access_token(identity=str(user.id))
    return jsonify({
        'message': '登录成功',
        'user': serialize_user(user),
        'token': token,
    }), 200


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

    return jsonify({
        'current_book_id': user.current_book_id,
        'current_page': user.current_page,
        'reading_progress': user.reading_progress,
    }), 200
