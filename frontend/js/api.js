const API_URL = '/api';

const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23f2eedf' width='400' height='300'/%3E%3Ctext fill='%23888888' font-family='sans-serif' font-size='18' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3E%D0%9D%D0%B5%D1%82 %D1%84%D0%BE%D1%82%D0%BE%3C/text%3E%3C/svg%3E";

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function parseJwtPayload(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
        const json = decodeURIComponent(
            atob(padded)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
}

function getToken() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = parseJwtPayload(token);
    if (payload && payload.exp && payload.exp * 1000 <= Date.now()) {
        localStorage.removeItem('token');
        return null;
    }
    return token;
}

function getUserEmail() {
    const token = getToken();
    if (!token) return null;
    const payload = parseJwtPayload(token);
    return (payload && payload.sub) ? payload.sub : null;
}

function clearToken() {
    localStorage.removeItem('token');
}

function extractErrorMessage(rawText, status) {
    if (!rawText) return `Ошибка HTTP: ${status}`;
    try {
        const parsed = JSON.parse(rawText);
        return parsed.message || parsed.error || parsed.detail || rawText;
    } catch (e) {
        return rawText;
    }
}

function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.25s';
        setTimeout(() => toast.remove(), 260);
    }, 3200);
}

async function fetchApi(endpoint, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = { ...options, headers };
    if (options.body !== undefined && typeof options.body === 'object' && options.body !== null) {
        config.body = JSON.stringify(options.body);
    }

    const response = await fetch(`${API_URL}${endpoint}`, config);

    // Spring Security возвращает 403 при отсутствии/невалидности JWT на защищённых маршрутах
    if (response.status === 401 || (response.status === 403 && endpoint !== '/users/login' && endpoint !== '/users/register')) {
        const errText = await response.text();
        if (endpoint === '/users/login') {
            const err = new Error(extractErrorMessage(errText, 401) || 'Неверный email или пароль');
            err.status = 401;
            throw err;
        }
        clearToken();
        const isPublicPage = window.location.pathname.includes('login.html') ||
            window.location.pathname.includes('main.html') ||
            window.location.pathname.endsWith('/');
        if (!isPublicPage) {
            window.location.href = 'login.html';
            return null;
        }
        const err = new Error('Сессия истекла. Войдите в аккаунт заново.');
        err.status = response.status;
        throw err;
    }

    if (!response.ok) {
        const errorText = await response.text();
        const message = extractErrorMessage(errorText, response.status);
        const err = new Error(message);
        err.status = response.status;
        throw err;
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
        return null;
    }

    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch (e) {
        return text;
    }
}

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
    const token = getToken();
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.status === 401 || response.status === 403) {
        clearToken();
        window.location.href = 'login.html';
        return;
    }

    if (!response.ok) {
        const errText = await response.text();
        showToast(extractErrorMessage(errText, response.status) || 'Ошибка скачивания PDF', 'error');
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
    showToast(`Файл ${filename} скачан`, 'success');
}