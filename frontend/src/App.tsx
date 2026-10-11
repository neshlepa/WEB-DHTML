import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthPage } from './pages/AuthPage';
import { ProfilePage } from './pages/ProfilePage';
import './index.css'; // Оставляем глобальные стили

function App() {
  return (
    <Router>
      <Routes>
        {/* Перенаправляем с корня на страницу входа */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Страница входа и регистрации */}
        <Route path="/login" element={<AuthPage />} />
        
        {/* Страница профиля */}
        <Route path="/profile" element={<ProfilePage />} />
        
        {/* Заглушка для главной страницы (куда редиректит после входа) */}
        <Route path="/main" element={<div style={{padding: '40px', fontSize: '24px', textAlign: 'center'}}>Главная страница (в разработке)</div>} />
      </Routes>
    </Router>
  );
}

export default App;