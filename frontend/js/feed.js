// js/feed.js
const API_FEED = 'http://132.243.17.175/api/recipes/feed';
const token = localStorage.getItem('token');
const feedContainer = document.getElementById('feedContainer');

// Кнопка выхода
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
});

// Загрузка ленты
async function loadFeed() {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
        const res = await fetch(API_FEED, { headers });
        if (!res.ok) throw new Error('Ошибка загрузки');
        const recipes = await res.json();
        
        if (recipes.length === 0) {
            feedContainer.innerHTML = '<p>Рецепты закончились!</p>';
            return;
        }

        // Отрисовываем первую карточку (упрощенно)
        const recipe = recipes[0];
        feedContainer.innerHTML = `
            <div class="recipe-card">
                <img src="${recipe.photoUrl}" alt="${recipe.name}">
                <h2>${recipe.name}</h2>
                <p>Время: ${recipe.time} мин</p>
                <button onclick="react(${recipe.id}, 'LIKE')">❤️ Лайк</button>
                <button onclick="react(${recipe.id}, 'DISLIKE')">❌ Дизлайк</button>
            </div>
        `;
    } catch (err) {
        feedContainer.innerHTML = '<p>Ошибка сервера или сети.</p>';
    }
}

// Отправка реакции
async function react(recipeId, reactionType) {
    if (!token) {
        alert('Войдите, чтобы оценивать!');
        window.location.href = 'login.html';
        return;
    }

    try {
        await fetch(`http://132.243.17.175/api/recipes/${recipeId}/react`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reaction: reactionType })
        });
        // После успешной реакции можно загрузить следующий рецепт
        loadFeed(); 
    } catch (err) {
        console.error(err);
    }
}

// Запуск при загрузке страницы
loadFeed();