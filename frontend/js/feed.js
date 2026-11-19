const MAX_LIKED_PREVIEW = 5;

let recipes = [];
let currentIndex = 0;
let likedCount = 0;
let savedCount = 0;
let recentLikes = [];
let isSwiping = false;
let guestWarningShown = false;
let suppressNextClick = false;
let swipeAbortController = null;

document.addEventListener('DOMContentLoaded', () => {
    loadFeed();
    loadUserStatsAndLikes();

    document.getElementById('upNowCard').addEventListener('click', () => {
        const recipe = recipes[currentIndex];
        if (recipe) window.showRecipeModal(recipe);
    });

    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('global-recipe-modal');
        if (modal && modal.style.display === 'flex') return;
        if (recipes.length === 0 || currentIndex >= recipes.length) return;

        if (e.key === 'ArrowRight') { e.preventDefault(); handleSwipe('LIKE'); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); handleSwipe('DISLIKE'); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); handleSwipe('FAVORITE'); }
    });
});

async function loadFeed() {
    const cardWrapper = document.getElementById('cardWrapper');
    try {
        cardWrapper.innerHTML = '<div class="loading">Загрузка рецептов...</div>';
        const res = await fetchApi('/recipes/feed');
        recipes = normalizeArray(res);
        currentIndex = 0;
        isSwiping = false;
        updateStats();

        if (recipes.length === 0) {
            cardWrapper.innerHTML = `
                <div class="auth-required-box" style="margin: 20px auto;">
                    <h2>Рецепты закончились!</h2>
                    <p>Вы просмотрели все доступные блюда с учётом ваших фильтров и аллергенов.</p>
                    <button type="button" class="btn-primary" onclick="loadFeed()">Обновить ленту</button>
                </div>`;
            document.getElementById('upNowSection').style.display = 'none';
            return;
        }
        renderCard();
    } catch (err) {
        console.error('Ошибка ленты:', err);
        cardWrapper.innerHTML = `
            <div class="auth-required-box" style="margin: 20px auto;">
                <h2 style="color:#c62828;">Не удалось загрузить ленту</h2>
                <p>${escapeHtml(err.message)}</p>
                <button type="button" class="btn-primary" onclick="loadFeed()">Попробовать снова</button>
            </div>`;
    }
}

async function loadUserStatsAndLikes() {
    if (!getToken()) return;
    try {
        const [likesRes, favsRes] = await Promise.all([
            fetchApi('/recipes/likes'),
            fetchApi('/recipes/favorites')
        ]);
        const likes = normalizeArray(likesRes);
        const favs = normalizeArray(favsRes);

        likedCount = likes.length;
        savedCount = favs.length;
        updateStats();

        recentLikes = deduplicateRecipes(likes).slice(0, MAX_LIKED_PREVIEW);
        renderRightPanel();
    } catch (err) {
        console.warn('Не удалось загрузить статистику пользователя:', err);
    }
}

function deduplicateRecipes(list) {
    const seen = new Set();
    const result = [];
    for (const item of list) {
        if (!item || item.id == null || seen.has(item.id)) continue;
        seen.add(item.id);
        result.push(item);
    }
    return result;
}

function pushLikedPreview(recipe) {
    if (!recipe) return;
    recentLikes = [recipe, ...recentLikes.filter(r => r.id !== recipe.id)].slice(0, MAX_LIKED_PREVIEW);
    renderRightPanel();
}

