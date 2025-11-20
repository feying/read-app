from flask import Blueprint

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')
user_bp = Blueprint('user', __name__, url_prefix='/api')
library_bp = Blueprint('library', __name__, url_prefix='/api')
assets_bp = Blueprint('assets', __name__)

# 具体路由在同级模块内注册
