import React, { useState, useEffect } from 'react';
import './ProfilePage.css';

const BASE_URL = '';

// Словари для перевода
const ALLERGEN_LABELS: Record<string, string> = {
  GLUTEN: 'Глютен',
  LACTOSE: 'Лактоза',
  NUTS: 'Орехи',
  EGGS: 'Яйца',
  FISH: 'Рыба',
  SEAFOOD: 'Морепродукты',
  SOY: 'Соя',
  PEANUTS: 'Арахис',
};

const PREFERENCE_LABELS: Record<string, string> = {
  VEGETARIAN: 'Вегетарианство',
  VEGAN: 'Веганство',
  LOW_CARB: 'Низкоуглеводная',
  HIGH_PROTEIN: 'Высокобелковая',
  HALAL: 'Халяль',
  KOSHER: 'Кошерная',
  NO_PORK: 'Без свинины',
};

interface ProfileData {
  email: string;
  gender: string;
  age: number;
  height: number;
  weight: number;
  allergens: string[];
  preferences: string[];
}

export const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<ProfileData>({
    email: '',
    gender: 'male',
    age: 0,
    height: 0,
    weight: 0,
    allergens: [],
    preferences: [],
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Загрузка профиля при монтировании
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      window.location.href = '/login'; // Если нет токена, отправляем на вход
      return;
    }

    fetch(`${BASE_URL}/api/users/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Не удалось загрузить профиль');
        return res.json();
      })
      .then((data: ProfileData) => {
        // Защита от null в массивах
        setProfile({
          ...data,
          allergens: data.allergens || [],
          preferences: data.preferences || [],
        });
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  // Обработка обычных полей ввода
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: name === 'age' || name === 'height' ? parseInt(value) || 0 : 
              name === 'weight' ? parseFloat(value) || 0 : value
    }));
  };

  // Обработка чекбоксов
  const handleCheckboxChange = (category: 'allergens' | 'preferences', value: string) => {
    setProfile((prev) => {
      const list = prev[category];
      const newList = list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value];
      return { ...prev, [category]: newList };
    });
  };

  // Сохранение изменений
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    const token = localStorage.getItem('authToken');

    // Формируем тело запроса БЕЗ email (как ты просил)
    const payload = {
      gender: profile.gender,
      age: profile.age,
      height: profile.height,
      weight: profile.weight,
      allergens: profile.allergens,
      preferences: profile.preferences,
    };

    try {
      const response = await fetch(`${BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSuccessMessage('Профиль успешно сохранен!');
        // Можно обновить стейт ответом сервера, если он возвращает что-то новое
        const updatedData = await response.json();
        setProfile((prev) => ({ ...prev, ...updatedData }));
      } else {
        const errText = await response.text();
        setError(errText || 'Ошибка при сохранении профиля');
      }
    } catch (err) {
      setError('Ошибка сети. Проверьте подключение.');
    } finally {
      setIsSaving(false);
      // Скрываем сообщение об успехе через 3 секунды
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  if (isLoading) return <div className="loading">Загрузка профиля...</div>;

  return (
    <div className="profile-container">
      <header className="profile-header">
        <h1 className="logo">Food-Tinder</h1>
        <div className="user-info">
          <span>{profile.email}</span>
          <button className="logout-btn" onClick={() => {
            localStorage.removeItem('authToken');
            window.location.href = '/login';
          }}>Выйти</button>
        </div>
      </header>

      <main className="profile-content">
        <div className="tabs">
          <button className="tab active">Profile Information</button>
          <button className="tab">Favourite Recipes</button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}

        <form onSubmit={handleSubmit} className="profile-form">
          <h2>Личная информация</h2>
          
          <div className="form-group">
            <label>Email (нельзя изменить)</label>
            <input type="email" value={profile.email} disabled className="disabled-input" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Пол</label>
              <select name="gender" value={profile.gender} onChange={handleInputChange}>
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
                <option value="other">Другой</option>
              </select>
            </div>
            <div className="form-group">
              <label>Возраст</label>
              <input type="number" name="age" value={profile.age} onChange={handleInputChange} min="1" max="120" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Рост (см)</label>
              <input type="number" name="height" value={profile.height} onChange={handleInputChange} min="50" max="250" />
            </div>
            <div className="form-group">
              <label>Вес (кг)</label>
              <input type="number" step="0.1" name="weight" value={profile.weight} onChange={handleInputChange} min="20" max="300" />
            </div>
          </div>

          <h3>Аллергены</h3>
          <div className="checkbox-grid">
            {Object.entries(ALLERGEN_LABELS).map(([key, label]) => (
              <label key={key} className={`checkbox-pill ${profile.allergens.includes(key) ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={profile.allergens.includes(key)}
                  onChange={() => handleCheckboxChange('allergens', key)}
                />
                {label}
              </label>
            ))}
          </div>

          <h3>Предпочтения в еде</h3>
          <div className="checkbox-grid">
            {Object.entries(PREFERENCE_LABELS).map(([key, label]) => (
              <label key={key} className={`checkbox-pill ${profile.preferences.includes(key) ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={profile.preferences.includes(key)}
                  onChange={() => handleCheckboxChange('preferences', key)}
                />
                {label}
              </label>
            ))}
          </div>

          <button type="submit" className="save-btn" disabled={isSaving}>
            {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </form>
      </main>
    </div>
  );
};