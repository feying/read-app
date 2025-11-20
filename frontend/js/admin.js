const API_BASE = 'http://127.0.0.1:5000/api/admin';

const loginPanel = document.getElementById('admin-login-panel');
const dashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('admin-login-form');
const emailInput = document.getElementById('admin-email');
const passwordInput = document.getElementById('admin-password');
const loginError = document.getElementById('admin-login-error');
const identityLabel = document.getElementById('admin-identity');
const logoutBtn = document.getElementById('admin-logout-btn');
const booksOutput = document.getElementById('admin-books');
const dictionaryTableBody = document.getElementById('dictionary-table-body');
const dictionaryStatus = document.getElementById('dictionary-status');
const dictionaryImportForm = document.getElementById('dictionary-import-form');
const dictionaryImportSelect = document.getElementById('dictionary-import-select');
const dictionaryImportFile = document.getElementById('dictionary-import-file');
const dictionaryImportStatus = document.getElementById('dictionary-import-status');
const dictionaryCreateForm = document.getElementById('dictionary-create-form');
const dictionaryCreateIdInput = document.getElementById('dictionary-create-id');
const dictionaryCreateNameInput = document.getElementById('dictionary-create-name');
const dictionaryCreateFileInput = document.getElementById('dictionary-create-file');
const dictionaryCreateStatus = document.getElementById('dictionary-create-status');
const usersOutput = document.getElementById('admin-users');
const refreshBooksBtn = document.getElementById('refresh-books');
const refreshDictionariesBtn = document.getElementById('refresh-dictionaries');
const refreshUsersBtn = document.getElementById('refresh-users');
const backBtn = document.getElementById('back-to-reader');
const sidebar = document.getElementById('admin-sidebar');
const sidebarOpenBtn = document.getElementById('sidebar-open-btn');
const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
const navLinks = document.querySelectorAll('.admin-nav-link');
const panels = document.querySelectorAll('[data-panel-content]');
const panelPlaceholder = document.getElementById('admin-panel-placeholder');
const pdfUploadForm = document.getElementById('pdf-upload-form');
const pdfUploadStatus = document.getElementById('pdf-upload-status');
const pdfFileInput = document.getElementById('pdf-file');
const pdfOriginSelect = document.getElementById('pdf-origin');
const pdfTitleInput = document.getElementById('pdf-title');
const pdfBookIdInput = document.getElementById('pdf-book-id');
const pdfDictInput = document.getElementById('pdf-dictionary-id');
const pdfDescInput = document.getElementById('pdf-description');
const pageDeleteBookSelect = document.getElementById('page-delete-book-select');
const pageDeletePageSelect = document.getElementById('page-delete-page-select');
const deleteSelectedPagesBtn = document.getElementById('delete-selected-pages-btn');
const pageDeleteStatus = document.getElementById('page-delete-status');
const refreshPageListBtn = document.getElementById('refresh-page-list');
const chapterForm = document.getElementById('chapter-form');
const chapterSelect = document.getElementById('chapter-select');
const chapterNumberInput = document.getElementById('chapter-number');
const chapterTitleInput = document.getElementById('chapter-title');
const chapterSummaryInput = document.getElementById('chapter-summary');
const chapterStartPageSelect = document.getElementById('chapter-start-page');
const chapterSaveBtn = document.getElementById('chapter-save-btn');
const chapterResetBtn = document.getElementById('chapter-reset-btn');
const chapterStatus = document.getElementById('chapter-status');

const ADMIN_TOKEN_KEY = 'admin_token';
const HTML_ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

let cachedBookList = [];
let cachedPageNumbers = [];
let cachedChapters = [];
let cachedDictionaries = [];

function getAdminToken() {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
}

function setAdminToken(token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

function clearAdminToken() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
}

function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

