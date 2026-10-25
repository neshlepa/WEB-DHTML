const API_URL = '/api/recipes/feed';
const REACT_URL = '/api/recipes';
const token = localStorage.getItem('token');

// Если токена нет, мы все равно можем загрузить ленту (гостевой режим)
if (!token) {
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('headerEmail').textContent = 'Гость';
} else {
    document.getElementById('headerEmail').textContent = 'Мой аккаунт';
}

let recipes = [];
let currentIndex = 0;
let likedCount = 0;
let savedCount = 0;

const cardWrapper = document.getElementById('cardWrapper');

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
        cardWrapper.innerHTML = '<div class="loading">Загрузка...</div>';
        const res = await fetch(API_URL, { headers });
        
        if (!res.ok) throw new Error('Ошибка сервера');
        
        recipes = await res.json();
        currentIndex = 0;
        updateStats();
        
        if (recipes.length === 0) {
            cardWrapper.innerHTML = '<h2 style="text-align:center;">Вы посмотрели все рецепты!</h2>';
            return;
        }
        
        renderCard();
    } catch (err) {
        cardWrapper.innerHTML = '<h2 style="text-align:center;">Сервер временно недоступен. Попробуйте позже.</h2>';
    }
}

// Отрисовка текущей карточки
function renderCard() {
    if (currentIndex >= recipes.length) {
        loadFeed();
        return;
    }

    const recipe = recipes[currentIndex];
    let stars = '';
    for(let i=1; i<=5; i++) {
        stars += i <= recipe.difficulty ? '★' : '☆';
    }

    cardWrapper.innerHTML = `
        <div class="recipe-card" id="currentCard">
            <div class="card-image-box">
                <img src="${recipe.photoUrl}" alt="${recipe.name}" draggable="false">
                <div class="card-badges">
                    <span class="badge">СЛОЖНОСТЬ: ${recipe.difficulty}/5</span>
                </div>
                <h2 class="card-title">${recipe.name}</h2>
            </div>
            
            <div class="card-body">
                <p class="card-desc">${recipe.instruction.substring(0, 100)}...</p>
                
                <div class="card-meta-row">
                    <div class="meta-item">
                        <small>СЛОЖНОСТЬ</small>
                        <span class="stars">${stars}</span>
                    </div>
                    <div class="meta-item">
                        <small>ВРЕМЯ</small>
                        <span><b>${recipe.time} мин</b></span>
                    </div>
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

     // ВАЖНО: Активируем свайпы мышкой/пальцем для новой карточки
    attachSwipeEvents();
}

// Обработка свайпа
async function handleSwipe(reactionType) {
    const card = document.getElementById('currentCard');
    if (!card) return;

    // 1. Визуальная анимация (улетание карточки)
    if (reactionType === 'LIKE') {
        card.classList.add('swipe-right');
        likedCount++;
        addToLikedList(recipes[currentIndex]);
    } else if (reactionType === 'DISLIKE') {
        card.classList.add('swipe-left');
    } else if (reactionType === 'FAVORITE') {
        card.classList.add('swipe-up');
        savedCount++;
    }
    
    updateStats();

    // 2. Отправка запроса на сервер (в фоне)
    if (token) {
        try {
            await fetch(`${REACT_URL}/${recipes[currentIndex].id}/react`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reaction: reactionType })
            });
        } catch (err) {
            console.error('Не удалось сохранить реакцию');
        }
    } else {
        // Если гость, просто показываем алерт один раз
        if (currentIndex === 0) alert('Войдите в аккаунт, чтобы сохранять рецепты!');
    }

    // 3. Ждем окончания анимации (300мс) и показываем следующую карточку
    setTimeout(() => {
        currentIndex++;
        renderCard();
    }, 300);
}

// Обновление счетчиков слева
function updateStats() {
    document.getElementById('likedCount').textContent = likedCount;
    document.getElementById('savedCount').textContent = savedCount;
    const left = recipes.length - currentIndex;
    document.getElementById('leftCount').textContent = left >= 0 ? left : 0;
}

// Обновление правой колонки (Ингредиенты)
function updateRightPanel(recipe) {
    document.getElementById('upNowSection').style.display = 'block';
    document.getElementById('upNowTitle').textContent = recipe.name;
    
    // Ингредиенты
    const ingList = document.getElementById('upNowIngredients');
    ingList.innerHTML = '';
    if (recipe.ingredients && recipe.ingredients.length > 0) {
        recipe.ingredients.forEach(ing => {
            ingList.innerHTML += `<li><span>${ing.name}</span> <span>${ing.amountGrams}г</span></li>`;
        });
    } else {
        ingList.innerHTML = '<li>Ингредиенты не указаны</li>';
    }
}

// Добавление в список "Понравившиеся блюда" справа
const likedDishesArray = [];
function addToLikedList(recipe) {
    document.getElementById('likedSection').style.display = 'block';
    const likedList = document.getElementById('likedList');
    
    // Создаем мини-карточку
    const miniCard = document.createElement('div');
    miniCard.className = 'mini-card';
    miniCard.innerHTML = `
        <img src="${recipe.photoUrl}" alt="${recipe.name}">
        <div>
            <b>${recipe.name}</b><br>
            <small>${Math.round(recipe.totalCalories)} ккал • ${recipe.time} мин</small>
        </div>
    `;
    likedList.prepend(miniCard);
}

// ==========================================
// ИСПРАВЛЕННАЯ ФУНКЦИЯ: Физика свайпов
// ==========================================
function attachSwipeEvents() {
    const card = document.getElementById('currentCard');
    if (!card) return;

    let startX = 0;
    let startY = 0;
    let isDragging = false;
    let hasDragged = false; // Флаг: было ли реальное перетаскивание

    // Когда зажимаем карточку
    card.addEventListener('pointerdown', (e) => {
        // ВАЖНО: Если клик пришелся на кнопку, не начинаем свайп!
        if (e.target.closest('.action-btn')) return;

        isDragging = true;
        hasDragged = false;
        startX = e.clientX;
        startY = e.clientY;
        card.style.transition = 'none'; 
    });

    // Слушаем движение мыши на всем окне (чтобы карточка не застревала, если увести курсор)
    window.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        // Если сдвинули больше чем на 5 пикселей, считаем это перетаскиванием
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            hasDragged = true;
        }

        if (hasDragged) {
            const rotate = deltaX * 0.05; 
            card.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotate}deg)`;
        }
    });

    // Когда отпускаем кнопку мыши/палец
    window.addEventListener('pointerup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        
        // Если это был просто клик (без перетаскивания), ничего не делаем
        if (!hasDragged) {
            card.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            return; 
        }

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        card.style.transition = 'transform 0.3s ease, opacity 0.3s ease'; 

        // Порог свайпа - 100 пикселей
        if (deltaX > 100) {
            card.style.transform = ''; 
            handleSwipe('LIKE');
        } else if (deltaX < -100) {
            card.style.transform = '';
            handleSwipe('DISLIKE');
        } else if (deltaY < -100) {
            card.style.transform = '';
            handleSwipe('FAVORITE');
        } else {
            // Если сдвинули мало — возвращаем на место
            card.style.transform = `translate(0px, 0px) rotate(0deg)`;
        }
    });
}

// Запуск
loadFeed();