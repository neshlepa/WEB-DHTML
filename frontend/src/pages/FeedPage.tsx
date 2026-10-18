import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './FeedPage.css';

const BASE_URL = ''; // Используем прокси Vite (пустая строка)

interface Ingredient {
  name: string;
  amountGrams: number;
}

interface Recipe {
  id: number;
  name: string;
  photoUrl: string;
  time: number;
  difficulty: number;
  instruction: string;
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbohydrates: number;
  ingredients: Ingredient[];
}

export const FeedPage: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const navigate = useNavigate();

  const token = localStorage.getItem('authToken');

  // Загрузка ленты
  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    setIsLoading(true);
    setError(null);

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/recipes/feed`, { headers });
      
      if (!response.ok) throw new Error('Ошибка при загрузке ленты');
      
      const data: Recipe[] = await response.json();
      
      if (data.length === 0) {
        setError('Рецепты закончились! Вы посмотрели все.');
      } else {
        setRecipes(data);
        setCurrentIndex(0); // Сбрасываем индекс при новой загрузке
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Обработка реакций
  const handleReaction = async (reactionType: 'LIKE' | 'DISLIKE' | 'FAVORITE') => {
    if (!token) {
      alert('Для оценки рецептов нужно войти в аккаунт!');
      navigate('/login');
      return;
    }

    const currentRecipe = recipes[currentIndex];
    if (!currentRecipe) return;

    // Оптимистичный UI: сразу переключаем карточку, не ждем ответа сервера
    goToNextCard();

    try {
      await fetch(`${BASE_URL}/api/recipes/${currentRecipe.id}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reaction: reactionType }),
      });
      // Ошибки можно обрабатывать незаметно для пользователя (например, в консоли)
    } catch (err) {
      console.error('Не удалось сохранить реакцию', err);
    }
  };

  const goToNextCard = () => {
    if (currentIndex < recipes.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setShowDetails(false); // Закрываем детали при переходе
    } else {
      // Дошли до конца пачки, грузим новую
      fetchFeed();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  if (isLoading) return <div className="loading-screen">Загрузка вкусностей...</div>;
  if (error) return <div className="error-screen">{error} <button onClick={fetchFeed}>Попробовать снова</button></div>;
  
  const currentRecipe = recipes[currentIndex];
  if (!currentRecipe) return null;

  return (
    <div className="feed-container">
      <header className="feed-header">
        <h1 className="logo">Food-Tinder</h1>
        <div className="header-actions">
          {token ? (
            <>
              <button className="nav-btn" onClick={() => navigate('/profile')}>Профиль</button>
              <button className="nav-btn" onClick={handleLogout}>Выйти</button>
            </>
          ) : (
            <button className="nav-btn" onClick={() => navigate('/login')}>Войти</button>
          )}
        </div>
      </header>

      <main className="card-wrapper">
        {/* Сама карточка */}
        <div className="recipe-card">
          <img src={currentRecipe.photoUrl} alt={currentRecipe.name} className="card-image" />
          
          <div className="card-content">
            <h2 className="card-title">{currentRecipe.name}</h2>
            <div className="card-meta">
              <span>⭐ Сложность: {currentRecipe.difficulty}/5</span>
              <span>⏱ {currentRecipe.time} мин</span>
            </div>
            
            <div className="card-macros">
              <div><strong>{currentRecipe.totalCalories}</strong> <br/>ККАЛ</div>
              <div><strong>{currentRecipe.totalProtein}г</strong> <br/>БЕЛКИ</div>
              <div><strong>{currentRecipe.totalFat}г</strong> <br/>ЖИРЫ</div>
              <div><strong>{currentRecipe.totalCarbohydrates}г</strong> <br/>УГЛЕВОДЫ</div>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="card-actions">
            <button className="action-btn dislike" onClick={() => handleReaction('DISLIKE')}>✕</button>
            <button className="action-btn favorite" onClick={() => handleReaction('FAVORITE')}>🔖</button>
            <button className="action-btn like" onClick={() => handleReaction('LIKE')}>❤️</button>
          </div>
        </div>

        {/* Кнопка открытия рецепта */}
        <button className="show-recipe-btn" onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? 'Скрыть рецепт' : 'Показать рецепт'}
        </button>

        {/* Блок с деталями (появляется при нажатии) */}
        {showDetails && (
          <div className="recipe-details">
            <h3>Ингредиенты</h3>
            <ul>
              {currentRecipe.ingredients.map((ing, idx) => (
                <li key={idx}>{ing.name} — {ing.amountGrams}г</li>
              ))}
            </ul>
            <h3>Инструкция</h3>
            <p className="instruction-text">{currentRecipe.instruction}</p>
          </div>
        )}
      </main>
    </div>
  );
};