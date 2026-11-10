const MealPlanApp = (() => {
    const API_BASE = '/api';
    let currentPlanCells = [];
    let currentDaysCount = 0;
    
    // Состояние модального окна ячейки
    let activeCell = { dayNumber: null, mealType: null };
    let skippedRecipeIds = []; // Массив для отслеживания скипов в текущей ячейке
    let currentSuggestedRecipe = null;
    let cachedCollection = null;

    const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'];
    const MEAL_LABELS = { 'BREAKFAST': 'Завтрак', 'LUNCH': 'Обед', 'SNACK': 'Перекус', 'DINNER': 'Ужин' };

    // Базовая функция запросов с JWT-авторизацией
    async function apiFetch(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        const headers = { 'Authorization': `Bearer ${token}` };
        if (!(options.body instanceof FormData) && options.method !== 'GET') {
            headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
        
        if (response.status === 401) {
            window.location.href = '/login.html'; // 401 Unauthorized
            return null;
        }
        
        // Обработка бинарного потока для PDF
        if (options.isBlob) {
            return await response.blob();
        }
        
        // Обработка текстовых/JSON ответов
        const text = await response.text();
        try {
            return { status: response.status, data: text ? JSON.parse(text) : null };
        } catch {
            return { status: response.status, data: text };
        }
    }

    // Инициализация при входе на вкладку
    async function loadCurrentPlan() {
        const res = await apiFetch('/meal-plans');
        if (res && res.status === 200) {
            if (res.data.length === 0) {
                // План еще не создан
                document.getElementById('plan-setup-screen').style.display = 'block';
                document.getElementById('plan-grid-screen').style.display = 'none';
            } else {
                // План существует, рендерим сетку
                currentPlanCells = res.data;
                currentDaysCount = Math.max(...currentPlanCells.map(c => c.dayNumber));
                renderGrid();
            }
        }
    }

    // Отрисовка сетки
    function renderGrid() {
        document.getElementById('plan-setup-screen').style.display = 'none';
        document.getElementById('plan-grid-screen').style.display = 'block';
        
        const header = document.getElementById('grid-header');
        const body = document.getElementById('grid-body');
        header.innerHTML = '<th>Прием пищи</th>';
        body.innerHTML = '';

        for (let d = 1; d <= currentDaysCount; d++) {
            header.innerHTML += `<th>День ${d}</th>`;
        }

        MEAL_TYPES.forEach(mealType => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${MEAL_LABELS[mealType]}</td>`;
            
            for (let d = 1; d <= currentDaysCount; d++) {
                const cellData = currentPlanCells.find(c => c.dayNumber === d && c.mealType === mealType);
                const td = document.createElement('td');
                td.style.cursor = 'pointer';
                td.style.border = '1px solid #ccc';
                td.onclick = () => openCellModal(d, mealType);
                
                if (cellData && cellData.recipe) {
                    td.innerHTML = `<img src="${cellData.recipe.photoUrl}" width="50"><br>${cellData.recipe.name}`;
                } else {
                    td.innerHTML = '+ Добавить';
                }
                tr.appendChild(td);
            }
            body.appendChild(tr);
        });
    }

    function initGrid(days) {
        currentDaysCount = days;
        currentPlanCells = [];
        renderGrid();
    }

    // Модальное окно и генерация
    async function openCellModal(day, mealType) {
        activeCell = { dayNumber: day, mealType: mealType };
        skippedRecipeIds = []; // Сброс истории скипов при переходе к новой ячейке
        currentSuggestedRecipe = null;
        
        document.getElementById('cell-modal').style.display = 'block';
        document.getElementById('suggested-recipe-preview').innerHTML = '';
        document.getElementById('btn-skip').style.display = 'none';
        document.getElementById('btn-apply').style.display = 'none';

        // Кэшируем и выводим коллекцию (лайки + избранное)
        if (!cachedCollection) {
            const res = await apiFetch('/recipes/collection');
            if (res && res.status === 200) cachedCollection = res.data;
        }
        
        const colList = document.getElementById('collection-list');
        colList.innerHTML = cachedCollection.map(r => 
            `<div onclick="MealPlanApp.selectFromCollection(${r.id})" style="cursor:pointer; padding:5px; border-bottom:1px solid #eee;">
                <img src="${r.photoUrl}" width="40"> ${r.name}
            </div>`
        ).join('');
    }

    function selectFromCollection(recipeId) {
        const recipe = cachedCollection.find(r => r.id === recipeId);
        showRecipePreview(recipe);
    }

    async function suggestRecipe(isSkip = false) {
        if (isSkip && currentSuggestedRecipe) {
            skippedRecipeIds.push(currentSuggestedRecipe.id); // Пополняем список скипов
        }

        let res = await apiFetch('/meal-plans/suggest', {
            method: 'POST',
            body: JSON.stringify({
                mealType: activeCell.mealType,
                skippedRecipeIds: skippedRecipeIds
            })
        });

        // Если рецепты закончились, обнуляем список скипов и идем по второму кругу
        if (res.status === 400) {
            skippedRecipeIds = [];
            res = await apiFetch('/meal-plans/suggest', {
                method: 'POST',
                body: JSON.stringify({ mealType: activeCell.mealType, skippedRecipeIds: [] })
            });
        }

        if (res.status === 200 && res.data) {
            showRecipePreview(res.data);
        }
    }

    function showRecipePreview(recipe) {
        currentSuggestedRecipe = recipe;
        document.getElementById('suggested-recipe-preview').innerHTML = `
            <h4>${recipe.name}</h4>
            <img src="${recipe.photoUrl}" width="100">
            <p>КБЖУ: ${recipe.totalCalories} ккал | Б: ${recipe.totalProtein} Ж: ${recipe.totalFat} У: ${recipe.totalCarbohydrates}</p>
        `;
        document.getElementById('btn-skip').style.display = 'inline-block';
        document.getElementById('btn-apply').style.display = 'inline-block';
    }

    function applyRecipeToCell() {
        if (!currentSuggestedRecipe) return;
        
        // Удаляем старую запись для этой ячейки, если была
        currentPlanCells = currentPlanCells.filter(c => !(c.dayNumber === activeCell.dayNumber && c.mealType === activeCell.mealType));
        
        currentPlanCells.push({
            dayNumber: activeCell.dayNumber,
            mealType: activeCell.mealType,
            recipeId: currentSuggestedRecipe.id,
            recipe: currentSuggestedRecipe
        });
        
        document.getElementById('cell-modal').style.display = 'none';
        renderGrid();
    }

    // Сохранение и удаление плана
    async function savePlan() {
        const cellsToSave = currentPlanCells.map(c => ({
            dayNumber: c.dayNumber,
            mealType: c.mealType,
            recipeId: c.recipeId || c.recipe.id
        }));

        const res = await apiFetch('/meal-plans', {
            method: 'POST',
            body: JSON.stringify({ cells: cellsToSave })
        });

        if (res.status === 200) alert('План сохранен!');
    }

    async function resetPlan() {
        if (confirm('Вы уверены? Старый план будет удален.')) { // Предупреждение перед удалением
            const res = await apiFetch('/meal-plans', { method: 'DELETE' });
            if (res.status === 200) {
                currentPlanCells = [];
                document.getElementById('plan-grid-screen').style.display = 'none';
                document.getElementById('plan-setup-screen').style.display = 'block';
            }
        }
    }

    // Список покупок
    async function openShoppingList() {
        const res = await apiFetch('/meal-plans/shopping-list');
        if (res.status === 200) {
            const list = document.getElementById('shopping-items-list');
            list.innerHTML = res.data.items.map(item => 
                `<li>${item.ingredientName}: ${item.totalGrams} г. — ${item.estimatedPrice} руб.</li>`
            ).join('');
            document.getElementById('shopping-total-price').innerText = `Итого: ${res.data.totalPrice} руб.`;
            document.getElementById('shopping-list-modal').style.display = 'block';
        }
    }

    // Экспорт в PDF
    async function downloadPDF(endpoint, filename) {
        const blob = await apiFetch(endpoint, { isBlob: true }); // Получение бинарного потока
        if (blob) {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        }
    }

    return {
        loadCurrentPlan, initGrid, openCellModal, selectFromCollection,
        suggestRecipe, applyRecipeToCell, savePlan, resetPlan, openShoppingList, downloadPDF
    };
})();

// Вызов при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    MealPlanApp.loadCurrentPlan();
});