function renderBookSummaryList(items = []) {
    if (!booksOutput) return;
    cachedBookList = Array.isArray(items) ? items : [];
    populatePageDeleteBookOptions();
    if (!items.length) {
        booksOutput.innerHTML = '<p class="text-gray-500 text-sm">No books yet</p>';
        return;
    }

    const rows = items.map((book, index) => {
        const safeTitle = escapeHtml((book && book.title) ? book.title : 'Untitled book');
        const safeId = escapeHtml((book && book.id) ? book.id : 'unknown');
        const safeDescription = escapeHtml((book && book.description) ? book.description : 'No description');
        const safeDictionary = escapeHtml((book && book.defaultDictionaryId) ? book.defaultDictionaryId : 'Not set');
        const safeOrigin = escapeHtml((book && book.origin) ? book.origin : 'default');
        const rowStripe = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';

        return `
            <tr class="${rowStripe}">
                <td class="align-top px-4 py-3">
                    <p class="font-medium text-gray-900">${safeTitle}</p>
                    <p class="text-xs text-gray-500 mt-1 break-all">Dictionary: ${safeDictionary}</p>
                </td>
                <td class="align-top px-4 py-3 text-sm font-mono text-gray-700 break-all">${safeId}</td>
                <td class="align-top px-4 py-3 text-sm text-gray-700">${safeOrigin}</td>
                <td class="align-top px-4 py-3 text-sm text-gray-700 leading-relaxed">${safeDescription}</td>
                <td class="align-top px-4 py-3 text-sm">
                    <button
                        class="delete-book-btn text-red-600 hover:text-red-500 text-xs font-semibold"
                        data-action="delete-book"
                        data-book-id="${safeId}"
                    >
                        删除
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    booksOutput.innerHTML = `
        <p class="text-sm text-gray-500 mb-3">Total ${items.length} books</p>
        <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table class="min-w-full text-left text-sm text-gray-800">
                <thead class="bg-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <tr>
                        <th class="px-4 py-3">Title</th>
                        <th class="px-4 py-3">Book ID</th>
                        <th class="px-4 py-3">Origin</th>
                        <th class="px-4 py-3">Description</th>
                        <th class="px-4 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

function hydrateExistingBookList() {
    if (!booksOutput) return;
    const raw = (booksOutput.textContent || '').trim();
    if (!raw) return;
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            renderBookSummaryList(parsed);
        } else if (parsed && Array.isArray(parsed.items)) {
            renderBookSummaryList(parsed.items);
        }
    } catch (error) {
        // ignore invalid JSON
    }
}

hydrateExistingBookList();

function populatePageDeleteBookOptions() {
    if (!pageDeleteBookSelect) return;
    const previous = pageDeleteBookSelect.value;
    pageDeleteBookSelect.innerHTML = '<option value="">请选择需要操作的书籍</option>';
    cachedBookList.forEach(book => {
        if (!book || !book.id) return;
        const option = document.createElement('option');
        option.value = book.id;
        option.textContent = `${book.title || '未命名'}（${book.id}）`;
        pageDeleteBookSelect.appendChild(option);
    });
    if (previous && cachedBookList.some(book => book.id === previous)) {
        pageDeleteBookSelect.value = previous;
    } else {
        pageDeleteBookSelect.value = '';
        pageDeletePageSelect && (pageDeletePageSelect.innerHTML = '');
        deleteSelectedPagesBtn && (deleteSelectedPagesBtn.disabled = true);
    }
}

function setPageDeleteStatus(message = '', variant = 'info') {
    if (!pageDeleteStatus) return;
    pageDeleteStatus.textContent = message;
    pageDeleteStatus.classList.remove('text-gray-500', 'text-red-500', 'text-green-600');
    const colorClass = variant === 'error'
        ? 'text-red-500'
        : variant === 'success'
            ? 'text-green-600'
            : 'text-gray-500';
    pageDeleteStatus.classList.add(colorClass);
}
function setChapterStatus(message = '', variant = 'info') {
    if (!chapterStatus) return;
    chapterStatus.textContent = message;
    chapterStatus.classList.remove('text-gray-500', 'text-red-500', 'text-green-600');
    const colorClass = variant === 'error'
        ? 'text-red-500'
        : variant === 'success'
            ? 'text-green-600'
            : 'text-gray-500';
    chapterStatus.classList.add(colorClass);
}

function setStatusElement(el, message = '', variant = 'info') {
    if (!el) return;
    el.textContent = message;
    el.classList.remove('text-gray-500', 'text-red-500', 'text-green-600');
    const colorClass = variant === 'error'
        ? 'text-red-500'
        : variant === 'success'
            ? 'text-green-600'
            : 'text-gray-500';
    el.classList.add(colorClass);
}


function populateStartPageOptions(numbers = []) {
    if (!chapterStartPageSelect) return;
    const previous = chapterStartPageSelect.value;
    chapterStartPageSelect.innerHTML = '<option value="">请选择章节起始页</option>';
    numbers.forEach(num => {
        const option = document.createElement('option');
        option.value = num;
        option.textContent = `第 ${num} 页`;
        chapterStartPageSelect.appendChild(option);
    });
    if (previous && numbers.some(num => String(num) === previous)) {
        chapterStartPageSelect.value = previous;
    } else {
        chapterStartPageSelect.value = numbers.length ? numbers[0] : '';
    }
}

async function loadPageNumbersForBook(bookId) {
    if (!pageDeletePageSelect) return;
    pageDeletePageSelect.innerHTML = '';
    deleteSelectedPagesBtn && (deleteSelectedPagesBtn.disabled = true);
    if (!bookId) {
        cachedPageNumbers = [];
        setPageDeleteStatus('请选择书籍以加载页码', 'info');
        populateStartPageOptions([]);
        return;
    }
    setPageDeleteStatus('正在加载页码...', 'info');
    try {
        const data = await fetchAdminResource(`/books/${encodeURIComponent(bookId)}/page_numbers`);
        const numbers = data.pageNumbers || [];
        cachedPageNumbers = numbers;
        pageDeletePageSelect.innerHTML = '';
        if (!numbers.length) {
            setPageDeleteStatus('该书暂无页面', 'info');
            populateStartPageOptions([]);
            return;
        }
        numbers.forEach(num => {
            const option = document.createElement('option');
            option.value = num;
            option.textContent = `第 ${num} 页`;
            pageDeletePageSelect.appendChild(option);
        });
        populateStartPageOptions(numbers);
        deleteSelectedPagesBtn && (deleteSelectedPagesBtn.disabled = false);
        setPageDeleteStatus(`共 ${numbers.length} 个页面，可多选删除`, 'success');
    } catch (error) {
        cachedPageNumbers = [];
        populateStartPageOptions([]);
        setPageDeleteStatus(error.message || '加载页码失败', 'error');
    }
}

async function loadChaptersForBook(bookId) {
    if (!chapterSelect) return;
    if (!bookId) {
        cachedChapters = [];
        populateChapterSelect();
        resetChapterForm();
        setChapterStatus('请选择书籍以编辑章节', 'info');
        return;
    }
    setChapterStatus('正在加载章节...', 'info');
    try {
        const data = await fetchAdminResource(`/books/${encodeURIComponent(bookId)}/chapters`);
        cachedChapters = data.chapters || [];
        populateChapterSelect();
        setChapterStatus(`共 ${cachedChapters.length} 个章节，可选择编辑或新增`, 'success');
    } catch (error) {
        cachedChapters = [];
        populateChapterSelect();
        resetChapterForm();
        setChapterStatus(error.message || '加载章节失败', 'error');
    }
}

function populateChapterSelect() {
    if (!chapterSelect) return;
    const previous = chapterSelect.value;
    chapterSelect.innerHTML = '<option value="">新增章节</option>';
    cachedChapters.forEach(chapter => {
        if (!chapter || typeof chapter.id === 'undefined') return;
        const option = document.createElement('option');
        option.value = chapter.id;
        option.textContent = `#${chapter.chapterNumber ?? '?'} · ${chapter.title || '未命名章节'}`;
        chapterSelect.appendChild(option);
    });
    if (previous && cachedChapters.some(ch => String(ch.id) === previous)) {
        chapterSelect.value = previous;
        const chapter = cachedChapters.find(ch => String(ch.id) === previous);
        fillChapterForm(chapter);
    } else {
        chapterSelect.value = '';
        resetChapterForm(true);
    }
}

function fillChapterForm(chapter) {
    if (!chapter) return;
    if (chapterNumberInput) chapterNumberInput.value = chapter.chapterNumber ?? '';
    if (chapterTitleInput) chapterTitleInput.value = chapter.title || '';
    if (chapterSummaryInput) chapterSummaryInput.value = chapter.summary || '';
    if (chapterStartPageSelect) {
        if (chapter.startPage != null && !Array.from(chapterStartPageSelect.options).some(opt => Number(opt.value) === chapter.startPage)) {
            const opt = document.createElement('option');
            opt.value = chapter.startPage;
            opt.textContent = `第 ${chapter.startPage} 页`;
            chapterStartPageSelect.appendChild(opt);
        }
        chapterStartPageSelect.value = chapter.startPage ?? '';
    }
}

function resetChapterForm(keepSelection = false) {
    if (!keepSelection && chapterSelect) chapterSelect.value = '';
    if (chapterNumberInput) chapterNumberInput.value = '';
    if (chapterTitleInput) chapterTitleInput.value = '';
    if (chapterSummaryInput) chapterSummaryInput.value = '';
    if (chapterStartPageSelect) chapterStartPageSelect.value = '';
    if (!keepSelection) setChapterStatus('可以填写下方表单创建新章节', 'info');
}

async function saveChapter(bookId, payload) {
    const response = await fetch(`${API_BASE}/books/${encodeURIComponent(bookId)}/chapters`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
    });
    let data = {};
    try {
        data = await response.json();
    } catch (error) {}
    if (response.status === 401 || response.status === 403) {
        clearAdminToken();
        showLogin();
        throw new Error('登录已过期，请重新登录');
    }
    if (!response.ok) {
        throw new Error(data.error || `保存失败 (HTTP ${response.status})`);
    }
    return data;
}

