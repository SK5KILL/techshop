
backend/src/index.ts
```  typescript
import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import path from 'path';
import nodemailer from 'nodemailer';
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
// ... начало файла без изменений ...

const db = new Database('./shop.db');
const JWT_SECRET = 'your-secret-key';

// Создаем таблицы
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    fio TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    role TEXT DEFAULT 'client',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );
  
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    price REAL,
    stock INTEGER DEFAULT 0,
    description TEXT,
    image TEXT
  );
  
  CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  items TEXT,
  total REAL,
  status TEXT DEFAULT 'new',
  delivery_info TEXT, -- 👈 Новое поле
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
  
    CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    client_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES users(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );
`);

// Middleware для проверки авторизации
function isAuthenticated(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Нужна авторизация' });
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Неверный токен' });
  }
}

// Middleware для проверки админа (объявляем ДО использования!)
function isAdmin(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Нет токена' });
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Невалидный токен' });
  }
}

// Создаем админа если нет
// 👇 FIX: добавляем "as any" для результата запроса
const checkAdmin = db.prepare('SELECT COUNT(*) as c FROM users WHERE login = ?').get('admin') as any;
if (checkAdmin?.c === 0) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare(`INSERT INTO users (login, password, fio, role) VALUES ('admin', ?, 'Главный администратор', 'admin')`).run(hashedPassword);
  console.log('✅ Создан админ: admin / admin123');
}

// Тестовые товары
// 👇 FIX: добавляем "as any"
const checkProducts = db.prepare('SELECT COUNT(*) as c FROM products').get() as any;
if (checkProducts?.c === 0) {
  db.exec(`
    INSERT INTO products (name, category, price, stock, description, image) VALUES
    ('RTX 4060 Ti', 'Видеокарты', 45000, 10, 'Видеокарта NVIDIA GeForce RTX 4060 Ti 8GB', 'https://via.placeholder.com/400x300/3498db/ffffff?text=RTX+4060+Ti'),
    ('Intel Core i5-13400F', 'Процессоры', 18000, 15, 'Процессор 10 ядер, 16 потоков', 'https://via.placeholder.com/400x300/2ecc71/ffffff?text=Intel+i5'),
    ('Samsung 980 PRO 1TB', 'SSD накопители', 12000, 20, 'NVMe M.2 SSD', 'https://via.placeholder.com/400x300/e74c3c/ffffff?text=Samsung+SSD'),
    ('Corsair Vengeance 16GB', 'Оперативная память', 6000, 25, 'DDR4 3200MHz', 'https://via.placeholder.com/400x300/f39c12/ffffff?text=Corsair+RAM'),
    ('MSI B760M', 'Материнские платы', 14000, 8, 'Socket LGA1700', 'https://via.placeholder.com/400x300/9b59b6/ffffff?text=MSI+Motherboard')
  `);
  console.log('✅ Добавлены тестовые товары');
}

// РЕГИСТРАЦИЯ
app.post('/api/register', (req, res) => {
  const { login, password, fio, email, phone } = req.body;
  if (!login || !password) return res.status(400).json({ error: 'Логин и пароль обязательны' });
  
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare(`INSERT INTO users (login, password, fio, email, phone) VALUES (?, ?, ?, ?, ?)`)
      .run(login, hashedPassword, fio || '', email || '', phone || '');
    res.json({ success: true, userId: result.lastInsertRowid, message: 'Зарегистрирован' });
  } catch (err: any) {
    res.status(400).json({ error: err.message.includes('UNIQUE') ? 'Логин/email занят' : 'Ошибка' });
  }
});

// АВТОРИЗАЦИЯ
app.post('/api/login', (req, res) => {
  const { login, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE login = ?').get(login) as any;
  
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }
  
  const token = jwt.sign({ userId: user.id, login: user.login, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ success: true, token, user: { id: user.id, login: user.login, fio: user.fio, email: user.email, role: user.role } });
});

// КАТАЛОГ товаров
app.get('/api/products', (req, res) => {
let category: string | undefined = req.query.category as string | undefined;
if (Array.isArray(category)) {
  category = category[0];
}

let query = 'SELECT * FROM products';
const params: any[] = [];

// Если передана категория и она не "all", добавляем WHERE
if (category && category.toLowerCase() !== 'all') {
  query += ' WHERE category = ?';
  params.push(category);
}

  try {
    const products = db.prepare(query).all(...params) as any[];
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка получения товаров' });
  }
});

