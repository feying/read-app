# 英文阅读应用

一个现代化的英文阅读应用，支持实时翻译和阅读进度管理。

## 项目结构

```
reading-app/
├── frontend/          # 前端文件
│   ├── index.html    # 主页面
│   ├── css/          # 样式文件
│   │   └── styles.css
│   └── js/           # JavaScript文件
│       ├── main.js   # 主应用逻辑
│       ├── app.js    # 应用初始化
│       ├── dictionary.js  # 词典功能
│       ├── library.js     # 图书馆功能
│       └── utils.js       # 工具函数
├── backend/          # 后端API服务
│   ├── app.py       # Flask应用
│   ├── requirements.txt  # Python依赖
│   ├── .env         # 环境配置
│   ├── instance/    # 数据库文件目录
│   │   └── users.db # SQLite数据库
│   └── venv/        # Python虚拟环境
├── venv/            # 根目录虚拟环境（可选）
└── README.md        # 项目说明
```

## 功能特性

- 📖 英文文章阅读
- 🔍 实时单词翻译
- 👤 用户注册登录
- 💾 阅读进度同步
- 📱 响应式设计

## 技术栈

### 前端
- HTML5 + CSS3
- Tailwind CSS
- 原生 JavaScript ES6+
- Fetch API

### 后端
- Python 3.x
- Flask Web框架
- SQLAlchemy ORM
- SQLite数据库
- JWT认证（可选）

## 快速开始

### 前端启动
```bash
# 进入前端目录
cd frontend

# 启动HTTP服务器
python -m http.server 8080
# 或使用Node.js
npx http-server -p 8080
```

### 后端启动
```bash
# 进入后端目录
cd backend

# 激活虚拟环境
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动Flask应用
python app.py
```

### 虚拟环境设置
```bash
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

## 开发说明

### 数据库配置
项目默认使用SQLite数据库，数据文件位于 `backend/instance/users.db`

如需使用MySQL，请参考 `backend/DATABASE_SETUP.md`

### API接口
- `POST /api/register` - 用户注册
- `POST /api/login` - 用户登录
- `POST /api/logout` - 用户退出
- `GET /api/progress` - 获取阅读进度
- `POST /api/progress` - 保存阅读进度

### 环境变量
在 `backend/.env` 中配置：
```
DATABASE_URL=sqlite:///instance/users.db
SECRET_KEY=your-secret-key
```

## 部署说明

### 生产环境部署
1. 配置生产数据库（MySQL/PostgreSQL）
2. 设置环境变量
3. 使用Gunicorn或uWSGI部署Flask应用
4. 配置Nginx反向代理

### 前端部署
前端为静态文件，可部署到任何静态文件服务器或CDN。

## 许可证

MIT License
