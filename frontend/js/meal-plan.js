const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'];
const MEAL_NAMES = {
    BREAKFAST: 'Завтрак',
    LUNCH: 'Обед',
    SNACK: 'Перекус',
    DINNER: 'Ужин'
};

let mealPlanData = [];
let cachedCollection = null;
let skippedRecipeIds = [];
let currentCell = { dayNumber: null, mealType: null };
let currentSuggestedRecipe = null;
let currentDays = 1;
let isSuggesting = false;
let hasUnsavedChanges = false;

function getDaysStorageKey() {
    return `mealPlanDays_${getUserEmail() || 'default'}`;
}

function snapToValidDays(maxDay) {
    if (maxDay > 3) return 7;
    if (maxDay > 1) return 3;
    return 1;
}

function setUnsavedState(flag) {
    hasUnsavedChanges = flag;
    const badge = document.getElementById('unsavedBadge');
    if (badge) badge.style.display = flag ? 'inline-block' : 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    if (!getToken()) {
        renderAuthRequired(
            document.getElementById('planWrapper'),
            'Войдите в аккаунт, чтобы составлять план питания на 1, 3 или 7 дней, формировать список покупок и скачивать PDF.'
        );
        return;
    }

    setupDropzone();
    setupModalBackdropClose();
    loadCurrentPlan();
});

function setupModalBackdropClose() {
    const cellModal = document.getElementById('cell-modal');
    const shoppingModal = document.getElementById('shopping-list-modal');

    cellModal.addEventListener('click', (e) => {
        if (e.target === cellModal) closeCellModal();
    });
    shoppingModal.addEventListener('click', (e) => {
        if (e.target === shoppingModal) closeShoppingModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const recipeModal = document.getElementById('global-recipe-modal');
        if (recipeModal && recipeModal.style.display === 'flex') return;
        if (cellModal.style.display === 'flex') closeCellModal();
        if (shoppingModal.style.display === 'flex') closeShoppingModal();
    });
}

function setupDropzone() {
    const dropzone = document.getElementById('recipe-dropzone');
    if (!dropzone) return;

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', (e) => {
        if (!dropzone.contains(e.relatedTarget)) {
            dropzone.classList.remove('drag-over');
        }
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        const recipeId = Number(e.dataTransfer.getData('text/plain'));
        if (!Number.isNaN(recipeId)) {
            selectFromCollection(recipeId);
        }
    });
}

async function loadCurrentPlan() {
    const loadingEl = document.getElementById('plan-loading');
    const setupEl = document.getElementById('plan-setup-screen');
    const gridEl = document.getElementById('plan-grid-screen');

    try {
        const res = await fetchApi('/meal-plans');
        const plan = normalizeArray(res, ['cells', 'items', 'content', 'data']);
        loadingEl.style.display = 'none';

        if (plan.length === 0) {
            mealPlanData = [];
            setUnsavedState(false);
            setupEl.style.display = 'block';
            gridEl.style.display = 'none';
        } else {
            mealPlanData = plan.map(cell => ({
                dayNumber: Number(cell.dayNumber),
                mealType: cell.mealType,
                recipeId: cell.recipe ? cell.recipe.id : cell.recipeId,
                recipe: cell.recipe
            }));
            const maxDay = Math.max(...mealPlanData.map(p => p.dayNumber || 1));
            const savedDays = Number(localStorage.getItem(getDaysStorageKey())) || 1;
            const days = Math.max(snapToValidDays(maxDay), [1, 3, 7].includes(savedDays) ? savedDays : 1);
            setUnsavedState(false);
            renderGrid(days);
        }
    } catch (e) {
        console.error('Ошибка загрузки плана:', e);
        loadingEl.style.display = 'none';
        setupEl.style.display = 'block';
        gridEl.style.display = 'none';
        showToast(`Не удалось загрузить план: ${e.message}`, 'error');
    }
}

