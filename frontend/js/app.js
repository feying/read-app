// 主要应用逻辑
import { dictionaries } from './dictionary.js';
import { libraryData } from './library.js';
import { callDeepSeekAPI, parsePageRange, parseContent } from './utils.js';

// --- Global State ---
let deepSeekApiKey = null;
let currentBookId = null;
let activeDictionary = {};
let currentPage = 0;
const mockUserEmail = 'test@example.com';

// DOM 元素引用
let contentDiv, userBtn, userModal, closeModalBtn, libraryBtn, libraryModal, closeLibraryModalBtn, libraryList;
let apiKeyInput, saveKeyBtn, saveStatusEl, logoutBtn, paginationControls, printBtn, printModal;
let closePrintModalBtn, confirmPrintBtn, clearProgressBtn, aiModal, closeAiModalBtn, aiModalTitle;
let aiModalLoader, aiResponseEl;

// 进度管理函数
function getProgressKey() { return `reading_progress_${mockUserEmail}_${currentBookId}`; }

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
}

function loadProgress() {
    if (!currentBookId) return;
    const savedProgress = JSON.parse(localStorage.getItem(getProgressKey()) || '{}');
    const wordsOnPage = document.querySelectorAll('.word');
    wordsOnPage.forEach(wordEl => {
        const progressItem = savedProgress[wordEl.dataset.wordId];
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
        wordCounterOffset = parseContent(tempDiv, book.content[i], true, wordCounterOffset, currentBookId);
    }

    parseContent(contentDiv, book.content[currentPage], false, wordCounterOffset, currentBookId);
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
    document.getElementById('user-email-display').textContent = mockUserEmail;
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
