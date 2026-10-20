const API_URL = '/api/users/profile';
const token = localStorage.getItem('token');

// Если токена нет — выкидываем на страницу входа
if (!token) {
    window.location.href = 'login.html';
}

// Словари для перевода (как в React)
const ALLERGENS = {
    GLUTEN: 'Глютен', LACTOSE: 'Лактоза', NUTS: 'Орехи', EGGS: 'Яйца',
    FISH: 'Рыба', SEAFOOD: 'Морепродукты', SOY: 'Соя', PEANUTS: 'Арахис'
};

const PREFERENCES = {
    VEGETARIAN: 'Вегетарианство', VEGAN: 'Веганство', LOW_CARB: 'Низкоуглеводная',
    HIGH_PROTEIN: 'Высокобелковая', HALAL: 'Халяль', KOSHER: 'Кошерная', NO_PORK: 'Без свинины'
};

// Функция для отрисовки чекбоксов
function renderCheckboxes(containerId, data, name) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    for (const [key, label] of Object.entries(data)) {
        const isChecked = profileData[name] && profileData[name].includes(key);
        container.innerHTML += `
            <label class="checkbox-pill ${isChecked ? 'checked' : ''}">
                <input type="checkbox" name="${name}" value="${key}" ${isChecked ? 'checked' : ''}>
                ${label}
            </label>
        `;
    }
}

let profileData = {}; // Сюда сохраним ответ от сервера

// Загрузка профиля
async function loadProfile() {
    try {
        const response = await fetch(API_URL, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        if (!response.ok) throw new Error('Ошибка загрузки профиля');

        profileData = await response.json();

        // Заполняем поля
        document.getElementById('email').value = profileData.email || '';
        document.getElementById('gender').value = profileData.gender || 'male';
        document.getElementById('age').value = profileData.age || '';
        document.getElementById('height').value = profileData.height || '';
        document.getElementById('weight').value = profileData.weight || '';

        // Рисуем чекбоксы
        renderCheckboxes('allergens-container', ALLERGENS, 'allergens');
        renderCheckboxes('preferences-container', PREFERENCES, 'preferences');

    } catch (error) {
        showMessage('Сервер временно недоступен. Попробуйте позже.', true);
    }
}

// Обработка клика по чекбоксу (чтобы менялся цвет плашки)
document.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox') {
        const label = e.target.closest('label');
        if (e.target.checked) {
            label.classList.add('checked');
        } else {
            label.classList.remove('checked');
        }
    }
});

// Сохранение изменений
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Сохранение...';

    // Собираем массивы выбранных чекбоксов
    const selectedAllergens = Array.from(document.querySelectorAll('input[name="allergens"]:checked')).map(cb => cb.value);
    const selectedPreferences = Array.from(document.querySelectorAll('input[name="preferences"]:checked')).map(cb => cb.value);

    // Формируем тело запроса (без email!)
    const payload = {
        gender: document.getElementById('gender').value,
        age: parseInt(document.getElementById('age').value) || 0,
        height: parseInt(document.getElementById('height').value) || 0,
        weight: parseFloat(document.getElementById('weight').value) || 0,
        allergens: selectedAllergens,
        preferences: selectedPreferences
    };

    try {
        const response = await fetch(API_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showMessage('Профиль успешно сохранен!', false);
        } else {
            const textError = await response.text();
            showMessage(textError || 'Ошибка при сохранении', true);
        }
    } catch (error) {
        showMessage('Ошибка сети при сохранении.', true);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Сохранить изменения';
    }
});

// Выход из аккаунта
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
});

// Функция показа сообщений
function showMessage(text, isError) {
    const msgDiv = document.getElementById('statusMessage');
    msgDiv.textContent = text;
    msgDiv.style.display = 'block';
    msgDiv.style.backgroundColor = isError ? '#ffebee' : '#e8f5e9';
    msgDiv.style.color = isError ? '#c62828' : '#2e7d32';
    
    setTimeout(() => { msgDiv.style.display = 'none'; }, 3000);
}

// Запускаем загрузку при открытии страницы
loadProfile();