function initGrid(days) {
    mealPlanData = [];
    localStorage.setItem(getDaysStorageKey(), String(days));
    setUnsavedState(false);
    renderGrid(days);
}

function renderGrid(days) {
    currentDays = days;
    document.getElementById('plan-loading').style.display = 'none';
    document.getElementById('plan-setup-screen').style.display = 'none';
    document.getElementById('plan-grid-screen').style.display = 'block';

    const dayWord = days === 1 ? 'день' : (days < 5 ? 'дня' : 'дней');
    document.getElementById('planTitle').textContent = `План питания на ${days} ${dayWord}`;

    const header = document.getElementById('grid-header');
    const body = document.getElementById('grid-body');

    header.innerHTML = '<th>Приём пищи</th>' +
        Array.from({ length: days }, (_, i) => `<th>День ${i + 1}</th>`).join('');
    body.innerHTML = '';

    MEAL_TYPES.forEach(type => {
        const tr = document.createElement('tr');
        const labelTd = document.createElement('td');
        labelTd.className = 'meal-row-label';
        labelTd.textContent = MEAL_NAMES[type];
        tr.appendChild(labelTd);

        for (let day = 1; day <= days; day++) {
            const cell = mealPlanData.find(p => Number(p.dayNumber) === day && p.mealType === type);
            const recipe = cell ? cell.recipe : null;
            const td = document.createElement('td');
            td.className = 'plan-cell';
            td.addEventListener('click', () => openCellModal(day, type));

            if (recipe) {
                const wrapper = document.createElement('div');
                wrapper.className = 'cell-filled-card';
                wrapper.innerHTML = `
                    <img src="${escapeHtml(recipe.photoUrl || FALLBACK_IMG)}" onerror="this.src='${FALLBACK_IMG}'" alt="${escapeHtml(recipe.name)}">
                    <div class="name">${escapeHtml(recipe.name)}</div>
                    <div class="kcal">${Math.round(recipe.totalCalories || 0)} ккал • ${escapeHtml(recipe.time || 0)} мин</div>
                `;
                const viewBtn = document.createElement('button');
                viewBtn.type = 'button';
                viewBtn.className = 'cell-view-btn';
                viewBtn.textContent = 'Рецепт';
                viewBtn.title = 'Открыть полный рецепт';
                viewBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.showRecipeModal(recipe);
                });
                wrapper.appendChild(viewBtn);
                td.appendChild(wrapper);
            } else {
                td.innerHTML = '<div class="cell-empty-inner">+ Добавить</div>';
            }

            tr.appendChild(td);
        }
        body.appendChild(tr);
    });

    // Строка суммарного КБЖУ за каждый день
    const totalsTr = document.createElement('tr');
    totalsTr.className = 'totals-row';
    totalsTr.innerHTML = '<td class="meal-row-label">Итого за день</td>';

    for (let day = 1; day <= days; day++) {
        const dayCells = mealPlanData.filter(p => Number(p.dayNumber) === day && p.recipe);
        const kcal = Math.round(dayCells.reduce((s, c) => s + (c.recipe.totalCalories || 0), 0));
        const protein = Math.round(dayCells.reduce((s, c) => s + (c.recipe.totalProtein || 0), 0));
        const fat = Math.round(dayCells.reduce((s, c) => s + (c.recipe.totalFat || 0), 0));
        const carbs = Math.round(dayCells.reduce((s, c) => s + (c.recipe.totalCarbohydrates || 0), 0));

        const td = document.createElement('td');
        td.innerHTML = kcal > 0
            ? `<b>${kcal} ккал</b>Б:${protein} Ж:${fat} У:${carbs}`
            : '<span style="color:#aaa;">—</span>';
        totalsTr.appendChild(td);
    }
    body.appendChild(totalsTr);
}

