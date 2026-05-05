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

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { isAuthenticated } = useAuthStore();
  const addToCart = useCartStore((state) => state.addToCart);

  useEffect(() => {
    if (!id) return;
    
    fetch(`https://techshop-backend-dkgb.onrender.com/api/products/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          navigate('/catalog');
        } else {
          setProduct(data);
        }
      })
      .catch(() => navigate('/catalog'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (product) {
      addToCart(product.id);
      alert(`${product.name} добавлен в корзину!`);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Загрузка...</div>;
  if (!product) return <div style={{ padding: 40, textAlign: 'center' }}>Товар не найден</div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Хлебные крошки */}
      <div style={{ marginBottom: 20, color: '#7f8c8d' }}>
        <Link to="/" style={{ color: '#3498db', textDecoration: 'none' }}>Главная</Link>
        <span> / </span>
        <Link to="/catalog" style={{ color: '#3498db', textDecoration: 'none' }}>Каталог</Link>
        <span> / </span>
        <span style={{ color: '#2c3e50' }}>{product.name}</span>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: 40, 
        background: 'white',
        padding: 30,
        borderRadius: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)'
      }}>
        {/* Изображение */}
        <div>
          <img 
            src={product.image || 'https://via.placeholder.com/500x500?text=No+Image'} 
            alt={product.name}
            style={{ 
              width: '100%', 
              borderRadius: 8, 
              objectFit: 'cover',
              background: '#f8f9fa'
            }}
          />
        </div>

        {/* Информация */}
        <div>
          <span style={{ 
            background: '#3498db', 
            color: 'white', 
            padding: '4px 12px', 
            borderRadius: 4, 
            fontSize: 12,
            textTransform: 'uppercase'
          }}>
            {product.category}
          </span>
          
          <h1 style={{ margin: '15px 0', fontSize: 28 }}>{product.name}</h1>
          
          <p style={{ fontSize: 32, fontWeight: 'bold', color: '#27ae60', margin: '20px 0' }}>
            {product.price.toLocaleString()} ₽
          </p>
          
          <p style={{ 
            color: product.stock > 0 ? '#27ae60' : '#e74c3c',
            fontWeight: 500,
            marginBottom: 25
          }}>
            {product.stock > 0 ? `✓ В наличии: ${product.stock} шт.` : '✗ Нет в наличии'}
          </p>
          
          <p style={{ color: '#666', lineHeight: 1.6, marginBottom: 30 }}>
            {product.description}
          </p>
          
          {isAuthenticated ? (
            <button 
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              style={{
                width: '100%',
                padding: 16,
                background: product.stock > 0 ? '#27ae60' : '#95a5a6',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 16,
                fontWeight: 'bold',
                cursor: product.stock > 0 ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                if (product.stock > 0) (e.target as HTMLButtonElement).style.background = '#219a52';
              }}
              onMouseLeave={(e) => {
                if (product.stock > 0) (e.target as HTMLButtonElement).style.background = '#27ae60';
              }}
            >
              🛒 Добавить в корзину
            </button>
          ) : (
            <button 
              onClick={() => navigate('/login')}
              style={{
                width: '100%',
                padding: 16,
                background: '#95a5a6',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 16,
                cursor: 'pointer'
              }}
            >
              🔐 Войдите для покупки
            </button>
          )}
        </div>
      </div>

      {/* Характеристики (заглушка для диплома) */}
      <div style={{ marginTop: 40, background: 'white', padding: 25, borderRadius: 12 }}>
        <h2 style={{ marginBottom: 20 }}>📋 Характеристики</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 12, fontWeight: 500, width: '40%', color: '#7f8c8d' }}>Категория</td>
              <td style={{ padding: 12 }}>{product.category}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 12, fontWeight: 500, color: '#7f8c8d' }}>Цена</td>
              <td style={{ padding: 12 }}>{product.price.toLocaleString()} ₽</td>
            </tr>
            <tr>
              <td style={{ padding: 12, fontWeight: 500, color: '#7f8c8d' }}>Наличие</td>
              <td style={{ padding: 12 }}>{product.stock} шт.</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Кнопка назад */}
      <div style={{ marginTop: 30 }}>
        <button 
          onClick={() => navigate(-1)}
          style={{
            padding: '10px 25px',
            background: 'transparent',
            border: '2px solid #3498db',
            color: '#3498db',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          ← Назад в каталог
        </button>
      </div>
    </div>
  );
}
