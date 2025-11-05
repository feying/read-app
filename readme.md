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

## 完整启动指南

### 第一步：验证项目结构
确保项目目录结构正确：
```bash
# 列出项目根目录文件
ls -la

# 应该看到以下结构：
# frontend/  backend/  venv/  README.md
```

### 第二步：启动后端服务

#### 1. 进入后端目录
```bash
cd backend
```

#### 2. 激活虚拟环境
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

#### 3. 安装依赖（如果尚未安装）
```bash
pip install -r requirements.txt
```

#### 4. 启动Flask应用
```bash
python app.py
```

#### 5. 验证后端启动成功
如果看到以下输出，表示后端启动成功：
```
* Serving Flask app 'app'
* Debug mode: on
* Running on http://127.0.0.1:5000
* Running on http://[你的IP]:5000
```

### 第三步：启动前端服务

#### 1. 打开新的终端窗口
保持后端服务运行，打开新的终端

#### 2. 进入前端目录
```bash
cd frontend
```

#### 3. 启动HTTP服务器
```bash
# 使用Python
python -m http.server 8080

# 或使用Node.js
npx http-server -p 8080
```

#### 4. 验证前端启动成功
如果看到以下输出，表示前端启动成功：
```
Serving HTTP on 0.0.0.0 port 8080
```

### 第四步：验证完整功能

#### 1. 打开浏览器访问
在浏览器中打开：`http://localhost:8080`

#### 2. 检查应用界面
应该看到：
- 完整的英文阅读界面
- 顶部导航栏
- 文章阅读区域
- 用户登录/注册按钮

#### 3. 测试用户注册功能
1. 点击"登录"按钮
2. 在弹出窗口中选择"注册"标签
3. 输入用户名和密码
4. 点击注册按钮
5. 应该看到注册成功的提示

#### 4. 测试用户登录功能
1. 使用刚才注册的用户名和密码登录
2. 应该看到登录成功的提示
3. 用户头像应该显示在右上角

#### 5. 测试阅读功能
1. 选择一篇文章开始阅读
2. 点击单词查看翻译
3. 阅读进度应该自动保存

### 验证任务成功的完整检查清单

✅ **项目结构检查**
- [ ] frontend/ 目录存在且包含所有必要文件
- [ ] backend/ 目录存在且包含所有必要文件
- [ ] 虚拟环境已创建

✅ **后端服务检查**
- [ ] 虚拟环境激活成功
- [ ] 依赖包安装完成
- [ ] Flask应用启动无错误
- [ ] 在 http://127.0.0.1:5000 可以访问API

✅ **前端服务检查**
- [ ] HTTP服务器启动成功
- [ ] 在 http://localhost:8080 可以访问应用界面

✅ **功能测试检查**
- [ ] 用户注册功能正常
- [ ] 用户登录功能正常
- [ ] 文章阅读界面显示正常
- [ ] 单词翻译功能正常
- [ ] 阅读进度保存功能正常

## 故障排除

### 常见问题及解决方案

#### 1. 后端启动失败
**问题**: `ModuleNotFoundError: No module named 'flask'`
**解决**: 确保虚拟环境已激活并安装依赖
```bash
cd backend
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

#### 2. 数据库连接错误
**问题**: `sqlite3.OperationalError: unable to open database file`
**解决**: 确保instance目录存在且有写入权限
```bash
cd backend
mkdir -p instance
```

#### 3. 前端页面空白
**问题**: 页面加载但显示空白
**解决**: 检查浏览器控制台错误，确保后端服务正在运行

#### 4. CORS跨域错误
**问题**: 前端无法连接到后端API
**解决**: 确保后端Flask-CORS已正确配置并运行在端口5000

### 调试技巧

1. **检查浏览器开发者工具**
   - 按F12打开开发者工具
   - 查看Console标签页的错误信息
   - 查看Network标签页的API请求状态

2. **检查后端日志**
   - 后端终端会显示所有API请求和错误信息
   - 关注500错误或数据库连接错误

3. **验证数据库**
   ```bash
   cd backend
   venv\Scripts\activate
   python -c "
   import sqlite3
   conn = sqlite3.connect('instance/users.db')
   cursor = conn.cursor()
   cursor.execute('SELECT name FROM sqlite_master WHERE type=\"table\"')
   tables = cursor.fetchall()
   print('数据库中的表:', tables)
   conn.close()
   "
   ```

## API接口文档

### 用户认证接口
- `POST /api/register` - 用户注册
- `POST /api/login` - 用户登录  
- `POST /api/logout` - 用户退出

### 阅读进度接口
- `GET /api/progress` - 获取阅读进度
- `POST /api/progress` - 保存阅读进度

### 测试API连接
```bash
# 测试后端API是否响应
curl http://127.0.0.1:5000/api/register
```

## 开发说明

### 数据库配置
项目默认使用SQLite数据库，数据文件位于 `backend/instance/users.db`

如需使用MySQL，请参考 `backend/DATABASE_SETUP.md`

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
