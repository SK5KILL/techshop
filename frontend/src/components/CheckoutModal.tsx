import { useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
  const { user } = useAuthStore();
  const { items, total, clearCart } = useCartStore();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: user?.fio || '',
    phone: '',
    address: '',
    deliveryMethod: 'delivery' as 'delivery' | 'pickup'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://techshop-backend-dkgb.onrender.com/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: user.id, items, total: total(), deliveryInfo: formData })
      });
      
      const data = await res.json();
      if (data.success) {
        alert('✅ Заказ оформлен! Уведомление отправлено администратору.');
        clearCart();
        onClose();
        navigate('/profile');
      } else {
        alert('❌ ' + (data.error || 'Ошибка оформления'));
      }
    } catch {
      alert('❌ Ошибка соединения с сервером');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: 'white', padding: 25, borderRadius: 12, maxWidth: 500, width: '90%', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>📦 Оформление заказа</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <input placeholder="ФИО получателя *" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required style={{ padding: 10 }} />
          <input placeholder="Телефон *" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required style={{ padding: 10 }} />
          
          <div style={{ display: 'flex', gap: 15 }}>
            <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: 10, border: `2px solid ${formData.deliveryMethod === 'delivery' ? '#3498db' : '#ddd'}`, borderRadius: 6 }}>
              <input type="radio" name="method" value="delivery" checked={formData.deliveryMethod === 'delivery'} onChange={() => setFormData({...formData, deliveryMethod: 'delivery'})} />
              🚚 Доставка
            </label>
            <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: 10, border: `2px solid ${formData.deliveryMethod === 'pickup' ? '#3498db' : '#ddd'}`, borderRadius: 6 }}>
              <input type="radio" name="method" value="pickup" checked={formData.deliveryMethod === 'pickup'} onChange={() => setFormData({...formData, deliveryMethod: 'pickup'})} />
              🏪 Самовывоз
            </label>
          </div>

          {formData.deliveryMethod === 'delivery' && (
            <textarea placeholder="Адрес доставки *" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required rows={3} style={{ padding: 10, resize: 'vertical' }} />
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: 12, background: '#27ae60', color: 'white', border: 'none', borderRadius: 6, cursor: isSubmitting ? 'wait' : 'pointer', fontWeight: 'bold' }}>
              {isSubmitting ? 'Отправка...' : 'Подтвердить заказ'}
            </button>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: 12, background: '#95a5a6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Отмена</button>
          </div>
        </form>
      </div>
    </div>
  );
}
