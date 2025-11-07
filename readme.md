英语阅读应用 - 启动指南（新手版）

这是一个英语阅读软件，包含前端（网页）和后端（服务器）两部分。本指南将带你一步一步启动这个项目。

项目技术栈

前端 (frontend): HTML, Tailwind CSS, JavaScript

后端 (backend): Python, Flask, SQLAlchemy

数据库: MySQL (本项目已配置为使用 MySQL)

一步一步启动项目

你需要同时打开 2 个终端窗口（命令行工具）来分别运行前端和后端。

第 1 步：启动后端服务（第 1 个终端）

后端负责处理用户登录、注册和保存进度。

进入后端文件夹
打开你的终端（在 Windows 上可能是 CMD 或 PowerShell，在 Mac/Linux 上是 Terminal），cd 到 backend 目录：

cd path/to/your/project/backend


(请把 path/to/your/project 换成你项目的实际路径)

创建并激活 Python 虚拟环境
（如果你已经有了 venv 文件夹，可以跳过第一条命令）

# 1. 创建一个叫 venv 的虚拟环境（每个项目只需要做一次）
python -m venv venv

# 2. 激活这个环境
#    在 Windows 上:
venv\Scripts\activate


Windows 故障排除：
如果你在 PowerShell（Windows 10/11 默认终端）中运行 venv\Scripts\activate 时看到 ...在此系统上禁止运行脚本... 的红色错误：

方法 1 (推荐): 关闭 PowerShell，打开 Command Prompt (CMD) 终端（你可以在开始菜单搜索 "CMD"），然后在 CMD 中 cd 到你的 backend 目录，再次运行 venv\Scripts\activate。

方法 2 (在 PowerShell 中): 或者，在 PowerShell 中先运行以下命令来临时允许脚本，然后再试一次 venv\Scripts\activate：

Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process


激活后，你应该会在命令行前面看到 (venv) 字样。

安装所有依赖
在激活了 (venv) 的情况下，运行：

pip install -r requirements.txt


这会安装 Flask, SQLAlchemy, PyMySQL 等所有后端需要用到的库。

【新步骤】初始化数据库（仅需执行一次）
在运行应用之前，你需要先运行 seed.py 脚本来创建数据库表并填充书籍和词典数据。

python seed.py


你会看到类似 --- 正在创建所有数据库表... --- 和 --- 正在填充词典数据... --- 的提示。
（如果你想重新填充数据，你需要先去 MySQL 手动 DROP TABLE book, book_page, dictionary;，然后再运行此命令。）

运行后端服务器
数据库准备好后，现在可以启动主应用了：

python app.py


如果一切顺利，你会看到它成功连接到你的 MySQL 数据库，并运行在 5000 端口：

 * Running on [http://127.0.0.1:5000](http://127.0.0.1:5000)


注意：请让这个终端窗口保持打开状态，不要关闭它！

第 2 步：启动前端网页（第 2 个终端）

前端就是你在浏览器里看到的网页。

打开一个新的终端窗口
不要关闭刚才的第 1 个终端，请打开一个全新的终端窗口。

进入前端文件夹
在新终端里，cd 到 frontend 目录：

cd path/to/your/project/frontend


(同样，请把 path/to/your/project 换成你项目的实际路径)

启动一个简单的网页服务器
（你的电脑需要安装有 Python 才能使用这个命令）

# 这会在 8080 端口启动一个网页服务
python -m http.server 8080


如果一切顺利，你会看到类似下面的输出：

Serving HTTP on 0.0.0.0 port 8080 ([http://0.0.0.0:8080/](http://0.0.0.0:8080/)) ...


注意：也请让这个终端窗口保持打开状态！

第 3 步：访问你的应用

现在，你的后端（API）运行在 5000 端口，前端（网页）运行在 8080 端口。

打开你的浏览器（推荐使用 Chrome 或 Firefox）。

在地址栏输入：

http://localhost:8080


按下回车，你就应该能看到你的英语阅读软件界面了！

检查清单

如果你遇到了问题，请检查：

[ ] 你是否打开了两个终端窗口？

[ ] 你的 .env 文件是否在 backend 目录中，并且正确配置了 DATABASE_URL？

[ ] 你是否已经在第 1 个终端中成功运行了 python seed.py 来初始化数据库？

[ ] 第一个终端是否显示后端正在 http://127.0.0.1:5000 上运行？

[ ] 第二个终端是否显示前端正在 port 8080 上运行？

[ ] 你在浏览器访问的是 http://localhost:8080（前端端口），而不是 5000 端口？