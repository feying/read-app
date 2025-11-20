from flask import Flask
from flask_cors import CORS

from backend.config import load_config, ALLOWED_ORIGINS
from backend.extensions import db, jwt
from backend.api import admin_bp, user_bp, library_bp, assets_bp


def create_app() -> Flask:
    app = Flask(__name__)
    cfg = load_config()
    app.config.from_object(cfg)

    db.init_app(app)
    jwt.init_app(app)

    CORS(app, resources={r"/api/*": {"origins": list(ALLOWED_ORIGINS)}}, supports_credentials=True)

    # 导入路由模块以注册蓝图上的视图
    import backend.api.admin  # noqa: F401
    import backend.api.user  # noqa: F401
    import backend.api.library  # noqa: F401
    import backend.api.assets  # noqa: F401

    app.register_blueprint(admin_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(library_bp)
    app.register_blueprint(assets_bp)

    @app.route('/healthz')
    def health():
        return {"status": "ok"}, 200

    return app


app = create_app()


if __name__ == '__main__':
    app.run(debug=True, port=5000)
