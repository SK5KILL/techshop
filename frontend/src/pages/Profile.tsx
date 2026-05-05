import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';

export default function Profile() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetch(`http://localhost:3001/api/users/${user.id}/orders`)
      .then(r => r.json())
      .then(setOrders);
  }, [user.id]);

  return (
    <div>
      <h1>👤 Личный кабинет</h1>
      
      <div style={{ background: '#ecf0f1', padding: 20, borderRadius: 8, marginTop: 20 }}>
        <h2>Информация о пользователе</h2>
        <p><b>ФИО:</b> {user.fio || 'Не указано'}</p>
        <p><b>Login:</b> {user.login}</p>
        <p><b>Email:</b> {user.email || 'Не указан'}</p>
        <p><b>Роль:</b> {user.role}</p>
      </div>

      <h2 style={{ marginTop: 30 }}>📋 Мои заказы</h2>
      {orders.length === 0 ? (
        <p>У вас пока нет заказов</p>
      ) : (
        <div style={{ marginTop: 20 }}>
          {orders.map(order => (
            <div key={order.id} style={{ border: '1px solid #ddd', padding: 15, marginBottom: 10, borderRadius: 5 }}>
              <p><b>Заказ #{order.id}</b> от {new Date(order.created_at).toLocaleDateString()}</p>
              <p>Сумма: {order.total.toLocaleString()} ₽</p>
              <p>Статус: <span style={{ color: order.status === 'new' ? 'orange' : 'green' }}>{order.status === 'new' ? 'Новый' : order.status}</span></p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}