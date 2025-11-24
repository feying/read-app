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

// --- 全局 DOM 引用 ---
let contentDiv, userBtn, userModal, closeModalBtn, libraryList;
let apiKeyInput, saveKeyBtn, saveStatusEl, logoutBtn;
let paginationControls, clearProgressBtn;
let aiModal, closeAiModalBtn, aiModalLoader, aiResponseEl, aiModalTitle;
let loginModal, loginForm, loginEmail, loginPassword, loginError;
let registerModal, registerForm, registerEmail, registerUsername, registerPassword, confirmPassword, registerError;
let showRegisterBtn, showLoginBtn;
let sidebarUsernameDisplay, userEmailDisplay, userUsernameDisplay;
let userUsernameEditBtn, userUsernameEditContainer, userUsernameInput, userUsernameSaveBtn, userUsernameCancelBtn, userUsernameStatus;
let tocModal, closeTocModalBtn, tocList;
let searchModal, closeSearchModalBtn, searchForm, searchInput, searchStatusEl, searchResultsContainer;
let mainContainer, viewLibrary, viewReader, navLibrary, navToc, navSearch, sidebarToggle, pageTitle;
let readingSettings, fontIncreaseBtn, fontDecreaseBtn, printBtn, printRangeInput, printRangeBtn;
let printModal;

