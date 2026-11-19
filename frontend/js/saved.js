let activeTab = 'favorites';
const savedCache = {
    favorites: null,
    likes: null
};

document.addEventListener('DOMContentLoaded', () => {
    if (!getToken()) {
        renderAuthRequired(
            document.getElementById('savedWrapper'),
            'Войдите в аккаунт, чтобы просматривать избранные и понравившиеся рецепты.'
        );
        return;
    }
    loadTab('favorites');
});

async function switchTab(tab) {
    activeTab = tab;
    document.getElementById('tabFavorites').classList.toggle('active', tab === 'favorites');
    document.getElementById('tabLikes').classList.toggle('active', tab === 'likes');
    await loadTab(tab);
}

async function loadTab(tab) {
    const content = document.getElementById('savedContent');
    content.innerHTML = '<div class="loading">Загрузка рецептов...</div>';

    try {
        const endpoint = tab === 'favorites' ? '/recipes/favorites' : '/recipes/likes';
        const res = await fetchApi(endpoint);
        const list = normalizeArray(res);
        savedCache[tab] = list;
        renderSavedList(list, tab);
    } catch (err) {
        content.innerHTML = `<div class="saved-empty"><p style="color:#c62828;">Ошибка загрузки: ${escapeHtml(err.message)}</p></div>`;
    }
}

function renderSavedList(list, tab) {
    const content = document.getElementById('savedContent');

    if (list.length === 0) {
        const emptyText = tab === 'favorites'
            ? 'В избранном пока пусто. Свайпайте карточки вверх (★) на главной странице, чтобы откладывать рецепты.'
            : 'Вы еще не поставили лайк ни одному блюду. Свайпайте карточки вправо (❤️) на главной странице.';
        content.innerHTML = `
            <div class="saved-empty">
                <p style="margin-bottom: 18px;">${emptyText}</p>
                <button type="button" class="btn-orange" onclick="window.location.href='main.html'">Перейти к поиску блюд</button>
            </div>
        `;
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'saved-grid';

    list.forEach(recipe => {
        const diff = Math.min(5, Math.max(1, Number(recipe.difficulty) || 1));
        const stars = '★'.repeat(diff) + '☆'.repeat(5 - diff);

        const card = document.createElement('article');
        card.className = 'saved-card';
        card.addEventListener('click', () => window.showRecipeModal(recipe));
        card.innerHTML = `
            <img src="${escapeHtml(recipe.photoUrl || FALLBACK_IMG)}" onerror="this.src='${FALLBACK_IMG}'" alt="${escapeHtml(recipe.name)}">
            <div class="saved-card-body">
                <h3>${escapeHtml(recipe.name || 'Без названия')}</h3>
                <div class="saved-card-meta">
                    <span>⏱ ${escapeHtml(recipe.time || 0)} мин</span>
                    <span class="stars">${stars}</span>
                </div>
                <div class="saved-card-macros">
                    <span><b>${Math.round(recipe.totalCalories || 0)}</b> ккал</span>
                    <span>Б: ${Math.round(recipe.totalProtein || 0)}</span>
                    <span>Ж: ${Math.round(recipe.totalFat || 0)}</span>
                    <span>У: ${Math.round(recipe.totalCarbohydrates || 0)}</span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    content.innerHTML = '';
    content.appendChild(grid);
}

window.SavedApp = { switchTab };