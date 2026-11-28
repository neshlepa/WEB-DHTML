let isLoginView = true;
const PASSWORD_REGEX = /^[a-zA-Z0-9_]{8,}$/;

const errorDiv = document.getElementById('error-message');
const successDiv = document.getElementById('success-message');
const passwordHint = document.getElementById('passwordHint');

const authForm = document.getElementById('authForm');
const verifyForm = document.getElementById('verifyForm');
const forgotForm = document.getElementById('forgotForm');
const resetForm = document.getElementById('resetForm');

const toggleBtn = document.getElementById('toggleBtn');
const forgotLink = document.getElementById('forgotLink');
const backToLoginBtn = document.getElementById('backToLoginBtn');

let pendingEmail = ''; // email, для которого ждём код

function hideAllMessages() {
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
}

function showError(text) {
    successDiv.style.display = 'none';
    errorDiv.textContent = text;
    errorDiv.style.display = 'block';
}

function showSuccess(text) {
    errorDiv.style.display = 'none';
    successDiv.textContent = text;
    successDiv.style.display = 'block';
}

function setAuthView() {
    authForm.style.display = 'block';
    verifyForm.style.display = 'none';
    forgotForm.style.display = 'none';
    resetForm.style.display = 'none';
    toggleBtn.style.display = 'inline-block';
    forgotLink.style.display = 'inline-block';
    backToLoginBtn.style.display = 'none';
    document.getElementById('formTitle').textContent = isLoginView ? 'Вход в аккаунт' : 'Создание аккаунта';
    document.getElementById('submitBtn').textContent = isLoginView ? 'Войти' : 'Зарегистрироваться';
    toggleBtn.textContent = isLoginView ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти';
    document.getElementById('password').autocomplete = isLoginView ? 'current-password' : 'new-password';
    passwordHint.style.display = isLoginView ? 'none' : 'block';
    hideAllMessages();
}

function setVerifyView(email) {
    pendingEmail = email;
    authForm.style.display = 'none';
    verifyForm.style.display = 'block';
    forgotForm.style.display = 'none';
    resetForm.style.display = 'none';
    toggleBtn.style.display = 'none';
    forgotLink.style.display = 'none';
    backToLoginBtn.style.display = 'inline-block';
    document.getElementById('formTitle').textContent = 'Подтверждение email';
    document.getElementById('verifyEmailLabel').textContent = email;
    document.getElementById('verifyCode').value = '';
    hideAllMessages();
}

function setForgotView() {
    authForm.style.display = 'none';
    verifyForm.style.display = 'none';
    forgotForm.style.display = 'block';
    resetForm.style.display = 'none';
    toggleBtn.style.display = 'none';
    forgotLink.style.display = 'none';
    backToLoginBtn.style.display = 'inline-block';
    document.getElementById('formTitle').textContent = 'Сброс пароля';
    document.getElementById('forgotEmail').value = document.getElementById('email').value || '';
    hideAllMessages();
}

function setResetView(email) {
    pendingEmail = email;
    authForm.style.display = 'none';
    verifyForm.style.display = 'none';
    forgotForm.style.display = 'none';
    resetForm.style.display = 'block';
    toggleBtn.style.display = 'none';
    forgotLink.style.display = 'none';
    backToLoginBtn.style.display = 'inline-block';
    document.getElementById('formTitle').textContent = 'Новый пароль';
    document.getElementById('resetEmailLabel').textContent = email;
    document.getElementById('resetCode').value = '';
    document.getElementById('newPassword').value = '';
    hideAllMessages();
}

// Переключение вход ↔ регистрация
toggleBtn.addEventListener('click', () => {
    isLoginView = !isLoginView;
    setAuthView();
});

// «Забыли пароль?»
forgotLink.addEventListener('click', () => {
    setForgotView();
});

// «Вернуться ко входу»
backToLoginBtn.addEventListener('click', () => {
    isLoginView = true;
    setAuthView();
});

