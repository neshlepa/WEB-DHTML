document.addEventListener('DOMContentLoaded', () => {
    renderHeader();
    createGlobalModals();
});

function renderHeader() {
    const headerRoot = document.getElementById('header-root');
    if (!headerRoot) return;

    const path = window.location.pathname;
    const isMain = path.includes('main.html') || path.endsWith('/') || path.endsWith('/index.html');
    const isSaved = path.includes('saved.html');
    const isPlan = path.includes('meal-plan.html');
    const isProfile = path.includes('profile.html');

    const token = getToken();
    const email = getUserEmail();

    headerRoot.innerHTML = `
        <header class="main-header">
            <a href="main.html" class="logo">Food-Tinder</a>
            <nav class="main-nav">
                <a href="main.html" class="nav-link ${isMain ? 'active' : ''}">Поиск</a>
                <a href="saved.html" class="nav-link ${isSaved ? 'active' : ''}">Избранное</a>
                <a href="meal-plan.html" class="nav-link ${isPlan ? 'active' : ''}">План питания</a>
                <a href="profile.html" class="nav-link ${isProfile ? 'active' : ''}">Профиль</a>
            </nav>
            <div class="header-right">
                <span class="user-email" id="headerEmail" title="${escapeHtml(email || 'Гость')}">${escapeHtml(token ? (email || 'Мой аккаунт') : 'Гость')}</span>
                ${token
                    ? `<button type="button" onclick="logout()" class="btn-logout">Выйти</button>`
                    : `<button type="button" onclick="window.location.href='login.html'" class="btn-logout">Войти</button>`}
            </div>
        </header>
    `;
}

function logout() {
    clearToken();
    window.location.href = 'login.html';
}

function renderAuthRequired(container, description) {
    if (!container) return;
    container.innerHTML = `
        <div class="auth-required-box">
            <h2>Требуется авторизация</h2>
            <p>${escapeHtml(description || 'Войдите в аккаунт или зарегистрируйтесь, чтобы пользоваться этим разделом.')}</p>
            <button type="button" class="btn-primary" onclick="window.location.href='login.html'">Войти или зарегистрироваться</button>
        </div>
    `;
}

