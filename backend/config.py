import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

ALLOWED_ORIGINS = {"http://localhost:8080", "http://127.0.0.1:8080"}


class BaseConfig:
    def __init__(self) -> None:
        db_url = os.getenv('DATABASE_URL')
        if not db_url:
            raise SystemExit("未找到 DATABASE_URL，请在 backend/.env 配置")
        self.SQLALCHEMY_DATABASE_URI = db_url
        self.SQLALCHEMY_TRACK_MODIFICATIONS = False

        secret = os.getenv('SECRET_KEY', 'your-secret-key-here')
        self.SECRET_KEY = secret
        self.JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', secret)
        self.JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.getenv('JWT_EXPIRES_HOURS', '24')))

        self.ADMIN_EMAIL = os.getenv('ADMIN_EMAIL')
        self.ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD')
        if not self.ADMIN_EMAIL or not self.ADMIN_PASSWORD:
            raise SystemExit("请在 .env 配置 ADMIN_EMAIL 与 ADMIN_PASSWORD 用于后台登录")


def load_config() -> BaseConfig:
    return BaseConfig()
