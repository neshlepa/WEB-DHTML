const ALLERGENS = {
    GLUTEN: 'Глютен',
    LACTOSE: 'Лактоза',
    NUTS: 'Орехи',
    EGGS: 'Яйца',
    FISH: 'Рыба',
    SEAFOOD: 'Морепродукты',
    SOY: 'Соя',
    PEANUTS: 'Арахис',
    CITRUSES: 'Цитрусовые'
};

const PREFERENCES = {
    VEGETARIAN: 'Вегетарианство',
    VEGAN: 'Веганство',
    LOW_CARB: 'Низкоуглеводная',
    HIGH_PROTEIN: 'Высокобелковая',
    HALAL: 'Халяль',
    KOSHER: 'Кошерная',
    NO_PORK: 'Без свинины'
};

let profileData = {};

document.addEventListener('DOMContentLoaded', () => {
    if (!getToken()) {
        const wrapper = document.getElementById('profileWrapper');
        wrapper.className = '';
        wrapper.style.width = '100%';
        wrapper.style.padding = '0 20px';
        renderAuthRequired(
            wrapper,
            'Войдите в аккаунт, чтобы настроить биометрию, аллергены и диетические предпочтения.'
        );
        return;
    }

    loadProfile();
    attachProfileFormHandlers();
});

async function loadProfile() {
    try {
        profileData = await fetchApi('/users/profile') || {};

        document.getElementById('email').value = profileData.email || '';
        document.getElementById('gender').value = profileData.gender || '';
        document.getElementById('age').value = profileData.age != null && profileData.age > 0 ? profileData.age : '';
        document.getElementById('height').value = profileData.height != null && profileData.height > 0 ? profileData.height : '';
        document.getElementById('weight').value = profileData.weight != null && profileData.weight > 0 ? profileData.weight : '';

        renderCheckboxes('allergens-container', ALLERGENS, 'allergens');
        renderCheckboxes('preferences-container', PREFERENCES, 'preferences');
    } catch (error) {
        showMessage(error.message || 'Не удалось загрузить профиль', true);
    }
}

function renderCheckboxes(containerId, data, name) {
    const container = document.getElementById(containerId);
    const selected = Array.isArray(profileData[name]) ? profileData[name] : [];

    container.innerHTML = Object.entries(data).map(([key, label]) => {
        const isChecked = selected.includes(key);
        return `
            <label class="checkbox-pill ${isChecked ? 'checked' : ''}">
                <input type="checkbox" name="${name}" value="${key}" ${isChecked ? 'checked' : ''}>
                ${escapeHtml(label)}
            </label>
        `;
    }).join('');
}

function attachProfileFormHandlers() {
    document.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox' && e.target.closest('.checkbox-pill')) {
            e.target.closest('.checkbox-pill').classList.toggle('checked', e.target.checked);
        }
    });

    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('saveBtn');
        btn.disabled = true;

        const ageRaw = document.getElementById('age').value.trim();
        const heightRaw = document.getElementById('height').value.trim();
        const weightRaw = document.getElementById('weight').value.trim();
        const genderVal = document.getElementById('gender').value;

        const payload = {
            gender: genderVal || null,
            age: ageRaw !== '' ? parseInt(ageRaw, 10) : null,
            height: heightRaw !== '' ? parseInt(heightRaw, 10) : null,
            weight: weightRaw !== '' ? parseFloat(weightRaw) : null,
            allergens: Array.from(document.querySelectorAll('input[name="allergens"]:checked')).map(cb => cb.value),
            preferences: Array.from(document.querySelectorAll('input[name="preferences"]:checked')).map(cb => cb.value)
        };

        try {
            const updated = await fetchApi('/users/profile', { method: 'PUT', body: payload });
            if (updated) profileData = updated;
            showMessage('Профиль успешно сохранён!', false);
            showToast('Профиль обновлён', 'success');
        } catch (error) {
            showMessage(error.message || 'Ошибка сохранения профиля', true);
        } finally {
            btn.disabled = false;
        }
    });
}

function showMessage(text, isError) {
    const msg = document.getElementById('statusMessage');
    msg.textContent = text;
    msg.className = isError ? 'error-message' : 'success-message';
    msg.style.display = 'block';
    setTimeout(() => { msg.style.display = 'none'; }, 3500);
}