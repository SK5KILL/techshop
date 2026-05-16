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
      await fetch(`https://techshop-backend-dkgb.onrender.com/api/cart/${productId}`, {
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
      const res = await fetch('https://techshop-backend-dkgb.onrender.com/api/cart', {
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
      await fetch('https://techshop-backend-dkgb.onrender.com/api/cart', {
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
      await fetch(`https://techshop-backend-dkgb.onrender.com/api/cart/${productId}`, {
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
      await fetch('https://techshop-backend-dkgb.onrender.com/api/cart', {
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
