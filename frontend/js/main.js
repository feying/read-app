// --- \u5bfc\u5165\u6240\u6709\u6a21\u5757 ---
import { callDeepSeekAPI, parsePageRange, parseContent } from './utils.js';
import { 
    registerUser, 
    loginUser, 
    updateUserApiKey, 
    updateReadingProgress, 
    getReadingProgress,
    getLibrary,
    getDictionaries,
    getCurrentUser,
    getBookPages,
    searchBook,
    getBookPageNumbers,
    setAuthToken,
    clearAuthToken,
    updateUsername
} from './api.js';

// --- \u5168\u5c40\u72b6\u6001 ---
// --- 全局状态 ---
let deepSeekApiKey = null;
let currentBookId = null;
let activeDictionary = {};
let currentPage = null; // stores actual page_number from backend
let currentUser = null;
let authToken = null;
let currentBookMeta = null;

let allDictionaries = {};
let allLibraryData = {};
let bookPageCache = {};
let bookPageOrders = {}; // bookId -> sorted array of available page numbers

// --- DOM 元素引用 ---
let contentDiv, userBtn, userModal, closeModalBtn, libraryBtn, libraryModal, closeLibraryModalBtn, libraryList;
let apiKeyInput, saveKeyBtn, saveStatusEl, logoutBtn, paginationControls, printBtn, printModal;
let userUsernameDisplay, userUsernameEditBtn, userUsernameEditContainer, userUsernameInput, userUsernameSaveBtn, userUsernameCancelBtn, userUsernameStatus;
let closePrintModalBtn, confirmPrintBtn, clearProgressBtn, aiModal, closeAiModalBtn, aiModalTitle;
let aiModalLoader, aiResponseEl;
let loginModal, closeLoginModalBtn, loginForm, loginEmail, loginPassword, loginError;
let registerModal, closeRegisterModalBtn, registerForm, registerEmail, registerUsername, registerPassword, confirmPassword, registerError;
let showRegisterBtn, showLoginBtn;
let userEmailDisplay;
let tocBtn, tocModal, closeTocModalBtn, tocList;
let searchBtn, searchModal, closeSearchModalBtn, searchForm, searchInput, searchStatusEl, searchResultsContainer;
let mainContainer; // 新增：主内容容器引用

// --- \u8fdb\u5ea6\u7ba1\u7406 ---
// (\u8fd9\u90e8\u5206\u51fd\u6570 getProgressKey, saveProgress, loadProgress, applyProgress \u4fdd\u6301\u4e0d\u53d8)

function updateUserEmailDisplay() {
    if (!userEmailDisplay) {
        userEmailDisplay = document.getElementById('user-email-display');
    }
    if (userEmailDisplay) {
        const name = currentUser?.user_name || currentUser?.email || 'Not logged in';
        userEmailDisplay.textContent = name;
    }
}

function updateUserProfileView() {
    const name = currentUser?.user_name || currentUser?.email || '-';
    if (userUsernameDisplay) userUsernameDisplay.textContent = name;
    if (userEmailDisplay) userEmailDisplay.textContent = currentUser?.email || '-';
    if (userUsernameInput && currentUser?.user_name) userUsernameInput.value = currentUser.user_name;
    refreshUsernameEditUI();
}

function establishSession(token, user) {
    authToken = token;
    setAuthToken(token);
    currentUser = user;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('current_user', JSON.stringify(user));
    updateUserEmailDisplay();
    updateUserProfileView();
}

function handleUnauthorizedState(message = '登录已过期，请重新登录') {
    authToken = null;
    clearAuthToken();
    currentUser = null;
    currentBookId = null;
    currentPage = null;
    currentBookMeta = null;
    bookPageCache = {};
    bookPageOrders = {};
    localStorage.clear();
    updateUserEmailDisplay();
    updateUserProfileView();
    if (contentDiv) {
        contentDiv.innerHTML = '';
    }
    if (loginError) loginError.textContent = message;
    if (mainContainer) mainContainer.classList.add('hidden');
    [userModal, libraryModal, printModal, aiModal, tocModal, searchModal].forEach(modal => modal && modal.classList.add('hidden'));
    if (searchStatusEl) searchStatusEl.textContent = '';
    if (searchResultsContainer) searchResultsContainer.innerHTML = '';
    if (searchInput) searchInput.value = '';
    if (loginModal) {
        loginModal.classList.remove('hidden');
        loginModal.classList.add('flex');
    }
}

function canEditUsername() {
    if (!currentUser) return false;
    return !currentUser.username_updated_at;
}

