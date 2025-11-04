// 工具函数
let deepSeekApiKey = null;

// DeepSeek API 调用函数
async function callDeepSeekAPI(prompt) {
    if (!deepSeekApiKey) {
        alert('请在用户中心设置您的 DeepSeek API Key。');
        return "错误：未设置 API Key。";
    }
    const proxyUrl = 'https://corsproxy.io/?';
    const targetUrl = 'https://api.deepseek.com/chat/completions';
    const apiUrl = proxyUrl + targetUrl;
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${deepSeekApiKey}` },
            body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "user", content: prompt }], stream: false })
        });
        if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
        const result = await response.json();
        return result.choices?.[0]?.message?.content.trim() || "无效的API响应。";
    } catch (error) {
        console.error('调用 DeepSeek API 失败:', error);
        return "抱歉，无法获取 AI 的回复。";
    }
}

// 解析打印页面范围
function parsePageRange(rangeStr, maxPage) {
    const pages = new Set();
    if (!rangeStr.trim()) {
        for (let i = 0; i < maxPage; i++) pages.add(i);
        return Array.from(pages);
    }

    const parts = rangeStr.split(',');
    for (const part of parts) {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(num => parseInt(num.trim()));
            if (!isNaN(start) && !isNaN(end) && start <= end && start > 0 && end <= maxPage) {
                for (let i = start; i <= end; i++) pages.add(i - 1);
            } else return null;
        } else {
            const pageNum = parseInt(part.trim());
            if (!isNaN(pageNum) && pageNum > 0 && pageNum <= maxPage) {
                pages.add(pageNum - 1);
            } else return null;
        }
    }
    if (pages.size === 0) return null;
    return Array.from(pages).sort((a, b) => a - b);
}

// 解析内容并添加单词容器
function parseContent(targetDiv, contentHtml, isForPrint = false, pageWordCounterOffset = 0, currentBookId = 'default') {
    targetDiv.innerHTML = contentHtml;
    let wordCounter = pageWordCounterOffset;

    const textBlocks = targetDiv.querySelectorAll('h3, h4, h5, h6, p, td');
    textBlocks.forEach(block => {
        if (block.tagName === 'P' && !isForPrint) {
            const container = document.createElement('div');
            container.className = 'summarize-btn-container';
            const button = document.createElement('button');
            button.className = 'summarize-btn';
            button.textContent = '✨ 总结本段';
            container.appendChild(button);
            block.insertAdjacentElement('afterend', container);
        }

        const nodes = Array.from(block.childNodes);
        block.innerHTML = '';
        nodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                const wordsAndSeparators = text.split(/([,.\s\n]+)/);
                wordsAndSeparators.forEach(item => {
                    if (item.trim() !== '') {
                        const wordContainer = document.createElement('div');
                        wordContainer.className = 'word-container';
                        const wordSpan = document.createElement('span');
                        wordSpan.className = 'word';
                        wordSpan.textContent = item;
                        wordSpan.dataset.wordId = `${currentBookId}-${wordCounter++}`;
                        wordContainer.appendChild(wordSpan);
                        block.appendChild(wordContainer);
                    } else {
                        block.appendChild(document.createTextNode(item));
                    }
                });
            } else {
                block.appendChild(node.cloneNode(true));
            }
        });
    });
    return wordCounter;
}

export { callDeepSeekAPI, parsePageRange, parseContent };
