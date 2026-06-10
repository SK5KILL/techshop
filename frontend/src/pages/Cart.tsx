import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import CheckoutModal from '../components/CheckoutModal';

export default function Cart() {
  const { items, removeFromCart, clearCart, total, fetchCart, updateQuantity } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    if (user) fetchCart();
  }, [user]);

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
            <Link to={`/product/${item.product_id}`}>
              <img src={item.image} alt={item.name} className="cart-item-img" />
            </Link>

            <div className="cart-item-info">
              <Link to={`/product/${item.product_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <h3 className="cart-item-name">{item.name}</h3>
              </Link>
              <span className="cart-item-category">{item.category || 'Товар'}</span>
            </div>

            <div className="qty-control">
              <button className="qty-btn" onClick={() => updateQuantity(item.product_id, item.quantity - 1)} disabled={item.quantity <= 1}>−</button>
              <span className="qty-value">{item.quantity}</span>
              <button className="qty-btn" onClick={() => updateQuantity(item.product_id, item.quantity + 1)} disabled={item.quantity >= (item.stock || 99)}>+</button>
            </div>

            <div className="cart-item-total">
              {(item.price * item.quantity).toLocaleString()} ₽
            </div>

            <button className="btn-delete" onClick={() => removeFromCart(item.product_id)}>🗑</button>
          </div>
        ))}
      </div>

      {/* Итого + кнопка оформления */}
      <div className="cart-footer">
        <div>
          <span className="total-label">Итого к оплате:</span>
          <div className="total-value">{total().toLocaleString()} ₽</div>
        </div>
        <button className="btn-checkout" onClick={() => setIsCheckoutOpen(true)}>
          Оформить заказ
        </button>
      </div>

      {/* Модальное окно оформления */}
      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
      />
    </div>
  );
}