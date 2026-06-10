import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ login: '', password: '', fio: '', email: '', phone: '' });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/login' : '/api/register';
    
    try {
      const res = await fetch(`https://techshop-backend-dkgb.onrender.com${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (data.error) {
        setMessage(data.error);
      } else {
        if (data.token) {
          localStorage.setItem('token', data.token);
          setUser(data.user);
          navigate('/profile');
        } else {
          setMessage('Регистрация успешна! Теперь войдите');
          setIsLogin(true);
        }
      }
    } catch {
      setMessage('Ошибка соединения');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      <h2>{isLogin ? '🔐 Вход' : '📝 Регистрация'}</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input placeholder="Логин *" value={formData.login} onChange={e => setFormData({...formData, login: e.target.value})} required style={{ padding: 10 }} />
        <input type="password" placeholder="Пароль *" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required style={{ padding: 10 }} />
        {!isLogin && (
          <>
            <input placeholder="ФИО" value={formData.fio} onChange={e => setFormData({...formData, fio: e.target.value})} style={{ padding: 10 }} />
            <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ padding: 10 }} />
            <input placeholder="Телефон" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ padding: 10 }} />
          </>
        )}
        <button type="submit" style={{ padding: 12, background: '#3498db', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>{isLogin ? 'Войти' : 'Зарегистрироваться'}</button>
      </form>
      <p style={{ marginTop: 10 }}>
        {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
        <button onClick={() => { setIsLogin(!isLogin); setMessage(''); }} style={{ background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', textDecoration: 'underline' }}>{isLogin ? 'Зарегистрироваться' : 'Войти'}</button>
      </p>
      {message && <p style={{ color: message.includes('Ошибка') ? 'red' : 'green' }}>{message}</p>}
    </div>
  );
}