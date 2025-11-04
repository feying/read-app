# **交互式 AI 阅读器 (DeepSeek 版)**

本项目是一个功能丰富的纯前端交互式阅读应用。它允许用户阅读内置的英文书籍，通过点击单词获取翻译，并利用 AI (DeepSeek) 进行上下文翻译、深度解析和段落总结。应用支持多书籍、多词典管理，并能保存用户的阅读进度。

## **核心功能**

* **交互式翻译**:  
  * **单击 (Single-click)**: 显示/隐藏来自本地静态词典的翻译。如果本地词典未收录，则显示“未找到”。  
  * **双击 (Double-click)**: 触发 **AI 优化翻译**。应用会结合上下文，调用 DeepSeek API 获取更精准的翻译，并以紫色文本显示。  
  * **三击 (Triple-click)**: 触发 **AI 深度解析**。弹出一个窗口，显示 AI 对该词汇（结合上下文）的详细解释。  
* **AI 段落总结**:  
  * 在设置 API Key 后，每个段落末尾会显示“✨ 总结本段”按钮。  
  * 点击后，AI 会对该段落进行总结，并在弹窗中显示。  
* **书库系统 (📚)**:  
  * 支持加载多本书籍。  
  * 支持加载多个独立的静态词典库。  
  * 用户可以在书库中为每本书**自由选择**要加载的词典（例如用专业词典读小说）。  
* **阅读进度管理**:  
  * **自动保存进度**: 用户的所有翻译操作（显示、隐藏、AI优化）都会被**自动保存**到本地。  
  * **自动加载进度**: 翻页或重新打开书籍时，所有已翻译的单词会**自动恢复**显示。  
  * **一键清除**: 用户可以在设置中“清除本书翻译”，重置当前书籍的阅读进度。  
* **分页与打印** (📄 / **🖨️)**:  
  * **分页加载**: 长篇文章被分割为多个页面，按需加载，极大地提升了应用的性能和加载速度。  
  * **自定义打印**:  
    * 点击打印按钮后，允许用户输入页码范围（如 1-3, 5）。  
    * 应用会精确提取指定页面，并**完整重现**所有已保存的翻译，实现“所见即所得”的打印输出。  
* **用户与设置 (👤)**:  
  * **模拟用户会话**: (为未来后端迁移预留) 目前使用一个本地模拟账户 (test@example.com)。  
  * **API Key 管理**: 用户可以在设置中安全地保存或移除自己的 DeepSeek API Key。Key 存储在 localStorage 中，可持久使用。  
  * **退出登录**: 一键清除包括 API Key 和所有阅读进度在内的本地数据。

## **技术特点与实现**

本项目为纯前端应用，不依赖任何后端服务（API 代理除外），核心逻辑均通过 JavaScript (ES Module) 实现。

* **技术栈**:  
  * **HTML/CSS/JavaScript**: 应用基础。  
  * **Tailwind CSS**: 用于快速构建现代化、响应式的 UI 界面。  
  * **ES Module**: 采用现代 JavaScript 模块化开发。  
* **数据存储 (LocalStorage)**:  
  * deepseek\_api\_key: 保存用户的 API Key。  
  * lastReadBookId: 记住用户最后阅读的书籍 ID。  
  * selected\_dictionary\_for\_\[bookId\]: 记住用户为每本书选择的词典 ID。  
  * lastReadPage\_\[bookId\]: 记住用户在每本书上最后阅读的页码。  
  * reading\_progress\_\[user\]\_\[bookId\]: 核心数据，以 JSON 格式存储用户在特定书籍中的所有翻译进度，key 为单词的唯一ID (data-word-id)。  
* **核心逻辑: parseContent 函数**:  
  * 这是实现交互的核心。该函数在加载页面时运行，它会：  
  1. 遍历页面内容中的所有文本节点。  
  2. 将文本拆分为单词和分隔符（如空格、标点）。  
  3. 将每个单词包裹在一个 \<div class="word-container"\> 和 \<span class="word"\> 中。  
  4. 为每个 \<span class="word"\> 分配一个在全书中唯一的 data-word-id（例如 api521-123），这是保存和恢复进度的关键。  
* **性能优化 (分页)**:  
  * 书籍内容 libraryData\[bookId\].content 是一个**字符串数组**，数组的每个成员就是一页的 HTML 内容。  
  * loadPage(pageNumber) 函数只在需要时才调用 parseContent 来解析和渲染当前页，避免了一次性渲染整本巨著导致的性能崩溃。

## **外部接口 (API)**

* **DeepSeek API**:  
  * **功能**: AI 翻译、AI 解析、AI 总结。  
  * **Endpoint**: https://api.deepseek.com/chat/completions  
  * **CORS 代理**: 由于浏览器安全策略，所有 API 请求都通过 https://corsproxy.io/? 进行代理转发。  
  * **调用函数**: callDeepSeekAPI(prompt) 是项目中统一的 API 调用入口，它会自动附加 localStorage 中的 API Key。

## **未来开发与后端迁移指南**

本项目的数据结构（libraryData, dictionaries）已经为迁移到数据库做好了准备。

* **如何添加新书**:  
  1. 在 libraryData 对象中添加一个新的 key (例如 myNewBook)。  
  2. 提供 title, description, defaultDictionaryId。  
  3. 将书籍的 HTML 内容按逻辑分页，粘贴到 content: \[ "页面1的HTML", "页面2的HTML", ... \] 数组中。  
* **如何添加新词典**:  
  1. 在 dictionaries 对象中添加一个新的 key (例如 myNewDict)。  
  2. 提供 name (用于下拉菜单显示) 和 data: { ... } (词典的键值对)。  
  3. （可选）在 libraryData 中将某本书的 defaultDictionaryId 指向它。  
* **后端迁移 (例如使用 Flask \+ MySQL)**:  
  * **用户认证**:  
    * 替换 mockUserEmail 变量。在应用启动时调用您的 /api/user/status 接口获取当前登录用户的信息。  
    * 替换“用户中心” (👤) 弹窗中的逻辑，使其调用您后端的 /api/login, /api/register 和 /api/logout 接口。  
  * **数据获取**:  
    * **书库与词典**: 替换本地的 libraryData 和 dictionaries 对象。在应用启动时，通过 fetch 从后端的 /api/books 和 /api/dictionaries 接口获取数据。  
  * **数据存储**:  
    * **API Key**: 替换 saveKeyBtn 的逻辑，将 localStorage.setItem 改为 fetch('/api/user/save\_key', ...) 来保存到用户数据库。  
    * **阅读进度**:  
      * 替换 saveProgress() 函数中的 localStorage.setItem。  
      * 改为 fetch('/api/progress/save', ...)，将**当前页**有变动的进度数据（wordId, translationText, isEnhanced）发送到后端，在数据库中进行 INSERT ... ON DUPLICATE KEY UPDATE 操作。  
      * 替换 loadProgress() 函数中的 localStorage.getItem。在 loadPage() 时，调用 /api/progress/get?bookId=... 一次性获取该书的所有进度