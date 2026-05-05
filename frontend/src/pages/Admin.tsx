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
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    stock: '',
    description: '',
    image: '' 
  });
  
  const [previewImage, setPreviewImage] = useState('');
  const [message, setMessage] = useState('');

  // Защита маршрута
  if (!user || user.role !== 'admin') {
    navigate('/');
    return null;
  }

  // Загрузка товаров
  useEffect(() => {
    fetch('https://techshop-backend-dkgb.onrender.com/api/products')
      .then(r => r.json())
      .then(setProducts);
  }, []);

  // === ФУНКЦИИ ДЛЯ ДОБАВЛЕНИЯ ===
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        setFormData(prev => ({ ...prev, image: base64String }));
        setPreviewImage(base64String);
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://techshop-backend-dkgb.onrender.com/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock) || 0
        })
      });
      
      const data = await res.json();
      if (data.error) {
        setMessage(data.error);
      } else {
        setMessage('✅ Товар добавлен!');
        setFormData({ name: '', category: '', price: '', stock: '', description: '', image: '' });
        setPreviewImage('');
        fetch('https://techshop-backend-dkgb.onrender.com/api/products').then(r => r.json()).then(setProducts);
      }
    } catch {
      setMessage('❌ Ошибка соединения');
    }
  };

  // === ФУНКЦИИ ДЛЯ УДАЛЕНИЯ ===
  const handleDelete = async (id: number) => {
    if (!confirm('Удалить товар?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`https://techshop-backend-dkgb.onrender.com/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setProducts(products.filter(p => p.id !== id));
      setMessage('✅ Товар удален');
    } catch { 
      setMessage('❌ Ошибка'); 
    }
  };

  // === ФУНКЦИИ ДЛЯ РЕДАКТИРОВАНИЯ ===
  const startEdit = (product: Product) => {
    console.log('🔧 Start edit:', product);
    setEditingProduct({ ...product });
    setIsEditing(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://techshop-backend-dkgb.onrender.com/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...editingProduct,
          price: parseFloat(editingProduct.price as any),
          stock: parseInt(editingProduct.stock as any) || 0
        })
      });
      
      const data = await res.json();
      if (data.error) {
        setMessage(data.error);
      } else {
        setMessage('✅ Товар обновлён!');
        setIsEditing(false);
        setEditingProduct(null);
        fetch('https://techshop-backend-dkgb.onrender.com/api/products').then(r => r.json()).then(setProducts);
      }
    } catch {
      setMessage('❌ Ошибка соединения');
    }
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

  // === РЕНДЕР ===
  return (
    <div>
      <h1>🛠 Админ-панель</h1>
      
      {/* Форма добавления товара */}
      <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 8, marginBottom: 30 }}>
        <h2>➕ Добавить товар</h2>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input placeholder="Название *" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required style={{ padding: 10 }} />
          <input placeholder="Категория" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ padding: 10 }} />
          <input type="number" placeholder="Цена *" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required style={{ padding: 10 }} />
          <input type="number" placeholder="Количество" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} style={{ padding: 10 }} />
          
          <div style={{ gridColumn: '1 / -1', padding: 10, border: '1px dashed #ccc', borderRadius: 4 }}>
            <label>Изображение товара:</label>
            <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'block', marginTop: 5 }} />
            {previewImage && <img src={previewImage} alt="Preview" style={{ maxHeight: 100, marginTop: 10, borderRadius: 4 }} />}
          </div>

          <textarea placeholder="Описание" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} style={{ padding: 10, gridColumn: '1 / -1' }} />
          <button type="submit" style={{ gridColumn: '1 / -1', padding: 12, background: '#27ae60', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            Добавить товар в БД
          </button>
        </form>
      </div>

      {message && <p style={{ color: message.includes('❌') ? 'red' : 'green' }}>{message}</p>}
      
      {/* Список товаров */}
      <h2>📦 Управление товарами</h2>
      <div style={{ marginTop: 20 }}>
        {products.map(product => (
          <div key={product.id} style={{ display: 'flex', padding: 15, borderBottom: '1px solid #ddd', alignItems: 'center', gap: 15 }}>
            {product.image ? (
              <img src={product.image} alt={product.name} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />
            ) : (
              <div style={{ width: 60, height: 60, background: '#eee', borderRadius: 4 }} />
            )}
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0 }}>{product.name}</h3>
              <p style={{ margin: 0, color: '#666' }}>{product.category} • {product.price} ₽</p>
            </div>
            
            {/* Кнопки управления */}
            <button 
              onClick={() => startEdit(product)}
              style={{ background: '#3498db', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', marginRight: 8 }}
            >
              ✏️ Редактировать
            </button>
            <button 
              onClick={() => handleDelete(product.id)} 
              style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' }}
            >
              🗑 Удалить
            </button>
          </div>
        ))}
      </div>

      {/* ✅ МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ - ВНУТРИ RETURN */}
      {isEditing && editingProduct && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setIsEditing(false)}>
          <div style={{
            background: 'white',
            padding: 25,
            borderRadius: 12,
            maxWidth: 600,
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>✏️ Редактировать товар</h2>
            
            <form onSubmit={handleUpdate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input
                placeholder="Название *"
                value={editingProduct.name}
                onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                required
                style={{ padding: 10 }}
              />
              <input
                placeholder="Категория"
                value={editingProduct.category}
                onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                style={{ padding: 10 }}
              />
              <input
                type="number"
                placeholder="Цена *"
                value={editingProduct.price}
                onChange={e => setEditingProduct({...editingProduct, price: e.target.value as any})}
                required
                style={{ padding: 10 }}
              />
              <input
                type="number"
                placeholder="Количество"
                value={editingProduct.stock}
                onChange={e => setEditingProduct({...editingProduct, stock: e.target.value as any})}
                style={{ padding: 10 }}
              />
              
              <div style={{ gridColumn: '1 / -1', padding: 10, border: '1px dashed #ccc', borderRadius: 4 }}>
                <label>Изображение:</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleEditFileChange} 
                  style={{ display: 'block', marginTop: 5 }} 
                />
                {editingProduct.image && (
                  <img 
                    src={editingProduct.image} 
                    alt="Preview" 
                    style={{ maxHeight: 100, marginTop: 10, borderRadius: 4 }} 
                  />
                )}
              </div>
              
              <textarea
                placeholder="Описание"
                value={editingProduct.description}
                onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                rows={3}
                style={{ padding: 10, gridColumn: '1 / -1' }}
              />
              
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, marginTop: 10 }}>
                <button 
                  type="submit" 
                  style={{ flex: 1, padding: 12, background: '#27ae60', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                >
                  💾 Сохранить
                </button>
                <button 
                  type="button"
                  onClick={() => { setIsEditing(false); setEditingProduct(null); }}
                  style={{ flex: 1, padding: 12, background: '#95a5a6', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
