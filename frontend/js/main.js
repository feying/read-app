// 词典数据
const dictionaries = {
    'api521_dict': { 
        name: 'API 521 专业词典', 
        data: { 
            "api": "美国石油学会", "standard": "标准", "relieving": "泄压", "rates": "速率", 
            "conditions": "工况", "failure": "故障", "reflux": "回流", "cooling": "冷却", 
            "reactors": "反应器", "agitation": "搅拌", "stream": "流", "vapor": "蒸气", 
            "generation": "产生", "runaway": "失控", "reaction": "反应", "exchangers": "交换器", 
            "pressure": "压力", "operating": "操作", "estimation": "估算", "outlet": "出口", 
            "loads": "负荷", "manual": "手动的", "operated": "操作的", "closure": "关闭", 
            "overpressure": "超压", "condensation": "冷凝", "process": "工艺", "vessels": "容器", 
            "condenser": "冷凝器", "flooding": "液泛", "coolant": "冷却剂", "piping": "管道", 
            "surroundings": "环境" 
        }
    },
    'sherlock_dict': { 
        name: '福尔摩斯词典', 
        data: { 
            'sherlock': '夏洛克', 'holmes': '福尔摩斯', 'watson': '华生', 'client': '客户', 
            'case': '案件', 'extraordinary': '非凡的', 'league': '联盟', 'red-headed': '红发的', 
            'gentleman': '绅士', 'pawnbroker': '当铺老板', 'advertisement': '广告', 
            'vacancy': '职位空缺', 'salary': '薪水', 'duties': '职责', 'peculiar': '古怪的', 
            'friend': '朋友', 'conversation': '交谈', 'stout': '肥胖的', 'florid-faced': '脸色通红的', 
            'elderly': '年长的', 'fiery': '火红的', 'hair': '头发', 'apology': '道歉', 
            'intrusion': '闯入', 'withdraw': '退出', 'abruptly': '突然地', 'cordially': '亲切地', 
            'engaged': '忙碌的', 'partner': '伙伴', 'helper': '助手', 'successful': '成功的', 
            'utmost': '极大的', 'greeting': '问候', 'questioning': '疑问的', 'glance': '一瞥', 
            'fat-encircled': '被脂肪包围的', 'settee': '长椅', 'relapsing': '回到', 
            'armchair': '扶手椅', 'fingertips': '指尖', 'custom': '习惯', 'judicial': '判断的', 
            'moods': '情绪' 
        }
    }
};

