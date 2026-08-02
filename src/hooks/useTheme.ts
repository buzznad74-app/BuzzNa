import { useState, useEffect } from 'react';

interface ThemeState {
  theme: 'light' | 'dark' | 'system';
  primaryColor: string;
}

export const useTheme = () => {
  const [themeState, setThemeState] = useState<ThemeState>({
    theme: 'light',
    primaryColor: '#2563EB', // Default brand color
  });

  useEffect(() => {
    // Optional: Add logic here to sync with localStorage or system preferences
    const storedTheme = localStorage.getItem('theme') as ThemeState['theme'];
    const storedColor = localStorage.getItem('primaryColor');
    
    if (storedTheme || storedColor) {
      setThemeState({
        theme: storedTheme || 'light',
        primaryColor: storedColor || '#2563EB',
      });
    }
  }, []);

  return {
    theme: themeState.theme,
    primaryColor: themeState.primaryColor,
    setTheme: (theme: ThemeState['theme']) => setThemeState(prev => ({ ...prev, theme })),
    setPrimaryColor: (color: string) => setThemeState(prev => ({ ...prev, primaryColor: color }))
  };
};
