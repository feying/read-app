// --- 导入所有模块 ---
import { dictionaries } from './dictionary.js';
import { libraryData } from './library.js';
import { callDeepSeekAPI, parsePageRange, parseContent } from './utils.js';
import { 
    registerUser, 
    loginUser, 
    updateUserApiKey, 
    updateReadingProgress, 
    getReadingProgress 
} from './api.js';

// --- 全局状态 ---
let deepSeekApiKey = null;
let currentBookId = null;
let activeDictionary = {};
let currentPage = 0;
let currentUser = null;

// --- DOM 元素引用 ---
let contentDiv, userBtn, userModal, closeModalBtn, libraryBtn, libraryModal, closeLibraryModalBtn, libraryList;
let apiKeyInput, saveKeyBtn, saveStatusEl, logoutBtn, paginationControls, printBtn, printModal;
let closePrintModalBtn, confirmPrintBtn, clearProgressBtn, aiModal, closeAiModalBtn, aiModalTitle;
let aiModalLoader, aiResponseEl;
let loginModal, closeLoginModalBtn, loginForm, loginEmail, loginPassword, loginError;
let registerModal, closeRegisterModalBtn, registerForm, registerEmail, registerPassword, confirmPassword, registerError;
let showRegisterBtn, showLoginBtn;

// --- 进度管理 ---
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

// --- 页面和书库逻辑 ---

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
        wordCounterOffset = parseContent(tempDiv, book.content[i], true, wordCounterOffset, currentBookId);
    }

    parseContent(contentDiv, book.content[currentPage], false, wordCounterOffset, currentBookId);
    updateSummarizeButtonsVisibility();
    loadProgress();
    renderPaginationControls();
}

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

// --- UI 辅助函数 ---

function updateSummarizeButtonsVisibility() {
    const summarizeContainers = document.querySelectorAll('.summarize-btn-container');
    summarizeContainers.forEach(c => c.style.display = deepSeekApiKey ? 'block' : 'none');
}

function showAiModal() { 
    aiModal.classList.remove('hidden'); 
    aiResponseEl.textContent = ''; 
    aiModalLoader.style.display = 'flex'; 
}

// --- 事件监听设置 ---

function setupEventListeners() {
    // 模态框按钮
    [userBtn, libraryBtn, printBtn].forEach(btn => btn.addEventListener('click', () => {
        const modalId = btn.id.replace('-btn', '-modal');
        const modal = document.getElementById(modalId);
        if (modalId === 'user-modal' && !currentUser) {
            loginModal.classList.remove('hidden');
        } else if (modal) {
            modal.classList.remove('hidden');
        }
    }));

    // 关闭按钮
    [closeModalBtn, closeLibraryModalBtn, closePrintModalBtn, closeLoginModalBtn, closeRegisterModalBtn, closeAiModalBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                btn.closest('.fixed').classList.add('hidden');
            });
        }
    });

    // 模态框外部点击关闭
    [userModal, libraryModal, printModal, loginModal, registerModal, aiModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', e => {
                if(e.target === modal) modal.classList.add('hidden');
            });
        }
    });

    // API Key 保存
    saveKeyBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            localStorage.setItem('deepseek_api_key', apiKey);
            deepSeekApiKey = apiKey;
            saveStatusEl.textContent = 'Key 已本地保存!';
            if (currentUser) {
                const result = await updateUserApiKey(currentUser.id, apiKey);
                saveStatusEl.textContent = result.success ? 'Key 已同步到云端!' : 'Key 同步失败。';
            }
        } else {
            localStorage.removeItem('deepseek_api_key');
            deepSeekApiKey = null;
            saveStatusEl.textContent = 'Key 已移除。';
        }
        updateSummarizeButtonsVisibility();
        setTimeout(() => saveStatusEl.textContent = '', 2000);
    });

    // 退出登录
    logoutBtn.addEventListener('click', () => {
        currentUser = null;
        localStorage.clear();
        document.getElementById('user-email-display').textContent = "未登录";
        userModal.classList.add('hidden');
        saveStatusEl.textContent = '已退出登录，页面将刷新。';
        setTimeout(() => window.location.reload(), 1500);
    });

    // 清除进度
    clearProgressBtn.addEventListener('click', () => {
        if (!currentBookId) return;
        const visibleTranslations = document.querySelectorAll('#content .translation');
        visibleTranslations.forEach(el => el.remove());
        localStorage.removeItem(getProgressKey());
        if(currentUser) {
            updateReadingProgress(currentUser.id, currentBookId, currentPage, "{}");
        }
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
                pageOffset = parseContent(tempDiv, book.content[i], true, pageOffset, currentBookId);
            }

            parseContent(printPageDiv, book.content[pageNumber], true, pageOffset, currentBookId);
            
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

    // 登录/注册模态框切换
    showRegisterBtn.addEventListener('click', () => {
        loginModal.classList.add('hidden');
        registerModal.classList.remove('hidden');
    });

    showLoginBtn.addEventListener('click', () => {
        registerModal.classList.add('hidden');
        loginModal.classList.remove('hidden');
    });

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
            
            // 检查用户的 API Key
            if (currentUser.api_key) {
                localStorage.setItem('deepseek_api_key', currentUser.api_key);
                deepSeekApiKey = currentUser.api_key;
                apiKeyInput.value = currentUser.api_key;
                updateSummarizeButtonsVisibility();
            }
            
            setTimeout(() => saveStatusEl.textContent = '', 2000);
            
            // 登录后加载用户的阅读进度
            if (currentBookId) {
                loadPage(currentPage); // 重新加载当前页面以应用服务器进度
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
            // 注册成功后自动登录
            const loginResult = await loginUser(email, password);
            if (loginResult.success) {
                currentUser = loginResult.data.user;
                document.getElementById('user-email-display').textContent = currentUser.email;
                registerModal.classList.add('hidden');
                saveStatusEl.textContent = '注册并登录成功！';
                setTimeout(() => saveStatusEl.textContent = '', 2000);
            }
        } else {
            registerError.textContent = result.data.error || '注册失败';
        }
    });

    // --- 内容交互事件 ---
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

            if (event.detail === 2) { // 双击
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
            } else if (event.detail === 3) { // 三击
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

// --- 应用初始化 ---
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

    // 登录/注册相关元素
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

    // 初始化用户信息
    document.getElementById('user-email-display').textContent = "未登录";
    const savedApiKey = localStorage.getItem('deepseek_api_key');
    if (savedApiKey) {
        deepSeekApiKey = savedApiKey;
        apiKeyInput.value = savedApiKey;
    }
    
    populateLibraryModal();
    setupEventListeners();

    // 加载最后一本书
    const lastReadBookId = localStorage.getItem('lastReadBookId') || Object.keys(libraryData)[0];
    const lastUsedDictId = localStorage.getItem(`selected_dictionary_for_${lastReadBookId}`) || libraryData[lastReadBookId].defaultDictionaryId;
    loadBook(lastReadBookId, lastUsedDictId);
}

// --- 启动应用 ---
document.addEventListener('DOMContentLoaded', initialize);