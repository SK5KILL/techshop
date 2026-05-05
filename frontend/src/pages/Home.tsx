import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <h1>🖥 Добро пожаловать в TechShop!</h1>
      <p style={{ fontSize: 18, color: '#666' }}>Лучший магазин компьютерной электроники</p>
      <Link to="/catalog" style={{ display: 'inline-block', marginTop: 20, padding: '12px 30px', background: '#3498db', color: 'white', textDecoration: 'none', borderRadius: 5, fontSize: 16 }}>Перейти в каталог →</Link>
      
      <div style={{ marginTop: 60, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        <div style={{ padding: 20, background: '#ecf0f1', borderRadius: 8 }}>
          <h3>🚀 Быстрая доставка</h3>
          <p>Доставка по всей России</p>
        </div>
        <div style={{ padding: 20, background: '#ecf0f1', borderRadius: 8 }}>
          <h3>✅ Гарантия качества</h3>
          <p>Только оригинальная продукция</p>
        </div>
        <div style={{ padding: 20, background: '#ecf0f1', borderRadius: 8 }}>
          <h3>💰 Лучшие цены</h3>
          <p>Конкурентные цены на всё</p>
        </div>
      </div>
    </div>
  );
}