// Товар по ID
app.get('/api/products/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as any;
  if (!product) return res.status(404).json({ error: 'Товар не найден' });
  res.json(product);
});

// ДОБАВЛЕНИЕ товара (только админ)
app.post('/api/products', isAdmin, (req, res) => {
  const { name, category, price, stock, description, image } = req.body;
  
  if (!name || !price) {
    return res.status(400).json({ error: 'Название и цена обязательны' });
  }
  
  try {
    const result = db.prepare(`
      INSERT INTO products (name, category, price, stock, description, image) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, category || '', price, stock || 0, description || '', image || '');
    
    res.json({ success: true, productId: result.lastInsertRowid, message: 'Товар добавлен' });
  } catch (err: any) {
    res.status(500).json({ error: 'Ошибка добавления товара' });
  }
});

// УДАЛЕНИЕ товара (только админ)
app.delete('/api/products/:id', isAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Товар удален' });
  } catch (err: any) {
    res.status(500).json({ error: 'Ошибка удаления товара' });
  }
});

// Создание заказа
app.post('/api/orders', (req, res) => {
  const { userId, items, total } = req.body;
  const result = db.prepare('INSERT INTO orders (user_id, items, total) VALUES (?, ?, ?)').run(userId, JSON.stringify(items), total);
  res.json({ success: true, orderId: result.lastInsertRowid });
});

// Заказы пользователя
app.get('/api/users/:id/orders', (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.params.id) as any[];
  res.json(orders);
});

// === КОРЗИНА ===
app.get('/api/cart', isAuthenticated, (req: any, res) => {
  const userId = req.userId;
  
  // 👇 ДОБАВЬ p.category В ЭТОТ ЗАПРОС
  const items = db.prepare(`
    SELECT p.id as product_id, p.name, p.price, p.stock, p.image, p.category, c.quantity 
    FROM cart_items c
    JOIN products p ON c.product_id = p.id
    WHERE c.user_id = ?
  `).all(userId) as any[];
  
  res.json(items);
});

app.post('/api/cart', isAuthenticated, (req: any, res) => {
  const userId = req.userId;
  const { productId, quantity = 1 } = req.body;
  if (!productId) return res.status(400).json({ error: 'Нет ID товара' });
  
  const existing = db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?').get(userId, productId) as any;

  if (existing) {
    db.prepare('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?').run(quantity, existing.id);
  } else {
    db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)').run(userId, productId, quantity);
  }
  res.json({ success: true, message: 'Добавлено в корзину' });
});

// Получить отзывы товара
app.get('/api/products/:id/reviews', (req, res) => {
  const reviews = db.prepare(`
    SELECT r.id, r.text, r.client_id, u.login as client_name, r.created_at
    FROM reviews r
    JOIN users u ON r.client_id = u.id
    WHERE r.product_id = ?
    ORDER BY r.created_at DESC
  `).all(req.params.id) as any[];
  res.json(reviews);
});

// ОБНОВЛЕНИЕ количества товара в корзине
app.put('/api/cart/:productId', isAuthenticated, (req: any, res) => {
  const userId = req.userId;
  const productId = req.params.productId;
  const { quantity } = req.body;

  if (!quantity || quantity < 1) {
    return res.status(400).json({ error: 'Количество должно быть не менее 1' });
  }

  try {
    const result = db.prepare(
      'UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?'
    ).run(quantity, userId, productId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Товар не найден в корзине' });
    }
    
    res.json({ success: true, message: 'Количество обновлено' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления количества' });
  }
});

// Добавить отзыв (только авторизованным)
app.post('/api/reviews', isAuthenticated, (req: any, res) => {
  const userId = req.userId;
  const { productId, text } = req.body;
  
  if (!text || !productId) return res.status(400).json({ error: 'Текст и ID товара обязательны' });
  
  try {
    db.prepare('INSERT INTO reviews (text, client_id, product_id) VALUES (?, ?, ?)')
      .run(text.trim(), userId, productId);
    res.json({ success: true, message: 'Отзыв опубликован' });
  } catch (err: any) {
    res.status(500).json({ error: 'Ошибка сохранения отзыва' });
  }
});

app.delete('/api/cart/:productId', isAuthenticated, (req: any, res) => {
  const userId = req.userId;
  const productId = req.params.productId;
  
  db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(userId, productId);
  res.json({ success: true });
});

app.delete('/api/cart', isAuthenticated, (req: any, res) => {
  const userId = req.userId;
  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
  res.json({ success: true });
});
app.put('/api/products/:id', isAdmin, (req, res) => {
  const { id } = req.params;
  const { name, category, price, stock, description, image } = req.body;
  
  if (!name || !price) {
    return res.status(400).json({ error: 'Название и цена обязательны' });
  }
  
  try {
    const result = db.prepare(`
      UPDATE products 
      SET name = ?, category = ?, price = ?, stock = ?, description = ?, image = ?
      WHERE id = ?
    `).run(name, category || '', price, stock || 0, description || '', image || '', id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    
    res.json({ success: true, message: 'Товар обновлён' });
  } catch (err: any) {
    res.status(500).json({ error: 'Ошибка обновления товара' });
  }

});

const transporter = nodemailer.createTransport({
  service: 'yandex',
  auth: {
    user: process.env.EMAIL_USER || 'kostia.suhanoff@yandex.ru',
    pass: process.env.EMAIL_PASS || 'kdjhlakgiacxynky' // Пароль приложения, не основной!
  }
});

app.post('/api/orders/checkout', isAuthenticated, async (req: any, res) => {
  const userId = req.userId;
  const { items, total, deliveryInfo } = req.body;

  if (!items || items.length === 0) return res.status(400).json({ error: 'Корзина пуста' });

  try {
    // 1. Сохраняем заказ в БД
    const orderResult = db.prepare(
      'INSERT INTO orders (user_id, items, total, status, delivery_info) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, JSON.stringify(items), total, 'new', JSON.stringify(deliveryInfo));

    // 2. Очищаем корзину
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);

    // 3. Формируем письмо
    const itemsList = items.map((i: any) => 
      `• ${i.name} × ${i.quantity} = ${(i.price * i.quantity).toLocaleString()} ₽`
    ).join('\n');

    const emailHtml = `
      <h2> Новый заказ #${orderResult.lastInsertRowid}</h2>
      <p><b>Клиент:</b> ${deliveryInfo.name}</p>
      <p><b>Телефон:</b> ${deliveryInfo.phone}</p>
      <p><b>Способ:</b> ${deliveryInfo.deliveryMethod === 'delivery' ? ' Доставка' : '🏪 Самовывоз'}</p>
      ${deliveryInfo.deliveryMethod === 'delivery' ? `<p><b>Адрес:</b> ${deliveryInfo.address}</p``` : ''}
      <h3>Состав заказа:</h3>
      <pre style="background:#f5f5f5; padding:10px; border-radius:6px;">${itemsList}</pre>
      <p><b>Итого:</b> ${total.toLocaleString()} ₽</p>
    `;

    // 4. Отправляем на почту админа
    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'noreply@techshop.ru',
      to: 'kostia.suhanoff@yandex.ru',
      subject: `Заказ #${orderResult.lastInsertRowid} | TechShop`,
      html: emailHtml
    });

    res.json({ success: true, orderId: orderResult.lastInsertRowid });
  } catch (err) {
    console.error('❌ Checkout error:', err);
    res.status(500).json({ error: 'Ошибка оформления заказа' });
  }
});

