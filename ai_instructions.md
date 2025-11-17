# AI Assistance Instructions

## 项目定位
- 该仓库是一个“英语阅读应用”示例，两端分离：`frontend` 负责阅读器 UI，`backend` 提供 Flask API 与 MySQL 持久化。
- 应用面向需要精读英文技术资料的用户，提供词典注释、AI 翻译/总结、分页打印等学习工具。
- 项目运行期望：后端 `python app.py` 监听 5000 端口，前端通过 `python -m http.server 8080` 或任意静态服务器提供界面，浏览器访问 `http://localhost:8080`。

## 关键能力
- **阅读体验**：前端将每个单词包裹成可点击元素，单击显示词典释义，双击/三击触发 DeepSeek 翻译或术语解释，段落按钮可请求 AI 总结。
- **AI 依赖**：用户需在界面里保存自己的 DeepSeek API Key（写入 `/api/user/api_key`）后才能调用 `callDeepSeekAPI`。
- **内容来源**：管理员通过 `frontend/admin.html` 登录（凭 `.env` 中的 `ADMIN_EMAIL/ADMIN_PASSWORD`），可上传 PDF，经 `PdfReader` 解析成 `Book`/`BookPage` 数据。
- **基础数据**：`seed.py` 会写入样例书籍与术语表（过程安全主题），方便开发期验证流程。
- **用户状态**：所有 `/api` 请求使用 JWT 保护，前端 `localStorage` 存储 `auth_token` 和 `current_user`，阅读进度可与服务器同步。
- **核心交互（点击翻译）**：
  - 拆词：`frontend/js/utils.js` 的 `parseContent` 把 h1~h6/p/td 文本拆分成 `.word-container > .word`，为点击译词提供 DOM 结构。
  - 事件：`frontend/js/main.js` 在 `contentDiv` 上监听点击：
    - 单击 `.word`：插入/移除 `.translation`，显示当前词典静态释义并保存进度。
    - 双击 `.translation`：调用 `callDeepSeekAPI` 进行 AI 翻译，更新译文并标记 `ai-enhanced`。
    - 三击 `.translation`：调用 AI 术语解释弹窗。
  - 样式：`frontend/css/styles.css` 定义 `.word`、`.translation`、`translation-pos-*`，支持翻译显示上/左/右三种位置。默认 `.word-container` 为 `inline-flex` 纵向堆叠（翻译在上、单词在下），翻译占位撑开行高，避免与上一行重叠。

## 请求 Codex 时的提示
1. **先看文档**：`readme.md` 和 `DATABASE_SETUP.md` 记录运行步骤、数据库准备及常见问题。
2. **保持结构**：新增 API 请按 Flask Blueprint 分类；前端 JS 模块化在 `frontend/js` 下，复用 `api.js` 封装的请求。
3. **AI 相关修改**：记得同时更新 `utils.js`（调用层）和 `main.js` 中的交互逻辑，确保 DeepSeek Key 校验友好。
4. **数据库变更**：若调整模型，别忘了更新 `seed.py` 与任何依赖字段的前端代码（例如图书馆/目录渲染）。
5. **安全约束**：保持 JWT 校验与 `CORS` 设置（仅允许 8080 来源），管理员路由必须继续使用 `admin_required`。

> 未来如果需要进一步说明，只需扩展本文件即可让 AI 快速理解项目目标与约束。
