let recipes = [];
let currentIndex = 0;
let likedCount = 0;
let savedCount = 0;
let isSwiping = false;
let guestWarningShown = false;

const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%231e293b' width='400' height='300'/%3E%3Ctext fill='%2394a3b8' font-family='sans-serif' font-size='18' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EНет фото%3C/text%3E%3C/svg%3E";

document.addEventListener('DOMContentLoaded', () => {
    loadFeed();
    loadRightPanel();
});

async function loadFeed() {
    const cardWrapper = document.getElementById('cardWrapper');
    try {
        cardWrapper.innerHTML = '<div class="loading">Загрузка рецептов...</div>';
        const res = await fetchApi('/recipes/feed');
        const list = normalizeArray(res);

        recipes = list;
        currentIndex = 0;
        isSwiping = false;
        updateStats();

        if (recipes.length === 0) {
            cardWrapper.innerHTML = `
                <div style="text-align:center; padding: 30px;">
                    <h2>Рецепты закончились!</h2>
                    <p style="color:#94a3b8; margin: 12px 0 20px;">Вы посмотрели все доступные блюда.</p>
                    <button class="btn-primary" style="max-width:220px;" onclick="loadFeed()">Обновить ленту</button>
                </div>`;
            document.getElementById('upNowSection').style.display = 'none';
            return;
        }
        renderCard();
    } catch (err) {
        console.error('Ошибка ленты:', err);
        const hint = !localStorage.getItem('token')
            ? '<br><small style="color:#94a3b8;">Возможно, для просмотра ленты требуется авторизация.</small>'
            : '';
        cardWrapper.innerHTML = `<h3 style="text-align:center; color:#ef4444; padding: 20px;">Ошибка загрузки ленты:<br>${err.message}${hint}</h3>`;
    }
}

async function loadRightPanel() {
    if (!localStorage.getItem('token')) return;
    try {
        const res = await fetchApi('/recipes/likes');
        const likes = normalizeArray(res);
        if (likes.length > 0) {
            const top5 = likes.slice(0, 5);
            const likedList = document.getElementById('likedList');
            likedList.innerHTML = '';
            document.getElementById('likedSection').style.display = 'block';

            top5.forEach(recipe => {
                const miniCard = document.createElement('div');
                miniCard.className = 'mini-card';
                miniCard.style.cursor = 'pointer';
                miniCard.onclick = () => window.showRecipeModal(recipe);
                miniCard.innerHTML = `
                    <img src="${recipe.photoUrl || FALLBACK_IMG}" onerror="this.src='${FALLBACK_IMG}'">
                    <div><b>${recipe.name || 'Без названия'}</b><br><small>${Math.round(recipe.totalCalories || 0)} ккал • ${recipe.time || 0} мин</small></div>
                `;
                likedList.appendChild(miniCard);
            });
        }
    } catch (err) {
        console.warn('Не удалось загрузить понравившиеся блюда:', err);
    }
}

