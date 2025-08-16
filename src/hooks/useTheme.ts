import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { themeService } from '../services/ThemeService';

export const useTheme = () => {
  const { getSelectedTheme, loadAvailableThemes } = useSettingsStore();

  useEffect(() => {
    const initializeTheme = async () => {
      try {
        // Load available themes
        await loadAvailableThemes();

        // Get current theme selection
        const selectedThemeName = getSelectedTheme();

        // Apply the selected theme
        const theme = await themeService.getTheme(selectedThemeName);
        if (theme) {
          const isDarkMode = document.documentElement.classList.contains('dark');
          themeService.applyTheme(theme, isDarkMode);
        }
      } catch (error) {
        console.error('Failed to initialize theme:', error);
      }
    };

    initializeTheme();
  }, [getSelectedTheme, loadAvailableThemes]);

  const applyTheme = async (themeName: string, isDark: boolean = false) => {
    try {
      const theme = await themeService.getTheme(themeName);
      if (theme) {
        themeService.applyTheme(theme, isDark);
      }
    } catch (error) {
      console.error('Failed to apply theme:', error);
    }
  };

  return { applyTheme };
};
