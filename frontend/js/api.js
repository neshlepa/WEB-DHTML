const API_URL = '/api'; // СТРОГО ТАК ДЛЯ ПРОДА!

function extractErrorMessage(rawText, status) {
    if (!rawText) return `Ошибка HTTP: ${status}`;
    try {
        const parsed = JSON.parse(rawText);
        return parsed.message || parsed.error || parsed.detail || rawText;
    } catch (e) {
        return rawText;
    }
}

async function fetchApi(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = { ...options, headers };
    if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
    }

    const response = await fetch(`${API_URL}${endpoint}`, config);

    if (response.status === 401) {
        localStorage.removeItem('token');
        const isLoginPage = window.location.pathname.includes('login.html');
        if (!isLoginPage && endpoint !== '/users/login') {
            window.location.href = 'login.html';
            return null;
        }
        const errText = await response.text();
        throw { status: 401, message: extractErrorMessage(errText, 401) || 'Неверный email или пароль' };
    }

    if (!response.ok) {
        const errorText = await response.text();
        const message = extractErrorMessage(errorText, response.status);
        const err = new Error(message);
        err.status = response.status;
        throw err;
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') return null;

    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch (e) {
        return text;
    }
}

// Универсальное извлечение массива (поддерживает List, Spring Page {content: []}, {recipes: []} и т.д.)
function normalizeArray(data, keys = ['content', 'recipes', 'items', 'cells', 'data']) {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
        for (const key of keys) {
            if (Array.isArray(data[key])) return data[key];
        }
    }
    return [];
}

async function downloadPdf(endpoint, filename) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}${endpoint}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
        return;
    }
    if (!response.ok) {
        alert(`Ошибка скачивания PDF: ${response.status}`);
        return;
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
}