// 书库数据
const libraryData = {
    'api521': {
        title: 'API Standard 521',
        description: '美国石油学会关于泄压和减压系统的标准。',
        defaultDictionaryId: 'api521_dict',
        content: [
            `<h3>API STANDARD 521</h3><h4>Table 1 - Guidance for Required Relieving Rates Under Selected Conditions (continued)</h4><table><thead><tr><th>Condition</th><th>Section</th><th>Vapor-relief / Liquid-relief Guidance</th></tr></thead><tbody><tr><td rowspan="5">Power failure (steam, electric, or other)</td><td rowspan="5">4.4.15</td><td>Study the installation to determine the effect of power failure; size the relief valve for the worst condition that can occur.</td></tr><tr><td><b>a) Fractionators</b><br>Loss of all pumps, with the result that reflux and cooling water would fail.</td></tr><tr><td><b>b) Reactors</b><br>Consider failure of agitation or stirring, quench or retarding stream; size the valves for vapor generation from a runaway reaction.</td></tr><tr><td><b>c) Air-cooled heat exchangers</b><br>Fan failure; size valves for the difference between normal and emergency duty.</td></tr><tr><td><b>d) Surge vessels</b><br>Maximum liquid inlet rate.</td></tr><tr><td>Maintenance</td><td>4.4.16</td><td>Consideration can be given to the reduction of the relief rate as the result of the relieving pressure being above operating pressure.</td></tr></tbody></table>`,
            `<h4>4.4.2.4 Relieving Rate Estimation for a Closed Outlet</h4><p>For determining relief loads, it may be assumed that manual or remotely operated valves that are normally open and functioning at the time of inadvertent closure or failure and that are not affected by the primary cause of failure remain in operation at their normal operating positions. A check of possible common mode failures that can affect multiple valves simultaneously (e.g. control systems, electrical equipment, etc.) should be made to assure that the valves are independent and would not be affected by the primary failure.</p><p>The quantity of material to be relieved should be determined at conditions that correspond to relieving conditions instead of at normal operating conditions. The required relieving rate is often reduced appreciably when this difference in conditions is considered. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered  The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate. The effect of frictional pressure drop in the connecting line between the source of overpressure and the system being protected should also be considered in determining the required relieving rate.in determining the required relieving rate.</p>`,
        ]
    },
    'sherlock': {
        title: '福尔摩斯探案集：红发会',
        description: '柯南·道尔的经典侦探小说。',
        defaultDictionaryId: 'sherlock_dict',
        content: [
            `<h3>The Red-Headed League</h3><p>I had called upon my friend, Mr. Sherlock Holmes, one day in the autumn of last year and found him in deep conversation with a very stout, florid-faced, elderly gentleman with fiery red hair. With an apology for my intrusion, I was about to withdraw when Holmes pulled me abruptly into the room and closed the door behind me.</p><p>"You could not possibly have come at a better time, my dear Watson," he said cordially.</p><p>"I was afraid that you were engaged."</p><p>"So I am. Very much so."</p>`,
            `<p>"Then I can wait in the next room."</p><p>"Not at all. This gentleman, Mr. Wilson, has been my partner and helper in many of my most successful cases, and I have no doubt that he will be of the utmost use to me in yours also."</p><p>The stout gentleman half rose from his chair and gave a bob of greeting, with a quick little questioning glance from his small fat-encircled eyes. "Try the settee," said Holmes, relapsing into his armchair and putting his fingertips together, as was his custom when in judicial moods.</p>`
        ]
    }
};

// --- Global State ---
let deepSeekApiKey = null;
let currentBookId = null;
let activeDictionary = {};
let currentPage = 0;
let currentUser = null;
const API_BASE_URL = 'http://127.0.0.1:5000/api';

// DOM 元素引用
let contentDiv, userBtn, userModal, closeModalBtn, libraryBtn, libraryModal, closeLibraryModalBtn, libraryList;
let apiKeyInput, saveKeyBtn, saveStatusEl, logoutBtn, paginationControls, printBtn, printModal;
let closePrintModalBtn, confirmPrintBtn, clearProgressBtn, aiModal, closeAiModalBtn, aiModalTitle;
let aiModalLoader, aiResponseEl;

// 登录/注册相关元素
let loginModal, closeLoginModalBtn, loginForm, loginEmail, loginPassword, loginError;
let registerModal, closeRegisterModalBtn, registerForm, registerEmail, registerPassword, confirmPassword, registerError;
let showRegisterBtn, showLoginBtn;

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
function parseContent(targetDiv, contentHtml, isForPrint = false, pageWordCounterOffset = 0) {
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

// 用户认证函数
async function registerUser(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        console.error('注册失败:', error);
        return { success: false, data: { error: '网络错误，请检查后端服务器是否运行' } };
    }
}

async function loginUser(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        console.error('登录失败:', error);
        return { success: false, data: { error: '网络错误，请检查后端服务器是否运行' } };
    }
}

async function updateUserApiKey(userId, apiKey) {
    try {
        const response = await fetch(`${API_BASE_URL}/user/api_key`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, api_key: apiKey })
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        console.error('更新API密钥失败:', error);
        return { success: false, data: { error: '网络错误' } };
    }
}

async function updateReadingProgress(userId, bookId, currentPage, readingProgress) {
    try {
        const response = await fetch(`${API_BASE_URL}/user/progress`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                user_id: userId, 
                book_id: bookId, 
                current_page: currentPage,
                reading_progress: readingProgress 
            })
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        console.error('更新阅读进度失败:', error);
        return { success: false, data: { error: '网络错误' } };
    }
}