async function openCellModal(day, mealType) {
    currentCell = { dayNumber: day, mealType };
    skippedRecipeIds = [];
    currentSuggestedRecipe = null;

    const existing = mealPlanData.find(c => Number(c.dayNumber) === day && c.mealType === mealType);

    document.getElementById('cell-modal-title').textContent = `День ${day} — ${MEAL_NAMES[mealType]}`;
    document.getElementById('btn-clear-cell').style.display = existing ? 'inline-block' : 'none';
    document.getElementById('cell-modal').style.display = 'flex';

    if (existing && existing.recipe) {
        showRecipePreview(existing.recipe, false);
    } else {
        document.getElementById('suggested-recipe-preview').innerHTML = `
            <div class="dropzone-placeholder">
                Перетащите сюда блюдо из коллекции слева<br>
                или нажмите <b>«Сгенерировать блюдо»</b>
            </div>`;
        document.getElementById('btn-skip').style.display = 'none';
        document.getElementById('btn-apply').style.display = 'none';
    }

    await loadCollectionIntoSidebar();
}

async function loadCollectionIntoSidebar() {
    const list = document.getElementById('collection-list');

    if (cachedCollection === null) {
        list.innerHTML = '<p style="color:#888; font-size:13px;">Загрузка коллекции...</p>';
        try {
            const res = await fetchApi('/recipes/collection');
            cachedCollection = normalizeArray(res);
        } catch (err) {
            console.error('Ошибка загрузки коллекции:', err);
            list.innerHTML = `<p style="color:#c62828; font-size:13px;">Не удалось загрузить коллекцию: ${escapeHtml(err.message)}</p>`;
            return;
        }
    }

    if (cachedCollection.length === 0) {
        list.innerHTML = '<p style="color:#888; font-size:13px;">В коллекции пока нет блюд. Лайкайте или добавляйте рецепты в избранное на главной странице.</p>';
        return;
    }

    list.innerHTML = '';
    cachedCollection.forEach(recipe => {
        const item = document.createElement('div');
        item.className = 'collection-item';
        item.draggable = true;
        item.dataset.recipeId = String(recipe.id);

        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', String(recipe.id));
            e.dataTransfer.effectAllowed = 'copy';
        });

        item.addEventListener('click', () => selectFromCollection(recipe.id));

        item.innerHTML = `
            <img src="${escapeHtml(recipe.photoUrl || FALLBACK_IMG)}" onerror="this.src='${FALLBACK_IMG}'" draggable="false" alt="${escapeHtml(recipe.name)}">
            <div class="collection-item-info">
                <div class="name">${escapeHtml(recipe.name)}</div>
                <small>${Math.round(recipe.totalCalories || 0)} ккал • ${escapeHtml(recipe.time || 0)} мин</small>
            </div>
        `;

        const viewBtn = document.createElement('button');
        viewBtn.type = 'button';
        viewBtn.className = 'collection-item-view';
        viewBtn.textContent = 'Рецепт';
        viewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.showRecipeModal(recipe);
        });
        item.appendChild(viewBtn);

        list.appendChild(item);
    });
}

function closeCellModal() {
    document.getElementById('cell-modal').style.display = 'none';
    skippedRecipeIds = [];
    currentSuggestedRecipe = null;
}

function closeShoppingModal() {
    document.getElementById('shopping-list-modal').style.display = 'none';
}

function selectFromCollection(recipeId) {
    if (!Array.isArray(cachedCollection)) return;
    const recipe = cachedCollection.find(r => Number(r.id) === Number(recipeId));
    if (recipe) {
        showRecipePreview(recipe, true);
    }
}