async function adminDeletePages(bookId, pageNumbers) {
    const response = await fetch(`${API_BASE}/books/${encodeURIComponent(bookId)}/pages`, {
        method: 'DELETE',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ page_numbers: pageNumbers })
    });
    let data = {};
    try {
        data = await response.json();
    } catch (error) {
        // ignore
    }
    if (response.status === 401 || response.status === 403) {
        clearAdminToken();
        showLogin();
        throw new Error('登录已过期，请重新登录');
    }
    if (!response.ok) {
        throw new Error(data.error || `删除失败 (HTTP ${response.status})`);
    }
    return data;
}

async function handleBookListClick(event) {
    const deleteBtn = event.target.closest('[data-action="delete-book"]');
    if (!deleteBtn) return;

    const bookId = deleteBtn.dataset.bookId;
    if (!bookId) return;

    const confirmed = window.confirm(`确定要删除书籍「${bookId}」吗？
此操作无法撤销。`);
    if (!confirmed) {
        return;
    }

    const originalText = deleteBtn.textContent;
    deleteBtn.disabled = true;
    deleteBtn.textContent = '删除中...';

    try {
        await adminDeleteBook(bookId);
        await refreshBooks();
    } catch (error) {
        alert(error.message || '删除失败');
    } finally {
        deleteBtn.disabled = false;
        deleteBtn.textContent = originalText;
    }
}