function refreshUsernameEditUI() {
    if (!userUsernameEditBtn || !userUsernameEditContainer) return;
    userUsernameEditContainer.classList.add('hidden');
    if (canEditUsername()) {
        userUsernameEditBtn.classList.remove('hidden');
        if (userUsernameStatus) userUsernameStatus.textContent = '';
        if (userUsernameInput && currentUser?.user_name) {
            userUsernameInput.value = currentUser.user_name;
        }
    } else {
        userUsernameEditBtn.classList.add('hidden');
        if (userUsernameStatus) {
            userUsernameStatus.textContent = currentUser ? '用户名已修改，无法再次修改' : '';
        }
    }
}

async function attemptAutoLogin() {
    const storedToken = localStorage.getItem('auth_token');
    if (!storedToken) {
        if (loginModal) {
            loginModal.classList.remove('hidden');
            loginModal.classList.add('flex');
        }
        return;
    }
    const storedUser = localStorage.getItem('current_user');
    authToken = storedToken;
    setAuthToken(storedToken);
    if (storedUser) {
        try {
            currentUser = JSON.parse(storedUser);
        } catch (error) {
            currentUser = null;
        }
    }
    updateUserEmailDisplay();
    updateUserProfileView();
    try {
        const meResult = await getCurrentUser();
        if (meResult.success) {
            establishSession(storedToken, meResult.data.user);
            if (loginModal) {
                loginModal.classList.add('hidden');
                loginModal.classList.remove('flex');
            }
            await loadDataAndShowApp();
        } else if (meResult.unauthorized) {
            handleUnauthorizedState();
        } else {
            authToken = null;
            clearAuthToken();
            localStorage.removeItem('auth_token');
            localStorage.removeItem('current_user');
            if (loginModal) {
                loginModal.classList.remove('hidden');
                loginModal.classList.add('flex');
            }
        }
    } catch (error) {
        console.error('\u81ea\u52a8\u767b\u5f55\u5931\u8d25:', error);
        if (loginModal) {
            loginModal.classList.remove('hidden');
            loginModal.classList.add('flex');
        }
    }
}

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
    
    if (currentUser && currentBookId) {
        updateReadingProgress(
            currentUser.id, 
            currentBookId, 
            currentPage, 
            JSON.stringify(fullProgress)
        ).then(result => {
            if (result.unauthorized) {
                handleUnauthorizedState();
            }
        }).catch(err => console.error('\u540c\u6b65\u8fdb\u5ea6\u5931\u8d25:', err));
    }
}