app.listen(3001, () => console.log('✅ Backend: http://localhost:3001'));
```

frontend/src/components/CheckoutModal.tsx
```  tsx
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
      const res = await fetch('http://localhost:3001/api/orders/checkout', {
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
```

frontend/src/components/Navbar.tsx
```  tsx
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useThemeStore } from '../store/themeStore';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const cartItems = useCartStore((state) => state.items);
  const { theme, toggleTheme } = useThemeStore();

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
      background: 'var(--bg-surface)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--glass-border)',
      transition: 'background 0.3s'
    }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '70px' }}>
        <Link to="/" className="text-gradient" style={{ textDecoration: 'none', fontSize: 24, fontWeight: 800 }}>
          TECH.SHOP
        </Link>
        
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link to="/" className="nav-link">Главная</Link>
          <Link to="/catalog" className="nav-link">Каталог</Link>
          <Link to="/contacts" className="nav-link">Контакты</Link>
          
          {isAuthenticated ? (
            <>
              {user?.role === 'admin' && (
                <Link to="/admin" className="nav-link" style={{ color: 'var(--accent)' }}>Admin</Link>
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
          
          {/* Кнопка переключения темы */}
          <button 
            onClick={toggleTheme} 
            className="btn btn-outline" 
            style={{ padding: '6px 12px', fontSize: 16, minWidth: 40 }}
            title={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </nav>
  );
}
```

frontend/src/pages/Admin.tsx
```  tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number | string;
  stock: number | string;
  description: string;
  image: string;
}

export default function Admin() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Форма добавления
  const [formData, setFormData] = useState({
    name: '', category: '', price: '', stock: '', description: '', image: '' 
  });
  const [previewImage, setPreviewImage] = useState('');
  const [message, setMessage] = useState('');

  if (!user || user.role !== 'admin') {
    navigate('/');
    return null;
  }

  // Загрузка
  useEffect(() => {
    fetch('http://localhost:3001/api/products')
      .then(r => r.json())
      .then(setProducts);
  }, []);

  // === ФУНКЦИИ ДОБАВЛЕНИЯ ===
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const res = reader.result as string;
        setFormData(prev => ({ ...prev, image: res }));
        setPreviewImage(res);
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock) || 0
        })
      });
      const data = await res.json();
      if (data.error) setMessage(data.error);
      else {
        setMessage('✅ Товар добавлен!');
        setFormData({ name: '', category: '', price: '', stock: '', description: '', image: '' });
        setPreviewImage('');
        fetch('http://localhost:3001/api/products').then(r => r.json()).then(setProducts);
      }
    } catch { setMessage('❌ Ошибка соединения'); }
  };

  // === ФУНКЦИИ УДАЛЕНИЯ ===
  const handleDelete = async (id: number) => {
    if (!confirm('Удалить товар?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:3001/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setProducts(products.filter(p => p.id !== id));
      setMessage('✅ Товар удален');
    } catch { setMessage('❌ Ошибка'); }
  };

  // === ФУНКЦИИ РЕДАКТИРОВАНИЯ ===
  const startEdit = (product: Product) => {
    setEditingProduct({ ...product });
    setIsEditing(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ...editingProduct,
          price: parseFloat(editingProduct.price as any),
          stock: parseInt(editingProduct.stock as any) || 0
        })
      });
      const data = await res.json();
      if (data.error) setMessage(data.error);
      else {
        setMessage('✅ Товар обновлён!');
        setIsEditing(false);
        setEditingProduct(null);
        fetch('http://localhost:3001/api/products').then(r => r.json()).then(setProducts);
      }
    } catch { setMessage('❌ Ошибка соединения'); }
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingProduct) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        setEditingProduct(prev => prev ? { ...prev, image: reader.result as string } : null);
      };
    }
  };

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      <h1 className="admin-title">🛠 Админ-панель</h1>

      {message && (
        <div style={{ 
          padding: 15, borderRadius: 8, marginBottom: 20, 
          background: message.includes('❌') ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
          color: message.includes('❌') ? '#f87171' : '#34d399',
          border: `1px solid ${message.includes('❌') ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`
        }}>
          {message}
        </div>
      )}

      {/* Секция добавления */}
      <div className="admin-section">
        <div className="glass-card add-product-form">
          <div className="form-group">
            <label>Название *</label>
            <input 
              placeholder="Например: RTX 4090" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Категория</label>
            <input 
              placeholder="Видеокарты" 
              value={formData.category} 
              onChange={e => setFormData({...formData, category: e.target.value})} 
            />
          </div>
          <div className="form-group">
            <label>Цена *</label>
            <input 
              type="number" 
              placeholder="45000" 
              value={formData.price} 
              onChange={e => setFormData({...formData, price: e.target.value})} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Количество</label>
            <input 
              type="number" 
              placeholder="10" 
              value={formData.stock} 
              onChange={e => setFormData({...formData, stock: e.target.value})} 
            />
          </div>
          
          <div className="form-group form-group-full">
            <div className="file-input-wrapper">
              <input type="file" accept="image/*" onChange={handleFileChange} />
              <div style={{ color: 'var(--text-muted)', pointerEvents: 'none' }}>
                📷 Нажмите для загрузки изображения
              </div>
              {previewImage && <img src={previewImage} alt="Preview" className="preview-image" />}
            </div>
          </div>

          <div className="form-group form-group-full">
            <label>Описание</label>
            <textarea 
              placeholder="Полные характеристики..." 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
              rows={3} 
            />
          </div>

          <div className="form-group-full">
            <button onClick={handleSubmit} className="btn btn-primary" style={{ width: '100%', padding: 16, fontSize: 16 }}>
              ✨ Добавить товар в каталог
            </button>
          </div>
        </div>
      </div>

      {/* Секция списка товаров */}
      <div className="admin-section">
        <h2 style={{ color: 'white', marginBottom: 20, fontSize: '1.5rem' }}>📦 Управление товарами</h2>
        <div className="product-list">
          {products.map(product => (
            <div key={product.id} className="product-row">
              <img src={product.image || 'https://via.placeholder.com/60'} alt={product.name} className="product-thumb" />
              
              <div className="product-info-row">
                <div className="product-name-row">{product.name}</div>
                <div className="product-meta-row">{product.category} • {product.price} ₽</div>
              </div>

              <button onClick={() => startEdit(product)} className="action-btn btn-edit">
                ✏️ Ред.
              </button>
              <button onClick={() => handleDelete(product.id)} className="action-btn btn-delete">
                🗑 Удалить
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Модальное окно редактирования (Glassmorphism) */}
      {isEditing && editingProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }} onClick={() => setIsEditing(false)}>
          <div className="glass-card" style={{ padding: 30, width: '90%', maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, color: 'white' }}>✏️ Редактирование: {editingProduct.name}</h2>
            <form onSubmit={handleUpdate} className="add-product-form" style={{ padding: 0 }}>
              <div className="form-group"><label>Название</label><input value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} required /></div>
              <div className="form-group"><label>Категория</label><input value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} /></div>
              <div className="form-group"><label>Цена</label><input type="number" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: e.target.value as any})} required /></div>
              <div className="form-group"><label>Сток</label><input type="number" value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: e.target.value as any})} /></div>
              
              <div className="form-group form-group-full">
                <label>Изображение</label>
                <input type="file" accept="image/*" onChange={handleEditFileChange} />
                {editingProduct.image && <img src={editingProduct.image} alt="Prev" style={{ height: 80, marginTop: 10 }} />}
              </div>
              <div className="form-group form-group-full"><label>Описание</label><textarea value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} rows={3} /></div>
              
              <div className="form-group-full" style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>💾 Сохранить</button>
                <button type="button" onClick={() => setIsEditing(false)} className="btn btn-outline" style={{ flex: 1 }}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

