let mealPlanData = [];
let cachedCollection = null;
let skippedRecipeIds = [];
let currentCell = { dayNumber: null, mealType: null };
let currentSuggestedRecipe = null;
let currentDays = 1;
let isSuggesting = false;

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'];
const MEAL_NAMES = { BREAKFAST: 'Завтрак', LUNCH: 'Обед', SNACK: 'Перекус', DINNER: 'Ужин' };
const PLAN_FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect fill='%230f172a' width='300' height='200'/%3E%3Ctext fill='%2394a3b8' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EНет фото%3C/text%3E%3C/svg%3E";

document.addEventListener('DOMContentLoaded', loadCurrentPlan);

async function loadCurrentPlan() {
    if (!localStorage.getItem('token')) {
        document.getElementById('plan-setup-screen').style.display = 'block';
        document.getElementById('plan-grid-screen').style.display = 'none';
        return;
    }

    try {
        const res = await fetchApi('/meal-plans');
        const plan = normalizeArray(res, ['cells', 'items', 'content', 'data']);
        if (plan.length === 0) {
            document.getElementById('plan-setup-screen').style.display = 'block';
            document.getElementById('plan-grid-screen').style.display = 'none';
        } else {
            mealPlanData = plan;
            const maxDay = Math.max(...plan.map(p => Number(p.dayNumber) || 1), Number(res?.days) || 1);
            renderGrid(maxDay);
        }
    } catch (e) {
        console.error('Ошибка загрузки плана:', e);
        document.getElementById('plan-setup-screen').style.display = 'block';
        document.getElementById('plan-grid-screen').style.display = 'none';
    }
}

function initGrid(days) {
    mealPlanData = [];
    renderGrid(days);
}

