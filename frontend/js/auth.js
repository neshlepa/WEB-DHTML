// Внимание: Так как мы убрали Vite Proxy, теперь мы ОБЯЗАНЫ использовать полный URL!
const API_URL = 'http://132.243.17.175/api/users';

let isLoginView = true;
const form = document.getElementById('authForm');
const title = document.getElementById('formTitle');
const toggleBtn = document.getElementById('toggleBtn');
const submitBtn = document.getElementById('submitBtn');
const errorDiv = document.getElementById('error-message');

// Переключение между Входом и Регистрацией
toggleBtn.addEventListener('click', () => {
    isLoginView = !isLoginView;
    title.textContent = isLoginView ? 'Вход в аккаунт' : 'Создание аккаунта';
    submitBtn.textContent = isLoginView ? 'Войти' : 'Зарегистрироваться';
    toggleBtn.textContent = isLoginView ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти';
    errorDiv.style.display = 'none'; // Скрываем ошибку при переключении
});

// Обработка отправки формы
form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Останавливаем перезагрузку страницы
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const url = isLoginView ? `${API_URL}/login` : `${API_URL}/register`;
    
    try {
        submitBtn.textContent = 'Загрузка...';
        submitBtn.disabled = true;
        errorDiv.style.display = 'none';

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const textData = await response.text(); // Читаем ответ как текст (чтобы поймать HTML ошибки Nginx)

        if (response.ok) {
            if (isLoginView) {
                // Если это вход, сервер возвращает JSON с токеном
                try {
                    const data = JSON.parse(textData);
                    if (data.token) {
                        localStorage.setItem('token', data.token); // Сохраняем токен
                        window.location.href = 'main.html'; // Переходим на главную
                    } else {
                        showError('Сервер не вернул токен');
                    }
                } catch (e) {
                    showError('Ошибка формата ответа сервера');
                }
            } else {
                // Если это регистрация
                alert('Регистрация успешна! Теперь войдите.');
                isLoginView = true;
                title.textContent = 'Вход в аккаунт';
                submitBtn.textContent = 'Войти';
                toggleBtn.textContent = 'Нет аккаунта? Зарегистрироваться';
            }
        } else {
            // Если ошибка (400, 401, 502 и т.д.)
            if (textData.includes('<html>')) {
                showError('Сервер временно недоступен (502). Попробуйте позже.');
            } else {
                showError(textData); // Показываем текст ошибки от бэкенда
            }
        }
    } catch (error) {
        showError('Ошибка сети. Проверьте подключение.');
    } finally {
        submitBtn.textContent = isLoginView ? 'Войти' : 'Зарегистрироваться';
        submitBtn.disabled = false;
    }
});

function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}