frontend/src/pages/Cart.tsx
```  tsx
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import CheckoutModal from '../components/CheckoutModal';

export default function Cart() {
  const { items, removeFromCart, clearCart, total, fetchCart, updateQuantity } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    if (user) fetchCart();
  }, [user]);

  if (items.length === 0) {
    return (
      <div className="container empty-cart">
        <div className="empty-cart-icon">🛒</div>
        <h2>Корзина пуста</h2>
        <p>Добавьте товары из каталога</p>
        <Link to="/catalog" className="btn btn-primary" style={{ marginTop: 20, display: 'inline-block', textDecoration: 'none' }}>
          Перейти в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="container cart-wrapper">
      <h1 className="cart-title">🛒 Корзина</h1>

      <div className="cart-list">
        {items.map(item => (
          <div key={item.product_id} className="cart-item">
            <Link to={`/product/${item.product_id}`}>
              <img src={item.image} alt={item.name} className="cart-item-img" />
            </Link>

            <div className="cart-item-info">
              <Link to={`/product/${item.product_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <h3 className="cart-item-name">{item.name}</h3>
              </Link>
              <span className="cart-item-category">{item.category || 'Товар'}</span>
            </div>

            <div className="qty-control">
              <button className="qty-btn" onClick={() => updateQuantity(item.product_id, item.quantity - 1)} disabled={item.quantity <= 1}>−</button>
              <span className="qty-value">{item.quantity}</span>
              <button className="qty-btn" onClick={() => updateQuantity(item.product_id, item.quantity + 1)} disabled={item.quantity >= (item.stock || 99)}>+</button>
            </div>

            <div className="cart-item-total">
              {(item.price * item.quantity).toLocaleString()} ₽
            </div>

            <button className="btn-delete" onClick={() => removeFromCart(item.product_id)}>🗑</button>
          </div>
        ))}
      </div>

      {/* Итого + кнопка оформления */}
      <div className="cart-footer">
        <div>
          <span className="total-label">Итого к оплате:</span>
          <div className="total-value">{total().toLocaleString()} ₽</div>
        </div>
        <button className="btn-checkout" onClick={() => setIsCheckoutOpen(true)}>
          Оформить заказ
        </button>
      </div>

      {/* Модальное окно оформления */}
      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
      />
    </div>
  );
}
```

frontend/src/pages/Catalog.tsx
```  tsx
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
      ? 'http://localhost:3001/api/products'
      : `http://localhost:3001/api/products?category=${encodeURIComponent(selectedCategory)}`;

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
```

frontend/src/pages/Contacts.tsx
```  tsx
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
```

frontend/src/pages/Home.tsx
```  tsx
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
```

frontend/src/pages/Login.tsx
```  tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ login: '', password: '', fio: '', email: '', phone: '' });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/login' : '/api/register';
    
    try {
      const res = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (data.error) {
        setMessage(data.error);
      } else {
        if (data.token) {
          localStorage.setItem('token', data.token);
          setUser(data.user);
          navigate('/profile');
        } else {
          setMessage('Регистрация успешна! Теперь войдите');
          setIsLogin(true);
        }
      }
    } catch {
      setMessage('Ошибка соединения');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      <h2>{isLogin ? '🔐 Вход' : '📝 Регистрация'}</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input placeholder="Логин *" value={formData.login} onChange={e => setFormData({...formData, login: e.target.value})} required style={{ padding: 10 }} />
        <input type="password" placeholder="Пароль *" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required style={{ padding: 10 }} />
        {!isLogin && (
          <>
            <input placeholder="ФИО" value={formData.fio} onChange={e => setFormData({...formData, fio: e.target.value})} style={{ padding: 10 }} />
            <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ padding: 10 }} />
            <input placeholder="Телефон" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ padding: 10 }} />
          </>
        )}
        <button type="submit" style={{ padding: 12, background: '#3498db', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>{isLogin ? 'Войти' : 'Зарегистрироваться'}</button>
      </form>
      <p style={{ marginTop: 10 }}>
        {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
        <button onClick={() => { setIsLogin(!isLogin); setMessage(''); }} style={{ background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', textDecoration: 'underline' }}>{isLogin ? 'Зарегистрироваться' : 'Войти'}</button>
      </p>
      {message && <p style={{ color: message.includes('Ошибка') ? 'red' : 'green' }}>{message}</p>}
    </div>
  );
}
```

frontend/src/pages/ProductDetail.tsx
```  tsx
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
    fetch(`http://localhost:3001/api/products/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) navigate('/catalog');
        else setProduct(data);
      })
      .catch(() => navigate('/catalog'));
  }, [id, navigate]);

  useEffect(() => {
    if (!id) return;
    fetch(`http://localhost:3001/api/products/${id}/reviews`)
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
      const res = await fetch('http://localhost:3001/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ productId: parseInt(id), text: reviewText.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setReviewText('');
        fetch(`http://localhost:3001/api/products/${id}/reviews`)
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
```

frontend/src/pages/Profile.tsx
```  tsx
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';

export default function Profile() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetch(`http://localhost:3000/api/users/${user.id}/orders`)
        .then(r => r.json())
        .then(data => {
            setOrders(data);
            setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [user]);

  if (!user) return null;

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      
      {/* Шапка профиля */}
      <div className="profile-header">
        <div className="profile-avatar">
          {user.role === 'admin' ? '️' : '👤'}
        </div>
        <div>
          <h1 className="text-gradient" style={{ margin: 0, fontSize: '2.2rem' }}>
            {user.fio || 'Личный кабинет'}
          </h1>
          <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)' }}>
            ID: {user.id} • {user.login}
          </p>
        </div>
      </div>

      {/* Карточка информации (Стекло) */}
      <div className="glass-card" style={{ padding: '30px', marginBottom: '40px', position: 'relative', overflow: 'hidden' }}>
        {/* Фоновый градиент */}
        <div style={{ 
            position: 'absolute', top: '-50px', right: '-50px', 
            width: '200px', height: '200px', background: 'var(--primary)', 
            filter: 'blur(80px)', opacity: 0.15, borderRadius: '50%' 
        }}></div>

        <h3 style={{ marginTop: 0, marginBottom: 25, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '14px', letterSpacing: '1px' }}>
          Данные аккаунта
        </h3>

        <div className="profile-stats">
          <div className="stat-item">
            <span className="stat-label">Логин</span>
            <span className="stat-value">{user.login}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Email</span>
            <span className="stat-value">{user.email || 'Не указан'}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Роль</span>
            <span className="stat-value">
              <span className={`role-badge ${user.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                {user.role === 'admin' ? ' Администратор' : ' Клиент'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Секция заказов */}
      <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '20px' }}> История заказов</h2>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Загрузка...</div>
      ) : orders.length === 0 ? (
        <div className="glass-card empty-state">
          <div style={{ fontSize: 40, marginBottom: 10 }}>🛍️</div>
          <p>Вы ещё не совершали заказов</p>
          <a href="/catalog" className="btn btn-primary" style={{ display: 'inline-block', marginTop: '15px', textDecoration: 'none' }}>
            Перейти в каталог
          </a>
        </div>
      ) : (
        <div className="order-list">
          {orders.map(order => (
            <div key={order.id} className={`glass-card order-card ${order.status === 'new' ? 'new' : 'completed'}`}>
              <div className="order-info">
                <h4>Заказ #{order.id}</h4>
                <span className="order-date">{new Date(order.created_at).toLocaleDateString()} • {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div className="order-total">
                  {order.total.toLocaleString()} ₽
                </div>
                <span className="status-pill">
                  {order.status === 'new' ? ' Новый' : '✅ Выполнен'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

frontend/src/store/authStore.ts
```  typescript
import { create } from 'zustand';

interface AuthState {
  user: any;
  isAuthenticated: boolean;
  setUser: (user: any) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, isAuthenticated: false });
  }
}));
```

frontend/src/store/cartStore.ts
```  typescript
import { create } from 'zustand';

interface CartItem {
  product_id: number;
  name: string;
  price: number;
  stock: number;
  image: string;
  quantity: number;
  category: string;
}

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  
  // Действия
  fetchCart: () => Promise<void>;
  addToCart: (productId: number) => Promise<void>;
  removeFromCart: (productId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  updateQuantity: (productId: number, quantity: number) => Promise<void>;
  
  // Вычисляемые свойства
  total: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isLoading: false,
  updateQuantity: async (productId: number, quantity: number) => {
    const token = localStorage.getItem('token');
    if (!token || quantity < 1) return;
    
    try {
      await fetch(`http://localhost:3001/api/cart/${productId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ quantity })
      });
      // После обновления на сервере перезагружаем корзину
      get().fetchCart();
    } catch (e) { 
      console.error(e); 
    }
  },
  fetchCart: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      set({ isLoading: true });
      const res = await fetch('http://localhost:3001/api/cart', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        set({ items: data });
      }
    } catch (e) {
      console.error(e);
    } finally {
      set({ isLoading: false });
    }
  },

  addToCart: async (productId) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await fetch('http://localhost:3001/api/cart', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ productId })
      });
      // После успешного добавления обновляем список
      get().fetchCart();
    } catch (e) { console.error(e); }
  },

  removeFromCart: async (productId) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await fetch(`http://localhost:3001/api/cart/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Обновляем список
      get().fetchCart();
    } catch (e) { console.error(e); }
  },

  clearCart: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await fetch('http://localhost:3001/api/cart', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      set({ items: [] });
    } catch (e) { console.error(e); }
  },

  total: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
}));
```

frontend/src/store/themeStore.ts
```  typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'theme-storage' }
  )
);
```

frontend/src/App.tsx
```  tsx
import { useEffect } from 'react';
import { useThemeStore } from './store/themeStore';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Contacts from './pages/Contacts';
import { useAuthStore } from './store/authStore';
import { useCartStore } from './store/cartStore';

function App() {
  const { setUser, user } = useAuthStore();
  const fetchCart = useCartStore((state) => state.fetchCart);
  const { theme } = useThemeStore();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
      fetchCart();
    }
  }, [setUser]);

  // Применяем тему к корневому элементу
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <Navbar />
      <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={user ? <Cart /> : <Navigate to="/login" />} />
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/admin" element={user?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
```

frontend/src/main.tsx
```  tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

```

frontend/vite.config.ts
```  typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})

```

