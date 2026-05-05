import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';
export default function Cart() {
  const { items, removeFromCart, clearCart, total, fetchCart } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Загружаем корзину с сервера при открытии страницы
  useEffect(() => {
    if (user) fetchCart();
  }, [user]);

  const checkout = async () => {
    if (!user) return;

    try {
      // 1. Создаем заказ
      await fetch('http://localhost:3001/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, items, total: total() })
      });
      
      // 2. Очищаем корзину в БД
      await clearCart();
      
      alert('Заказ оформлен!');
      navigate('/profile');
    } catch {
      alert('Ошибка оформления заказа');
    }
  };

  if (items.length === 0) return <h2 style={{textAlign: 'center', marginTop: 50}}>🛒 Ваша корзина пуста</h2>;

  return (
    <div>
      <h1>🛒 Корзина</h1>
      <div style={{ marginTop: 20 }}>
        {items.map(item => (
          <div key={item.product_id} style={{ display: 'flex', padding: 20, borderBottom: '1px solid #ddd', alignItems: 'center', gap: 20, background: 'white', borderRadius: 8, marginBottom: 10 }}>
            <Link to={`/product/${item.product_id}`}>
            <img src={item.image} alt={item.name} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 6 }} />
            </Link>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0 }}>{item.name}</h3>
              <p style={{ margin: 0, color: '#7f8c8d' }}>{item.price.toLocaleString()} ₽ x {item.quantity}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontWeight: 'bold', fontSize: 18, marginRight: 20 }}>{(item.price * item.quantity).toLocaleString()} ₽</span>
              <button onClick={() => removeFromCart(item.product_id)} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' }}>Удалить</button>
            </div>
          </div>
        ))}
        
        <div style={{ marginTop: 30, textAlign: 'right', background: '#ecf0f1', padding: 20, borderRadius: 8 }}>
          <h2>Итого: {total().toLocaleString()} ₽</h2>
          <button onClick={checkout} style={{ padding: '15px 40px', background: '#27ae60', color: 'white', border: 'none', borderRadius: 6, fontSize: 16, cursor: 'pointer', fontWeight: 'bold' }}>Оформить заказ</button>
        </div>
      </div>
    </div>
  );
}