async function getReadingProgress(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/user/progress/${userId}`);
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        console.error('获取阅读进度失败:', error);
        return { success: false, data: { error: '网络错误' } };
    }
}

// 进度管理函数
function getProgressKey() { 
    return currentUser ? 
        `reading_progress_${currentUser.email}_${currentBookId}` : 
        `reading_progress_anonymous_${currentBookId}`;
}

function saveProgress() {
    if (!currentBookId) return;
    let fullProgress = JSON.parse(localStorage.getItem(getProgressKey()) || '{}');
    
    const wordsOnPage = document.querySelectorAll('.word-container .word');
    wordsOnPage.forEach(wordEl => {
        const wordId = wordEl.dataset.wordId;
        const translationEl = wordEl.parentElement.querySelector('.translation');

        if (translationEl) {
            fullProgress[wordId] = {
                translationText: translationEl.textContent,
                isEnhanced: translationEl.classList.contains('ai-enhanced'),
            };
        } else {
            delete fullProgress[wordId];
        }
    });
    
    localStorage.setItem(getProgressKey(), JSON.stringify(fullProgress));
    
    // 如果用户已登录，同步到服务器
    if (currentUser && currentBookId) {
        updateReadingProgress(
            currentUser.id, 
            currentBookId, 
            currentPage, 
            JSON.stringify(fullProgress)
        );
    }
}

function loadProgress() {
    if (!currentBookId) return;
    
    // 如果用户已登录，尝试从服务器加载进度
    if (currentUser) {
        getReadingProgress(currentUser.id).then(result => {
            if (result.success && result.data.current_book_id === currentBookId) {
                // 使用服务器进度
                const serverProgress = JSON.parse(result.data.reading_progress || '{}');
                applyProgress(serverProgress);
                return;
            }
            // 如果服务器没有进度，使用本地进度
            const savedProgress = JSON.parse(localStorage.getItem(getProgressKey()) || '{}');
            applyProgress(savedProgress);
        });
    } else {
        // 匿名用户使用本地进度
        const savedProgress = JSON.parse(localStorage.getItem(getProgressKey()) || '{}');
        applyProgress(savedProgress);
    }
}

function applyProgress(progressData) {
    const wordsOnPage = document.querySelectorAll('.word');
    wordsOnPage.forEach(wordEl => {
        const progressItem = progressData[wordEl.dataset.wordId];
        if (progressItem) {
            const wordContainer = wordEl.parentElement;
            if (!wordContainer.querySelector('.translation')) {
                const translationSpan = document.createElement('span');
                translationSpan.className = 'translation';
                translationSpan.textContent = progressItem.translationText;
                if (progressItem.isEnhanced) translationSpan.classList.add('ai-enhanced');
                wordContainer.prepend(translationSpan);
            }
        }
    });
}

// 分页控制
function renderPaginationControls() {
    paginationControls.innerHTML = '';
    const book = libraryData[currentBookId];
    if (!book || book.content.length <= 1) return;

    const prevButton = document.createElement('button');
    prevButton.textContent = '上一页';
    prevButton.className = 'px-4 py-2 text-sm bg-white border rounded-md shadow-sm disabled:opacity-50';
    prevButton.disabled = currentPage === 0;
    prevButton.addEventListener('click', () => loadPage(currentPage - 1));

    const pageIndicator = document.createElement('span');
    pageIndicator.textContent = `第 ${currentPage + 1} / ${book.content.length} 页`;
    pageIndicator.className = 'text-sm text-gray-600';

    const nextButton = document.createElement('button');
    nextButton.textContent = '下一页';
    nextButton.className = 'px-4 py-2 text-sm bg-white border rounded-md shadow-sm disabled:opacity-50';
    nextButton.disabled = currentPage >= book.content.length - 1;
    nextButton.addEventListener('click', () => loadPage(currentPage + 1));
    
    paginationControls.append(prevButton, pageIndicator, nextButton);
}

function loadPage(pageNumber) {
    const book = libraryData[currentBookId];
    if (pageNumber < 0 || pageNumber >= book.content.length) return;
    
    currentPage = pageNumber;
    localStorage.setItem(`lastReadPage_${currentBookId}`, currentPage);
    
    let wordCounterOffset = 0;
    for(let i=0; i < pageNumber; i++) {
        const tempDiv = document.createElement('div');
        wordCounterOffset = parseContent(tempDiv, book.content[i], true, wordCounterOffset);
    }

    parseContent(contentDiv, book.content[currentPage], false, wordCounterOffset);
    updateSummarizeButtonsVisibility();
    loadProgress();
    renderPaginationControls();
}

// 书库管理
function populateLibraryModal() {
    libraryList.innerHTML = '';
    for (const bookId in libraryData) {
        const book = libraryData[bookId];
        const itemContainer = document.createElement('div');
        itemContainer.className = 'p-4 border rounded-md flex justify-between items-center';
        const bookInfo = document.createElement('div');
        bookInfo.innerHTML = `<h4 class="font-bold">${book.title}</h4><p class="text-sm text-gray-600">${book.description}</p>`;
        const controls = document.createElement('div');
        controls.className = 'flex items-center space-x-2';
        const dictSelect = document.createElement('select');
        dictSelect.className = 'border border-gray-300 rounded-md px-2 py-1 text-xs';
        dictSelect.id = `dict-select-${bookId}`;
        for (const dictId in dictionaries) {
            const option = document.createElement('option');
            option.value = dictId;
            option.textContent = dictionaries[dictId].name;
            dictSelect.appendChild(option);
        }
        const savedDictId = localStorage.getItem(`selected_dictionary_for_${bookId}`) || book.defaultDictionaryId;
        dictSelect.value = savedDictId;
        const readButton = document.createElement('button');
        readButton.className = 'bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 whitespace-nowrap';
        readButton.textContent = '阅读';
        readButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const selectedDictId = document.getElementById(`dict-select-${bookId}`).value;
            localStorage.setItem(`selected_dictionary_for_${bookId}`, selectedDictId);
            loadBook(bookId, selectedDictId);
        });
        controls.append(dictSelect, readButton);
        itemContainer.append(bookInfo, controls);
        libraryList.appendChild(itemContainer);
    }
}

function loadBook(bookId, dictionaryId) {
    if (!libraryData[bookId] || !dictionaries[dictionaryId]) return;
    
    currentBookId = bookId;
    const book = libraryData[bookId];
    activeDictionary = dictionaries[dictionaryId].data;
    document.title = book.title;

    const lastPage = parseInt(localStorage.getItem(`lastReadPage_${currentBookId}`) || '0');
    loadPage(lastPage);

    localStorage.setItem('lastReadBookId', bookId);
    libraryModal.classList.add('hidden');
    libraryModal.classList.remove('flex');
}

// 总结按钮可见性
function updateSummarizeButtonsVisibility() {
    const summarizeContainers = document.querySelectorAll('.summarize-btn-container');
    summarizeContainers.forEach(c => c.style.display = deepSeekApiKey ? 'block' : 'none');
}

// AI 模态框
function showAiModal() { 
    aiModal.classList.remove('hidden'); 
    aiResponseEl.textContent = ''; 
    aiModalLoader.style.display = 'flex'; 
}

// 事件处理
function setupEventListeners() {
    // 模态框按钮
    [userBtn, libraryBtn, printBtn].forEach(btn => btn.addEventListener('click', () => {
        const modalId = btn.id.replace('-btn', '-modal');
        const modal = document.getElementById(modalId);
        if(modal) modal.classList.remove('hidden');
    }));

    // 关闭按钮
    [closeModalBtn, closeLibraryModalBtn, closePrintModalBtn].forEach(btn => btn.addEventListener('click', () => {
        btn.closest('.fixed').classList.add('hidden');
    }));

    // 模态框外部点击关闭
    [userModal, libraryModal, printModal].forEach(modal => modal.addEventListener('click', e => {
        if(e.target === modal) modal.classList.add('hidden');
    }));

    // API Key 保存
    saveKeyBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            localStorage.setItem('deepseek_api_key', apiKey);
            deepSeekApiKey = apiKey;
            saveStatusEl.textContent = '已保存成功!';
        } else {
            localStorage.removeItem('deepseek_api_key');
            deepSeekApiKey = null;
            saveStatusEl.textContent = 'API Key 已移除。';
        }
        updateSummarizeButtonsVisibility();
        setTimeout(() => saveStatusEl.textContent = '', 2000);
    });

    // 退出登录
    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        saveStatusEl.textContent = '所有数据已清除，页面将刷新。';
        setTimeout(() => window.location.reload(), 1500);
    });

    // 清除进度
    clearProgressBtn.addEventListener('click', () => {
        if (!currentBookId) return;
        const visibleTranslations = document.querySelectorAll('#content .translation');
        visibleTranslations.forEach(el => el.remove());
        localStorage.removeItem(getProgressKey());
        saveStatusEl.textContent = '本书翻译已清除。';
        setTimeout(() => {
            saveStatusEl.textContent = '';
            userModal.classList.add('hidden');
        }, 2000);
    });

    // 打印确认
    confirmPrintBtn.addEventListener('click', () => {
        const printContainer = document.getElementById('print-container');
        printContainer.innerHTML = ''; 
        
        const book = libraryData[currentBookId];
        if (!book) return;

        const rangeStr = document.getElementById('print-range-input').value;
        const pagesToPrint = parsePageRange(rangeStr, book.content.length);
        const printErrorEl = document.getElementById('print-error');

        if (!pagesToPrint) {
            printErrorEl.textContent = '无效的页码格式或范围。';
            setTimeout(() => printErrorEl.textContent = '', 3000);
            return;
        }
        printErrorEl.textContent = '';
        printModal.classList.add('hidden');

        const fullProgress = JSON.parse(localStorage.getItem(getProgressKey()) || '{}');
        let wordCounterForPrint = 0;

        pagesToPrint.forEach((pageNumber, index) => {
            const printPageDiv = document.createElement('div');
            printPageDiv.className = 'page bg-white p-16 text-xs leading-snug';
            if (index < pagesToPrint.length - 1) {
                printPageDiv.style.pageBreakAfter = 'always';
            }
            printPageDiv.style.boxShadow = 'none';

            let pageOffset = 0;
            for(let i=0; i < pageNumber; i++) {
                const tempDiv = document.createElement('div');
                pageOffset = parseContent(tempDiv, book.content[i], true, pageOffset);
            }

            parseContent(printPageDiv, book.content[pageNumber], true, pageOffset);
            
            const wordsInPage = printPageDiv.querySelectorAll('.word');
            wordsInPage.forEach(wordEl => {
                const progressItem = fullProgress[wordEl.dataset.wordId];
                if (progressItem) {
                     const wordContainer = wordEl.parentElement;
                     if (!wordContainer.querySelector('.translation')) {
                         const translationSpan = document.createElement('span');
                         translationSpan.className = 'translation';
                         translationSpan.textContent = progressItem.translationText;
                         if (progressItem.isEnhanced) translationSpan.classList.add('ai-enhanced');
                         wordContainer.prepend(translationSpan);
                     }
                }
            });
            
            printContainer.appendChild(printPageDiv);
        });
        
        window.print();
    });

    // 登录/注册模态框事件处理
    // 获取登录/注册相关元素
    loginModal = document.getElementById('login-modal');
    registerModal = document.getElementById('register-modal');
    closeLoginModalBtn = document.getElementById('close-login-modal-btn');
    closeRegisterModalBtn = document.getElementById('close-register-modal-btn');
    loginForm = document.getElementById('login-form');
    registerForm = document.getElementById('register-form');
    loginEmail = document.getElementById('login-email');
    loginPassword = document.getElementById('login-password');
    loginError = document.getElementById('login-error');
    registerEmail = document.getElementById('register-email');
    registerPassword = document.getElementById('register-password');
    confirmPassword = document.getElementById('confirm-password');
    registerError = document.getElementById('register-error');
    showRegisterBtn = document.getElementById('show-register-btn');
    showLoginBtn = document.getElementById('show-login-btn');

    // 登录/注册模态框切换
    showRegisterBtn.addEventListener('click', () => {
        loginModal.classList.add('hidden');
        registerModal.classList.remove('hidden');
    });

    showLoginBtn.addEventListener('click', () => {
        registerModal.classList.add('hidden');
        loginModal.classList.remove('hidden');
    });

    // 关闭登录/注册模态框
    closeLoginModalBtn.addEventListener('click', () => loginModal.classList.add('hidden'));
    closeRegisterModalBtn.addEventListener('click', () => registerModal.classList.add('hidden'));

    // 模态框外部点击关闭
    loginModal.addEventListener('click', e => e.target === loginModal && loginModal.classList.add('hidden'));
    registerModal.addEventListener('click', e => e.target === registerModal && registerModal.classList.add('hidden'));

    // 登录表单提交
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginEmail.value.trim();
        const password = loginPassword.value;

        if (!email || !password) {
            loginError.textContent = '请输入邮箱和密码';
            return;
        }

        loginError.textContent = '';
        const result = await loginUser(email, password);

        if (result.success) {
            currentUser = result.data.user;
            document.getElementById('user-email-display').textContent = currentUser.email;
            loginModal.classList.add('hidden');
            saveStatusEl.textContent = '登录成功！';
            setTimeout(() => saveStatusEl.textContent = '', 2000);
            
            // 登录后加载用户的阅读进度
            if (currentBookId) {
                loadProgress();
            }
        } else {
            loginError.textContent = result.data.error || '登录失败';
        }
    });

    // 注册表单提交
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = registerEmail.value.trim();
        const password = registerPassword.value;
        const confirm = confirmPassword.value;

        if (!email || !password) {
            registerError.textContent = '请输入邮箱和密码';
            return;
        }

        if (password !== confirm) {
            registerError.textContent = '密码不匹配';
            return;
        }

        if (password.length < 6) {
            registerError.textContent = '密码长度至少6位';
            return;
        }

        registerError.textContent = '';
        const result = await registerUser(email, password);

        if (result.success) {
            currentUser = result.data.user;
            document.getElementById('user-email-display').textContent = currentUser.email;
            registerModal.classList.add('hidden');
            saveStatusEl.textContent = '注册成功！';
            setTimeout(() => saveStatusEl.textContent = '', 2000);
        } else {
            registerError.textContent = result.data.error || '注册失败';
        }
    });

    // 用户按钮点击显示登录模态框
    userBtn.addEventListener('click', () => {
        if (!currentUser) {
            loginModal.classList.remove('hidden');
        } else {
            userModal.classList.remove('hidden');
        }
    });

    // 退出登录功能
    logoutBtn.addEventListener('click', () => {
        currentUser = null;
        localStorage.clear();
        document.getElementById('user-email-display').textContent = "未登录";
        userModal.classList.add('hidden');
        saveStatusEl.textContent = '已退出登录，页面将刷新。';
        setTimeout(() => window.location.reload(), 1500);
    });

    // AI 模态框
    closeAiModalBtn.addEventListener('click', () => aiModal.classList.add('hidden'));
    aiModal.addEventListener('click', e => e.target === aiModal && aiModal.classList.add('hidden'));

    // 内容点击事件
    contentDiv.addEventListener('click', async (event) => {
        const target = event.target;
        if (target.classList.contains('word')) {
            const wordContainer = target.parentElement;
            if (wordContainer.querySelector('.translation')) {
                wordContainer.querySelector('.translation').remove();
            } else {
                const wordText = target.textContent.trim();
                const normalizedWord = wordText.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
                const staticTranslation = activeDictionary[normalizedWord];
                const translationSpan = document.createElement('span');
                translationSpan.className = 'translation';
                translationSpan.textContent = staticTranslation || '未找到';
                wordContainer.prepend(translationSpan);
            }
            saveProgress();
        }
        
        const translationSpan = target.closest('.translation');
        if (translationSpan) {
            if (event.detail > 1) event.preventDefault();
            const wordContainer = translationSpan.parentElement;
            const wordText = wordContainer.querySelector('.word').textContent;
            const context = translationSpan.closest('p, td, h3, h4, h5, h6')?.textContent.trim().replace(/\s+/g, ' ') || '';

            if (event.detail === 2) {
                const originalText = translationSpan.textContent;
                translationSpan.textContent = '...';
                const translationText = await callDeepSeekAPI(`请根据上下文，将单词 "${wordText}" 翻译成最合适的中文。只返回翻译结果。\n\n上下文: "${context}"`);
                if (translationText.includes('错误')) {
                    translationSpan.textContent = originalText;
                } else {
                    translationSpan.textContent = translationText;
                    translationSpan.classList.add('ai-enhanced');
                    saveProgress();
                }
            } else if (event.detail === 3) {
                aiModalTitle.textContent = `✨ AI 深度解析: "${wordText}"`;
                showAiModal();
                const response = await callDeepSeekAPI(`请用中文，在一个段落内，为学生解释技术术语 "${wordText}"。请结合上下文解释：\n\n上下文："${context}"`);
                aiModalLoader.style.display = 'none';
                aiResponseEl.textContent = response;
            }
        }

        if (target.classList.contains('summarize-btn')) {
             const paragraph = target.parentElement.previousElementSibling;
             const paragraphText = paragraph?.textContent.trim().replace(/\s+/g, ' ') || '';
             if (paragraphText) {
                aiModalTitle.textContent = '✨ AI 段落总结';
                showAiModal();
                const response = await callDeepSeekAPI(`请用中文，将以下段落总结为几个关键点：\n\n段落："${paragraphText}"`);
                aiModalLoader.style.display = 'none';
                aiResponseEl.textContent = response;
             }
        }
    });
}

// 初始化
function initialize() {
    // 获取DOM元素引用
    contentDiv = document.getElementById('content');
    userBtn = document.getElementById('user-btn');
    userModal = document.getElementById('user-modal');
    closeModalBtn = document.getElementById('close-user-modal-btn');
    libraryBtn = document.getElementById('library-btn');
    libraryModal = document.getElementById('library-modal');
    closeLibraryModalBtn = document.getElementById('close-library-modal-btn');
    libraryList = document.getElementById('library-list');
    apiKeyInput = document.getElementById('api-key-input');
    saveKeyBtn = document.getElementById('save-key-btn');
    saveStatusEl = document.getElementById('save-status');
    logoutBtn = document.getElementById('logout-btn');
    paginationControls = document.getElementById('pagination-controls');
    printBtn = document.getElementById('print-btn');
    printModal = document.getElementById('print-modal');
    closePrintModalBtn = document.getElementById('close-print-modal-btn');
    confirmPrintBtn = document.getElementById('confirm-print-btn');
    clearProgressBtn = document.getElementById('clear-progress-btn');
    aiModal = document.getElementById('ai-modal');
    closeAiModalBtn = document.getElementById('close-modal-btn');
    aiModalTitle = document.getElementById('modal-title');
    aiModalLoader = document.getElementById('modal-loader');
    aiResponseEl = document.getElementById('ai-response');

    // 初始化用户信息
    document.getElementById('user-email-display').textContent = currentUser ? currentUser.email : "未登录";
    const savedApiKey = localStorage.getItem('deepseek_api_key');
    deepSeekApiKey = savedApiKey || null;
    apiKeyInput.value = savedApiKey || '';
    
    populateLibraryModal();
    setupEventListeners();

    const lastReadBookId = localStorage.getItem('lastReadBookId') || Object.keys(libraryData)[0];
    const lastUsedDictId = localStorage.getItem(`selected_dictionary_for_${lastReadBookId}`) || libraryData[lastReadBookId].defaultDictionaryId;
    loadBook(lastReadBookId, lastUsedDictId);
}

// 当DOM加载完成时初始化
document.addEventListener('DOMContentLoaded', initialize);
