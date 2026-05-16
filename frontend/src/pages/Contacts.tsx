import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Contacts() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📧 Сообщение отправлено:', formData);
    setSubmitted(true);
    setFormData({ name: '', email: '', message: '' });
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 0' }}>
      {/* Хлебные крошки */}
      <div style={{ marginBottom: 20, color: 'var(--text-muted)', fontSize: 14 }}>
        <Link to="/" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Главная</Link>
        <span style={{ margin: '0 8px' }}> / </span>
        <span style={{ color: 'var(--text-main)' }}>Контакты</span>
      </div>

      <h1 className="text-gradient" style={{ marginBottom: 40, fontSize: 42, fontWeight: 800 }}>
         Контакты
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 30 }}>
        {/* ЛЕВАЯ КОЛОНКА: Информация */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Адрес */}
          <div className="glass-card" style={{ padding: 25 }}>
            <h3 style={{ marginTop: 0, color: 'white', marginBottom: 20 }}>🏢 Наш адрес</h3>
            
            <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
              <span style={{ fontSize: 24 }}>📍</span>
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: 'white' }}>Саратовская область, г. Балаково</p>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)' }}>ул. Комсомольская, д. 85</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
              <span style={{ fontSize: 24 }}></span>
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: 'white' }}>Телефон</p>
                <a href="tel:+78453123456" style={{ color: 'var(--primary)', textDecoration: 'none', transition: '0.2s' }}
                   onMouseEnter={e => (e.target as HTMLAnchorElement).style.color = 'var(--accent)'}
                   onMouseLeave={e => (e.target as HTMLAnchorElement).style.color = 'var(--primary)'}>
                  +7 (8453) 12-34-56
                </a>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 15 }}>
              <span style={{ fontSize: 24 }}></span>
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: 'white' }}>Режим работы</p>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)' }}>Пн-Пт: 9:00–20:00</p>
              </div>
            </div>
          </div>

          {/* Соцсети */}
          <div className="glass-card" style={{ padding: 25 }}>
            <h3 style={{ marginTop: 0, color: 'white', marginBottom: 15 }}>🔗 Мы в соцсетях</h3>
            <div style={{ display: 'flex', gap: 12 }}>
              <a href="#" className="btn btn-outline" style={{ flex: 1, textAlign: 'center' }}>💬 Telegram</a>
              <a href="#" className="btn btn-outline" style={{ flex: 1, textAlign: 'center' }}> VK</a>
            </div>
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА: Форма */}
        <div className="glass-card" style={{ padding: 35 }}>
          <h3 className="text-gradient" style={{ marginTop: 0, marginBottom: 25, fontSize: 24 }}>✉️ Написать нам</h3>
          
          {submitted && (
            <div style={{ 
              background: 'rgba(16, 185, 129, 0.1)', 
              border: '1px solid var(--success)', 
              color: 'var(--success)',
              padding: 12, borderRadius: 8, marginBottom: 20, textAlign: 'center'
            }}>
              ✅ Сообщение отправлено!
            </div>
          )}
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-muted)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Ваше имя</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
                placeholder="Иван Иванов"
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-muted)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                required
                placeholder="example@mail.ru"
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-muted)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Сообщение</label>
              <textarea
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
                required
                rows={5}
                placeholder="Ваш вопрос или предложение..."
              />
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ padding: 16, fontSize: 16, marginTop: 10 }}>
              Отправить сообщение
            </button>
          </form>
        </div>
      </div>

      {/* Карта */}
      <div className="glass-card" style={{ marginTop: 40, padding: 25, textAlign: 'center' }}>
        <h3 style={{ color: 'white', marginBottom: 15 }}>️ Как нас найти</h3>
        <div style={{ 
          width: '100%', height: 300, 
          background: 'rgba(0,0,0,0.3)', 
          borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px dashed var(--glass-border)'
        }}>
          <div style={{ color: 'var(--text-muted)' }}>
            <p style={{ margin: 0 }}>📍 г. Балаково, ул. Комсомольская, 85</p>
            <p style={{ margin: '10px 0 0 0', fontSize: 13 }}>
              <em>(Здесь будет карта Яндекс/Google Maps)</em>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}