function authHeaders(extra = {}) {
    const headers = { ...extra };
    const token = getAdminToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

async function adminLogin(email, password) {
    const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || '管理员登录失败');
    }
    return data;
}

async function fetchAdminResource(path) {
    const response = await fetch(`${API_BASE}${path}`, {
        headers: authHeaders()
    });
    if (response.status === 401 || response.status === 403) {
        clearAdminToken();
        showLogin();
        throw new Error('登录已过期，请重新登录');
    }
    if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
    }
    return response.json();
}


function showDashboard(email) {
    if (identityLabel) {
        identityLabel.textContent = email || '管理员';
    }
    if (loginPanel) loginPanel.classList.add('hidden');
    if (dashboard) dashboard.classList.remove('hidden');
}

function showLogin() {
    if (dashboard) dashboard.classList.add('hidden');
    if (loginPanel) loginPanel.classList.remove('hidden');
}

async function adminDeleteBook(bookId) {
    const response = await fetch(`${API_BASE}/books/${encodeURIComponent(bookId)}`, {
        method: 'DELETE',
        headers: authHeaders()
    });
    let data = {};
    try {
        data = await response.json();
    } catch (error) {
        // allow non-JSON body
    }
    if (response.status === 401 || response.status === 403) {
        clearAdminToken();
        showLogin();
        throw new Error('登录已过期，请重新登录');
    }
    if (!response.ok) {
        throw new Error(data.error || `删除失败 (HTTP ${response.status})`);
    }
    return data;
}

async function refreshBooks() {
    if (booksOutput) {
        booksOutput.innerHTML = '<p class="text-gray-500 text-sm">Loading...</p>';
    }
    try {
        const data = await fetchAdminResource('/books');
        renderBookSummaryList(data.items || []);
    } catch (error) {
        booksOutput.textContent = error.message;
    }
}

