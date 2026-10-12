import { useEffect, useState } from 'react';
import { CartContext } from './cartContextValue.js';

const STORAGE_KEY = 'zen-cart';

function readCart() {
  try {
    const savedCart = window.localStorage.getItem(STORAGE_KEY);
    const items = savedCart ? JSON.parse(savedCart) : [];
    return Array.isArray(items) ? items.filter((item) => item && item.id) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readCart);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (product, quantity = 1) => {
    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id);
      if (existingItem) {
        return currentItems.map((item) => item.id === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item);
      }
      return [...currentItems, { ...product, quantity }];
    });
  };

  const setQuantity = (productId, quantity) => {
    setItems((currentItems) => currentItems
      .map((item) => item.id === productId ? { ...item, quantity } : item)
      .filter((item) => item.quantity > 0));
  };

  const removeItem = (productId) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== productId));
  };

  const clearCart = () => setItems([]);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, itemCount, subtotal, addItem, setQuantity, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}