function loadProgress() {
    if (!currentBookId) return;
    
    if (currentUser) {
        getReadingProgress(currentUser.id).then(result => {
            if (result.unauthorized) {
                handleUnauthorizedState();
                return;
            }
            if (result.success && result.data.current_book_id === currentBookId) {
                const serverProgress = JSON.parse(result.data.reading_progress || '{}');
                applyProgress(serverProgress);
                return;
            }
            const savedProgress = JSON.parse(localStorage.getItem(getProgressKey()) || '{}');
            applyProgress(savedProgress);
        });
    } else {
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

function getCurrentBookMeta() {
    return allLibraryData[currentBookId] || currentBookMeta;
}

async function fetchAndCachePages(bookId, startPage, count = 1) {
    try {
        const response = await getBookPages(bookId, startPage, count);
        if (!bookPageCache[bookId]) {
            bookPageCache[bookId] = {};
        }
        response.pages.forEach(page => {
            bookPageCache[bookId][page.pageNumber] = {
                html: page.htmlContent,
                chapterTitle: page.chapterTitle || null,
            };
        });
    } catch (error) {
        if (error.message === 'UNAUTHORIZED') {
            handleUnauthorizedState();
        } else {
            console.error('加载页失败:', error);
            throw error;
        }
    }
}

async function ensurePageCached(bookId, pageNumber) {
    if (!bookPageCache[bookId] || !bookPageCache[bookId][pageNumber]) {
        await fetchAndCachePages(bookId, pageNumber, 1);
    }
}

function updateTocList() {
    if (!tocList) return;
    const meta = getCurrentBookMeta();
    tocList.innerHTML = '';
    if (!meta || !meta.chapters || meta.chapters.length === 0) {
        tocList.innerHTML = '<p class="text-sm text-gray-500">当前图书暂无目录。</p>';
        return;
    }
    meta.chapters.forEach(chapter => {
        const button = document.createElement('button');
        button.className = 'w-full text-left border border-gray-200 rounded-md p-3 hover:bg-blue-50 transition-colors';
        button.innerHTML = `
            <p class="font-semibold text-gray-800">${chapter.title}</p>
            <p class="text-xs text-gray-500">起始页：第 ${chapter.startPage + 1} 页</p>
        `;
        button.addEventListener('click', () => {
            tocModal.classList.add('hidden');
            loadPage(chapter.startPage);
        });
        tocList.appendChild(button);
    });
}

function renderSearchResults(results = []) {
    if (!searchResultsContainer) return;
    searchResultsContainer.innerHTML = '';
    if (results.length === 0) {
        searchResultsContainer.innerHTML = '<p class="text-sm text-gray-500">未找到匹配内容。</p>';
        return;
    }
    results.forEach(item => {
        const card = document.createElement('div');
        card.className = 'border border-gray-200 rounded-md p-3';
        card.innerHTML = `
            <p class="text-xs text-gray-500 mb-1">第 ${item.pageNumber + 1} 页 · ${item.chapterTitle || '未分类章节'}</p>
            <p class="text-sm text-gray-800 mb-2">${item.snippet || ''}</p>
        `;
        const jumpBtn = document.createElement('button');
        jumpBtn.className = 'text-blue-600 text-sm hover:underline';
        jumpBtn.textContent = '跳转';
        jumpBtn.addEventListener('click', () => {
            searchModal.classList.add('hidden');
            loadPage(item.pageNumber);
        });
        card.appendChild(jumpBtn);
        searchResultsContainer.appendChild(card);
    });
}


// --- 页面和书库逻辑 ---
function getCurrentPageOrder() {
    const order = bookPageOrders[currentBookId] || [];
    return [...order].sort((a, b) => a - b);
}

function renderPaginationControls() {
    paginationControls.innerHTML = '';
    const order = getCurrentPageOrder();
    const totalPages = order.length;
    if (totalPages <= 1 || currentPage === null) return;

    const currentIdx = order.indexOf(currentPage);
    if (currentIdx === -1) return;

    const prevButton = document.createElement('button');
    prevButton.textContent = '上一页';
    prevButton.className = 'px-4 py-2 text-sm bg-white border rounded-md shadow-sm disabled:opacity-50';
    prevButton.disabled = currentIdx === 0;
    prevButton.addEventListener('click', () => {
        if (currentIdx > 0) loadPage(order[currentIdx - 1]);
    });

    const pageIndicator = document.createElement('span');
    pageIndicator.textContent = `第 ${currentIdx + 1} / ${totalPages} 页（页码：${currentPage}）`;
    pageIndicator.className = 'text-sm text-gray-600';

    const nextButton = document.createElement('button');
    nextButton.textContent = '下一页';
    nextButton.className = 'px-4 py-2 text-sm bg-white border rounded-md shadow-sm disabled:opacity-50';
    nextButton.disabled = currentIdx >= totalPages - 1;
    nextButton.addEventListener('click', () => {
        if (currentIdx < totalPages - 1) loadPage(order[currentIdx + 1]);
    });
    
    paginationControls.append(prevButton, pageIndicator, nextButton);
}

async function loadPage(pageNumber) {
    const order = getCurrentPageOrder();
    if (!currentBookId || order.length === 0) return;

    // 如果请求的页码不存在，回退到最接近的页
    if (!order.includes(pageNumber)) {
        const sorted = order;
        const fallback = sorted.find(p => p >= pageNumber) ?? sorted[sorted.length - 1];
        pageNumber = fallback;
    }

    try {
        await ensurePageCached(currentBookId, pageNumber);
    } catch (error) {
        return;
    }
    const cached = bookPageCache[currentBookId] ? bookPageCache[currentBookId][pageNumber] : undefined;
    if (!cached) return;

    currentPage = pageNumber;
    localStorage.setItem(`lastReadPage_${currentBookId}`, currentPage);

    parseContent(contentDiv, cached.html, false, 0, currentBookId, pageNumber);
    updateSummarizeButtonsVisibility();
    loadProgress();
    renderPaginationControls();
}

function populateLibraryModal() {
    libraryList.innerHTML = '';
    const bookIds = Object.keys(allLibraryData);
    if (bookIds.length === 0) {
        libraryList.innerHTML = '<p class="text-sm text-gray-500">暂无可选书籍。</p>';
        return;
    }
    for (const bookId of bookIds) {
        const book = allLibraryData[bookId];
        const totalPages = (book && book.pageCount) || 0;
        const chapterCount = (book && book.chapters ? book.chapters.length : 0);
        const itemContainer = document.createElement('div');
        itemContainer.className = 'p-4 border rounded-md flex justify-between items-start';
        const bookInfo = document.createElement('div');
        bookInfo.innerHTML = `
            <h4 class="font-bold">${book.title}</h4>
            <p class="text-sm text-gray-600 mb-1">${book.description || '暂无简介'}</p>
            <p class="text-xs text-gray-500">${totalPages} 页 · ${chapterCount} 章节</p>
        `;
        const controls = document.createElement('div');
        controls.className = 'flex flex-col items-end space-y-2';
        const dictSelect = document.createElement('select');
        dictSelect.className = 'border border-gray-300 rounded-md px-2 py-1 text-xs';
        dictSelect.id = `dict-select-${bookId}`;
        for (const dictId in allDictionaries) {
            const option = document.createElement('option');
            option.value = dictId;
            option.textContent = allDictionaries[dictId].name;
            dictSelect.appendChild(option);
        }
        const savedDictId = localStorage.getItem(`selected_dictionary_for_${bookId}`) || book.defaultDictionaryId;
        dictSelect.value = savedDictId;
        const readButton = document.createElement('button');
        readButton.className = 'bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 whitespace-nowrap';
        readButton.textContent = '阅读';
        readButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            const selectedDictId = document.getElementById(`dict-select-${bookId}`).value;
            localStorage.setItem(`selected_dictionary_for_${bookId}`, selectedDictId);
            await loadBook(bookId, selectedDictId);
        });
        controls.append(dictSelect, readButton);
        itemContainer.append(bookInfo, controls);
        libraryList.appendChild(itemContainer);
    }
}