function renderDictionaryList(items = []) {
    cachedDictionaries = Array.isArray(items) ? items : [];
    if (!dictionaryTableBody) return;
    if (!cachedDictionaries.length) {
        dictionaryTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-4 py-3 text-sm text-gray-500 text-center">暂无词典</td>
            </tr>
        `;
        return;
    }
    const rows = cachedDictionaries.map((item, index) => {
        const rowStripe = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        const preview = (item.preview || []).map(([k, v]) => `${k}: ${v}`).join('; ');
        return `
            <tr class="${rowStripe}">
                <td class="px-4 py-3 text-sm font-semibold text-gray-800">${escapeHtml(item.name || '-') }</td>
                <td class="px-4 py-3 text-xs font-mono text-gray-700 break-all">${escapeHtml(item.id || '-')}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${item.entryCount ?? 0}</td>
                <td class="px-4 py-3 text-sm text-right space-x-2">
                    <button
                        class="export-dict-btn text-blue-600 hover:text-blue-500 text-xs font-semibold"
                        data-action="export-dict"
                        data-dict-id="${escapeHtml(item.id || '')}"
                    >导出 CSV</button>
                    <span class="text-xs text-gray-400">${escapeHtml(preview)}</span>
                </td>
            </tr>
        `;
    }).join('');
    dictionaryTableBody.innerHTML = rows;
}

function populateDictionarySelect() {
    if (!dictionaryImportSelect) return;
    const previous = dictionaryImportSelect.value;
    dictionaryImportSelect.innerHTML = '<option value="">请选择要覆盖的词典</option>';
    cachedDictionaries.forEach(item => {
        if (!item || !item.id) return;
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = `${item.name || item.id}（${item.id}）`;
        dictionaryImportSelect.appendChild(option);
    });
    if (previous && cachedDictionaries.some(item => item.id === previous)) {
        dictionaryImportSelect.value = previous;
    }
}

async function refreshDictionaries() {
    setStatusElement(dictionaryStatus, 'Loading...', 'info');
    try {
        const data = await fetchAdminResource('/dictionaries');
        renderDictionaryList(data.items || []);
        populateDictionarySelect();
        setStatusElement(dictionaryStatus, `共 ${data.items?.length ?? 0} 个词典`, 'success');
    } catch (error) {
        renderDictionaryList([]);
        setStatusElement(dictionaryStatus, error.message || '加载失败', 'error');
    }
}

async function downloadDictionaryCsv(dictId) {
    const response = await fetch(`${API_BASE}/dictionaries/${encodeURIComponent(dictId)}/export_csv`, {
        headers: authHeaders()
    });
    if (response.status === 401 || response.status === 403) {
        clearAdminToken();
        showLogin();
        throw new Error('登录已过期，请重新登录');
    }
    if (!response.ok) {
        throw new Error(`导出失败 (HTTP ${response.status})`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dictId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function refreshUsers() {
    usersOutput.textContent = 'Loading...';
    try {
        const data = await fetchAdminResource('/users');
        usersOutput.textContent = JSON.stringify(data.items, null, 2);
    } catch (error) {
        usersOutput.textContent = error.message;
    }
}

function toggleSidebar(show) {
    if (!sidebar) return;
    if (show) {
        sidebar.classList.remove('-translate-x-full');
    } else {
        sidebar.classList.add('-translate-x-full');
    }
}

function highlightNav(targetName) {
    navLinks.forEach(link => {
        const isActive = link.dataset.panel === targetName;
        link.classList.toggle('bg-gray-100', isActive);
        link.classList.toggle('text-gray-800', isActive);
        link.classList.toggle('text-gray-600', !isActive);
    });
}

function updatePdfUploadStatus(message, variant = 'info') {
    if (!pdfUploadStatus) return;
    pdfUploadStatus.textContent = message || '';
    pdfUploadStatus.classList.remove('text-gray-500', 'text-red-500', 'text-green-600');
    const colorClass = variant === 'error'
        ? 'text-red-500'
        : variant === 'success'
            ? 'text-green-600'
            : 'text-gray-500';
    pdfUploadStatus.classList.add(colorClass);
}

async function uploadPdfViaApi(formData, options = { allowAppend: false, overwriteConflicts: false }) {
    const attemptData = new FormData();
    formData.forEach((value, key) => attemptData.append(key, value));
    if (options.allowAppend) attemptData.set('allow_append', '1');
    if (options.overwriteConflicts) attemptData.set('overwrite_conflicts', '1');

    const response = await fetch(`${API_BASE}/books/upload_pdf`, {
        method: 'POST',
        headers: authHeaders(),
        body: attemptData
    });
    let data = {};
    try {
        data = await response.json();
    } catch (error) {
        // ignore
    }
    if (response.status === 401 || response.status === 403) {
        clearAdminToken();
        showLogin();
        throw new Error('登录已过期，请重新登录');
    }
    if (response.status === 409) {
        const err = new Error(data.error || '需要确认');
        err.code = 409;
        err.payload = data;
        throw err;
    }
    if (!response.ok) {
        throw new Error(data.error || `上传失败 (HTTP ${response.status})`);
    }
    return data;
}

async function showPanel(panelName) {
    let found = false;
    panels.forEach(panel => {
        if (panel.dataset.panelContent === panelName) {
            panel.classList.remove('hidden');
            found = true;
        } else {
            panel.classList.add('hidden');
        }
    });
    if (panelPlaceholder) {
        panelPlaceholder.classList.toggle('hidden', found);
    }
    highlightNav(panelName);

    if (!found) return;

    try {
        switch (panelName) {
            case 'books':
                await refreshBooks();
                break;
            case 'dictionaries':
                await refreshDictionaries();
                break;
            case 'users':
                await refreshUsers();
                break;
        }
    } catch (error) {
        // 已在 fetchAdminResource 处理 401/403，这里防止未捕获异常刷日志
        const message = error?.message || '加载失败';
        if (panelName === 'books' && booksOutput) booksOutput.textContent = message;
        if (panelName === 'dictionaries') setStatusElement(dictionaryStatus, message, 'error');
        if (panelName === 'users' && usersOutput) usersOutput.textContent = message;
        console.warn('showPanel error:', error);
    }
}

loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginError.textContent = '正在登录...';
    try {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const result = await adminLogin(email, password);
        setAdminToken(result.token);
        showDashboard(email);
        loginError.textContent = '';
        await showPanel('books');
    } catch (error) {
        loginError.textContent = error.message;
    }
});

logoutBtn?.addEventListener('click', () => {
    clearAdminToken();
    showLogin();
});

refreshBooksBtn?.addEventListener('click', refreshBooks);
refreshDictionariesBtn?.addEventListener('click', refreshDictionaries);
refreshUsersBtn?.addEventListener('click', refreshUsers);
booksOutput?.addEventListener('click', handleBookListClick);
navLinks.forEach(link => {
    link.addEventListener('click', async () => {
        const panelName = link.dataset.panel;
        await showPanel(panelName);
        toggleSidebar(false);
    });
});
sidebarOpenBtn?.addEventListener('click', () => toggleSidebar(true));
sidebarCloseBtn?.addEventListener('click', () => toggleSidebar(false));

backBtn?.addEventListener('click', () => {
    window.location.href = 'index.html';
});

dictionaryTableBody?.addEventListener('click', async (event) => {
    const btn = event.target.closest('[data-action="export-dict"]');
    if (!btn) return;
    const dictId = btn.dataset.dictId;
    if (!dictId) return;
    setStatusElement(dictionaryStatus, `正在导出 ${dictId}...`, 'info');
    try {
        await downloadDictionaryCsv(dictId);
        setStatusElement(dictionaryStatus, '导出完成', 'success');
    } catch (error) {
        setStatusElement(dictionaryStatus, error.message || '导出失败', 'error');
    }
});

dictionaryImportForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const dictId = dictionaryImportSelect?.value || '';
    const file = dictionaryImportFile?.files?.[0];
    const submitBtn = dictionaryImportForm.querySelector('button[type="submit"]');
    if (!dictId) {
        setStatusElement(dictionaryImportStatus, '请选择要覆盖的词典', 'error');
        return;
    }
    if (!file) {
        setStatusElement(dictionaryImportStatus, '请上传 CSV 文件', 'error');
        return;
    }
    submitBtn && (submitBtn.disabled = true);
    setStatusElement(dictionaryImportStatus, '正在导入并覆盖...', 'info');
    try {
        const formData = new FormData();
        formData.set('file', file);
        const response = await fetch(`${API_BASE}/dictionaries/${encodeURIComponent(dictId)}/import_csv`, {
            method: 'POST',
            headers: authHeaders(),
            body: formData
        });
        let data = {};
        try { data = await response.json(); } catch (e) {}
        if (response.status === 401 || response.status === 403) {
            clearAdminToken();
            showLogin();
            throw new Error('登录已过期，请重新登录');
        }
        if (!response.ok) {
            throw new Error(data.error || `导入失败 (HTTP ${response.status})`);
        }
        setStatusElement(dictionaryImportStatus, data.message || '导入成功', 'success');
        dictionaryImportForm.reset();
        await refreshDictionaries();
    } catch (error) {
        setStatusElement(dictionaryImportStatus, error.message || '导入失败', 'error');
    } finally {
        submitBtn && (submitBtn.disabled = false);
    }
});

dictionaryCreateForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const dictId = (dictionaryCreateIdInput?.value || '').trim();
    const name = (dictionaryCreateNameInput?.value || '').trim();
    const file = dictionaryCreateFileInput?.files?.[0];
    const submitBtn = dictionaryCreateForm.querySelector('button[type="submit"]');
    if (!dictId || !name) {
        setStatusElement(dictionaryCreateStatus, '请填写 id 和 name', 'error');
        return;
    }
    if (!file) {
        setStatusElement(dictionaryCreateStatus, '请上传 CSV 文件', 'error');
        return;
    }
    submitBtn && (submitBtn.disabled = true);
    setStatusElement(dictionaryCreateStatus, '正在创建词典...', 'info');
    try {
        const formData = new FormData();
        formData.set('id', dictId);
        formData.set('name', name);
        formData.set('file', file);
        const response = await fetch(`${API_BASE}/dictionaries`, {
            method: 'POST',
            headers: authHeaders(),
            body: formData
        });
        let data = {};
        try { data = await response.json(); } catch (e) {}
        if (response.status === 401 || response.status === 403) {
            clearAdminToken();
            showLogin();
            throw new Error('登录已过期，请重新登录');
        }
        if (!response.ok) {
            throw new Error(data.error || `创建失败 (HTTP ${response.status})`);
        }
        setStatusElement(dictionaryCreateStatus, data.message || '创建成功', 'success');
        dictionaryCreateForm.reset();
        await refreshDictionaries();
    } catch (error) {
        setStatusElement(dictionaryCreateStatus, error.message || '创建失败', 'error');
    } finally {
        submitBtn && (submitBtn.disabled = false);
    }
});

pageDeleteBookSelect?.addEventListener('change', async () => {
    const bookId = pageDeleteBookSelect.value;
    if (!bookId) {
        if (pageDeletePageSelect) pageDeletePageSelect.innerHTML = '';
        if (deleteSelectedPagesBtn) deleteSelectedPagesBtn.disabled = true;
        setPageDeleteStatus('请选择书籍以加载页码', 'info');
        await loadChaptersForBook('');
        return;
    }
    await loadPageNumbersForBook(bookId);
    await loadChaptersForBook(bookId);
});

refreshPageListBtn?.addEventListener('click', async () => {
    const bookId = pageDeleteBookSelect?.value;
    if (bookId) {
        await loadPageNumbersForBook(bookId);
        await loadChaptersForBook(bookId);
    } else {
        await refreshBooks();
    }
});

deleteSelectedPagesBtn?.addEventListener('click', async () => {
    const bookId = pageDeleteBookSelect?.value;
    if (!bookId) {
        setPageDeleteStatus('请选择书籍', 'error');
        return;
    }
    if (!pageDeletePageSelect) return;
    const selected = Array.from(pageDeletePageSelect.selectedOptions)
        .map(opt => parseInt(opt.value, 10))
        .filter(Number.isInteger);
    if (!selected.length) {
        setPageDeleteStatus('请选择需要删除的页码', 'error');
        return;
    }
    const confirmed = window.confirm(`确认删除《${bookId}》中的 ${selected.length} 个页面？该操作不可撤销。`);
    if (!confirmed) return;

    deleteSelectedPagesBtn.disabled = true;
    setPageDeleteStatus('正在删除选中页...', 'info');
    try {
        await adminDeletePages(bookId, selected);
        setPageDeleteStatus('已删除所选页面', 'success');
        await loadPageNumbersForBook(bookId);
        await loadChaptersForBook(bookId);
        await refreshBooks();
    } catch (error) {
        setPageDeleteStatus(error.message || '删除失败', 'error');
    } finally {
        deleteSelectedPagesBtn.disabled = false;
    }
});

pageDeletePageSelect?.addEventListener('change', () => {
    if (!chapterStartPageSelect || !pageDeletePageSelect) return;
    const selected = Array.from(pageDeletePageSelect.selectedOptions).map(opt => opt.value).filter(Boolean);
    if (!selected.length) return;
    if (!chapterSelect || !chapterSelect.value) {
        chapterStartPageSelect.value = selected[0];
    }
});

pdfUploadForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const originValue = (pdfOriginSelect?.value || 'default').trim() || 'default';
    const files = Array.from(pdfFileInput?.files || []);
    if (!files.length) {
        updatePdfUploadStatus('请先选择要上传的文件', 'error');
        return;
    }

    const isMinerU = originValue.toLowerCase() === 'mineru';
    if (isMinerU) {
        const invalid = files.find(f => {
            const name = (f.name || '').toLowerCase();
            return !name.endsWith('.html') && !name.endsWith('.htm');
        });
        if (invalid) {
            updatePdfUploadStatus('MinerU 仅支持上传 HTML 文件', 'error');
            return;
        }
        updatePdfUploadStatus('正在上传 HTML 数据，请稍候...', 'info');
    } else {
        const invalid = files.find(f => !(f.name || '').toLowerCase().endsWith('.pdf'));
        if (invalid) {
            updatePdfUploadStatus('default 模式仅支持 PDF 文件', 'error');
            return;
        }
        updatePdfUploadStatus('正在上传 PDF 数据，请稍候...', 'info');
    }

    let baseFormData;
    if (isMinerU) {
        const sorted = files.sort((a, b) => {
            const num = (name) => { const m = /\d+/.exec(name); return m ? parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER; };
            const an = num((a.name || '').toLowerCase());
            const bn = num((b.name || '').toLowerCase());
            if (an === bn) return (a.name || '').localeCompare(b.name || '');
            return an - bn;
        });
        baseFormData = new FormData();
        baseFormData.set('origin', originValue);
        baseFormData.set('title', pdfTitleInput?.value || '');
        baseFormData.set('book_id', pdfBookIdInput?.value || '');
        baseFormData.set('default_dictionary_id', pdfDictInput?.value || '');
        baseFormData.set('description', pdfDescInput?.value || '');
        sorted.forEach(file => baseFormData.append('file', file));
    } else {
        baseFormData = new FormData(pdfUploadForm);
        baseFormData.set('origin', originValue);
    }

    let allowAppend = false;
    let overwriteConflicts = false;

    while (true) {
        try {
            const result = await uploadPdfViaApi(baseFormData, { allowAppend, overwriteConflicts });
            const title = result?.book?.title || '新书籍';
            const pages = result?.book?.pageCount ?? '未知';
            updatePdfUploadStatus(`成功导入《${title}》，共 ${pages} 页`, 'success');
            pdfUploadForm.reset();
            await refreshBooks();
            break;
        } catch (error) {
            if (error.code === 409 && error.payload?.needsAppendConfirm) {
                const ok = window.confirm(error.payload.error || '已有此书籍，是否增补上传？');
                if (!ok) {
                    updatePdfUploadStatus('已取消增补上传', 'info');
                    break;
                }
                allowAppend = true;
                continue;
            }
            if (error.code === 409 && error.payload?.needsOverwriteConfirm) {
                const conflicts = error.payload.conflicts || [];
                const conflictText = conflicts.length ? `冲突页码: ${conflicts.join(', ')}` : '';
                const ok = window.confirm(`${error.payload.error || '存在页码冲突，是否覆盖？'}${conflictText ? `\n${conflictText}` : ''}`);
                if (!ok) {
                    updatePdfUploadStatus('已取消覆盖冲突页', 'info');
                    break;
                }
                allowAppend = true;
                overwriteConflicts = true;
                continue;
            }
            updatePdfUploadStatus(error.message || '上传失败', 'error');
            break;
        }
    }
});

if (chapterStatus) setChapterStatus('请选择书籍以编辑章节', 'info');

(function attemptAutoAdminLogin() {
    const token = getAdminToken();
    if (!token) {
        showLogin();
        return;
    }
    showDashboard('管理员');
    showPanel('books').catch(() => {
        clearAdminToken();
        showLogin();
    });
})();
chapterSelect?.addEventListener('change', () => {
    const selectedId = chapterSelect.value;
    if (!selectedId) {
        resetChapterForm(true);
        setChapterStatus('当前为创建新章节模式', 'info');
        return;
    }
    const chapter = cachedChapters.find(ch => String(ch.id) === selectedId);
    if (chapter) {
        fillChapterForm(chapter);
        setChapterStatus(`正在编辑章节 #${chapter.chapterNumber ?? '?'} · ${chapter.title || ''}`, 'info');
    } else {
        resetChapterForm(true);
    }
});

