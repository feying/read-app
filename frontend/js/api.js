const API_BASE_URL = 'http://127.0.0.1:5000/api';

let authToken = null;

function buildHeaders(headers = {}) {
    const combined = { ...headers };
    if (authToken) {
        combined['Authorization'] = `Bearer ${authToken}`;
    }
    return combined;
}

async function handleJsonResponse(response) {
    const data = await response.json().catch(() => ({}));
    const unauthorized = response.status === 401 || response.status === 403;
    return { success: response.ok, unauthorized, data };
}

async function fetchProtectedJson(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: options.method || 'GET',
        headers: buildHeaders(options.headers),
        body: options.body,
    });
    const data = await response.json().catch(() => ({}));
    if ((response.status === 401 || response.status === 403)) {
        const error = new Error('UNAUTHORIZED');
        error.data = data;
        throw error;
    }
    if (!response.ok) {
        const msg = data?.error || `HTTP error! status: ${response.status}`;
        throw new Error(msg);
    }
    return data;
}

async function getLibrary() {
    return fetchProtectedJson('/library');
}

async function getDictionaries() {
    return fetchProtectedJson('/dictionaries');
}

async function registerUser(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: buildHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ email, password })
        });
        return await handleJsonResponse(response);
    } catch (error) {
        console.error('注册失败:', error);
        return { success: false, data: { error: '无法连接服务器，请稍后再试' } };
    }
}

async function loginUser(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: buildHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ email, password })
        });
        return await handleJsonResponse(response);
    } catch (error) {
        console.error('登录失败:', error);
        return { success: false, data: { error: '无法连接服务器，请稍后再试' } };
    }
}

async function updateUserApiKey(userId, apiKey) {
    try {
        const response = await fetch(`${API_BASE_URL}/user/api_key`, {
            method: 'PUT',
            headers: buildHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ user_id: userId, api_key: apiKey })
        });
        return await handleJsonResponse(response);
    } catch (error) {
        console.error('更新 API Key 失败:', error);
        return { success: false, data: { error: '网络异常' } };
    }
}

async function updateReadingProgress(userId, bookId, currentPage, readingProgress) {
    try {
        const response = await fetch(`${API_BASE_URL}/user/progress`, {
            method: 'PUT',
            headers: buildHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
                user_id: userId,
                book_id: bookId,
                current_page: currentPage,
                reading_progress: readingProgress
            })
        });
        return await handleJsonResponse(response);
    } catch (error) {
        console.error('更新阅读进度失败:', error);
        return { success: false, data: { error: '网络异常' } };
    }
}

async function getReadingProgress(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/user/progress/${userId}`, {
            headers: buildHeaders()
        });
        return await handleJsonResponse(response);
    } catch (error) {
        console.error('获取阅读进度失败:', error);
        return { success: false, data: { error: '网络异常' } };
    }
}

async function getCurrentUser() {
    try {
        const response = await fetch(`${API_BASE_URL}/me`, {
            headers: buildHeaders()
        });
        return await handleJsonResponse(response);
    } catch (error) {
        console.error('获取当前用户信息失败:', error);
        return { success: false, data: { error: '网络异常' } };
    }
}

async function getBookPages(bookId, pageNumber, count = 1) {
    return fetchProtectedJson(`/books/${bookId}/pages/${pageNumber}?count=${count}`);
}

async function searchBook(bookId, query) {
    const encoded = encodeURIComponent(query);
    return fetchProtectedJson(`/books/${bookId}/search?q=${encoded}`);
}

function setAuthToken(token) {
    authToken = token;
}

function clearAuthToken() {
    authToken = null;
}

export {
    getLibrary,
    getDictionaries,
    registerUser,
    loginUser,
    updateUserApiKey,
    updateReadingProgress,
    getReadingProgress,
    getCurrentUser,
    getBookPages,
    searchBook,
    setAuthToken,
    clearAuthToken,
};