function updateUserEmailDisplay() {
    if (!sidebarUsernameDisplay) {
        sidebarUsernameDisplay = document.getElementById('sidebar-username');
    }
    if (sidebarUsernameDisplay) {
        const name = currentUser?.user_name || currentUser?.email || 'Not logged in';
        sidebarUsernameDisplay.textContent = name;
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
    if (loginError) loginError.textContent = message;

    // Reset View
    if (mainContainer) mainContainer.classList.remove('hidden'); // Ensure main container is visible
    showLibrary(); // Switch to library view

    [userModal, printModal, aiModal, tocModal, searchModal].forEach(modal => modal && modal.classList.add('hidden'));

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

function renderLibraryDashboard() {
    if (!libraryList) return;
    libraryList.innerHTML = '';
    const bookIds = Object.keys(allLibraryData);

    if (bookIds.length === 0) {
        libraryList.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                </div>
                <h3 class="text-lg font-medium text-gray-900">暂无书籍</h3>
                <p class="mt-1 text-sm text-gray-500">您的书库是空的。</p>
            </div>
        `;
        return;
    }

    for (const bookId of bookIds) {
        const book = allLibraryData[bookId];
        const totalPages = (book && book.pageCount) || 0;
        const chapterCount = (book && book.chapters ? book.chapters.length : 0);

        const card = document.createElement('div');
        card.className = 'bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group cursor-pointer';

        // Card Content
        card.innerHTML = `
            <div class="p-5 flex-1">
                <div class="flex items-start justify-between mb-2">
                    <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                </div>
                <h4 class="text-lg font-bold text-gray-900 mb-1 line-clamp-1" title="${book.title}">${book.title}</h4>
                <p class="text-sm text-gray-500 line-clamp-2 h-10 mb-4">${book.description || '暂无简介'}</p>
                <div class="flex items-center text-xs text-gray-400 space-x-3">
                    <span class="flex items-center"><svg class="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> ${totalPages} 页</span>
                    <span class="flex items-center"><svg class="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" /></svg> ${chapterCount} 章</span>
                </div>
            </div>
            <div class="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <div class="flex-1 mr-3">
                     <select id="dict-select-${bookId}" class="w-full text-xs border-none bg-transparent focus:ring-0 text-gray-600 cursor-pointer hover:text-blue-600" onclick="event.stopPropagation()">
                        <!-- Options injected below -->
                    </select>
                </div>
                <button class="text-blue-600 font-medium text-sm hover:text-blue-800 flex items-center transition-colors">
                    阅读 <svg class="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
            </div>
        `;

        // Populate Dictionary Select
        const dictSelect = card.querySelector(`#dict-select-${bookId}`);
        dictSelect.setAttribute('aria-label', `选择《${book.title}》的词典`);
        dictSelect.setAttribute('title', `选择《${book.title}》的词典`);
        for (const dictId in allDictionaries) {
            const option = document.createElement('option');
            option.value = dictId;
            option.textContent = allDictionaries[dictId].name;
            dictSelect.appendChild(option);
        }
        const savedDictId = localStorage.getItem(`selected_dictionary_for_${bookId}`) || book.defaultDictionaryId;
        dictSelect.value = savedDictId;

        // Click event for the whole card to open book
        card.addEventListener('click', async () => {
            const selectedDictId = dictSelect.value;
            localStorage.setItem(`selected_dictionary_for_${bookId}`, selectedDictId);
            await loadBook(bookId, selectedDictId);
        });

        // Prevent select click from triggering card click (handled by stopPropagation in HTML, but good to be safe)
        dictSelect.addEventListener('click', (e) => e.stopPropagation());

        libraryList.appendChild(card);
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
    showReader();
}

function setActiveNav(targetBtn) {
    [navLibrary, navToc, navSearch].forEach(btn => btn && btn.classList.remove('active-nav-item'));
    if (targetBtn) targetBtn.classList.add('active-nav-item');
}

function showLibrary() {
    if (viewLibrary) viewLibrary.classList.remove('hidden');
    if (viewReader) viewReader.classList.add('hidden');
    if (readingSettings) readingSettings.classList.add('hidden');
    if (paginationControls) paginationControls.classList.add('hidden');
    if (navToc) navToc.classList.add('hidden');
    if (navSearch) navSearch.classList.add('hidden');
    const titleEl = pageTitle || document.getElementById('page-title');
    pageTitle = titleEl;
    if (titleEl) titleEl.textContent = '书库';
    setActiveNav(navLibrary);
}

function showReader() {
    if (viewLibrary) viewLibrary.classList.add('hidden');
    if (viewReader) viewReader.classList.remove('hidden');
    if (readingSettings) readingSettings.classList.remove('hidden');
    if (paginationControls) paginationControls.classList.remove('hidden');
    if (navToc) navToc.classList.remove('hidden');
    if (navSearch) navSearch.classList.remove('hidden');
    const titleEl = pageTitle || document.getElementById('page-title');
    pageTitle = titleEl;
    const meta = getCurrentBookMeta();
    if (titleEl) titleEl.textContent = meta?.title || '阅读';
    setActiveNav(navLibrary);
}
function buildPrintableView() {
    if (!printModal) return null;
    const pageContainer = document.getElementById('page-container');
    if (!pageContainer) return null;

    const clone = pageContainer.cloneNode(true);
    printModal.innerHTML = '';
    printModal.appendChild(clone);
    return clone;
}

async function buildPrintablePages(pageIndexes = []) {
    if (!printModal) return null;
    const order = getCurrentPageOrder();
    if (order.length === 0) return null;

    let wordOffset = 0;
    printModal.innerHTML = '';

    for (const idx of pageIndexes) {
        const pageNumber = order[idx];
        if (pageNumber === undefined) continue;
        await ensurePageCached(currentBookId, pageNumber);
        const cached = bookPageCache[currentBookId]?.[pageNumber];
        if (!cached) continue;

        const pageWrapper = document.createElement('div');
        pageWrapper.className = 'print-page';

        const pageBox = document.createElement('div');
        pageBox.className = 'print-page-container bg-white shadow-sm rounded-lg p-8 md:p-12 min-h-full text-lg leading-loose';

        const contentNode = document.createElement('div');
        pageBox.appendChild(contentNode);

        wordOffset = parseContent(contentNode, cached.html, true, wordOffset, currentBookId, pageNumber);

        pageWrapper.appendChild(pageBox);
        printModal.appendChild(pageWrapper);

        const pageBreak = document.createElement('div');
        pageBreak.className = 'print-page-break';
        printModal.appendChild(pageBreak);
    }

    return printModal.firstChild ? printModal : null;
}

function waitForImages(container) {
    const images = Array.from(container.querySelectorAll('img'));
    if (images.length === 0) return Promise.resolve();
    return Promise.all(images.map(img => new Promise(resolve => {
        if (img.complete && img.naturalWidth !== 0) return resolve();
        img.loading = 'eager';
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
    })));
}

async function startPrintFromIndexes(pageIndexes) {
    const built = await buildPrintablePages(pageIndexes);
    if (!built) {
        alert('打印内容暂时无法准备');
        return;
    }

    printModal.classList.remove('hidden');
    await waitForImages(printModal);

    const cleanup = () => {
        printModal.innerHTML = '';
        printModal.classList.add('hidden');
        window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 1500);
}

async function printCurrentPage() {
    if (!currentBookId || currentPage === null) {
        alert('请先选择要打印的图书和页码');
        return;
    }

    const order = getCurrentPageOrder();
    const idx = order.indexOf(currentPage);
    if (idx === -1) {
        alert('当前页面未找到，无法打印');
        return;
    }
    await startPrintFromIndexes([idx]);
}

async function printRange() {
    if (!currentBookId) {
        alert('请先选择图书');
        return;
    }
    const order = getCurrentPageOrder();
    if (order.length === 0) {
        alert('当前图书没有可打印的页面');
        return;
    }

    const rangeText = (printRangeInput?.value || '').trim();
    const rangeIndexes = parsePageRange(rangeText, order.length);
    if (!rangeIndexes || rangeIndexes.length === 0) {
        alert('页码范围格式不正确，例如 1-3,5');
        return;
    }

    await startPrintFromIndexes(rangeIndexes);
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
}
function setupEventListeners() {
    const modalTriggerButtons = [userBtn]; // libraryBtn removed
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

    const modalCloseButtons = [closeModalBtn, closeAiModalBtn, closeTocModalBtn, closeSearchModalBtn];
    modalCloseButtons.forEach(btn => {
        if (!btn) return;
        btn.addEventListener('click', () => btn.closest('.fixed').classList.add('hidden'));
    });

    [userModal, aiModal, tocModal, searchModal, loginModal, registerModal].forEach(modal => {
        if (!modal) return;
        modal.addEventListener('click', e => {
            if (e.target === modal) modal.classList.add('hidden');
        });
    });

    // Sidebar Navigation
    if (navLibrary) {
        navLibrary.addEventListener('click', () => {
            showLibrary();
        });
    }

    if (navToc) {
        navToc.addEventListener('click', () => {
            if (!currentBookId) return;
            updateTocList();
            tocModal.classList.remove('hidden');
        });
    }

    if (navSearch) {
        navSearch.addEventListener('click', () => {
            if (!currentBookId) return;
            if (searchInput) searchInput.value = '';
            if (searchStatusEl) searchStatusEl.textContent = '';
            if (searchResultsContainer) searchResultsContainer.innerHTML = '';
            searchModal.classList.remove('hidden');
            setTimeout(() => { if (searchInput) searchInput.focus(); }, 50);
        });
    }

    // Sidebar Toggle (Mobile)
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.toggle('-translate-x-full');
            sidebar.classList.toggle('absolute');
            sidebar.classList.toggle('h-full');
        });
    }

    // Reading Settings
    if (fontIncreaseBtn) {
        fontIncreaseBtn.addEventListener('click', () => {
            const content = document.getElementById('content');
            const currentSize = parseFloat(window.getComputedStyle(content).fontSize);
            content.style.fontSize = (currentSize + 2) + 'px';
        });
    }

    if (fontDecreaseBtn) {
        fontDecreaseBtn.addEventListener('click', () => {
            const content = document.getElementById('content');
            const currentSize = parseFloat(window.getComputedStyle(content).fontSize);
            if (currentSize > 12) {
                content.style.fontSize = (currentSize - 2) + 'px';
            }
        });
    }

    if (printBtn) {
        printBtn.addEventListener('click', () => {
            printCurrentPage();
        });
    }

    if (printRangeBtn) {
        printRangeBtn.addEventListener('click', () => {
            printRange();
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
        if (currentUser) {
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

    // Removed Print Button Listener as it's not in UI anymore, but keeping function if needed later.

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
        try {
            const result = await loginUser(email, password);
            if (result.success) {
                establishSession(result.data.token, result.data.user);
                if (currentUser.api_key) {
                    localStorage.setItem('deepseek_api_key', currentUser.api_key);
                    deepSeekApiKey = currentUser.api_key;
                    apiKeyInput.value = currentUser.api_key;
                }
                loginError.textContent = '登录成功！正在加载数据...';
                loginModal.classList.add('hidden');
                loginModal.classList.remove('flex');
                await loadDataAndShowApp();
            } else {
                loginError.textContent = result.error || '登录失败';
            }
        } catch (error) {
            console.error('登录请求错误:', error);
            loginError.textContent = '网络错误，请稍后再试';
        }
    });

    // 注册表单提交
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = registerEmail.value.trim();
        const username = registerUsername.value.trim();
        const password = registerPassword.value;
        const confirm = confirmPassword.value;

        if (password !== confirm) {
            registerError.textContent = '两次输入的密码不一致';
            return;
        }

        try {
            const result = await registerUser(email, password, username);
            if (result.success) {
                alert('注册成功！请登录。');
                registerModal.classList.add('hidden');
                loginModal.classList.remove('hidden');
                loginModal.classList.add('flex');
            } else {
                registerError.textContent = result.error || '注册失败';
            }
        } catch (error) {
            console.error('注册请求错误:', error);
            registerError.textContent = '网络错误，请稍后再试';
        }
    });

    // Word Click & Translation Logic
    contentDiv.addEventListener('click', async (event) => {
        const target = event.target;
        if (target.classList.contains('word')) {
            const wordContainer = target.parentElement;
            if (wordContainer.querySelector('.translation')) {
                wordContainer.querySelector('.translation').remove();
            } else {
                const wordText = target.textContent.trim();
                const normalizedWord = wordText.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
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
            const contextNode = translationSpan.closest('p, td, h3, h4, h5, h6');
            const context = contextNode ? contextNode.textContent.trim().replace(/\s+/g, ' ') : '';

            if (event.detail === 2) { // 双击
                const originalText = translationSpan.textContent;
                translationSpan.textContent = '...';
                const translationText = await callDeepSeekAPI(`请根据上下文，将单词 "${wordText}" 翻译成最合适的中文。只返回翻译结果。\n\n上下文: "${context}"`, deepSeekApiKey);
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
                const response = await callDeepSeekAPI(`请用中文，在一个段落内，为学生解释技术术语 "${wordText}"。请结合上下文解释：\n\n上下文："${context}"`, deepSeekApiKey);
                aiModalLoader.style.display = 'none';
                aiResponseEl.textContent = response;
            }
        }

        if (target.classList.contains('summarize-btn')) {
            const paragraph = target.parentElement.previousElementSibling;
            const paragraphText = paragraph ? paragraph.textContent.trim().replace(/\s+/g, ' ') : '';
            if (paragraphText) {
                aiModalTitle.textContent = '✨ AI 段落总结';
                showAiModal();
                const response = await callDeepSeekAPI(`请用中文，将以下段落总结为几个关键点：\n\n段落："${paragraphText}"`, deepSeekApiKey);
                aiModalLoader.style.display = 'none';
                aiResponseEl.textContent = response;
            }
        }
    });
}

// --- Load Data & Show App ---
async function loadDataAndShowApp() {
    try {
        [allDictionaries, allLibraryData] = await Promise.all([
            getDictionaries(),
            getLibrary()
        ]);
    } catch (error) {
        if (error.message === 'UNAUTHORIZED') {
            handleUnauthorizedState();
        } else {
            console.error("应用数据加载失败:", error);
            contentDiv.innerHTML = `<div class="text-red-500 p-4 border border-red-300 rounded-md">
                <strong>数据加载失败</strong>
                <p>无法从后端服务器获取书库和词典数据。</p>
                <p>请确保后端服务 (python app.py) 正在运行，并且数据库连接正确。</p>
            </div>`;
            if (mainContainer) {
                mainContainer.classList.remove('hidden');
            }
        }
        return;
    }

    renderLibraryDashboard();
    updateSummarizeButtonsVisibility();

    showLibrary();

    if (mainContainer) mainContainer.classList.remove('hidden');
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize DOM Elements
    contentDiv = document.getElementById('content');
    userBtn = document.getElementById('user-btn');
    userModal = document.getElementById('user-modal');
    closeModalBtn = document.getElementById('close-user-modal-btn');
    libraryList = document.getElementById('library-list');

    apiKeyInput = document.getElementById('api-key-input');
    saveKeyBtn = document.getElementById('save-key-btn');
    saveStatusEl = document.getElementById('save-status');
    logoutBtn = document.getElementById('logout-btn');

    paginationControls = document.getElementById('pagination-controls');

    clearProgressBtn = document.getElementById('clear-progress-btn');

    aiModal = document.getElementById('ai-modal');
    closeAiModalBtn = document.getElementById('close-modal-btn');
    aiModalLoader = document.getElementById('modal-loader');
    aiResponseEl = document.getElementById('ai-response');

    loginModal = document.getElementById('login-modal');
    // closeLoginModalBtn removed
    loginForm = document.getElementById('login-form');
    loginEmail = document.getElementById('login-email');
    loginPassword = document.getElementById('login-password');
    loginError = document.getElementById('login-error');

    registerModal = document.getElementById('register-modal');
    // closeRegisterModalBtn removed
    registerForm = document.getElementById('register-form');
    registerEmail = document.getElementById('register-email');
    registerUsername = document.getElementById('register-username');
    registerPassword = document.getElementById('register-password');
    confirmPassword = document.getElementById('confirm-password');
    registerError = document.getElementById('register-error');

    showRegisterBtn = document.getElementById('show-register-btn');
    showLoginBtn = document.getElementById('show-login-btn');

    sidebarUsernameDisplay = document.getElementById('sidebar-username');
    userUsernameDisplay = document.getElementById('user-username-display');
    userEmailDisplay = document.getElementById('user-email-display');
    userUsernameEditBtn = document.getElementById('user-username-edit-btn');
    userUsernameEditContainer = document.getElementById('user-username-edit');
    userUsernameInput = document.getElementById('user-username-input');
    userUsernameSaveBtn = document.getElementById('user-username-save-btn');
    userUsernameCancelBtn = document.getElementById('user-username-cancel-btn');
    userUsernameStatus = document.getElementById('user-username-status');

    tocModal = document.getElementById('toc-modal');
    closeTocModalBtn = document.getElementById('close-toc-modal-btn');
    tocList = document.getElementById('toc-list');

    searchModal = document.getElementById('search-modal');
    closeSearchModalBtn = document.getElementById('close-search-modal-btn');
    searchForm = document.getElementById('search-form');
    searchInput = document.getElementById('search-input');
    searchStatusEl = document.getElementById('search-status');
    searchResultsContainer = document.getElementById('search-results');

    mainContainer = document.querySelector('main');
    pageTitle = document.getElementById('page-title');

    // New View Elements
    viewLibrary = document.getElementById('view-library');
    viewReader = document.getElementById('view-reader');
    navLibrary = document.getElementById('nav-library');
    navToc = document.getElementById('nav-toc');
    navSearch = document.getElementById('nav-search');
    sidebarToggle = document.getElementById('sidebar-toggle');
    readingSettings = document.getElementById('reading-settings');
    fontIncreaseBtn = document.getElementById('font-increase');
    fontDecreaseBtn = document.getElementById('font-decrease');
    printRangeInput = document.getElementById('print-range-input');
    printRangeBtn = document.getElementById('print-range-btn');
    printBtn = document.getElementById('print-btn');

    aiModalTitle = document.querySelector('#ai-modal h3');
    printModal = document.getElementById('print-container');

    setupEventListeners();

    // Initial State
    showLibrary();
    await attemptAutoLogin();
});
