import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { Link } from 'react-router-dom';

export default function Catalog() {
    const [products, setProducts] = useState<any[]>([]);
  const { isAuthenticated } = useAuthStore();
  const addToCart = useCartStore((state) => state.addToCart);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:3001/api/products')
      .then(r => r.json())
      .then(setProducts);
  }, []);

  const handleAddToCart = (product: any) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    // Вызываем функцию из стора, которая сама сходит на сервер
    addToCart(product.id); 
    alert(`${product.name} добавлен в корзину!`);
  };

  return (
    <div>
      <h1>📦 Каталог товаров</h1>
      {!isAuthenticated && (
        <div style={{ background: '#fff3cd', padding: 15, borderRadius: 8, marginBottom: 20, border: '1px solid #ffc107' }}>
          ⚠️ <b>Внимание:</b> Для добавления товаров в корзину необходимо <a href="/login" style={{ color: '#007bff' }}>войти</a>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 25, marginTop: 20 }}>
        {products.map(product => (
          <div key={product.id} style={{ 
            border: '1px solid #ddd', 
            borderRadius: 12, 
            background: 'white',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {/* Изображение товара */}
            <Link to={`/product/${product.id}`} style={{ 
              height: 220, 
              background: '#f8f9fa', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              {product.image ? (
    <img 
      src={product.image} // Просто вставляем Base64 строку
      alt={product.name}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  ) : (
    <div style={{ color: '#95a5a6' }}>Нет фото</div>
  )}
            </Link>
            
            {/* Информация о товаре */}
            <div style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: 18 }}>{product.name}</h3>
              <p style={{ color: '#7f8c8d', margin: '0 0 10px 0', fontSize: 14 }}>{product.category}</p>
              <p style={{ color: '#666', margin: '0 0 15px 0', fontSize: 14, height: 40, overflow: 'hidden' }}>
                {product.description}
              </p>
              <p style={{ fontSize: 22, fontWeight: 'bold', color: '#27ae60', margin: '0 0 10px 0' }}>
                {product.price.toLocaleString()} ₽
              </p>
              <p style={{ 
                color: product.stock > 0 ? '#27ae60' : '#e74c3c', 
                fontSize: 14, 
                margin: '0 0 15px 0',
                fontWeight: 500
              }}>
                {product.stock > 0 ? `✓ В наличии: ${product.stock} шт.` : '✗ Нет в наличии'}
              </p>
              
              {isAuthenticated ? (
                <button 
                  onClick={() => handleAddToCart(product)} 
                  disabled={product.stock === 0} 
                  style={{ 
                    width: '100%', 
                    padding: 12, 
                    background: product.stock > 0 ? '#3498db' : '#95a5a6', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 6, 
                    cursor: product.stock > 0 ? 'pointer' : 'not-allowed',
                    fontSize: 15,
                    fontWeight: 500,
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (product.stock > 0) (e.target as HTMLButtonElement).style.background = '#2980b9';
                  }}
                  onMouseLeave={(e) => {
                    if (product.stock > 0) (e.target as HTMLButtonElement).style.background = '#3498db';
                  }}
                >
                  🛒 В корзину
                </button>
              ) : (
                <button 
                  onClick={() => navigate('/login')}
                  style={{ 
                    width: '100%', 
                    padding: 12, 
                    background: '#95a5a6', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 6, 
                    cursor: 'pointer',
                    fontSize: 15
                  }}
                >
                  🔐 Войдите для покупки
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}