async function loadBook(bookId, dictionaryId) {
    if (!allLibraryData[bookId] || !allDictionaries[dictionaryId]) return;

    currentBookId = bookId;
    currentBookMeta = allLibraryData[bookId];
    activeDictionary = allDictionaries[dictionaryId].data;
    document.title = currentBookMeta.title;
    bookPageCache[bookId] = bookPageCache[bookId] || {};
    updateTocList();

    // 获取页码顺序（真实页码）
    if (!bookPageOrders[bookId]) {
        try {
            const pageNumberData = await getBookPageNumbers(bookId);
            const order = Array.isArray(pageNumberData.pageNumbers) ? pageNumberData.pageNumbers : [];
            bookPageOrders[bookId] = order.sort((a, b) => a - b);
        } catch (error) {
            console.error('获取页码列表失败:', error);
            bookPageOrders[bookId] = [];
        }
    }

    const order = getCurrentPageOrder();
    if (order.length === 0) {
        console.warn('当前书籍无可用页面');
        return;
    }

    const lastPageRaw = localStorage.getItem(`lastReadPage_${currentBookId}`);
    const lastPage = lastPageRaw ? parseInt(lastPageRaw, 10) : order[0];
    const pageToLoad = order.includes(lastPage) ? lastPage : order[0];
    await loadPage(pageToLoad);

    localStorage.setItem('lastReadBookId', bookId);
    libraryModal.classList.add('hidden');
    libraryModal.classList.remove('flex');
}

// --- UI 辅助函数 ---
// --- UI \u8f85\u52a9\u51fd\u6570 ---
// (updateSummarizeButtonsVisibility \u548c showAiModal \u4fdd\u6301\u4e0d\u53d8)
function updateSummarizeButtonsVisibility() {
    const summarizeContainers = document.querySelectorAll('.summarize-btn-container');
    summarizeContainers.forEach(c => c.style.display = deepSeekApiKey ? 'block' : 'none');
}

function showAiModal() { 
    aiModal.classList.remove('hidden'); 
    aiResponseEl.textContent = ''; 
    aiModalLoader.style.display = 'flex'; 
}


