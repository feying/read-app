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

const ADMIN_TOKEN_KEY = 'admin_token';

function getAdminToken() {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
}

function setAdminToken(token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

function clearAdminToken() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
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
    booksOutput.textContent = '加载中...';
    try {
        const data = await fetchAdminResource('/books');
        booksOutput.textContent = JSON.stringify(data.items, null, 2);
    } catch (error) {
        booksOutput.textContent = error.message;
    }
}

async function refreshDictionaries() {
    dictionariesOutput.textContent = '加载中...';
    try {
        const data = await fetchAdminResource('/dictionaries');
        dictionariesOutput.textContent = JSON.stringify(data.items, null, 2);
    } catch (error) {
        dictionariesOutput.textContent = error.message;
    }
}

async function refreshUsers() {
    usersOutput.textContent = '加载中...';
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
