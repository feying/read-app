// --- 后端 API 通信模块 ---

const API_BASE_URL = 'http://127.0.0.1:5000/api';

// --- 新增：获取书库 ---
async function getLibrary() {
    try {
        const response = await fetch(`${API_BASE_URL}/library`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data; // 返回书库对象
    } catch (error) {
        console.error('获取书库失败:', error);
        throw error; // 抛出错误，让调用者处理
    }
}

// --- 新增：获取词典 ---
async function getDictionaries() {
    try {
        const response = await fetch(`${API_BASE_URL}/dictionaries`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data; // 返回词典对象
    } catch (error) {
        console.error('获取词典失败:', error);
        throw error; // 抛出错误，让调用者处理
    }
}

// 用户注册
async function registerUser(email, password) {
// ... (此部分及以下的用户函数保持不变) ...
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

// 用户登录
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

// 更新 API Key
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

// 更新阅读进度
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

// 获取阅读进度
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

export { 
    getLibrary, // 新增
    getDictionaries, // 新增
    registerUser, 
    loginUser, 
    updateUserApiKey, 
    updateReadingProgress, 
    getReadingProgress 
};