// --- \u4e8b\u4ef6\u76d1\u542c\u8bbe\u7f6e ---
function setupEventListeners() {
    const modalTriggerButtons = [userBtn, libraryBtn, printBtn];
    modalTriggerButtons.forEach(btn => {
        if (!btn) return;
        btn.addEventListener('click', () => {
            const modalId = btn.id.replace('-btn', '-modal');
            const modal = document.getElementById(modalId);
            if (modalId === 'user-modal' && !currentUser) {
                loginModal.classList.remove('hidden');
                loginModal.classList.add('flex');
            } else if (modal) {
                modal.classList.remove('hidden');
            }
        });
    });

    const modalCloseButtons = [closeModalBtn, closeLibraryModalBtn, closePrintModalBtn, closeAiModalBtn, closeTocModalBtn, closeSearchModalBtn];
    modalCloseButtons.forEach(btn => {
        if (!btn) return;
        btn.addEventListener('click', () => btn.closest('.fixed').classList.add('hidden'));
    });

    [userModal, libraryModal, printModal, aiModal, tocModal, searchModal].forEach(modal => {
        if (!modal) return;
        modal.addEventListener('click', e => {
            if (e.target === modal) modal.classList.add('hidden');
        });
    });

    if (tocBtn) {
        tocBtn.addEventListener('click', () => {
            if (!currentBookId) {
                alert('请先选择一本书籍。');
                return;
            }
            updateTocList();
            tocModal.classList.remove('hidden');
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            if (!currentBookId) {
                alert('请先打开一本书再执行检索。');
                return;
            }
            if (searchInput) searchInput.value = '';
            if (searchStatusEl) searchStatusEl.textContent = '';
            if (searchResultsContainer) searchResultsContainer.innerHTML = '';
            searchModal.classList.remove('hidden');
            setTimeout(() => { if (searchInput) searchInput.focus(); }, 50);
        });
    }

    if (searchForm) {
        searchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentBookId) {
                searchStatusEl.textContent = '请先选择图书';
                return;
            }
            const query = ((searchInput && searchInput.value) || '').trim();
            if (query.length < 2) {
                searchStatusEl.textContent = '关键字至少 2 个字符';
                return;
            }
            searchStatusEl.textContent = '检索中...';
            searchResultsContainer.innerHTML = '';
            try {
                const result = await searchBook(currentBookId, query);
                const list = result.results || [];
                renderSearchResults(list);
                searchStatusEl.textContent = `找到 ${list.length} 条结果`;
            } catch (error) {
                if (error.message === 'UNAUTHORIZED') {
                    handleUnauthorizedState();
                } else {
                    console.error('检索失败:', error);
                    searchStatusEl.textContent = '检索失败，请稍后再试';
                }
            }
        });
    }

    if (userUsernameEditBtn && userUsernameEditContainer) {
        userUsernameEditBtn.addEventListener('click', () => {
            if (!canEditUsername()) {
                if (userUsernameStatus) userUsernameStatus.textContent = '用户名已修改，无法再次修改';
                return;
            }
            userUsernameEditBtn.classList.add('hidden');
            if (userUsernameStatus) userUsernameStatus.textContent = '';
            const fallbackName = currentUser?.user_name || currentUser?.email || '';
            if (userUsernameInput) {
                userUsernameInput.value = fallbackName;
                userUsernameInput.focus();
            }
            userUsernameEditContainer.classList.remove('hidden');
        });
    }

    if (userUsernameCancelBtn) {
        userUsernameCancelBtn.addEventListener('click', () => {
            userUsernameEditContainer.classList.add('hidden');
            if (canEditUsername() && userUsernameEditBtn) {
                userUsernameEditBtn.classList.remove('hidden');
            }
            if (userUsernameStatus) userUsernameStatus.textContent = '';
        });
    }

    if (userUsernameSaveBtn) {
        userUsernameSaveBtn.addEventListener('click', async () => {
            if (!canEditUsername()) {
                if (userUsernameStatus) userUsernameStatus.textContent = '用户名已修改，无法再次修改';
                return;
            }
            const newName = (userUsernameInput?.value || '').trim();
            if (!newName) {
                if (userUsernameStatus) userUsernameStatus.textContent = '请输入用户名';
                return;
            }

            if (userUsernameStatus) userUsernameStatus.textContent = '正在保存...';
            userUsernameSaveBtn.disabled = true;
            if (userUsernameCancelBtn) userUsernameCancelBtn.disabled = true;
            try {
                const result = await updateUsername(newName);
                if (result.unauthorized) {
                    handleUnauthorizedState();
                    return;
                }
                if (result.success) {
                    currentUser = result.data.user;
                    localStorage.setItem('current_user', JSON.stringify(currentUser));
                    updateUserProfileView();
                    userUsernameEditContainer.classList.add('hidden');
                    if (userUsernameEditBtn) userUsernameEditBtn.classList.add('hidden');
                    if (userUsernameStatus) userUsernameStatus.textContent = '用户名已更新，无法再次修改';
                } else {
                    if (userUsernameStatus) userUsernameStatus.textContent = result.data?.error || '更新失败';
                }
            } catch (error) {
                console.error('更新用户名失败:', error);
                if (userUsernameStatus) userUsernameStatus.textContent = '更新失败，请稍后再试';
            } finally {
                userUsernameSaveBtn.disabled = false;
                if (userUsernameCancelBtn) userUsernameCancelBtn.disabled = false;
            }
        });
    }

    saveKeyBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            localStorage.setItem('deepseek_api_key', apiKey);
            deepSeekApiKey = apiKey;
            saveStatusEl.textContent = 'Key 已本地保存!';
            if (currentUser) {
                const result = await updateUserApiKey(currentUser.id, apiKey);
                if (result.unauthorized) {
                    handleUnauthorizedState();
                    return;
                }
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

    logoutBtn.addEventListener('click', () => {
        authToken = null;
        clearAuthToken();
        currentUser = null;
        currentBookId = null;
        currentPage = null;
        currentBookMeta = null;
        bookPageCache = {};
        bookPageOrders = {};
        localStorage.clear();
        if (contentDiv) contentDiv.innerHTML = '';
        saveStatusEl.textContent = '已退出，页面即将刷新';
        setTimeout(() => window.location.reload(), 1200);
    });

    clearProgressBtn.addEventListener('click', () => {
        if (!currentBookId) return;
        const visibleTranslations = document.querySelectorAll('#content .translation');
        visibleTranslations.forEach(el => el.remove());
        localStorage.removeItem(getProgressKey());
        if(currentUser) {
            updateReadingProgress(currentUser.id, currentBookId, currentPage, "{}").then(result => {
                if (result.unauthorized) {
                    handleUnauthorizedState();
                }
            }).catch(err => console.error('清除进度失败:', err));
        }
        saveStatusEl.textContent = '本书翻译已清除。';
        setTimeout(() => {
            saveStatusEl.textContent = '';
            userModal.classList.add('hidden');
        }, 2000);
    });

    confirmPrintBtn.addEventListener('click', async () => {
        const printContainer = document.getElementById('print-container');
        printContainer.innerHTML = '';
        
        const meta = getCurrentBookMeta(); 
        if (!meta) return;

        const rangeStr = document.getElementById('print-range-input').value;
        const pagesToPrint = parsePageRange(rangeStr, meta.pageCount || 0);
        const printErrorEl = document.getElementById('print-error');

        if (!pagesToPrint) {
            printErrorEl.textContent = '无效的页码格式或范围。';
            setTimeout(() => printErrorEl.textContent = '', 3000);
            return;
        }
        printErrorEl.textContent = '';
        printModal.classList.add('hidden');

        const fullProgress = JSON.parse(localStorage.getItem(getProgressKey()) || '{}');

        for (let index = 0; index < pagesToPrint.length; index++) {
            const pageNumber = pagesToPrint[index];
            try {
                await ensurePageCached(currentBookId, pageNumber);
            } catch (error) {
                continue;
            }
            const cached = bookPageCache[currentBookId] ? bookPageCache[currentBookId][pageNumber] : undefined;
            if (!cached) continue;

            const printPageDiv = document.createElement('div');
            printPageDiv.className = 'page bg-white p-16 text-xs leading-snug';
            if (index < pagesToPrint.length - 1) {
                printPageDiv.style.pageBreakAfter = 'always';
            }
            printPageDiv.style.boxShadow = 'none';

            parseContent(printPageDiv, cached.html, true, 0, currentBookId, pageNumber);
            
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
        }
        
        window.print();
    });

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

        loginError.textContent = '正在登录...';
        const result = await loginUser(email, password);

        if (result.success) {
            establishSession(result.data.token, result.data.user);
            if (currentUser.api_key) {
                localStorage.setItem('deepseek_api_key', currentUser.api_key);
                deepSeekApiKey = currentUser.api_key;
                apiKeyInput.value = currentUser.api_key;
            }
            loginError.textContent = '登录成功！正在加载数据...';
            await loadDataAndShowApp();
            loginModal.classList.add('hidden');
        } else if (result.unauthorized) {
            handleUnauthorizedState(result.data.error || '登录失效，请重试');
        } else {
            loginError.textContent = result.data.error || '登录失败';
        }
    });

    // 注册表单提交
    // 注册表单提交
    // 注册表单提交
    // 注册表单提交
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = registerEmail.value.trim();
        const userName = registerUsername.value.trim();
        const password = registerPassword.value;
        const confirm = confirmPassword.value;

        if (!email || !password || !confirm || !userName) {
            registerError.textContent = 'Please fill email, username and password';
            return;
        }
        if (password !== confirm) {
            registerError.textContent = 'Passwords do not match';
            return;
        }
        if (password.length < 6) {
            registerError.textContent = 'Password must be at least 6 characters';
            return;
        }

        registerError.textContent = 'Registering...';
        const result = await registerUser(email, password, userName);

        if (result.success) {
            registerError.textContent = 'Registered! Initializing...';
            establishSession(result.data.token, result.data.user);
            await loadDataAndShowApp();
            registerModal.classList.add('hidden');
        } else if (result.unauthorized) {
            handleUnauthorizedState(result.data.error || 'Registered but authorization failed');
        } else {
            registerError.textContent = result.data.error || 'Registration failed';
        }
    });

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
                translationSpan.textContent = staticTranslation || '\u672a\u627e\u5230';
                wordContainer.prepend(translationSpan);
            }
            saveProgress();
        }
        
        const translationSpan = target.closest('.translation');
        if (translationSpan) {
            if (event.detail > 1) event.preventDefault();
            const wordContainer = translationSpan.parentElement;
            const wordText = wordContainer.querySelector('.word').textContent;
            const contextNode = translationSpan.closest('p, td, h3, h4, h5, h6');
            const context = contextNode ? contextNode.textContent.trim().replace(/\s+/g, ' ') : '';

            if (event.detail === 2) { // \u53cc\u51fb
                const originalText = translationSpan.textContent;
                translationSpan.textContent = '...';
                const translationText = await callDeepSeekAPI(`\u8bf7\u6839\u636e\u4e0a\u4e0b\u6587\uff0c\u5c06\u5355\u8bcd "${wordText}" \u7ffb\u8bd1\u6210\u6700\u5408\u9002\u7684\u4e2d\u6587\u3002\u53ea\u8fd4\u56de\u7ffb\u8bd1\u7ed3\u679c\u3002\n\n\u4e0a\u4e0b\u6587: "${context}"`, deepSeekApiKey);
                if (translationText.includes('\u9519\u8bef')) {
                    translationSpan.textContent = originalText;
                } else {
                    translationSpan.textContent = translationText;
                    translationSpan.classList.add('ai-enhanced');
                    saveProgress();
                }
            } else if (event.detail === 3) { // \u4e09\u51fb
                aiModalTitle.textContent = `\u2728 AI \u6df1\u5ea6\u89e3\u6790: "${wordText}"`;
                showAiModal();
                const response = await callDeepSeekAPI(`\u8bf7\u7528\u4e2d\u6587\uff0c\u5728\u4e00\u4e2a\u6bb5\u843d\u5185\uff0c\u4e3a\u5b66\u751f\u89e3\u91ca\u6280\u672f\u672f\u8bed "${wordText}"\u3002\u8bf7\u7ed3\u5408\u4e0a\u4e0b\u6587\u89e3\u91ca\uff1a\n\n\u4e0a\u4e0b\u6587\uff1a"${context}"`, deepSeekApiKey);
                aiModalLoader.style.display = 'none';
                aiResponseEl.textContent = response;
            }
        }

        if (target.classList.contains('summarize-btn')) {
             const paragraph = target.parentElement.previousElementSibling;
             const paragraphText = paragraph ? paragraph.textContent.trim().replace(/\s+/g, ' ') : '';
             if (paragraphText) {
                aiModalTitle.textContent = '\u2728 AI \u6bb5\u843d\u603b\u7ed3';
                showAiModal();
                const response = await callDeepSeekAPI(`\u8bf7\u7528\u4e2d\u6587\uff0c\u5c06\u4ee5\u4e0b\u6bb5\u843d\u603b\u7ed3\u4e3a\u51e0\u4e2a\u5173\u952e\u70b9\uff1a\n\n\u6bb5\u843d\uff1a"${paragraphText}"`, deepSeekApiKey);
                aiModalLoader.style.display = 'none';
                aiResponseEl.textContent = response;
             }
        }
    });
}

