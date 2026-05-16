import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px', position: 'relative' }}>
      {/* Герой-секция */}
      <div className="fade-in-up">
        <h1 className="text-gradient" style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '16px', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
          Добро пожаловать в TechShop!
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.25rem', maxWidth: '650px', margin: '0 auto 40px', lineHeight: 1.6 }}>
          Лучший магазин компьютерной электроники. Оригинальные комплектующие, быстрая доставка и гарантия качества.
        </p>

        <Link to="/catalog">
          <button className="btn btn-primary" style={{ padding: '18px 48px', fontSize: '18px', borderRadius: '14px', fontWeight: 600, boxShadow: '0 0 30px rgba(99, 102, 241, 0.4)' }}>
            Перейти в каталог →
          </button>
        </Link>
      </div>

      {/* Сетка преимуществ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', maxWidth: '1100px', margin: '100px auto 0' }}>
        
        {/* Карточка 1 */}
        <div className="glass-card feature-card" style={{ padding: '32px', textAlign: 'left' }}>
          <div style={{ width: 56, height: 56, borderRadius: '14px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', fontSize: '26px' }}>
            🚀
          </div>
          <h3 style={{ color: 'white', fontSize: '1.35rem', marginBottom: '12px', fontWeight: 600 }}>Быстрая доставка</h3>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, margin: 0, fontSize: '0.95rem' }}>
            Доставка по всей России в кратчайшие сроки. Отслеживание заказа на каждом этапе.
          </p>
        </div>

        {/* Карточка 2 */}
        <div className="glass-card feature-card" style={{ padding: '32px', textAlign: 'left' }}>
          <div style={{ width: 56, height: 56, borderRadius: '14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', fontSize: '26px' }}>
            ✅
          </div>
          <h3 style={{ color: 'white', fontSize: '1.35rem', marginBottom: '12px', fontWeight: 600 }}>Гарантия качества</h3>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, margin: 0, fontSize: '0.95rem' }}>
            Только оригинальная продукция от официальных поставщиков с полной заводской гарантией.
          </p>
        </div>

        {/* Карточка 3 */}
        <div className="glass-card feature-card" style={{ padding: '32px', textAlign: 'left' }}>
          <div style={{ width: 56, height: 56, borderRadius: '14px', background: 'rgba(236, 72, 153, 0.15)', border: '1px solid rgba(236, 72, 153, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', fontSize: '26px' }}>
            💰
          </div>
          <h3 style={{ color: 'white', fontSize: '1.35rem', marginBottom: '12px', fontWeight: 600 }}>Лучшие цены</h3>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, margin: 0, fontSize: '0.95rem' }}>
            Конкурентные цены, регулярные акции и бонусная программа для постоянных клиентов.
          </p>
        </div>

      </div>
    </div>
  );
}