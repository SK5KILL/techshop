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
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://techshop-backend-dkgb.onrender.com/api/orders/checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          userId: user.id, 
          items, 
          total: total(), 
          deliveryInfo: formData 
        })
      });
      
      const data = await res.json();
      if (data.success) {
        clearCart();
        onClose();
        navigate('/profile');
      } else {
        setError(data.error || 'Ошибка оформления');
      }
    } catch (err) {
      setError('Ошибка соединения с сервером');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
        animation: 'fadeIn 0.3s ease-out'
      }}
      onClick={onClose}
    >
      <div 
        className="glass-card modal-content"
        style={{
          maxWidth: 560,
          width: '100%',
          background: 'linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 24,
          padding: 0,
          boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05) inset',
          animation: 'modalSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header с градиентом */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(236,72,153,0.15))',
          padding: '30px 30px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: 48,
            height: 48,
            background: 'linear-gradient(135deg, #6366f1, #ec4899)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            boxShadow: '0 8px 24px rgba(99,102,241,0.4)'
          }}>
            📦
          </div>
          
          <h2 className="text-gradient" style={{ 
            margin: 0, 
            fontSize: '1.8rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            paddingRight: 60
          }}>
            Оформление заказа
          </h2>
          <p style={{ 
            margin: '8px 0 0', 
            color: 'rgba(255,255,255,0.6)',
            fontSize: 14
          }}>
            Заполните данные для доставки
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: 30 }}>
          {error && (
            <div style={{ 
              background: 'rgba(239,68,68,0.15)', 
              border: '1px solid rgba(239,68,68,0.3)', 
              color: '#f87171', 
              padding: '12px 16px', 
              borderRadius: 12, 
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 14
            }}>
              <span>⚠️</span>
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Поле ФИО */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: 8, 
                color: 'rgba(255,255,255,0.7)', 
                fontSize: 13,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                ФИО получателя *
              </label>
              <input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                required 
                placeholder="Иванов Иван Иванович"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  color: 'white',
                  fontSize: 15,
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(99,102,241,0.5)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            
            {/* Поле Телефон */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: 8, 
                color: 'rgba(255,255,255,0.7)', 
                fontSize: 13,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Телефон *
              </label>
              <input 
                type="tel"
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
                required 
                placeholder="+7 (___) ___-__-__"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  color: 'white',
                  fontSize: 15,
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(99,102,241,0.5)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            
            {/* Выбор способа доставки */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: 12, 
                color: 'rgba(255,255,255,0.7)', 
                fontSize: 13,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Способ получения *
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                <label style={{ 
                  flex: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 12, 
                  cursor: 'pointer', 
                  padding: '16px 18px', 
                  border: `2px solid ${formData.deliveryMethod === 'delivery' ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)'}`, 
                  borderRadius: 14,
                  background: formData.deliveryMethod === 'delivery' 
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))' 
                    : 'rgba(0,0,0,0.2)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={e => {
                  if (formData.deliveryMethod !== 'delivery') {
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)';
                    e.currentTarget.style.background = 'rgba(99,102,241,0.05)';
                  }
                }}
                onMouseLeave={e => {
                  if (formData.deliveryMethod !== 'delivery') {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.background = 'rgba(0,0,0,0.2)';
                  }
                }}
                >
                  <input 
                    type="radio" 
                    name="method" 
                    value="delivery" 
                    checked={formData.deliveryMethod === 'delivery'} 
                    onChange={() => setFormData({...formData, deliveryMethod: 'delivery'})} 
                    style={{ 
                      width: 20, 
                      height: 20,
                      accentColor: '#6366f1',
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{ fontSize: 28 }}>🚚</div>
                  <div>
                    <div style={{ color: 'white', fontWeight: 600, marginBottom: 2 }}>Доставка</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Курьером до двери</div>
                  </div>
                </label>
                
                <label style={{ 
                  flex: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 12, 
                  cursor: 'pointer', 
                  padding: '16px 18px', 
                  border: `2px solid ${formData.deliveryMethod === 'pickup' ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)'}`, 
                  borderRadius: 14,
                  background: formData.deliveryMethod === 'pickup' 
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))' 
                    : 'rgba(0,0,0,0.2)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={e => {
                  if (formData.deliveryMethod !== 'pickup') {
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)';
                    e.currentTarget.style.background = 'rgba(99,102,241,0.05)';
                  }
                }}
                onMouseLeave={e => {
                  if (formData.deliveryMethod !== 'pickup') {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.background = 'rgba(0,0,0,0.2)';
                  }
                }}
                >
                  <input 
                    type="radio" 
                    name="method" 
                    value="pickup" 
                    checked={formData.deliveryMethod === 'pickup'} 
                    onChange={() => setFormData({...formData, deliveryMethod: 'pickup'})} 
                    style={{ 
                      width: 20, 
                      height: 20,
                      accentColor: '#6366f1',
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{ fontSize: 28 }}>🏪</div>
                  <div>
                    <div style={{ color: 'white', fontWeight: 600, marginBottom: 2 }}>Самовывоз</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Из магазина</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Адрес доставки (только для доставки) */}
            {formData.deliveryMethod === 'delivery' && (
              <div style={{
                animation: 'slideDown 0.3s ease-out'
              }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: 8, 
                  color: 'rgba(255,255,255,0.7)', 
                  fontSize: 13,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Адрес доставки *
                </label>
                <textarea 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                  required 
                  rows={3} 
                  placeholder="г. Балаково, ул. Комсомольская, д. 85, кв. 10"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    color: 'white',
                    fontSize: 15,
                    outline: 'none',
                    resize: 'vertical',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = 'rgba(99,102,241,0.5)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            )}

            {/* Итого */}
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(52,211,153,0.05))',
              border: '1px solid rgba(16,185,129,0.3)',
              padding: 20, 
              borderRadius: 14,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 10
            }}>
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15 }}>К оплате:</span>
              <span className="total-value" style={{ 
                fontSize: '1.8rem', 
                fontWeight: 800,
                background: 'linear-gradient(135deg, #10b981, #34d399)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                {total().toLocaleString()} ₽
              </span>
            </div>

            {/* Кнопки */}
            <div style={{ 
              display: 'flex', 
              gap: 12, 
              marginTop: 10,
              paddingTop: 20,
              borderTop: '1px solid rgba(255,255,255,0.1)'
            }}>
              <button 
                type="button" 
                onClick={onClose} 
                disabled={isSubmitting}
                style={{ 
                  flex: 1, 
                  padding: '16px 24px', 
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.8)',
                  borderRadius: 12, 
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: isSubmitting ? 0.5 : 1
                }}
                onMouseEnter={e => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                  }
                }}
              >
                Отмена
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                style={{ 
                  flex: 1, 
                  padding: '16px 24px', 
                  background: isSubmitting 
                    ? 'linear-gradient(135deg, #6b7280, #9ca3af)' 
                    : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  border: 'none',
                  color: 'white', 
                  borderRadius: 12, 
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: isSubmitting ? 'wait' : 'pointer',
                  boxShadow: isSubmitting ? 'none' : '0 8px 24px rgba(99,102,241,0.4)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={e => {
                  if (!isSubmitting) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(99,102,241,0.5)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSubmitting) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.4)';
                  }
                }}
              >
                {isSubmitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{ 
                      width: 18, 
                      height: 18, 
                      border: '2px solid rgba(255,255,255,0.3)', 
                      borderTop: '2px solid white', 
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }}/>
                    Оформление...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    ✅ Подтвердить заказ
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}