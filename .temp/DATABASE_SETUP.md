# MySQL 数据库配置说明

## 概述
本阅读应用使用 MySQL 作为数据库后端，存储用户信息和阅读进度数据。以下是完整的数据库设置步骤。

## 步骤 1: 安装 MySQL

### Windows 系统
1. 下载 MySQL Installer: https://dev.mysql.com/downloads/installer/
2. 运行安装程序，选择 "Developer Default" 配置
3. 在配置步骤中设置 root 用户密码（请记住这个密码）
4. 完成安装并启动 MySQL 服务

### macOS 系统
```bash
# 使用 Homebrew 安装
brew install mysql
brew services start mysql
```

### Linux (Ubuntu/Debian) 系统
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

## 步骤 2: 创建数据库和用户

1. 登录 MySQL:
```bash
mysql -u root -p
```

2. 创建数据库:
```sql
CREATE DATABASE reading_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. 创建专用用户（推荐）:
```sql
CREATE USER 'reading_user'@'localhost' IDENTIFIED BY 'your_password_here';
GRANT ALL PRIVILEGES ON reading_app.* TO 'reading_user'@'localhost';
FLUSH PRIVILEGES;
```

4. 退出 MySQL:
```sql
EXIT;
```

## 步骤 3: 配置环境变量

确保 `backend/.env` 文件包含正确的数据库连接信息：

```ini
DATABASE_URL=mysql+pymysql://reading_user:your_password_here@localhost/reading_app
SECRET_KEY=your_secret_key_here
```

请将 `your_password_here` 替换为步骤 2 中设置的实际密码。

## 步骤 4: 安装 Python 依赖

在 backend 目录中，确保已安装所有必要的依赖：

```bash
cd backend
pip install -r requirements.txt
```

## 步骤 5: 初始化数据库表

当您首次运行后端应用时，SQLAlchemy 会自动创建所有必要的表：

```bash
cd backend
python app.py
```

应用启动后，表结构将自动创建。您可以在 MySQL 中验证表是否创建成功：

```sql
USE reading_app;
SHOW TABLES;
```

应该看到 `user` 表。

## 步骤 6: 手动创建表（可选）

如果您希望手动创建表，可以使用以下 SQL：

```sql
USE reading_app;

CREATE TABLE user (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 数据库表结构

### user 表
- `id`: 主键，自增整数
- `username`: 用户名，唯一，非空
- `email`: 邮箱地址，唯一，非空  
- `password_hash`: 加密的密码哈希
- `created_at`: 用户创建时间戳

## 故障排除

### 连接问题
1. 确保 MySQL 服务正在运行
2. 检查 `.env` 文件中的数据库连接字符串
3. 验证用户名和密码是否正确
4. 确保数据库 `reading_app` 已创建

### 权限问题
如果遇到权限错误，重新授权用户：
```sql
GRANT ALL PRIVILEGES ON reading_app.* TO 'reading_user'@'localhost';
FLUSH PRIVILEGES;
```

### Python 依赖问题
如果遇到 pymysql 错误，重新安装：
```bash
pip install pymysql cryptography
```

## 测试数据库连接

启动后端服务器后，访问 http://localhost:5000/health 应该返回数据库连接状态。

## 备份数据库

定期备份数据库：
```bash
mysqldump -u reading_user -p reading_app > backup_$(date +%Y%m%d).sql
```

现在您的阅读应用已完全配置了 MySQL 数据库支持！
