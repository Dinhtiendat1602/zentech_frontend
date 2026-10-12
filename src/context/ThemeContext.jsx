import { useEffect, useState } from 'react';
import { ThemeContext } from './themeContextValue.js';

function getInitialTheme() {
  try {
    return window.localStorage.getItem('zen-theme') || 'dark';
  } catch {
    return 'dark';
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('zen-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((currentTheme) => currentTheme === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;
