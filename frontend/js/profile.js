const ALLERGENS = {
    GLUTEN: 'Глютен', LACTOSE: 'Лактоза', NUTS: 'Орехи', EGGS: 'Яйца',
    FISH: 'Рыба', SEAFOOD: 'Морепродукты', SOY: 'Соя', PEANUTS: 'Арахис'
};

const PREFERENCES = {
    VEGETARIAN: 'Вегетарианство', VEGAN: 'Веганство', LOW_CARB: 'Низкоуглеводная',
    HIGH_PROTEIN: 'Высокобелковая', HALAL: 'Халяль', KOSHER: 'Кошерная', NO_PORK: 'Без свинины'
};

let profileData = {};

document.addEventListener('DOMContentLoaded', loadProfile);

async function loadProfile() {
    try {
        profileData = await fetchApi('/users/profile') || {};
        
        document.getElementById('email').value = profileData.email || '';
        document.getElementById('gender').value = profileData.gender || 'male';
        document.getElementById('age').value = profileData.age || '';
        document.getElementById('height').value = profileData.height || '';
        document.getElementById('weight').value = profileData.weight || '';

        renderCheckboxes('allergens-container', ALLERGENS, 'allergens');
        renderCheckboxes('preferences-container', PREFERENCES, 'preferences');
    } catch (error) {
        showMessage('Не удалось загрузить профиль', true);
    }
}

function renderCheckboxes(containerId, data, name) {
    const container = document.getElementById(containerId);
    container.innerHTML = Object.entries(data).map(([key, label]) => {
        const isChecked = profileData[name] && profileData[name].includes(key);
        return `
            <label class="checkbox-pill ${isChecked ? 'checked' : ''}">
                <input type="checkbox" name="${name}" value="${key}" ${isChecked ? 'checked' : ''}>
                ${label}
            </label>
        `;
    }).join('');
}

document.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox') {
        e.target.checked ? e.target.closest('label').classList.add('checked') : e.target.closest('label').classList.remove('checked');
    }
});

document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveBtn');
    btn.disabled = true;

    const payload = {
        gender: document.getElementById('gender').value,
        age: parseInt(document.getElementById('age').value) || 0,
        height: parseInt(document.getElementById('height').value) || 0,
        weight: parseFloat(document.getElementById('weight').value) || 0,
        allergens: Array.from(document.querySelectorAll('input[name="allergens"]:checked')).map(cb => cb.value),
        preferences: Array.from(document.querySelectorAll('input[name="preferences"]:checked')).map(cb => cb.value)
    };

    try {
        await fetchApi('/users/profile', { method: 'PUT', body: payload });
        showMessage('Профиль успешно сохранен!', false);
    } catch (error) {
        showMessage(error.message || 'Ошибка сохранения', true);
    } finally {
        btn.disabled = false;
    }
});

function showMessage(text, isError) {
    const msg = document.getElementById('statusMessage');
    msg.textContent = text;
    msg.style.display = 'block';
    msg.style.backgroundColor = isError ? '#ffebee' : '#e8f5e9';
    msg.style.color = isError ? '#c62828' : '#2e7d32';
    setTimeout(() => msg.style.display = 'none', 3000);
}