// DeepSeek API 调用函数
// --- 修改点：添加了 deepSeekApiKey 作为参数 ---
async function callDeepSeekAPI(prompt, deepSeekApiKey) {
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
function parseContent(targetDiv, contentHtml, isForPrint = false, pageWordCounterOffset = 0, currentBookId = 'default', pageNumber = 0) {
    targetDiv.innerHTML = contentHtml;
    let wordCounter = pageWordCounterOffset;

    const processNode = (node, parent) => {
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
                    wordSpan.dataset.wordId = `${currentBookId}-p${pageNumber}-${wordCounter++}`;
                    wordContainer.appendChild(wordSpan);
                    parent.appendChild(wordContainer);
                } else if (item !== '') {
                    parent.appendChild(document.createTextNode(item));
                }
            });
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const clone = node.cloneNode(false);
            parent.appendChild(clone);
            Array.from(node.childNodes).forEach(child => processNode(child, clone));
        } else {
            parent.appendChild(node.cloneNode(true));
        }
    };

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
        nodes.forEach(node => processNode(node, block));
    });
    return wordCounter;
}

export { callDeepSeekAPI, parsePageRange, parseContent };