function renderGrid(days) {
    currentDays = days;
    document.getElementById('plan-setup-screen').style.display = 'none';
    document.getElementById('plan-grid-screen').style.display = 'block';

    const header = document.getElementById('grid-header');
    const body = document.getElementById('grid-body');

    header.innerHTML = '<th>Прием пищи</th>' + Array.from({ length: days }, (_, i) => `<th>День ${i + 1}</th>`).join('');
    body.innerHTML = '';

    MEAL_TYPES.forEach(type => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${MEAL_NAMES[type]}</td>`;
        for (let day = 1; day <= days; day++) {
            const cell = mealPlanData.find(p => Number(p.dayNumber) === day && p.mealType === type);
            const recipe = cell ? (cell.recipe || (cell.name ? cell : null)) : null;
            const td = document.createElement('td');
            td.className = recipe ? 'cell-filled' : 'cell-empty';
            td.onclick = () => openCellModal(day, type);

            if (recipe) {
                td.innerHTML = `<img src="${recipe.photoUrl || PLAN_FALLBACK_IMG}" onerror="this.src='${PLAN_FALLBACK_IMG}'" alt="${recipe.name}"><div class="name">${recipe.name}</div>`;
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
    skippedRecipeIds = [];
    currentSuggestedRecipe = null;

    document.getElementById('cell-modal').style.display = 'flex';
    document.getElementById('suggested-recipe-preview').innerHTML = '<p style="color:#94a3b8; font-size:13px;">Нажмите «Сгенерировать блюдо» или выберите из коллекции слева.</p>';
    document.getElementById('btn-skip').style.display = 'none';
    document.getElementById('btn-apply').style.display = 'none';

    const list = document.getElementById('collection-list');

    if (cachedCollection === null) {
        list.innerHTML = '<p style="color:#94a3b8; font-size:13px;">Загрузка коллекции...</p>';
        try {
            const res = await fetchApi('/recipes/collection');
            cachedCollection = normalizeArray(res);
        } catch (err) {
            console.error('Ошибка загрузки коллекции:', err);
            list.innerHTML = `<p style="color:#f87171; font-size:13px;">Не удалось загрузить коллекцию: ${err.message}</p>`;
            return;
        }
    }

    if (cachedCollection.length === 0) {
        list.innerHTML = '<p style="color:#94a3b8; font-size:13px;">В коллекции пока нет блюд. Лайкайте или сохраняйте рецепты на главной.</p>';
    } else {
        list.innerHTML = cachedCollection.map(r => `
            <div class="collection-item" onclick="MealPlanApp.selectFromCollection(${r.id})">
                <img src="${r.photoUrl || PLAN_FALLBACK_IMG}" onerror="this.src='${PLAN_FALLBACK_IMG}'"> <span>${r.name}</span>
            </div>
        `).join('');
    }
}

function selectFromCollection(recipeId) {
    if (!Array.isArray(cachedCollection)) return;
    const recipe = cachedCollection.find(r => r.id === recipeId);
    if (recipe) showRecipePreview(recipe);
}

async function suggestRecipe(isSkip = false, isRetryAfterReset = false) {
    if (isSuggesting) return;

    if (isSkip && currentSuggestedRecipe && currentSuggestedRecipe.id != null) {
        if (!skippedRecipeIds.includes(currentSuggestedRecipe.id)) {
            skippedRecipeIds.push(currentSuggestedRecipe.id);
        }
    }

    const preview = document.getElementById('suggested-recipe-preview');
    preview.innerHTML = '<p style="color:#94a3b8;">Подбираем подходящее блюдо...</p>';
    isSuggesting = true;

    try {
        const res = await fetchApi('/meal-plans/suggest', {
            method: 'POST',
            body: {
                dayNumber: currentCell.dayNumber,
                mealType: currentCell.mealType,
                skippedRecipeIds: skippedRecipeIds
            }
        });

        const recipe = res && res.recipe ? res.recipe : res;
        if (recipe && recipe.name) {
            showRecipePreview(recipe);
        } else {
            preview.innerHTML = '<p style="color:#fbbf24; font-size:13px;">Подходящих блюд под ваши фильтры не найдено.</p>';
            document.getElementById('btn-skip').style.display = 'none';
            document.getElementById('btn-apply').style.display = 'none';
        }
    } catch (error) {
        console.error('Ошибка генерации блюда:', error);
        if (error.status === 400 && skippedRecipeIds.length > 0 && !isRetryAfterReset) {
            skippedRecipeIds = [];
            isSuggesting = false;
            return suggestRecipe(false, true);
        }
        preview.innerHTML = `<p style="color:#f87171; font-size:13px;">Ошибка генерации: ${error.message}</p>`;
        document.getElementById('btn-skip').style.display = 'none';
        document.getElementById('btn-apply').style.display = 'none';
    } finally {
        isSuggesting = false;
    }
}

function showRecipePreview(recipe) {
    currentSuggestedRecipe = recipe;
    document.getElementById('suggested-recipe-preview').innerHTML = `
        <h4 style="color:#f97316; margin-bottom:10px;">${recipe.name}</h4>
        <img src="${recipe.photoUrl || PLAN_FALLBACK_IMG}" onerror="this.src='${PLAN_FALLBACK_IMG}'" style="width:100%; height:180px; object-fit:cover; border-radius:8px; margin-bottom:10px; cursor:pointer;" onclick="showRecipeModal(MealPlanApp.getCurrentSuggested())">
        <p style="font-size:13px; color:#cbd5e1;">Ккал: ${Math.round(recipe.totalCalories || 0)} | Б: ${Math.round(recipe.totalProtein || 0)} | Ж: ${Math.round(recipe.totalFat || 0)} | У: ${Math.round(recipe.totalCarbohydrates || 0)}</p>
    `;
    document.getElementById('btn-skip').style.display = 'inline-block';
    document.getElementById('btn-apply').style.display = 'inline-block';
}

function applyRecipeToCell() {
    if (!currentSuggestedRecipe) return;
    mealPlanData = mealPlanData.filter(c => !(Number(c.dayNumber) === currentCell.dayNumber && c.mealType === currentCell.mealType));

    mealPlanData.push({
        dayNumber: currentCell.dayNumber,
        mealType: currentCell.mealType,
        recipeId: currentSuggestedRecipe.id,
        recipe: currentSuggestedRecipe
    });

    document.getElementById('cell-modal').style.display = 'none';
    renderGrid(Math.max(...mealPlanData.map(c => Number(c.dayNumber) || 1), currentDays));
}

async function savePlan() {
    const cells = mealPlanData.map(c => ({
        dayNumber: Number(c.dayNumber),
        mealType: c.mealType,
        recipeId: c.recipeId || (c.recipe && c.recipe.id)
    }));
    try {
        await fetchApi('/meal-plans', { method: 'POST', body: { cells } });
        alert('План питания успешно сохранен!');
    } catch (e) {
        alert(`Ошибка при сохранении плана: ${e.message}`);
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
            alert(`Ошибка при удалении плана: ${e.message}`);
        }
    }
}

async function openShoppingList() {
    try {
        const data = await fetchApi('/meal-plans/shopping-list');
        const items = normalizeArray(data, ['items', 'ingredients', 'content']);
        const list = document.getElementById('shopping-items-list');
        list.innerHTML = items.length > 0
            ? items.map(item => `
                <li style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #334155;">
                    <span>${item.ingredientName || item.name}</span>
                    <span><b>${item.totalGrams || item.amountGrams || 0}г</b> (${item.estimatedPrice ?? 0} руб.)</span>
                </li>
            `).join('')
            : '<li style="color:#94a3b8;">Список пуст</li>';
        document.getElementById('shopping-total-price').innerText = `Итого: ${data?.totalPrice ?? 0} руб.`;
        document.getElementById('shopping-list-modal').style.display = 'flex';
    } catch (e) {
        alert('Сначала сохраните план питания, чтобы сформировать список покупок.');
    }
}

window.MealPlanApp = {
    initGrid,
    selectFromCollection,
    suggestRecipe,
    applyRecipeToCell,
    savePlan,
    resetPlan,
    openShoppingList,
    downloadPDF: window.downloadPdf,
    getCurrentSuggested: () => currentSuggestedRecipe
};