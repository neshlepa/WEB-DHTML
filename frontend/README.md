<div align="center">

# 🍔 Food-Tinder (Frontend)

**Веб-клиент для приложения по подбору рецептов (аналог Tinder для еды)**

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/ru/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/ru/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/ru/docs/Web/JavaScript)
[![GitHub branch](https://img.shields.io/badge/branch-frontend--dev-success)](https://github.com/neshlepa/WEB-DHTML/tree/frontend-dev)

</div>

---

## 📖 О проекте

SPA-приложение (Single Page Application) для поиска и оценки блюд. Пользователь может проходить авторизацию, настраивать свой профиль (аллергены, диеты, биометрия) и свайпать рецепты, получая персональную ленту.

> [!IMPORTANT]  
> **Текущий статус:** Фронтенд написан на чистом HTML/CSS/JS (в соответствии с ТЗ) и готов к работе. 
> На данный момент тестирование заблокировано, так как удаленный сервер возвращает `502 Bad Gateway` (упал контейнер Spring Boot). Как только бэкенд будет поднят, функционал заработает в полном объеме.

---

## 📑 Содержание
- [Стек технологий](#-стек-технологий)
- [Реализованный функционал](#-реализованный-функционал)
- [Структура проекта](#-структура-проекта)
- [Инструкция по запуску (Local Dev)](#-инструкция-по-запуску-local-dev)
- [Особенности работы с API и CORS](#-особенности-работы-с-api-и-cors)
- [Troubleshooting (Частые ошибки)](#-troubleshooting-частые-ошибки)
- [Git Workflow](#-git-workflow)

---

## 🛠 Стек технологий
* **HTML5** — семантическая разметка страниц.
* **CSS3** — стилизация по макетам дизайнера (без тяжелых UI-фреймворков).
* **Vanilla JavaScript (ES6+)** — логика приложения, работа с DOM и асинхронные запросы (`fetch`).

---

## ✨ Реализованный функционал

### 🔐 Аутентификация (`login.html`)
* Переключение между режимами «Вход» и «Регистрация» без перезагрузки страницы.
* Отправка JSON на `/api/users/register` и `/api/users/login`.
* Обработка ошибок от бэкенда (400, 401) с красивым выводом в UI.
* Сохранение JWT-токена в `localStorage`.
* Режим «Гостя» (продолжить без авторизации).

### 👤 Профиль пользователя (`profile.html`)
* Защита страницы (редирект на `login.html` при отсутствии токена).
* Загрузка данных (`GET /api/users/profile`) и их обновление (`PUT /api/users/profile`).
* Блокировка поля `email` для редактирования.
* Удобный выбор аллергенов и предпочтений.

### 🃏 Лента рецептов (`main.html`)
* Интеграция с эндпоинтом `GET /api/recipes/feed`.
* Отображение карточек с КБЖУ, сложностью и временем готовки.
* Отправка реакций на кнопки (Лайк, Дизлайк, Избранное) через `POST /api/recipes/{id}/react`.
* Раскрывающийся блок с ингредиентами и инструкцией.

---

## 📂 Структура проекта

```text
frontend/
├── css/
│   └── style.css        # Все стили приложения
├── js/
│   ├── auth.js          # Логика входа и регистрации
│   ├── feed.js          # Логика ленты рецептов и свайпов
│   └── profile.js       # Логика загрузки и сохранения профиля
├── login.html           # Страница авторизации
├── main.html            # Главная страница (лента рецептов)
├── profile.html         # Личный кабинет
└── README.md