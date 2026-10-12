
import { BrowserRouter } from 'react-router-dom';
import { CartProvider } from './context/CartContext.jsx';
import ThemeProvider from './context/ThemeContext.jsx';
import AppRoutes from './routes/AppRoutes.jsx';
import StoreFooter from './components/layout/StoreFooter.jsx';
import StoreHeader from './components/layout/StoreHeader.jsx';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  TOKEN_KEY,
  USER_KEY,
  isTokenExpired,
  getTokenTimeRemaining,
  logout,
} from './utils/auth.js';

function useSessionWatcher() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let timerId = null;

    const checkSession = () => {
      const token = window.localStorage.getItem(TOKEN_KEY);
      if (!token) return;

      if (isTokenExpired(token)) {
        logout({ expired: true, redirect: true, navigate });
        return;
      }

      const timeRemaining = getTokenTimeRemaining(token);
      if (timeRemaining <= 0) {
        logout({ expired: true, redirect: true, navigate });
      } else {
        if (timerId) clearTimeout(timerId);
        timerId = setTimeout(() => {
          logout({ expired: true, redirect: true, navigate });
        }, timeRemaining);
      }
    };

    checkSession();

    const handleFocus = () => checkSession();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkSession();
    };
    const handleStorage = (e) => {
      if (e.key === TOKEN_KEY || e.key === USER_KEY) checkSession();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('novatech-auth-change', checkSession);

    const intervalId = setInterval(checkSession, 10000);

    return () => {
      if (timerId) clearTimeout(timerId);
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('novatech-auth-change', checkSession);
    };
  }, [navigate, location.pathname]);
}

function AppContent() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');

  useSessionWatcher();

  return (
    <CartProvider>
      <ThemeProvider>
        {!isAdmin && <StoreHeader />}
        <AppRoutes />
        {!isAdmin && <StoreFooter />}
      </ThemeProvider>
    </CartProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App
