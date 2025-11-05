import os
import sqlite3
from app import db, app

# 测试数据库文件是否存在
db_path = os.path.abspath(os.path.join('instance', 'users.db'))
print(f"数据库路径: {db_path}")
print(f"文件存在: {os.path.exists(db_path)}")

# 尝试直接使用 sqlite3 连接
try:
    conn = sqlite3.connect(db_path)
    print("直接 SQLite 连接成功")
    conn.close()
except Exception as e:
    print(f"直接 SQLite 连接失败: {e}")

# 尝试通过 Flask-SQLAlchemy 连接
with app.app_context():
    try:
        db.create_all()
        print("Flask-SQLAlchemy 连接成功")
    except Exception as e:
        print(f"Flask-SQLAlchemy 连接失败: {e}")
