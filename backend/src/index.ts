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
      ${deliveryInfo.deliveryMethod === 'delivery' ? `<p><b>Адрес:</b> ${deliveryInfo.address}</p>` : ''}
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