function renderRightPanel() {
    const section = document.getElementById('likedSection');
    const likedList = document.getElementById('likedList');
    const topFive = recentLikes.slice(0, MAX_LIKED_PREVIEW);

    if (topFive.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    likedList.innerHTML = '';

    topFive.forEach(recipe => {
        const miniCard = document.createElement('div');
        miniCard.className = 'mini-card';
        miniCard.title = 'Открыть рецепт';
        miniCard.addEventListener('click', () => window.showRecipeModal(recipe));
        miniCard.innerHTML = `
            <img src="${escapeHtml(recipe.photoUrl || FALLBACK_IMG)}" onerror="this.src='${FALLBACK_IMG}'" alt="${escapeHtml(recipe.name)}">
            <div>
                <b>${escapeHtml(recipe.name || 'Без названия')}</b>
                <small>${Math.round(recipe.totalCalories || 0)} ккал • ${escapeHtml(recipe.time || 0)} мин</small>
            </div>
        `;
        likedList.appendChild(miniCard);
    });
}

function renderCard() {
    if (currentIndex >= recipes.length) {
        if (!getToken()) {
            document.getElementById('cardWrapper').innerHTML = `
                <div class="auth-required-box" style="margin: 20px auto;">
                    <h2>Подборка просмотрена!</h2>
                    <p>Войдите в аккаунт, чтобы сохранять понравившиеся блюда, составлять план питания и получать новые рекомендации.</p>
                    <button type="button" class="btn-primary" onclick="window.location.href='login.html'">Войти в аккаунт</button>
                    <button type="button" class="btn-secondary" style="width:100%; margin-top:10px;" onclick="loadFeed()">Показать ещё</button>
                </div>`;
            document.getElementById('upNowSection').style.display = 'none';
            return;
        }
        return loadFeed();
    }

    const recipe = recipes[currentIndex];
    const diff = Math.min(5, Math.max(1, Number(recipe.difficulty) || 1));
    const stars = '★'.repeat(diff) + '☆'.repeat(5 - diff);
    const rawDesc = recipe.instruction || 'Описание отсутствует';
    const desc = rawDesc.length > 110 ? rawDesc.substring(0, 110) + '...' : rawDesc;

    const cardWrapper = document.getElementById('cardWrapper');
    cardWrapper.innerHTML = `
        <div class="recipe-card" id="currentCard">
            <div class="card-image-box" id="cardImageBox" title="Нажмите, чтобы открыть рецепт">
                <img src="${escapeHtml(recipe.photoUrl || FALLBACK_IMG)}" onerror="this.src='${FALLBACK_IMG}'" draggable="false" alt="${escapeHtml(recipe.name)}">
                <div class="card-badges"><span class="badge">СЛОЖНОСТЬ: ${diff}/5</span></div>
                <h2 class="card-title">${escapeHtml(recipe.name || 'Без названия')}</h2>
            </div>
            <div class="card-body">
                <p class="card-desc">${escapeHtml(desc)}</p>
                <button type="button" class="btn-open-recipe" id="openRecipeBtn">Открыть полный рецепт</button>
                <div class="card-meta-row">
                    <div class="meta-item"><small>СЛОЖНОСТЬ</small><span class="stars">${stars}</span></div>
                    <div class="meta-item"><small>ВРЕМЯ</small><span><b>${escapeHtml(recipe.time || 0)} мин</b></span></div>
                </div>
                <div class="card-macros">
                    <div class="macro"><b>${Math.round(recipe.totalCalories || 0)}</b><br>ККАЛ</div>
                    <div class="macro"><b>${Math.round(recipe.totalProtein || 0)}г</b><br>БЕЛКИ</div>
                    <div class="macro"><b>${Math.round(recipe.totalFat || 0)}г</b><br>ЖИРЫ</div>
                    <div class="macro"><b>${Math.round(recipe.totalCarbohydrates || 0)}г</b><br>УГЛЕВОДЫ</div>
                </div>
                <div class="card-actions">
                    <button type="button" class="action-btn btn-skip" title="Пропустить (←)" onclick="handleSwipe('DISLIKE')">✕</button>
                    <button type="button" class="action-btn btn-save" title="В избранное (↑)" onclick="handleSwipe('FAVORITE')">★</button>
                    <button type="button" class="action-btn btn-like" title="Нравится (→)" onclick="handleSwipe('LIKE')">❤️</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('cardImageBox').addEventListener('click', () => {
        if (suppressNextClick) return;
        window.showRecipeModal(recipe);
    });

    document.getElementById('openRecipeBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        window.showRecipeModal(recipe);
    });

    document.getElementById('upNowSection').style.display = 'block';
    document.getElementById('upNowTitle').textContent = recipe.name || 'Без названия';
    document.getElementById('upNowIngredients').innerHTML = (recipe.ingredients && recipe.ingredients.length > 0)
        ? recipe.ingredients.map(ing => `<li><span>${escapeHtml(ing.name)}</span> <span>${escapeHtml(ing.amountGrams)} г</span></li>`).join('')
        : '<li>Ингредиенты не указаны</li>';

    attachSwipeEvents();
}

async function handleSwipe(reactionType) {
    if (isSwiping) return;
    const card = document.getElementById('currentCard');
    const recipe = recipes[currentIndex];
    if (!card || !recipe) return;

    isSwiping = true;

    if (reactionType === 'LIKE') {
        card.classList.add('swipe-right');
        likedCount++;
        pushLikedPreview(recipe);
    } else if (reactionType === 'DISLIKE') {
        card.classList.add('swipe-left');
    } else if (reactionType === 'FAVORITE') {
        card.classList.add('swipe-up');
        savedCount++;
    }

    const animationDelay = new Promise(resolve => setTimeout(resolve, 300));

    if (getToken()) {
        try {
            await fetchApi(`/recipes/${recipe.id}/react`, {
                method: 'POST',
                body: { reaction: reactionType }
            });
        } catch (err) {
            console.error('Ошибка отправки реакции:', err);
            showToast('Не удалось сохранить реакцию', 'error');
        }
    } else if (!guestWarningShown && (reactionType === 'LIKE' || reactionType === 'FAVORITE')) {
        guestWarningShown = true;
        showToast('Войдите в аккаунт, чтобы сохранять рецепты навсегда', 'info');
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

function attachSwipeEvents() {
    const card = document.getElementById('currentCard');
    if (!card) return;
    if (swipeAbortController) swipeAbortController.abort();

    swipeAbortController = new AbortController();
    const { signal } = swipeAbortController;
    let startX = 0, startY = 0, isDragging = false, hasDragged = false;

    card.addEventListener('pointerdown', (e) => {
        if (isSwiping || e.target.closest('.action-btn') || e.target.closest('.btn-open-recipe')) return;
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
        if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) hasDragged = true;
        if (hasDragged) {
            card.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${deltaX * 0.05}deg)`;
        }
    }, { signal });

    window.addEventListener('pointerup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        card.style.transition = 'transform 0.3s ease, opacity 0.3s ease';

        if (!hasDragged) return;

        suppressNextClick = true;
        setTimeout(() => { suppressNextClick = false; }, 60);

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        if (deltaX > 100) { card.style.transform = ''; handleSwipe('LIKE'); }
        else if (deltaX < -100) { card.style.transform = ''; handleSwipe('DISLIKE'); }
        else if (deltaY < -100) { card.style.transform = ''; handleSwipe('FAVORITE'); }
        else card.style.transform = 'translate(0px, 0px) rotate(0deg)';
    }, { signal });
}