// ===== Вход / Регистрация =====
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const submitBtn = document.getElementById('submitBtn');

    hideAllMessages();

    if (!isLoginView && !PASSWORD_REGEX.test(password)) {
        showError('Пароль должен содержать минимум 8 символов (латинские буквы, цифры и знак _)');
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
            return;
        }

        if (!isLoginView) {
            // После регистрации сразу показываем форму ввода кода
            showSuccess(data?.message || 'Регистрация успешна! Проверьте почту.');
            setVerifyView(email);
            return;
        }
    } catch (error) {
        // Если при логине email не подтверждён — сервер вернёт 403 + EMAIL_NOT_VERIFIED
        if (error.code === 'EMAIL_NOT_VERIFIED' || error.status === 403) {
            const emailFromError = error.email || email;
            showError(error.message || 'Email не подтверждён. Введите код из письма.');
            setVerifyView(emailFromError);
            return;
        }
        showError(error.message || 'Ошибка сети или сервера');
    } finally {
        submitBtn.disabled = false;
    }
});

// ===== Подтверждение email =====
verifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('verifyCode').value.trim();
    const btn = document.getElementById('verifyBtn');
    hideAllMessages();

    if (!/^\d{6}$/.test(code)) {
        showError('Введите 6-значный код из письма');
        return;
    }

    try {
        btn.disabled = true;
        const data = await fetchApi('/users/verify-email', {
            method: 'POST',
            body: { email: pendingEmail, code }
        });
        showSuccess(typeof data === 'string' ? data : (data?.message || 'Email подтверждён! Теперь войдите.'));
        isLoginView = true;
        setAuthView();
        document.getElementById('email').value = pendingEmail;
    } catch (error) {
        showError(error.message || 'Не удалось подтвердить email');
    } finally {
        btn.disabled = false;
    }
});

// Повторная отправка кода подтверждения
document.getElementById('resendCodeBtn').addEventListener('click', async () => {
    hideAllMessages();
    const btn = document.getElementById('resendCodeBtn');
    try {
        btn.disabled = true;
        const data = await fetchApi('/users/resend-verification', {
            method: 'POST',
            body: { email: pendingEmail }
        });
        showSuccess(typeof data === 'string' ? data : 'Новый код отправлен на почту.');
    } catch (error) {
        showError(error.message || 'Не удалось отправить код');
    } finally {
        btn.disabled = false;
    }
});

// ===== Запрос кода для сброса пароля =====
forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value.trim();
    const btn = document.getElementById('forgotBtn');
    hideAllMessages();

    try {
        btn.disabled = true;
        const data = await fetchApi('/users/forgot-password', {
            method: 'POST',
            body: { email }
        });
        showSuccess(typeof data === 'string' ? data : 'Код отправлен на почту.');
        setResetView(email);
    } catch (error) {
        showError(error.message || 'Не удалось отправить код');
    } finally {
        btn.disabled = false;
    }
});

// ===== Сброс пароля =====
resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('resetCode').value.trim();
    const newPassword = document.getElementById('newPassword').value;
    const btn = document.getElementById('resetBtn');
    hideAllMessages();

    if (!/^\d{6}$/.test(code)) {
        showError('Введите 6-значный код из письма');
        return;
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
        showError('Пароль должен содержать минимум 8 символов (латинские буквы, цифры и знак _)');
        return;
    }

    try {
        btn.disabled = true;
        const data = await fetchApi('/users/reset-password', {
            method: 'POST',
            body: { email: pendingEmail, code, newPassword }
        });
        showSuccess(typeof data === 'string' ? data : 'Пароль успешно изменён! Теперь войдите.');
        isLoginView = true;
        setAuthView();
        document.getElementById('email').value = pendingEmail;
        document.getElementById('password').value = '';
    } catch (error) {
        showError(error.message || 'Не удалось сменить пароль');
    } finally {
        btn.disabled = false;
    }
});

// Стартовое состояние
setAuthView();
