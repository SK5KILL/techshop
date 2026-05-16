import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';

export default function Profile() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetch(`http://localhost:3000/api/users/${user.id}/orders`)
        .then(r => r.json())
        .then(data => {
            setOrders(data);
            setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [user]);

  if (!user) return null;

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      
      {/* Шапка профиля */}
      <div className="profile-header">
        <div className="profile-avatar">
          {user.role === 'admin' ? '️' : '👤'}
        </div>
        <div>
          <h1 className="text-gradient" style={{ margin: 0, fontSize: '2.2rem' }}>
            {user.fio || 'Личный кабинет'}
          </h1>
          <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)' }}>
            ID: {user.id} • {user.login}
          </p>
        </div>
      </div>

      {/* Карточка информации (Стекло) */}
      <div className="glass-card" style={{ padding: '30px', marginBottom: '40px', position: 'relative', overflow: 'hidden' }}>
        {/* Фоновый градиент */}
        <div style={{ 
            position: 'absolute', top: '-50px', right: '-50px', 
            width: '200px', height: '200px', background: 'var(--primary)', 
            filter: 'blur(80px)', opacity: 0.15, borderRadius: '50%' 
        }}></div>

        <h3 style={{ marginTop: 0, marginBottom: 25, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '14px', letterSpacing: '1px' }}>
          Данные аккаунта
        </h3>

        <div className="profile-stats">
          <div className="stat-item">
            <span className="stat-label">Логин</span>
            <span className="stat-value">{user.login}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Email</span>
            <span className="stat-value">{user.email || 'Не указан'}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Роль</span>
            <span className="stat-value">
              <span className={`role-badge ${user.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                {user.role === 'admin' ? ' Администратор' : ' Клиент'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Секция заказов */}
      <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '20px' }}> История заказов</h2>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Загрузка...</div>
      ) : orders.length === 0 ? (
        <div className="glass-card empty-state">
          <div style={{ fontSize: 40, marginBottom: 10 }}>🛍️</div>
          <p>Вы ещё не совершали заказов</p>
          <a href="/catalog" className="btn btn-primary" style={{ display: 'inline-block', marginTop: '15px', textDecoration: 'none' }}>
            Перейти в каталог
          </a>
        </div>
      ) : (
        <div className="order-list">
          {orders.map(order => (
            <div key={order.id} className={`glass-card order-card ${order.status === 'new' ? 'new' : 'completed'}`}>
              <div className="order-info">
                <h4>Заказ #{order.id}</h4>
                <span className="order-date">{new Date(order.created_at).toLocaleDateString()} • {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div className="order-total">
                  {order.total.toLocaleString()} ₽
                </div>
                <span className="status-pill">
                  {order.status === 'new' ? ' Новый' : '✅ Выполнен'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}