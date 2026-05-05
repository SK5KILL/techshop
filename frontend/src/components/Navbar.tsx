import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const cartItems = useCartStore((state) => state.items);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav style={{ background: '#2c3e50', padding: '15px 0', marginBottom: 20 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', fontSize: 24, fontWeight: 'bold' }}>🖥 TechShop</Link>
        
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>Главная</Link>
          <Link to="/catalog" style={{ color: 'white', textDecoration: 'none' }}>Каталог</Link>
          
          {isAuthenticated ? (
            <>
              {user?.role === 'admin' && (
                <Link to="/admin" style={{ color: '#f39c12', textDecoration: 'none', fontWeight: 'bold' }}>⚙️ Админка</Link>
              )}
              <Link to="/cart" style={{ color: 'white', textDecoration: 'none', position: 'relative' }}>
                🛒 Корзина
                {cartItems.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-12px',
                    background: '#e74c3c',
                    color: 'white',
                    borderRadius: '50%',
                    padding: '2px 6px',
                    fontSize: 12,
                    fontWeight: 'bold'
                  }}>
                    {cartItems.length}
                  </span>
                )}
              </Link>
              <Link to="/profile" style={{ color: 'white', textDecoration: 'none' }}>👤 {user?.fio || user?.login}</Link>
              <button onClick={handleLogout} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '8px 16px', cursor: 'pointer', borderRadius: 4 }}>Выйти</button>
            </>
          ) : (
            <Link to="/login" style={{ color: 'white', textDecoration: 'none' }}>🔐 Войти</Link>
          )}
        </div>
      </div>
    </nav>
  );
}