chapterResetBtn?.addEventListener('click', () => {
    if (chapterSelect) chapterSelect.value = '';
    resetChapterForm();
});

chapterForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const bookId = pageDeleteBookSelect?.value;
    if (!bookId) {
        setChapterStatus('请先选择书籍', 'error');
        return;
    }
    const chapterNumber = parseInt(chapterNumberInput?.value ?? '', 10);
    const title = (chapterTitleInput?.value || '').trim();
    const summary = (chapterSummaryInput?.value || '').trim();
    const startPageValue = chapterStartPageSelect?.value ?? '';
    const startPage = startPageValue === '' ? null : parseInt(startPageValue, 10);

    if (!Number.isInteger(chapterNumber) || chapterNumber < 0) {
        setChapterStatus('章节号必须为非负整数', 'error');
        return;
    }
    if (!title) {
        setChapterStatus('标题不能为空', 'error');
        return;
    }
    if (!Number.isInteger(startPage) || startPage < 0) {
        setChapterStatus('起始页必须为非负整数', 'error');
        return;
    }

    const payload = {
        chapter_id: chapterSelect?.value || undefined,
        chapter_number: chapterNumber,
        title,
        summary,
        start_page: startPage
    };

    chapterSaveBtn && (chapterSaveBtn.disabled = true);
    setChapterStatus('正在保存章节...', 'info');
    try {
        await saveChapter(bookId, payload);
        setChapterStatus('章节保存成功', 'success');
        await loadChaptersForBook(bookId);
    } catch (error) {
        setChapterStatus(error.message || '保存失败', 'error');
    } finally {
        chapterSaveBtn && (chapterSaveBtn.disabled = false);
    }
});
