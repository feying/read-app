from backend.extensions import db
import bcrypt
from datetime import datetime


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    api_key = db.Column(db.String(255))
    current_book_id = db.Column(db.String(100))
    current_page = db.Column(db.Integer, default=1)
    reading_progress = db.Column(db.Text)
    user_name = db.Column(db.String(120))
    username_updated_at = db.Column(db.DateTime)
    is_suspended = db.Column(db.Boolean, default=False, nullable=False)

    def set_password(self, password: str) -> None:
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password: str) -> bool:
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
