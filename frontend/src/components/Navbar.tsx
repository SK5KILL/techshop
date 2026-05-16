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
    <nav style={{
      position: 'sticky', 
      top: 0, 
      zIndex: 50, 
      marginBottom: 20,
      background: 'rgba(10, 14, 23, 0.7)', // Полупрозрачный фон
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.1)'
    }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '70px' }}>
        <Link to="/" className="text-gradient" style={{ textDecoration: 'none', fontSize: 24, fontWeight: 800, fontFamily: 'Montserrat' }}>
          TECH.SHOP
        </Link>
        
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link to="/" className="nav-link">Главная</Link>
          <Link to="/catalog" className="nav-link">Каталог</Link>
          <Link to="/contacts" className="nav-link">Контакты</Link>
          
          {isAuthenticated ? (
            <>
              {user?.role === 'admin' && (
                <Link to="/admin" className="nav-link" style={{ color: '#ec4899' }}>Admin</Link>
              )}
              <Link to="/cart" className="nav-link" style={{ position: 'relative' }}>
                Корзина
                {cartItems.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-8px', right: '-10px',
                    background: 'var(--accent)',
                    color: 'white',
                    borderRadius: '50%',
                    width: 18, height: 18,
                    fontSize: 11,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold'
                  }}>
                    {cartItems.length}
                  </span>
                )}
              </Link>
              <Link to="/profile" className="nav-link">👤 {user?.fio || user?.login}</Link>
              <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 12 }}>
                Выйти
              </button>
            </>
          ) : (
            <Link to="/login">
              <button className="btn btn-primary" style={{ padding: '8px 20px' }}>
                Войти
              </button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}