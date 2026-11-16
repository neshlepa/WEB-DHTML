let mealPlanData = [];
let cachedCollection = [];
let skippedRecipeIds = [];
let currentCell = { dayNumber: null, mealType: null };
let currentSuggestedRecipe = null;

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'];
const MEAL_NAMES = { BREAKFAST: 'Завтрак', LUNCH: 'Обед', SNACK: 'Перекус', DINNER: 'Ужин' };

document.addEventListener('DOMContentLoaded', loadCurrentPlan);

async function loadCurrentPlan() {
    try {
        const plan = await fetchApi('/meal-plans');
        if (!plan || plan.length === 0) {
            document.getElementById('plan-setup-screen').style.display = 'block';
            document.getElementById('plan-grid-screen').style.display = 'none';
        } else {
            mealPlanData = plan;
            renderGrid(Math.max(...plan.map(p => p.dayNumber)));
        }
    } catch (e) {
        console.error(e);
    }
}

function initGrid(days) {
    mealPlanData = [];
    renderGrid(days);
}

function renderGrid(days) {
    document.getElementById('plan-setup-screen').style.display = 'none';
    document.getElementById('plan-grid-screen').style.display = 'block';
    
    const header = document.getElementById('grid-header');
    const body = document.getElementById('grid-body');
    
    header.innerHTML = '<th>Прием пищи</th>' + Array.from({length: days}, (_, i) => `<th>День ${i+1}</th>`).join('');
    body.innerHTML = '';

    MEAL_TYPES.forEach(type => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${MEAL_NAMES[type]}</td>`;
        for (let day = 1; day <= days; day++) {
            const cell = mealPlanData.find(p => p.dayNumber === day && p.mealType === type);
            const td = document.createElement('td');
            td.className = cell ? 'cell-filled' : 'cell-empty';
            td.onclick = () => openCellModal(day, type);
            
            if (cell && cell.recipe) {
                td.innerHTML = `<img src="${cell.recipe.photoUrl}" alt="${cell.recipe.name}"><div class="name">${cell.recipe.name}</div>`;
            } else {
                td.innerHTML = '+ Добавить';
            }
            tr.appendChild(td);
        }
        body.appendChild(tr);
    });
}

async function openCellModal(day, mealType) {
    currentCell = { dayNumber: day, mealType: mealType };
    skippedRecipeIds = []; // Обязательный сброс при открытии новой ячейки
    currentSuggestedRecipe = null;
    
    document.getElementById('cell-modal').style.display = 'flex';
    document.getElementById('suggested-recipe-preview').innerHTML = '';
    document.getElementById('btn-skip').style.display = 'none';
    document.getElementById('btn-apply').style.display = 'none';

    if (cachedCollection.length === 0) {
        cachedCollection = await fetchApi('/recipes/collection') || [];
    }
    
    const list = document.getElementById('collection-list');
    list.innerHTML = cachedCollection.map(r => `
        <div class="collection-item" onclick="MealPlanApp.selectFromCollection(${r.id})">
            <img src="${r.photoUrl}"> <span>${r.name}</span>
        </div>
    `).join('');
}

function selectFromCollection(recipeId) {
    const recipe = cachedCollection.find(r => r.id === recipeId);
    showRecipePreview(recipe);
}

async function suggestRecipe(isSkip = false) {
    if (isSkip && currentSuggestedRecipe) {
        skippedRecipeIds.push(currentSuggestedRecipe.id);
    }

    try {
        const recipe = await fetchApi('/meal-plans/suggest', {
            method: 'POST',
            body: { mealType: currentCell.mealType, skippedRecipeIds: skippedRecipeIds }
        });
        if (recipe) showRecipePreview(recipe);
    } catch (error) {
        if (error.status === 400) {
            // Если рецепты кончились — обнуляем список и идем по кругу
            skippedRecipeIds = [];
            suggestRecipe(false); 
        } else {
            alert('Не удалось сгенерировать рецепт');
        }
    }
}

function showRecipePreview(recipe) {
    currentSuggestedRecipe = recipe;
    document.getElementById('suggested-recipe-preview').innerHTML = `
        <h4 style="color:#f97316; margin-bottom:10px;">${recipe.name}</h4>
        <img src="${recipe.photoUrl}" style="width:100%; height:180px; object-fit:cover; border-radius:8px; margin-bottom:10px;" onclick="showRecipeModal(MealPlanApp.getCurrentSuggested())">
        <p style="font-size:13px; color:#cbd5e1;">Ккал: ${Math.round(recipe.totalCalories)} | Б: ${Math.round(recipe.totalProtein)} | Ж: ${Math.round(recipe.totalFat)} | У: ${Math.round(recipe.totalCarbohydrates)}</p>
    `;
    document.getElementById('btn-skip').style.display = 'inline-block';
    document.getElementById('btn-apply').style.display = 'inline-block';
}

function applyRecipeToCell() {
    if (!currentSuggestedRecipe) return;
    mealPlanData = mealPlanData.filter(c => !(c.dayNumber === currentCell.dayNumber && c.mealType === currentCell.mealType));
    
    mealPlanData.push({
        dayNumber: currentCell.dayNumber,
        mealType: currentCell.mealType,
        recipeId: currentSuggestedRecipe.id,
        recipe: currentSuggestedRecipe
    });
    
    document.getElementById('cell-modal').style.display = 'none';
    renderGrid(Math.max(...mealPlanData.map(c => c.dayNumber), document.getElementById('grid-header').children.length - 1));
}

async function savePlan() {
    const cells = mealPlanData.map(c => ({
        dayNumber: c.dayNumber,
        mealType: c.mealType,
        recipeId: c.recipeId || c.recipe.id
    }));
    try {
        await fetchApi('/meal-plans', { method: 'POST', body: { cells } });
        alert('План питания успешно сохранен!');
    } catch (e) {
        alert('Ошибка при сохранении плана');
    }
}

async function resetPlan() {
    if (confirm('Внимание! Текущий план будет полностью удален. Продолжить?')) {
        try {
            await fetchApi('/meal-plans', { method: 'DELETE' });
            mealPlanData = [];
            document.getElementById('plan-grid-screen').style.display = 'none';
            document.getElementById('plan-setup-screen').style.display = 'block';
        } catch (e) {
            alert('Ошибка при удалении плана');
        }
    }
}

async function openShoppingList() {
    try {
        const data = await fetchApi('/meal-plans/shopping-list');
        const list = document.getElementById('shopping-items-list');
        list.innerHTML = data.items.map(item => `
            <li style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #334155;">
                <span>${item.ingredientName}</span>
                <span><b>${item.totalGrams}г</b> (${item.estimatedPrice} руб.)</span>
            </li>
        `).join('');
        document.getElementById('shopping-total-price').innerText = `Итого: ${data.totalPrice} руб.`;
        document.getElementById('shopping-list-modal').style.display = 'flex';
    } catch (e) {
        alert('Сначала сохраните план питания, чтобы сформировать список покупок.');
    }
}

// Экспортируем методы для HTML
window.MealPlanApp = {
    initGrid, selectFromCollection, suggestRecipe, applyRecipeToCell,
    savePlan, resetPlan, openShoppingList, downloadPDF: window.downloadPdf,
    getCurrentSuggested: () => currentSuggestedRecipe
};