async function suggestRecipe(isRetryAfterReset = false) {
    if (isSuggesting) return;

    // Если в превью уже есть блюдо, добавляем его в скипнутые, чтобы не повторялось в рамках этой ячейки
    if (!isRetryAfterReset && currentSuggestedRecipe && currentSuggestedRecipe.id != null) {
        if (!skippedRecipeIds.includes(currentSuggestedRecipe.id)) {
            skippedRecipeIds.push(currentSuggestedRecipe.id);
        }
    }

    const preview = document.getElementById('suggested-recipe-preview');
    preview.innerHTML = '<div class="dropzone-placeholder">Подбираем подходящее блюдо...</div>';
    isSuggesting = true;

    try {
        const recipe = await fetchApi('/meal-plans/suggest', {
            method: 'POST',
            body: {
                mealType: currentCell.mealType,
                skippedRecipeIds: skippedRecipeIds
            }
        });

        if (recipe && recipe.id != null) {
            showRecipePreview(recipe, true);
        } else {
            preview.innerHTML = '<div class="dropzone-placeholder" style="color:#c62828;">Подходящих блюд не найдено.</div>';
            document.getElementById('btn-skip').style.display = 'none';
            document.getElementById('btn-apply').style.display = 'none';
        }
    } catch (error) {
        // По ТЗ: если перебрали все варианты (400), сбрасываем список скипов и идём по второму кругу
        if (error.status === 400 && skippedRecipeIds.length > 0 && !isRetryAfterReset) {
            skippedRecipeIds = [];
            isSuggesting = false;
            showToast('Вы просмотрели все варианты — показываем по новому кругу', 'info');
            return suggestRecipe(true);
        }

        preview.innerHTML = `<div class="dropzone-placeholder" style="color:#c62828;">${escapeHtml(error.message)}</div>`;
        document.getElementById('btn-skip').style.display = 'none';
        document.getElementById('btn-apply').style.display = 'none';
    } finally {
        isSuggesting = false;
    }
}

function showRecipePreview(recipe, canApply = true) {
    currentSuggestedRecipe = recipe;
    const preview = document.getElementById('suggested-recipe-preview');

    preview.innerHTML = `
        <div class="preview-card">
            <img src="${escapeHtml(recipe.photoUrl || FALLBACK_IMG)}" onerror="this.src='${FALLBACK_IMG}'" alt="${escapeHtml(recipe.name)}" id="previewRecipeImg" title="Нажмите, чтобы открыть полный рецепт">
            <h4>${escapeHtml(recipe.name)}</h4>
            <div class="preview-macros">
                <span><b>${Math.round(recipe.totalCalories || 0)}</b> ккал</span>
                <span>Б: <b>${Math.round(recipe.totalProtein || 0)}г</b></span>
                <span>Ж: <b>${Math.round(recipe.totalFat || 0)}г</b></span>
                <span>У: <b>${Math.round(recipe.totalCarbohydrates || 0)}г</b></span>
            </div>
            <button type="button" class="btn-open-recipe" style="margin-bottom:0;" id="previewOpenFullBtn">Открыть полный рецепт</button>
        </div>
    `;

    document.getElementById('previewRecipeImg').addEventListener('click', () => window.showRecipeModal(recipe));
    document.getElementById('previewOpenFullBtn').addEventListener('click', () => window.showRecipeModal(recipe));

    document.getElementById('btn-skip').style.display = 'inline-block';
    document.getElementById('btn-apply').style.display = canApply ? 'inline-block' : 'none';
}

function applyRecipeToCell() {
    if (!currentSuggestedRecipe) return;
    mealPlanData = mealPlanData.filter(
        c => !(Number(c.dayNumber) === currentCell.dayNumber && c.mealType === currentCell.mealType)
    );

    mealPlanData.push({
        dayNumber: currentCell.dayNumber,
        mealType: currentCell.mealType,
        recipeId: currentSuggestedRecipe.id,
        recipe: currentSuggestedRecipe
    });

    setUnsavedState(true);
    closeCellModal();
    renderGrid(currentDays);
}

function clearCurrentCell() {
    mealPlanData = mealPlanData.filter(
        c => !(Number(c.dayNumber) === currentCell.dayNumber && c.mealType === currentCell.mealType)
    );
    setUnsavedState(true);
    closeCellModal();
    renderGrid(currentDays);
}