// --- \u65b0\u589e\uff1a\u767b\u5f55\u6210\u529f\u540e\u52a0\u8f7d\u6570\u636e\u548c\u663e\u793a\u5e94\u7528\u7684\u51fd\u6570 ---
async function loadDataAndShowApp() {
    try {
        // \u5e76\u884c\u83b7\u53d6\u4e66\u5e93\u548c\u8bcd\u5178\u6570\u636e
        [allDictionaries, allLibraryData] = await Promise.all([
            getDictionaries(),
            getLibrary()
        ]);
    } catch (error) {
        if (error.message === 'UNAUTHORIZED') {
            handleUnauthorizedState();
        } else {
            console.error("\u5e94\u7528\u6570\u636e\u52a0\u8f7d\u5931\u8d25:", error);
            contentDiv.innerHTML = `<div class="text-red-500 p-4 border border-red-300 rounded-md">
                <strong>\u6570\u636e\u52a0\u8f7d\u5931\u8d25</strong>
                <p>\u65e0\u6cd5\u4ece\u540e\u7aef\u670d\u52a1\u5668\u83b7\u53d6\u4e66\u5e93\u548c\u8bcdD\u5178\u6570\u636e\u3002</p>
                <p>\u8bf7\u786e\u4fdd\u540e\u7aef\u670d\u52a1 (python app.py) \u6b63\u5728\u8fd0\u884c\uff0c\u5e76\u4e14\u6570\u636e\u5e93\u8fde\u63a5\u6b63\u786e\u3002</p>
            </div>`;
            if (mainContainer) {
                mainContainer.classList.remove('hidden');
            }
        }
        return;
    }
    
    // --- \u6570\u636e\u52a0\u8f7d\u6210\u529f\u540e ---
    populateLibraryModal();
    updateSummarizeButtonsVisibility(); // \u786e\u4fdd AI \u6309\u94ae\u53ef\u89c1\u6027\u88ab\u8bbe\u7f6e

    // \u52a0\u8f7d\u6700\u540e\u4e00\u672c\u4e66
    const lastReadBookId = localStorage.getItem('lastReadBookId') || Object.keys(allLibraryData)[0];
    if (lastReadBookId && allLibraryData[lastReadBookId]) {
        const lastUsedDictId = localStorage.getItem(`selected_dictionary_for_${lastReadBookId}`) || allLibraryData[lastReadBookId].defaultDictionaryId;
        await loadBook(lastReadBookId, lastUsedDictId);
    } else {
        console.warn("书库为空或找不到上一册书，请从书库选择。");
        libraryModal.classList.remove('hidden');
    }
    mainContainer.classList.remove('hidden');
}

