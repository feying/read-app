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
const dictionariesOutput = document.getElementById('admin-dictionaries');
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

const ADMIN_TOKEN_KEY = 'admin_token';
const HTML_ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

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
        throw new Error('未授权，或登录已过期');
    }
    if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
    }
    return response.json();
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
        // ignore non-JSON responses
    }
    if (response.status === 401 || response.status === 403) {
        clearAdminToken();
        showLogin();
        throw new Error('登录已过期，请重新登录');
    }
    if (!response.ok) {
        const message = (data && data.error) || `删除失败 (HTTP ${response.status})`;
        throw new Error(message);
    }
    return data;
}

function showDashboard(email) {
    identityLabel.textContent = email || '管理员';
    loginPanel.classList.add('hidden');
    dashboard.classList.remove('hidden');
}

function showLogin() {
    dashboard.classList.add('hidden');
    loginPanel.classList.remove('hidden');
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

async function refreshDictionaries() {
    dictionariesOutput.textContent = 'Loading...';
    try {
        const data = await fetchAdminResource('/dictionaries');
        dictionariesOutput.textContent = JSON.stringify(data.items, null, 2);
    } catch (error) {
        dictionariesOutput.textContent = error.message;
    }
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

async function uploadPdfViaApi(formData) {
    const response = await fetch(`${API_BASE}/books/upload_pdf`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData
    });
    let data = {};
    try {
        data = await response.json();
    } catch (error) {
        // ignore, we will handle below
    }
    if (response.status === 401 || response.status === 403) {
        clearAdminToken();
        showLogin();
        throw new Error('登录已过期，请重新登录');
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

pdfUploadForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const originValue = (pdfOriginSelect?.value || 'default').trim() || 'default';
    const files = Array.from(pdfFileInput?.files || []);
    if (!files.length) {
        updatePdfUploadStatus('请选择要上传的文件', 'error');
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
        updatePdfUploadStatus('正在上传 HTML 内容，请稍候...', 'info');
    } else {
        const invalid = files.find(f => !(f.name || '').toLowerCase().endsWith('.pdf'));
        if (invalid) {
            updatePdfUploadStatus('default 模式仅支持 PDF 文件', 'error');
            return;
        }
        updatePdfUploadStatus('正在上传 PDF 内容，请稍候...', 'info');
    }

    let formData;
    if (isMinerU) {
        const sorted = files.sort((a, b) => {
            const num = (name) => { const m = /\d+/.exec(name); return m ? parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER; };
            const an = num((a.name || '').toLowerCase());
            const bn = num((b.name || '').toLowerCase());
            if (an === bn) return (a.name || '').localeCompare(b.name || '');
            return an - bn;
        });
        formData = new FormData();
        formData.set('origin', originValue);
        formData.set('title', pdfTitleInput?.value || '');
        formData.set('book_id', pdfBookIdInput?.value || '');
        formData.set('default_dictionary_id', pdfDictInput?.value || '');
        formData.set('description', pdfDescInput?.value || '');
        sorted.forEach(file => formData.append('file', file));
    } else {
        formData = new FormData(pdfUploadForm);
        formData.set('origin', originValue);
    }

    try {
        const result = await uploadPdfViaApi(formData);
        const title = result?.book?.title || '新书籍';
        const pages = result?.book?.pageCount ?? '若干';
        updatePdfUploadStatus(`成功导入「${title}」，共 ${pages} 页`, 'success');
        pdfUploadForm.reset();
        await refreshBooks();
    } catch (error) {
        updatePdfUploadStatus(error.message || '上传失败', 'error');
    }
});

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
