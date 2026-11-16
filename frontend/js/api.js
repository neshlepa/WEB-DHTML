const API_URL = '/api'; // СТРОГО ТАК ДЛЯ ПРОДА!

async function fetchApi(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = { ...options, headers };
    if (options.body && typeof options.body === 'object') config.body = JSON.stringify(options.body);

    const response = await fetch(`${API_URL}${endpoint}`, config);

    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
        return null;
    }

    if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 400) throw { status: 400, message: errorText };
        throw new Error(errorText || `Ошибка HTTP: ${response.status}`);
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') return null;

    const text = await response.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch (e) { return text; }
}

async function downloadPdf(endpoint, filename) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}${endpoint}`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (response.status === 401) { window.location.href = 'login.html'; return; }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
}