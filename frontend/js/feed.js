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
        recipes = res || [];
        currentIndex = 0;
        updateStats();
        
        if (recipes.length === 0) {
            cardWrapper.innerHTML = '<h2 style="text-align:center;">Вы посмотрели все рецепты!</h2>';
            return;
        }
        renderCard();
    } catch (err) {
        cardWrapper.innerHTML = '<h2 style="text-align:center;">Сервер временно недоступен.</h2>';
    }
}

async function loadRightPanel() {
    if (!localStorage.getItem('token')) return;
    try {
        const likes = await fetchApi('/recipes/likes');
        if (likes && likes.length > 0) {
            const top5 = likes.slice(0, 5); // Ограничение ровно 5 штук
            const likedList = document.getElementById('likedList');
            likedList.innerHTML = '';
            document.getElementById('likedSection').style.display = 'block';
            
            top5.forEach(recipe => {
                const miniCard = document.createElement('div');
                miniCard.className = 'mini-card';
                miniCard.style.cursor = 'pointer';
                miniCard.onclick = () => showRecipeModal(recipe);
                miniCard.innerHTML = `
                    <img src="${recipe.photoUrl}" alt="${recipe.name}">
                    <div>
                        <b>${recipe.name}</b><br>
                        <small>${Math.round(recipe.totalCalories)} ккал • ${recipe.time} мин</small>
                    </div>
                `;
                likedList.appendChild(miniCard);
            });
        }
    } catch (err) {
        console.error("Ошибка загрузки лайков", err);
    }
}

function renderCard() {
    if (currentIndex >= recipes.length) {
        loadFeed();
        return;
    }

    const recipe = recipes[currentIndex];
    let stars = '★'.repeat(recipe.difficulty) + '☆'.repeat(5 - recipe.difficulty);
    const cardWrapper = document.getElementById('cardWrapper');

    cardWrapper.innerHTML = `
        <div class="recipe-card" id="currentCard">
            <div class="card-image-box" onclick="showRecipeModal(recipes[currentIndex])" style="cursor: pointer;">
                <img src="${recipe.photoUrl}" alt="${recipe.name}" draggable="false">
                <div class="card-badges"><span class="badge">СЛОЖНОСТЬ: ${recipe.difficulty}/5</span></div>
                <h2 class="card-title">${recipe.name}</h2>
            </div>
            <div class="card-body">
                <p class="card-desc">${recipe.instruction.substring(0, 100)}...</p>
                <div class="card-meta-row">
                    <div class="meta-item"><small>СЛОЖНОСТЬ</small><span class="stars">${stars}</span></div>
                    <div class="meta-item"><small>ВРЕМЯ</small><span><b>${recipe.time} мин</b></span></div>
                </div>
                <div class="card-macros">
                    <div class="macro"><b>${Math.round(recipe.totalCalories)}</b><br>ККАЛ</div>
                    <div class="macro"><b>${Math.round(recipe.totalProtein)}г</b><br>БЕЛКИ</div>
                    <div class="macro"><b>${Math.round(recipe.totalFat)}г</b><br>ЖИРЫ</div>
                    <div class="macro"><b>${Math.round(recipe.totalCarbohydrates)}г</b><br>УГЛЕВОДЫ</div>
                </div>
                <div class="card-actions">
                    <button class="action-btn btn-skip" onclick="handleSwipe('DISLIKE')">✕</button>
                    <button class="action-btn btn-save" onclick="handleSwipe('FAVORITE')">★</button>
                    <button class="action-btn btn-like" onclick="handleSwipe('LIKE')">❤️</button>
                </div>
            </div>
        </div>
    `;

    updateRightPanel(recipe);
    attachSwipeEvents();
}

async function handleSwipe(reactionType) {
    const card = document.getElementById('currentCard');
    if (!card) return;

    if (reactionType === 'LIKE') {
        card.classList.add('swipe-right');
        likedCount++;
    } else if (reactionType === 'DISLIKE') {
        card.classList.add('swipe-left');
    } else if (reactionType === 'FAVORITE') {
        card.classList.add('swipe-up');
        savedCount++;
    }
    
    updateStats();

    if (localStorage.getItem('token')) {
        try {
            await fetchApi(`/recipes/${recipes[currentIndex].id}/react`, {
                method: 'POST',
                body: { reaction: reactionType }
            });
            if (reactionType === 'LIKE') loadRightPanel(); // Обновляем топ-5 на лету
        } catch (err) {}
    } else if (currentIndex === 0) {
        alert('Войдите в аккаунт, чтобы сохранять рецепты!');
    }

    setTimeout(() => {
        currentIndex++;
        renderCard();
    }, 300);
}

function updateStats() {
    document.getElementById('likedCount').textContent = likedCount;
    document.getElementById('savedCount').textContent = savedCount;
    const left = recipes.length - currentIndex;
    document.getElementById('leftCount').textContent = left >= 0 ? left : 0;
}

function updateRightPanel(recipe) {
    document.getElementById('upNowSection').style.display = 'block';
    document.getElementById('upNowTitle').textContent = recipe.name;
    const ingList = document.getElementById('upNowIngredients');
    
    if (recipe.ingredients && recipe.ingredients.length > 0) {
        ingList.innerHTML = recipe.ingredients.map(ing => `<li><span>${ing.name}</span> <span>${ing.amountGrams}г</span></li>`).join('');
    } else {
        ingList.innerHTML = '<li>Ингредиенты не указаны</li>';
    }
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
        if (e.target.closest('.action-btn') || e.target.closest('.card-image-box')) return;
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