function createGlobalModals() {
    if (document.getElementById('global-recipe-modal')) return;

    const modalHTML = `
        <div id="global-recipe-modal" class="custom-modal" style="display:none; z-index:9999;">
            <div class="custom-modal-content" style="max-width:620px;">
                <button type="button" class="modal-close-x" id="global-recipe-close" aria-label="Закрыть">✕</button>
                <div id="global-recipe-content"></div>
            </div>
        </div>
        <div id="global-confirm-modal" class="custom-modal" style="display:none; z-index:10000;">
            <div class="custom-modal-content" style="max-width:440px; text-align:center;">
                <h3 id="global-confirm-title" style="color:#d35400; margin-bottom:12px;">Подтверждение</h3>
                <p id="global-confirm-text" style="color:#555; font-size:15px; line-height:1.5; margin-bottom:24px;"></p>
                <div style="display:flex; justify-content:center; gap:12px;">
                    <button type="button" class="btn-secondary" id="global-confirm-cancel">Отмена</button>
                    <button type="button" class="btn-danger" id="global-confirm-ok">Подтвердить</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const recipeModal = document.getElementById('global-recipe-modal');
    document.getElementById('global-recipe-close').addEventListener('click', closeRecipeModal);
    recipeModal.addEventListener('click', (e) => {
        if (e.target === recipeModal) closeRecipeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeRecipeModal();
            const confirmModal = document.getElementById('global-confirm-modal');
            if (confirmModal && confirmModal.style.display === 'flex') {
                document.getElementById('global-confirm-cancel').click();
            }
        }
    });
}

function closeRecipeModal() {
    const modal = document.getElementById('global-recipe-modal');
    if (modal) modal.style.display = 'none';
}

window.showRecipeModal = function(recipe) {
    if (!recipe) return;
    const modal = document.getElementById('global-recipe-modal');
    const content = document.getElementById('global-recipe-content');
    if (!modal || !content) return;

    const diff = Math.min(5, Math.max(1, Number(recipe.difficulty) || 1));
    const stars = '★'.repeat(diff) + '☆'.repeat(5 - diff);
    const safeInstruction = escapeHtml(recipe.instruction || 'Описание отсутствует').replace(/\n/g, '<br>');
    const ingredientsHtml = (recipe.ingredients && recipe.ingredients.length > 0)
        ? recipe.ingredients.map(ing => `
            <li style="padding:8px 0; border-bottom:1px solid #eee6d8; display:flex; justify-content:space-between; gap:12px;">
                <span>${escapeHtml(ing.name)}</span>
                <b>${escapeHtml(ing.amountGrams)} г</b>
            </li>
        `).join('')
        : '<li style="color:#888; padding:6px 0;">Ингредиенты не указаны</li>';

    content.innerHTML = `
        <h2 style="color:#d35400; margin-bottom:14px; padding-right:32px; line-height:1.25;">${escapeHtml(recipe.name || 'Без названия')}</h2>
        <img src="${escapeHtml(recipe.photoUrl || FALLBACK_IMG)}" onerror="this.src='${FALLBACK_IMG}'" alt="${escapeHtml(recipe.name || 'Фото блюда')}" style="width:100%; height:260px; object-fit:cover; border-radius:12px; margin-bottom:16px;">
        <div style="display:flex; gap:24px; flex-wrap:wrap; margin-bottom:16px; color:#555; font-size:14px; font-weight:600;">
            <span>⏱ ${escapeHtml(recipe.time || 0)} мин</span>
            <span>Сложность: <span class="stars">${stars}</span> (${diff}/5)</span>
        </div>
        <div style="background:#f9f6ef; padding:14px 18px; border-radius:12px; margin-bottom:20px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px; font-size:14px;">
            <div>Ккал: <b>${Math.round(recipe.totalCalories || 0)}</b></div>
            <div>Белки: <b>${Math.round(recipe.totalProtein || 0)} г</b></div>
            <div>Жиры: <b>${Math.round(recipe.totalFat || 0)} г</b></div>
            <div>Углеводы: <b>${Math.round(recipe.totalCarbohydrates || 0)} г</b></div>
        </div>
        <h3 style="margin-bottom:8px; font-size:17px; color:#222;">Ингредиенты</h3>
        <ul style="list-style:none; padding:0; margin-bottom:20px; font-size:14px; color:#444;">
            ${ingredientsHtml}
        </ul>
        <h3 style="margin-bottom:8px; font-size:17px; color:#222;">Пошаговый рецепт</h3>
        <p style="font-size:14px; line-height:1.65; color:#444;">${safeInstruction}</p>
    `;
    modal.style.display = 'flex';
};

window.showConfirmModal = function(title, text, okLabel = 'Подтвердить') {
    return new Promise((resolve) => {
        const modal = document.getElementById('global-confirm-modal');
        const titleEl = document.getElementById('global-confirm-title');
        const textEl = document.getElementById('global-confirm-text');
        const okBtn = document.getElementById('global-confirm-ok');
        const cancelBtn = document.getElementById('global-confirm-cancel');

        titleEl.textContent = title;
        textEl.textContent = text;
        okBtn.textContent = okLabel;
        modal.style.display = 'flex';

        const cleanup = (result) => {
            modal.style.display = 'none';
            okBtn.onclick = null;
            cancelBtn.onclick = null;
            modal.onclick = null;
            resolve(result);
        };

        okBtn.onclick = () => cleanup(true);
        cancelBtn.onclick = () => cleanup(false);
        modal.onclick = (e) => {
            if (e.target === modal) cleanup(false);
        };
    });
};