let recipes = [];
let currentIndex = 0;
let likedCount = 0;
let savedCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    loadFeed();
    loadRightPanel();
});

async function loadFeed() {
    const cardWrapper = document.getElementById('cardWrapper');
    try {
        cardWrapper.innerHTML = '<div class="loading">Загрузка...</div>';
        const res = await fetchApi('/recipes/feed');
        
        if (!Array.isArray(res)) throw new Error('Бэкенд вернул не массив данных');
        
        recipes = res;
        currentIndex = 0;
        updateStats();
        
        if (recipes.length === 0) {
            cardWrapper.innerHTML = '<h2 style="text-align:center;">Вы посмотрели все рецепты!</h2>';
            return;
        }
        renderCard();
    } catch (err) {
        console.error("Ошибка ленты:", err);
        cardWrapper.innerHTML = `<h3 style="text-align:center; color:red; padding: 20px;">Ошибка загрузки ленты:<br>${err.message}</h3>`;
    }
}

async function loadRightPanel() {
    if (!localStorage.getItem('token')) return;
    try {
        const likes = await fetchApi('/recipes/likes');
        if (Array.isArray(likes) && likes.length > 0) {
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
                    <img src="${recipe.photoUrl || ''}">
                    <div><b>${recipe.name || 'Без названия'}</b><br><small>${Math.round(recipe.totalCalories || 0)} ккал • ${recipe.time || 0} мин</small></div>
                `;
                likedList.appendChild(miniCard);
            });
        }
    } catch (err) {}
}

function renderCard() {
    if (currentIndex >= recipes.length) return loadFeed();

    const recipe = recipes[currentIndex];
    
    // БРОНЕЖИЛЕТ ОТ ПУСТЫХ ДАННЫХ ИЗ БД:
    const diff = Number(recipe.difficulty) || 1; 
    const stars = '★'.repeat(diff) + '☆'.repeat(Math.max(0, 5 - diff));
    const desc = recipe.instruction ? recipe.instruction.substring(0, 100) : 'Описание отсутствует...';
    
    const cardWrapper = document.getElementById('cardWrapper');

    cardWrapper.innerHTML = `
        <div class="recipe-card" id="currentCard">
            <div class="card-image-box" onclick="window.showRecipeModal(recipes[currentIndex])" style="cursor: pointer;">
                <img src="${recipe.photoUrl || ''}" draggable="false">
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
    const card = document.getElementById('currentCard');
    if (!card) return;

    if (reactionType === 'LIKE') { card.classList.add('swipe-right'); likedCount++; } 
    else if (reactionType === 'DISLIKE') card.classList.add('swipe-left');
    else if (reactionType === 'FAVORITE') { card.classList.add('swipe-up'); savedCount++; }
    
    updateStats();

    if (localStorage.getItem('token')) {
        try {
            await fetchApi(`/recipes/${recipes[currentIndex].id}/react`, { method: 'POST', body: { reaction: reactionType } });
            if (reactionType === 'LIKE') loadRightPanel(); 
        } catch (err) {}
    } else if (currentIndex === 0) alert('Войдите в аккаунт, чтобы сохранять рецепты!');

    setTimeout(() => { currentIndex++; renderCard(); }, 300);
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
        if (e.target.closest('.action-btn')) return;
        isDragging = true; hasDragged = false;
        startX = e.clientX; startY = e.clientY;
        card.style.transition = 'none'; 
    }, { signal });

    window.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - startX, deltaY = e.clientY - startY;
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) hasDragged = true;
        if (hasDragged) card.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${deltaX * 0.05}deg)`;
    }, { signal });

    window.addEventListener('pointerup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        if (!hasDragged) return card.style.transition = 'transform 0.3s ease, opacity 0.3s ease';

        const deltaX = e.clientX - startX, deltaY = e.clientY - startY;
        card.style.transition = 'transform 0.3s ease, opacity 0.3s ease'; 
        if (deltaX > 100) { card.style.transform = ''; handleSwipe('LIKE'); }
        else if (deltaX < -100) { card.style.transform = ''; handleSwipe('DISLIKE'); }
        else if (deltaY < -100) { card.style.transform = ''; handleSwipe('FAVORITE'); }
        else card.style.transform = `translate(0px, 0px) rotate(0deg)`;
    }, { signal });
}