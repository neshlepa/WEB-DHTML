let isLoginView = true;

document.getElementById('toggleBtn').addEventListener('click', () => {
    isLoginView = !isLoginView;
    document.getElementById('formTitle').textContent = isLoginView ? 'Вход в аккаунт' : 'Создание аккаунта';
    document.getElementById('submitBtn').textContent = isLoginView ? 'Войти' : 'Зарегистрироваться';
    document.getElementById('toggleBtn').textContent = isLoginView ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти';
    document.getElementById('error-message').style.display = 'none';
});

document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const url = isLoginView ? '/users/login' : '/users/register';
    const submitBtn = document.getElementById('submitBtn');
    
    try {
        submitBtn.disabled = true;
        document.getElementById('error-message').style.display = 'none';

        const data = await fetchApi(url, {
            method: 'POST',
            body: { email, password }
        });

        if (isLoginView && data && data.token) {
            localStorage.setItem('token', data.token);
            window.location.href = 'main.html';
        } else if (!isLoginView) {
            alert('Регистрация успешна! Теперь войдите.');
            document.getElementById('toggleBtn').click();
        }
    } catch (error) {
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = error.message || 'Ошибка сети или сервера';
        errorDiv.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
    }
});