let isLoginView = true;
const PASSWORD_REGEX = /^[a-zA-Z0-9_]+$/;

const errorDiv = document.getElementById('error-message');
const successDiv = document.getElementById('success-message');
const passwordHint = document.getElementById('passwordHint');

function setViewMode(loginMode) {
    isLoginView = loginMode;
    document.getElementById('formTitle').textContent = isLoginView ? 'Вход в аккаунт' : 'Создание аккаунта';
    document.getElementById('submitBtn').textContent = isLoginView ? 'Войти' : 'Зарегистрироваться';
    document.getElementById('toggleBtn').textContent = isLoginView ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти';
    document.getElementById('password').autocomplete = isLoginView ? 'current-password' : 'new-password';
    passwordHint.style.display = isLoginView ? 'none' : 'block';
    errorDiv.style.display = 'none';
}

document.getElementById('toggleBtn').addEventListener('click', () => {
    successDiv.style.display = 'none';
    setViewMode(!isLoginView);
});

document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const submitBtn = document.getElementById('submitBtn');

    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';

    if (!isLoginView && !PASSWORD_REGEX.test(password)) {
        errorDiv.textContent = 'Пароль может содержать только латинские буквы, цифры и знак нижнего подчеркивания (_)';
        errorDiv.style.display = 'block';
        return;
    }

    const url = isLoginView ? '/users/login' : '/users/register';

    try {
        submitBtn.disabled = true;

        const data = await fetchApi(url, {
            method: 'POST',
            body: { email, password }
        });

        if (isLoginView && data && data.token) {
            localStorage.setItem('token', data.token);
            window.location.href = 'main.html';
        } else if (!isLoginView) {
            setViewMode(true);
            successDiv.textContent = 'Регистрация успешна! Теперь войдите в аккаунт.';
            successDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = error.message || 'Ошибка сети или сервера';
        errorDiv.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
    }
});