function renderCard() {
    if (currentIndex >= recipes.length) {
        if (!localStorage.getItem('token')) {
            document.getElementById('cardWrapper').innerHTML = `
                <div style="text-align:center; padding: 30px;">
                    <h2>Вы просмотрели подборку!</h2>
                    <p style="color:#94a3b8; margin: 12px 0 20px;">Войдите в аккаунт, чтобы сохранять реакции и получать новые блюда.</p>
                    <button class="btn-primary" style="max-width:220px;" onclick="window.location.href='login.html'">Войти</button>
                </div>`;
            return;
        }
        return loadFeed();
    }

    const recipe = recipes[currentIndex];
    const diff = Math.min(5, Math.max(1, Number(recipe.difficulty) || 1));
    const stars = '★'.repeat(diff) + '☆'.repeat(5 - diff);
    const desc = recipe.instruction ? recipe.instruction.substring(0, 100) : 'Описание отсутствует...';

    const cardWrapper = document.getElementById('cardWrapper');
    cardWrapper.innerHTML = `
        <div class="recipe-card" id="currentCard">
            <div class="card-image-box" onclick="window.showRecipeModal(recipes[currentIndex])" style="cursor: pointer;">
                <img src="${recipe.photoUrl || FALLBACK_IMG}" onerror="this.src='${FALLBACK_IMG}'" draggable="false">
                <div class="card-badges"><span class="badge">СЛОЖНОСТЬ: ${diff}/5</span></div>
                <h2 class="card-title">${recipe.name || 'Без названия'}</h2>
            </div>
            <div class="card-body">
                <p class="card-desc">${desc}...</p>
                <div class="card-meta-row">
                    <div class="meta-item"><small>СЛОЖНОСТЬ</small><span class="stars">${stars}</span></div>
                    <div class="meta-item"><small>ВРЕМЯ</small><span><b>${recipe.time || 0} мин</b></span></div>
                </div>
                <div class="card-macros">
                    <div class="macro"><b>${Math.round(recipe.totalCalories || 0)}</b><br>ККАЛ</div>
                    <div class="macro"><b>${Math.round(recipe.totalProtein || 0)}г</b><br>БЕЛКИ</div>
                    <div class="macro"><b>${Math.round(recipe.totalFat || 0)}г</b><br>ЖИРЫ</div>
                    <div class="macro"><b>${Math.round(recipe.totalCarbohydrates || 0)}г</b><br>УГЛЕВОДЫ</div>
                </div>
                <div class="card-actions">
                    <button class="action-btn btn-skip" onclick="handleSwipe('DISLIKE')">✕</button>
                    <button class="action-btn btn-save" onclick="handleSwipe('FAVORITE')">★</button>
                    <button class="action-btn btn-like" onclick="handleSwipe('LIKE')">❤️</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('upNowSection').style.display = 'block';
    document.getElementById('upNowTitle').textContent = recipe.name || 'Без названия';
    document.getElementById('upNowIngredients').innerHTML = (recipe.ingredients && recipe.ingredients.length > 0)
        ? recipe.ingredients.map(ing => `<li><span>${ing.name}</span> <span>${ing.amountGrams}г</span></li>`).join('')
        : '<li>Ингредиенты не указаны</li>';

    attachSwipeEvents();
}

async function handleSwipe(reactionType) {
    if (isSwiping) return;
    const card = document.getElementById('currentCard');
    const recipe = recipes[currentIndex];
    if (!card || !recipe) return;

    isSwiping = true;

    if (reactionType === 'LIKE') { card.classList.add('swipe-right'); likedCount++; }
    else if (reactionType === 'DISLIKE') card.classList.add('swipe-left');
    else if (reactionType === 'FAVORITE') { card.classList.add('swipe-up'); savedCount++; }

    const animationDelay = new Promise(resolve => setTimeout(resolve, 300));

    if (localStorage.getItem('token')) {
        try {
            await fetchApi(`/recipes/${recipe.id}/react`, {
                method: 'POST',
                body: { reaction: reactionType }
            });
            if (reactionType === 'LIKE') loadRightPanel();
        } catch (err) {
            console.error('Ошибка отправки реакции:', err);
        }
    } else if (!guestWarningShown) {
        guestWarningShown = true;
        alert('Войдите в аккаунт, чтобы сохранять рецепты!');
    }

    await animationDelay;
    currentIndex++;
    updateStats();
    isSwiping = false;
    renderCard();
}

function updateStats() {
    document.getElementById('likedCount').textContent = likedCount;
    document.getElementById('savedCount').textContent = savedCount;
    document.getElementById('leftCount').textContent = Math.max(0, recipes.length - currentIndex);
}

let swipeAbortController = null;
function attachSwipeEvents() {
    const card = document.getElementById('currentCard');
    if (!card) return;
    if (swipeAbortController) swipeAbortController.abort();

    swipeAbortController = new AbortController();
    const { signal } = swipeAbortController;
    let startX = 0, startY = 0, isDragging = false, hasDragged = false;

    card.addEventListener('pointerdown', (e) => {
        if (isSwiping || e.target.closest('.action-btn')) return;
        isDragging = true;
        hasDragged = false;
        startX = e.clientX;
        startY = e.clientY;
        card.style.transition = 'none';
    }, { signal });

    window.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) hasDragged = true;
        if (hasDragged) {
            card.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${deltaX * 0.05}deg)`;
        }
    }, { signal });

    window.addEventListener('pointerup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        if (!hasDragged) {
            card.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            return;
        }

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        card.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        if (deltaX > 100) { card.style.transform = ''; handleSwipe('LIKE'); }
        else if (deltaX < -100) { card.style.transform = ''; handleSwipe('DISLIKE'); }
        else if (deltaY < -100) { card.style.transform = ''; handleSwipe('FAVORITE'); }
        else card.style.transform = 'translate(0px, 0px) rotate(0deg)';
    }, { signal });
}