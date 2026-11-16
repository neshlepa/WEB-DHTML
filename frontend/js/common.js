document.addEventListener('DOMContentLoaded', () => {
    renderHeader();
    createGlobalModal();
});

function renderHeader() {
    const headerRoot = document.getElementById('header-root');
    if (!headerRoot) return;

    const path = window.location.pathname;
    const isMain = path.includes('main.html') || path.endsWith('/');
    const isPlan = path.includes('meal-plan.html');
    const isProfile = path.includes('profile.html');
    const token = localStorage.getItem('token');

    headerRoot.innerHTML = `
        <header class="main-header">
            <h1 class="logo">Food-Tinder</h1>
            <nav class="main-nav">
                <a href="main.html" class="nav-link ${isMain ? 'active' : ''}">Поиск</a>
                <a href="meal-plan.html" class="nav-link ${isPlan ? 'active' : ''}">План питания</a>
                <a href="profile.html" class="nav-link ${isProfile ? 'active' : ''}">Профиль</a>
            </nav>
            <div class="header-right">
                <span class="user-email" id="headerEmail">${token ? 'Мой аккаунт' : 'Гость'}</span>
                ${token ? `<button onclick="logout()" class="btn-logout">Выйти</button>` : `<button onclick="window.location.href='login.html'" class="btn-logout">Войти</button>`}
            </div>
        </header>
    `;
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

function createGlobalModal() {
    const modalHTML = `
        <div id="global-recipe-modal" class="custom-modal" style="display: none;">
            <div class="custom-modal-content" style="max-width: 550px; width: 100%; position: relative; background: #fff; color: #333;">
                <button onclick="document.getElementById('global-recipe-modal').style.display='none'" style="position: absolute; top: 15px; right: 15px; background: transparent; color: #666; border: none; font-size: 24px; cursor: pointer;">✕</button>
                <div id="global-recipe-content"></div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function showRecipeModal(recipe) {
    const content = document.getElementById('global-recipe-content');
    content.innerHTML = `
        <h2 style="color: #d35400; margin-bottom: 15px; padding-right: 30px;">${recipe.name}</h2>
        <img src="${recipe.photoUrl}" alt="${recipe.name}" style="width: 100%; height: 250px; object-fit: cover; border-radius: 12px; margin-bottom: 15px;">
        
        <div style="display: flex; gap: 20px; margin-bottom: 15px; color: #666; font-size: 14px; font-weight: bold;">
            <span>⏳ Время: ${recipe.time} мин</span>
            <span>⭐ Сложность: ${recipe.difficulty}/5</span>
        </div>
        
        <div style="background: #f9f6ef; padding: 15px; border-radius: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; font-size: 14px;">
            <div>Ккал: <b>${Math.round(recipe.totalCalories)}</b></div>
            <div>Б: <b>${Math.round(recipe.totalProtein)}г</b></div>
            <div>Ж: <b>${Math.round(recipe.totalFat)}г</b></div>
            <div>У: <b>${Math.round(recipe.totalCarbohydrates)}г</b></div>
        </div>
        
        <h3 style="margin-bottom: 10px; font-size: 18px;">Ингредиенты:</h3>
        <ul style="list-style: none; padding: 0; margin-bottom: 20px; font-size: 14px; color: #555;">
            ${recipe.ingredients ? recipe.ingredients.map(ing => `<li style="padding: 6px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;"><span>${ing.name}</span><b>${ing.amountGrams}г</b></li>`).join('') : '<li>Нет данных</li>'}
        </ul>
        
        <h3 style="margin-bottom: 10px; font-size: 18px;">Инструкция:</h3>
        <p style="font-size: 14px; line-height: 1.6; color: #555; max-height: 200px; overflow-y: auto;">${recipe.instruction}</p>
    `;
    document.getElementById('global-recipe-modal').style.display = 'flex';
}