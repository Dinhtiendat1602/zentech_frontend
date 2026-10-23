import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import ToastContainer from '../components/common/ToastContainer.jsx';

export const ToastContext = createContext({
  showToast: () => {},
  removeToast: () => {},
});

/**
 * Global function to dispatch a toast from anywhere (inside or outside React)
 * @param {Object} toastData
 * @param {'cart'|'wishlist-add'|'wishlist-remove'|'success'|'info'|'error'} [toastData.type='info']
 * @param {string} [toastData.title]
 * @param {string} [toastData.message]
 * @param {Object} [toastData.product]
 * @param {number} [toastData.quantity]
 * @param {number} [toastData.duration=3200]
 */
export function showToast(toastData) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('zen-toast', { detail: toastData }));
  }
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    // Start leaving animation
    setToasts((current) =>
      current.map((t) => (t.id === id ? { ...t, leaving: true } : t))
    );

    // After animation finishes, remove from state
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
      if (timersRef.current.has(id)) {
        clearTimeout(timersRef.current.get(id));
        timersRef.current.delete(id);
      }
    }, 240);
  }, []);

  const addToast = useCallback(
    (toastData) => {
      const id = toastData.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = toastData.duration ?? 3200;

      const newToast = {
        ...toastData,
        id,
        duration,
        createdAt: Date.now(),
        leaving: false,
      };

      setToasts((current) => {
        // Keep up to 3 most recent toasts
        const filtered = current.filter((t) => t.id !== id);
        return [...filtered.slice(-2), newToast];
      });

      if (duration > 0) {
        if (timersRef.current.has(id)) {
          clearTimeout(timersRef.current.get(id));
        }
        const timerId = setTimeout(() => {
          removeToast(id);
        }, duration);
        timersRef.current.set(id, timerId);
      }

      return id;
    },
    [removeToast]
  );

  // Listen to window custom event for decoupled triggers
  useEffect(() => {
    const handleEvent = (event) => {
      if (event.detail) {
        addToast(event.detail);
      }
    };
    window.addEventListener('zen-toast', handleEvent);
    return () => {
      window.removeEventListener('zen-toast', handleEvent);
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ showToast: addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

export default ToastProvider;
