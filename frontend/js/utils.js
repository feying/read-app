// --- 移除了 'let deepSeekApiKey = null;' ---

// DeepSeek API 调用函数
// --- 修改点：添加了 deepSeekApiKey__ 作为参数 ---
async function callDeepSeekAPI(prompt, deepSeekApiKey) { 
    if (!deepSeekApiKey) {
        // 这个 alert 现在可以正常工作了
        alert('请在用户中心设置您的 DeepSeek API Key。');
        return "错误：未设置 API Key。";
    }
    const proxyUrl = 'https://corsproxy.io/?';
// ... existing code ...
    }
}

// 解析打印页面范围
function parsePageRange(rangeStr, maxPage) {
// ... existing code ...
    return Array.from(pages).sort((a, b) => a - b);
}

// 解析内容并添加单词容器
function parseContent(targetDiv, contentHtml, isForPrint = false, pageWordCounterOffset = 0, currentBookId = 'default') {
// ... existing code ...
    return wordCounter;
}

export { callDeepSeekAPI, parsePageRange, parseContent };