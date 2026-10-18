import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthPage } from './pages/AuthPage';
import { ProfilePage } from './pages/ProfilePage';
import { FeedPage } from './pages/FeedPage'; // Импортируем новую страницу
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/main" replace />} /> 
        {/* Теперь при заходе на сайт сразу кидает на главную */}
        
        <Route path="/login" element={<AuthPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        
        {/* Наша новая главная страница */}
        <Route path="/main" element={<FeedPage />} />
      </Routes>
    </Router>
  );
}

export default App;