import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';

export default function Cart() {
  const { items, removeFromCart, clearCart, total, fetchCart, updateQuantity } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) fetchCart();
  }, [user]);

  const checkout = async () => {
    if (!user) return;
    try {
      await fetch('http://localhost:3001/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, items, total: total() })
      });
      await clearCart();
      alert('✅ Заказ успешно оформлен!');
      navigate('/profile');
    } catch {
      alert('❌ Ошибка оформления заказа');
    }
  };

  if (items.length === 0) {
    return (
      <div className="container empty-cart">
        <div className="empty-cart-icon">🛒</div>
        <h2>Корзина пуста</h2>
        <p>Добавьте товары из каталога</p>
        <Link to="/catalog" className="btn btn-primary" style={{ marginTop: 20, display: 'inline-block', textDecoration: 'none' }}>
          Перейти в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="container cart-wrapper">
      <h1 className="cart-title">🛒 Корзина</h1>

      <div className="cart-list">
        {items.map(item => (
          <div key={item.product_id} className="cart-item">
            {/* Картинка */}
            <Link to={`/product/${item.product_id}`}>
              <img src={item.image} alt={item.name} className="cart-item-img" />
            </Link>

            {/* Инфо */}
            <div className="cart-item-info">
              <Link to={`/product/${item.product_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <h3 className="cart-item-name">{item.name}</h3>
              </Link>
              <span className="cart-item-category">{item.category || 'Товар'}</span>
            </div>

            {/* Количество */}
            <div className="qty-control">
              <button 
                className="qty-btn" 
                onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                disabled={item.quantity <= 1}
              >−</button>
              <span className="qty-value">{item.quantity}</span>
              <button 
                className="qty-btn" 
                onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                disabled={item.quantity >= (item.stock || 99)}
              >+</button>
            </div>

            {/* Цена */}
            <div className="cart-item-total">
              {(item.price * item.quantity).toLocaleString()} ₽
            </div>

            {/* Удалить */}
            <button className="btn-delete" onClick={() => removeFromCart(item.product_id)}>
              🗑
            </button>
          </div>
        ))}
      </div>

      {/* Итого */}
      <div className="cart-footer">
        <div>
          <span className="total-label">Итого к оплате:</span>
          <div className="total-value">{total().toLocaleString()} ₽</div>
        </div>
        <button className="btn-checkout" onClick={checkout}>
          Оформить заказ
        </button>
      </div>
    </div>
  );
}