async function savePlan(silent = false) {
    if (mealPlanData.length === 0) {
        if (!silent) showToast('Добавьте хотя бы одно блюдо перед сохранением плана', 'info');
        return false;
    }

    const cells = mealPlanData.map(c => ({
        dayNumber: Number(c.dayNumber),
        mealType: c.mealType,
        recipeId: c.recipeId || (c.recipe && c.recipe.id)
    }));

    const btn = document.getElementById('savePlanBtn');
    if (btn) btn.disabled = true;

    try {
        await fetchApi('/meal-plans', {
            method: 'POST',
            body: { cells }
        });
        setUnsavedState(false);
        if (!silent) showToast('План питания успешно сохранён!', 'success');
        return true;
    } catch (e) {
        showToast(`Ошибка при сохранении плана: ${e.message}`, 'error');
        return false;
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function ensurePlanSavedBeforeExport() {
    if (mealPlanData.length === 0) {
        showToast('Сначала добавьте блюда в план питания', 'info');
        return false;
    }
    if (hasUnsavedChanges) {
        return await savePlan(true);
    }
    return true;
}

async function resetPlan() {
    const confirmed = await window.showConfirmModal(
        'Пересоздать план питания?',
        'Внимание! Текущий сохранённый план будет полностью удалён, и вы сможете выбрать новый период (1, 3 или 7 дней).',
        'Удалить и пересоздать'
    );
    if (!confirmed) return;

    try {
        await fetchApi('/meal-plans', { method: 'DELETE' });
        mealPlanData = [];
        localStorage.removeItem(getDaysStorageKey());
        setUnsavedState(false);
        document.getElementById('plan-grid-screen').style.display = 'none';
        document.getElementById('plan-setup-screen').style.display = 'block';
        showToast('План питания удалён', 'success');
    } catch (e) {
        showToast(`Ошибка при удалении плана: ${e.message}`, 'error');
    }
}

async function openShoppingList() {
    const ready = await ensurePlanSavedBeforeExport();
    if (!ready) return;

    try {
        const data = await fetchApi('/meal-plans/shopping-list');
        const items = normalizeArray(data, ['items', 'ingredients', 'content']);
        const list = document.getElementById('shopping-items-list');

        if (items.length === 0) {
            list.innerHTML = '<li style="color:#888; justify-content:center;">Список покупок пуст</li>';
        } else {
            list.innerHTML = '';
            items.forEach(item => {
                const li = document.createElement('li');
                const price = Number(item.estimatedPrice ?? 0).toFixed(2);
                li.innerHTML = `
                    <label>
                        <input type="checkbox">
                        <span>${escapeHtml(item.ingredientName || item.name)}</span>
                    </label>
                    <span style="white-space:nowrap;"><b>${escapeHtml(item.totalGrams || 0)} г</b> · ${price} ₽</span>
                `;
                li.querySelector('input').addEventListener('change', (e) => {
                    li.classList.toggle('checked', e.target.checked);
                });
                list.appendChild(li);
            });
        }

        const total = Number(data?.totalPrice ?? 0).toFixed(2);
        document.getElementById('shopping-total-price').textContent = `Итого: ${total} ₽`;
        document.getElementById('shopping-list-modal').style.display = 'flex';
    } catch (e) {
        showToast(`Не удалось загрузить список покупок: ${e.message}`, 'error');
    }
}

async function exportPdf(endpoint, filename) {
    const ready = await ensurePlanSavedBeforeExport();
    if (!ready) return;
    await downloadPdf(endpoint, filename);
}

window.MealPlanApp = {
    initGrid,
    selectFromCollection,
    suggestRecipe,
    applyRecipeToCell,
    clearCurrentCell,
    savePlan,
    resetPlan,
    openShoppingList,
    exportPdf,
    closeCellModal,
    closeShoppingModal
};