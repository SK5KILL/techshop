import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  image: string;
}

interface Review {
  id: number;
  text: string;
  client_name: string;
  created_at: string;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { isAuthenticated } = useAuthStore();
  const addToCart = useCartStore((state) => state.addToCart);

  useEffect(() => {
    if (!id) return;
    fetch(`https://techshop-backend-dkgb.onrender.com/api/products/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) navigate('/catalog');
        else setProduct(data);
      })
      .catch(() => navigate('/catalog'));
  }, [id, navigate]);

  useEffect(() => {
    if (!id) return;
    fetch(`https://techshop-backend-dkgb.onrender.com/api/products/${id}/reviews`)
      .then(r => r.json())
      .then(setReviews);
  }, [id]);

  const handleAddToCart = () => {
    if (!isAuthenticated) return navigate('/login');
    if (product) {
      addToCart(product.id);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim() || !isAuthenticated || !id) return;
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://techshop-backend-dkgb.onrender.com/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ productId: parseInt(id), text: reviewText.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setReviewText('');
        fetch(`https://techshop-backend-dkgb.onrender.com/api/products/${id}/reviews`)
          .then(r => r.json())
          .then(setReviews);
      }
    } catch {
      alert('Ошибка отправки отзыва');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!product) return <div className="container" style={{ padding: '100px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Загрузка...</div>;

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      {/* Хлебные крошки */}
      <div style={{ marginBottom: 24, color: 'var(--text-muted)', fontSize: 14 }}>
        <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Главная</Link>
        <span style={{ margin: '0 8px' }}> / </span>
        <Link to="/catalog" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Каталог</Link>
        <span style={{ margin: '0 8px' }}> / </span>
        <span style={{ color: 'white' }}>{product.name}</span>
      </div>

      {/* Герой-карточка товара */}
      <div className="glass-card product-hero">
        <div className="product-image-wrapper">
          {product.image ? (
            <img src={product.image} alt={product.name} className="product-image" />
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Нет изображения</div>
          )}
        </div>

        <div className="product-info">
          <span className="category-badge">{product.category}</span>
          <h1>{product.name}</h1>
          <p className="product-price">{product.price.toLocaleString()} ₽</p>
          
          <div className={`stock-badge ${product.stock > 0 ? 'in' : 'out'}`}>
            {product.stock > 0 ? `✓ В наличии: ${product.stock} шт.` : '✗ Нет в наличии'}
          </div>

          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 30 }}>{product.description}</p>

          {isAuthenticated ? (
            <button 
              className="btn btn-primary" 
              onClick={handleAddToCart} 
              disabled={product.stock === 0}
              style={{ width: '100%', padding: '18px 0', fontSize: '16px', fontWeight: 600 }}
            >
              🛒 Добавить в корзину
            </button>
          ) : (
            <button 
              className="btn btn-outline" 
              onClick={() => navigate('/login')}
              style={{ width: '100%', padding: '18px 0', fontSize: '16px' }}
            >
              🔐 Войдите для покупки
            </button>
          )}
        </div>
      </div>

      {/* Характеристики */}
      <div className="glass-card" style={{ padding: '30px 40px', marginTop: 30 }}>
        <h3 className="text-gradient" style={{ marginTop: 0, marginBottom: 20, fontSize: '1.4rem' }}> Характеристики</h3>
        <div className="specs-list">
          <div className="spec-item">
            <span className="spec-label">Категория</span>
            <span className="spec-value">{product.category}</span>
          </div>
          <div className="spec-item">
            <span className="spec-label">Цена</span>
            <span className="spec-value">{product.price.toLocaleString()} ₽</span>
          </div>
          <div className="spec-item">
            <span className="spec-label">Наличие</span>
            <span className="spec-value">{product.stock} шт.</span>
          </div>
        </div>
      </div>

      {/* Отзывы */}
      <div className="glass-card reviews-section" style={{ padding: '30px 40px' }}>
        <h3 className="text-gradient" style={{ marginTop: 0, marginBottom: 24, fontSize: '1.4rem' }}>💬 Отзывы ({reviews.length})</h3>
        
        {isAuthenticated ? (
          <form onSubmit={handleSubmitReview} className="review-form">
            <textarea 
              placeholder="Напишите ваш отзыв о товаре..." 
              value={reviewText} 
              onChange={e => setReviewText(e.target.value)} 
              rows={3} 
              required
              style={{ flex: 1, resize: 'vertical' }}
            />
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSubmitting || !reviewText.trim()}
              style={{ padding: '0 28px', fontWeight: 600 }}
            >
              {isSubmitting ? 'Отправка...' : 'Отправить'}
            </button>
          </form>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--glass-border)', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 24, color: 'var(--text-muted)' }}>
            <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Войдите в аккаунт</Link>, чтобы оставить отзыв
          </div>
        )}

        {reviews.length === 0 ? (
          <div className="empty-reviews">Отзывов пока нет. Будьте первым!</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reviews.map(review => (
              <div key={review.id} className="review-card">
                <div className="review-header">
                  <span className="review-author">{review.client_name}</span>
                  <span className="review-date">{new Date(review.created_at).toLocaleDateString()}</span>
                </div>
                <p className="review-text">{review.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Кнопка назад */}
      <div style={{ marginTop: 30 }}>
        <button className="btn btn-outline" onClick={() => navigate(-1)} style={{ padding: '12px 28px' }}>
          ← Назад в каталог
        </button>
      </div>
    </div>
  );
}