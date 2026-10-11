import React, { useState } from 'react';
import './AuthPage.css';

// Базовый URL твоего сервера
const BASE_URL = '';
const REGISTER_URL = `${BASE_URL}/api/users/register`;
const LOGIN_URL = `${BASE_URL}/api/users/login`;

export const AuthPage: React.FC = () => {
  const [isLoginView, setIsLoginView] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const sendAuthRequest = async (url: string, isRegister: boolean) => {
    setIsLoading(true);
    setError(null);

    const payload = {
      email: email,
      password: password
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Читаем тело ответа как текст, так как бэкенд возвращает строки для ошибок
      const responseText = await response.text();

      if (response.ok) { // Проверяет статусы 200-299
        if (isRegister) {
          alert('Регистрация прошла успешно! Теперь вы можете войти.');
          setIsLoginView(true);
          setPassword('');
        } else {
          // При успешном логине бэкенд возвращает JSON с токеном
          // Но так как мы прочитали ответ как текст, распарсим его обратно
          try {
            const data = JSON.parse(responseText);
            if (data.token) {
              localStorage.setItem('authToken', data.token);
              // Перенаправляем на главную
              window.location.href = '/main'; 
            } else {
              setError('Сервер не вернул токен авторизации.');
            }
          } catch (e) {
            setError('Ошибка при обработке ответа сервера.');
          }
        }
      } else {
        // Обработка ошибок 400 и 401
        setError(responseText || 'Произошла ошибка. Проверьте введенные данные.');
      }
    } catch (err) {
      console.error('Network error:', err);
      setError('Ошибка сети. Проверьте подключение к серверу.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Пожалуйста, заполните все поля.');
      return;
    }

    if (isLoginView) {
      sendAuthRequest(LOGIN_URL, false);
    } else {
      sendAuthRequest(REGISTER_URL, true);
    }
  };

  const handleContinueWithoutAuth = () => {
    // Редирект на главную без токена
    window.location.href = '/main'; 
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Food-Tinder</h1>
        <p className="auth-subtitle">
          {isLoginView ? 'Вход в аккаунт' : 'Создание аккаунта'}
        </p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@planfood.com"
              required
            />
          </div>

          <div className="input-group">
            <label>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password123_"
              required
            />
            {!isLoginView && (
              <small className="password-hint">
                Только латинские буквы, цифры и знак подчеркивания
              </small>
            )}
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Загрузка...' : isLoginView ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="auth-actions">
          <button 
            type="button" 
            className="btn-toggle" 
            onClick={() => {
              setIsLoginView(!isLoginView);
              setError(null);
            }}
          >
            {isLoginView ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          </button>
          
          <button 
            type="button" 
            className="btn-guest" 
            onClick={handleContinueWithoutAuth}
          >
            Продолжить без авторизации
          </button>
        </div>
      </div>
    </div>
  );
};