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
    fetch('https://techshop-backend-dkgb.onrender.com/api/products')
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
      const res = await fetch('https://techshop-backend-dkgb.onrender.com/api/products', {
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
        fetch('https://techshop-backend-dkgb.onrender.com/api/products').then(r => r.json()).then(setProducts);
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