// --- \u5e94\u7528\u521d\u59cb\u5316 (\u5df2\u91cd\u6784) ---
function initialize() {
    // 1. \u83b7\u53d6\u6240\u6709 DOM \u5143\u7d20\u5f15\u7528
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
    mainContainer = document.getElementById('main-container');
    userEmailDisplay = document.getElementById('user-email-display');
    tocBtn = document.getElementById('toc-btn');
    tocModal = document.getElementById('toc-modal');
    closeTocModalBtn = document.getElementById('close-toc-modal-btn');
    tocList = document.getElementById('toc-list');
    searchBtn = document.getElementById('search-btn');
    searchModal = document.getElementById('search-modal');
    closeSearchModalBtn = document.getElementById('close-search-modal-btn');
    searchForm = document.getElementById('search-form');
    searchInput = document.getElementById('search-input');
    searchStatusEl = document.getElementById('search-status');
    searchResultsContainer = document.getElementById('search-results');

    loginModal = document.getElementById('login-modal');
    registerModal = document.getElementById('register-modal');
    // \u79fb\u9664\u4e86 closeLoginModalBtn \u548c closeRegisterModalBtn \u7684\u83b7\u53d6
    loginForm = document.getElementById('login-form');
    registerForm = document.getElementById('register-form');
    loginEmail = document.getElementById('login-email');
    loginPassword = document.getElementById('login-password');
    loginError = document.getElementById('login-error');
    registerEmail = document.getElementById('register-email');
    registerUsername = document.getElementById('register-username');
    userUsernameDisplay = document.getElementById('user-username-display');
    userUsernameEditBtn = document.getElementById('user-username-edit-btn');
    userUsernameEditContainer = document.getElementById('user-username-edit');
    userUsernameInput = document.getElementById('user-username-input');
    userUsernameSaveBtn = document.getElementById('user-username-save-btn');
    userUsernameCancelBtn = document.getElementById('user-username-cancel-btn');
    userUsernameStatus = document.getElementById('user-username-status');
    registerPassword = document.getElementById('register-password');
    confirmPassword = document.getElementById('confirm-password');
    registerError = document.getElementById('register-error');
    showRegisterBtn = document.getElementById('show-register-btn');
    showLoginBtn = document.getElementById('show-login-btn');
    updateUserEmailDisplay();
    updateUserProfileView();

    // 2. \u521d\u59cb\u5316\u7528\u6237\u4fe1\u606f
    document.getElementById('user-email-display').textContent = "\u672a\u767b\u5f55";
    const savedApiKey = localStorage.getItem('deepseek_api_key');
    if (savedApiKey) {
        deepSeekApiKey = savedApiKey;
        apiKeyInput.value = savedApiKey;
    }
    
    // 3. \u7ed1\u5b9a\u6240\u6709\u4e8b\u4ef6\u76d1\u542c\u5668\uff08\u8fd9\u6837\u767b\u5f55\u6846\u624d\u80fd\u5de5\u4f5c\uff09
    setupEventListeners();

    // 4. \u5c1d\u8bd5\u6062\u590d\u767b\u5f55\u72b6\u6001
    attemptAutoLogin();
}

// --- \u542f\u52a8\u5e94\u7528 ---
document.addEventListener('DOMContentLoaded', initialize);
