# 交互式英文阅读应用

一个基于Web的交互式英文阅读应用，支持AI翻译、用户管理和阅读进度同步。

## 项目结构

```
reading-app/
├── frontend/                    # 前端文件
│   ├── index.html              # 主页面
│   ├── css/
│   │   └── styles.css          # 样式文件
│   └── js/
│       ├── main.js             # 主逻辑
│       ├── utils.js            # 工具函数
│       ├── app.js              # 应用配置
│       ├── dictionary.js       # 词典功能
│       └── library.js          # 书库管理
├── backend/                    # 后端文件
│   ├── app.py                 # Flask应用
│   ├── requirements.txt       # Python依赖
│   ├── .env                   # 环境配置
│   └── instance/
│       └── users.db           # 用户数据库
└── README.md                  # 项目说明
```

## 功能特性

### 阅读功能
- 交互式英文阅读体验
- 单词点击翻译
- AI智能段落总结
- 分页阅读和翻页控制
- 打印功能支持

### 用户管理
- 用户注册和登录
- 密码加密存储
- API密钥管理
- 阅读进度同步
- 多设备进度同步

### 书库管理
- 多本书籍管理
- 阅读进度跟踪
- 快速切换书籍

## 技术栈

### 前端
- HTML5 + CSS3
- Tailwind CSS
- 原生JavaScript (ES6+)
- 响应式设计

### 后端
- Python 3.x
- Flask Web框架
- SQLAlchemy ORM
- bcrypt密码加密
- CORS跨域支持

## 安装和运行

### 环境要求
- Python 3.8+
- 现代浏览器（支持ES6）

### 后端设置

1. 创建虚拟环境：
```bash
cd backend
python -m venv venv
```

2. 激活虚拟环境：
- Windows:
```bash
venv\Scripts\activate
```
- macOS/Linux:
```bash
source venv/bin/activate
```

3. 安装依赖：
```bash
pip install -r requirements.txt
```

4. 运行后端服务：
```bash
python app.py
```
后端服务将在 http://127.0.0.1:5000 运行

### 前端设置

1. 直接在浏览器中打开 `frontend/index.html` 文件
2. 或使用本地HTTP服务器：
```bash
cd frontend
python -m http.server 8000
```
然后在浏览器中访问 http://localhost:8000

## 配置说明

### 环境变量 (.env)
```
SECRET_KEY=your-secret-key-here
```

### API配置
- 需要在用户设置中配置DeepSeek API密钥
- 支持AI翻译和段落总结功能

## 数据库结构

### User表
- id: 主键
- email: 用户邮箱（唯一）
- password_hash: 密码哈希
- api_key: DeepSeek API密钥
- current_book_id: 当前阅读书籍ID
- current_page: 当前页码
- reading_progress: 阅读进度（JSON格式）

## API接口

### 用户认证
- `POST /api/register` - 用户注册
- `POST /api/login` - 用户登录

### 用户管理
- `PUT /api/user/api_key` - 更新API密钥
- `PUT /api/user/progress` - 更新阅读进度
- `GET /api/user/progress/<user_id>` - 获取阅读进度

## 使用说明

1. **首次使用**：注册新用户账户
2. **配置API密钥**：在用户设置中添加DeepSeek API密钥
3. **选择书籍**：从书库中选择要阅读的书籍
4. **开始阅读**：点击单词查看翻译，点击段落按钮获取AI总结
5. **进度保存**：阅读进度会自动保存到服务器

## 开发说明

### 文件说明

- `frontend/js/main.js` - 主应用逻辑，包含事件处理和页面渲染
- `frontend/js/utils.js` - 工具函数，包括API调用和内容解析
- `frontend/js/app.js` - 应用配置和初始化
- `frontend/js/dictionary.js` - 词典功能实现
- `frontend/js/library.js` - 书库管理功能
- `backend/app.py` - Flask后端API服务

### 扩展开发

- 添加新书籍：在书库配置中添加新书籍信息
- 自定义样式：修改 `frontend/css/styles.css`
- 扩展API：在 `backend/app.py` 中添加新的路由

## 许可证

MIT License
