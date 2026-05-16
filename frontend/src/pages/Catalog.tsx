import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { isAuthenticated } = useAuthStore();
  const addToCart = useCartStore((state) => state.addToCart);
  const navigate = useNavigate();

  // Загрузка товаров с учётом выбранной категории
  useEffect(() => {
    const url = selectedCategory === 'all'
      ? 'https://techshop-backend-dkgb.onrender.com/api/products'
      : `https://techshop-backend-dkgb.onrender.com/api/products?category=${encodeURIComponent(selectedCategory)}`;

    fetch(url)
      .then(r => r.json())
      .then(setProducts)
      .catch(() => setProducts([]));
  }, [selectedCategory]);

  // Динамически собираем уникальные категории из полученных товаров
  const categories = useMemo(() => {
    const unique = new Set(products.map(p => p.category).filter(Boolean));
    return ['all', ...Array.from(unique)];
  }, [products]);

  const handleAddToCart = (product: Product) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    addToCart(product.id);
    alert(`${product.name} добавлен в корзину!`);
  };

  return (
    <div>
      <h1> Каталог товаров</h1>

      {/* Фильтр по категориям */}
      <div style={{ marginBottom: 25, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '8px 18px',
              background: selectedCategory === cat ? '#2980b9' : '#ecf0f1',
              color: selectedCategory === cat ? '#fff' : '#2c3e50',
              border: selectedCategory === cat ? '2px solid #2980b9' : '2px solid transparent',
              borderRadius: 20,
              cursor: 'pointer',
              fontWeight: selectedCategory === cat ? '600' : '400',
              transition: 'all 0.2s ease'
            }}
          >
            {cat === 'all' ? '🔍 Все товары' : cat}
          </button>
        ))}
      </div>

      {!isAuthenticated && (
        <div style={{ background: '#fff3cd', padding: 15, borderRadius: 8, marginBottom: 20, border: '1px solid #ffc107' }}>
          ⚠️ <b>Внимание:</b> Для добавления товаров в корзину необходимо <a href="/login" style={{ color: '#007bff' }}>войти</a>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 25, marginTop: 20 }}>
        {products.map(product => (
  <div key={product.id} className="glass-card" style={{ overflow: 'hidden' }}>
    {/* Картинка */}
    <Link to={`/product/${product.id}`} style={{ display: 'block', height: 220, overflow: 'hidden' }}>
      <img 
        src={product.image || 'https://via.placeholder.com/400x300?text=No+Image'} 
        alt={product.name} 
        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: '0.5s' }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      />
    </Link>
    
    <div style={{ padding: 20 }}>
      <span style={{ 
        fontSize: 10, 
        background: 'rgba(99, 102, 241, 0.2)', 
        color: '#818cf8', 
        padding: '4px 8px', 
        borderRadius: 4, 
        textTransform: 'uppercase',
        letterSpacing: 1
      }}>
        {product.category}
      </span>
      
      <Link to={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <h3 style={{ margin: '12px 0', fontSize: 18, fontWeight: 600 }}>{product.name}</h3>
      </Link>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 15 }}>
        <div>
          <p style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>
            {product.price.toLocaleString()} ₽
          </p>
          <p style={{ fontSize: 12, color: product.stock > 0 ? 'var(--success)' : '#ef4444' }}>
            {product.stock > 0 ? 'В наличии' : 'Нет на складе'}
          </p>
        </div>
        
        {isAuthenticated ? (
          <button 
            onClick={() => handleAddToCart(product)} 
            disabled={product.stock === 0} 
            className="btn btn-primary"
            style={{ padding: '10px 16px', borderRadius: '50%' }} // Круглая кнопка
          >
            🛒
          </button>
        ) : (
          <button onClick={() => navigate('/login')} className="btn btn-outline" style={{ padding: '10px 16px' }}>
            🔐
          </button>
        )}
      </div>
    </div>
  </div>
))}
      </div>

      {products.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#7f8c8d' }}>
          <p style={{ fontSize: 18 }}>📭 В данной категории товаров пока нет</p>
          {selectedCategory !== 'all' && (
            <button onClick={() => setSelectedCategory('all')} style={{ marginTop: 10, padding: '10px 20px', background: '#3498db', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              Показать все товары
            </button>
          )}
        </div>
      )}
    </div>
  );
}
