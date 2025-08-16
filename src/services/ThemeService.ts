import { ThemeConfig } from '../types/config';

export class ThemeService {
  private static instance: ThemeService;
  private registry: any = null;

  private constructor() {}

  public static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  /**
   * Load theme registry from public/registry.json
   */
  async loadRegistry(): Promise<void> {
    if (this.registry) return;

    try {
      const response = await fetch('/registry.json');
      this.registry = await response.json();
    } catch (error) {
      console.error('Failed to load theme registry:', error);
      throw error;
    }
  }

  /**
   * Get all available themes from registry
   */
  async getAvailableThemes(): Promise<ThemeConfig[]> {
    await this.loadRegistry();

    if (!this.registry?.items) {
      return [];
    }

    return this.registry.items.map((item: any) => ({
      name: item.name,
      title: item.title,
      description: item.description,
      cssVars: item.cssVars,
    }));
  }

  /**
   * Get a specific theme by name
   */
  async getTheme(name: string): Promise<ThemeConfig | null> {
    const themes = await this.getAvailableThemes();
    return themes.find(theme => theme.name === name) || null;
  }

  /**
   * Apply theme CSS variables to the document
   */
  applyTheme(theme: ThemeConfig, isDark: boolean = false): void {
    const root = document.documentElement;
    const vars = isDark ? theme.cssVars.dark : theme.cssVars.light;

    // Apply theme variables
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value as string);
    });

    // Apply theme-level variables if they exist
    if (theme.cssVars.theme) {
      Object.entries(theme.cssVars.theme).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value as string);
      });
    }
  }

  /**
   * Remove all theme-related CSS variables
   */
  clearTheme(): void {
    const root = document.documentElement;
    const style = root.style;

    // List of all possible theme variables
    const themeVars = [
      'background',
      'foreground',
      'card',
      'card-foreground',
      'popover',
      'popover-foreground',
      'primary',
      'primary-foreground',
      'secondary',
      'secondary-foreground',
      'muted',
      'muted-foreground',
      'accent',
      'accent-foreground',
      'destructive',
      'destructive-foreground',
      'border',
      'input',
      'ring',
      'chart-1',
      'chart-2',
      'chart-3',
      'chart-4',
      'chart-5',
      'radius',
      'sidebar',
      'sidebar-foreground',
      'sidebar-primary',
      'sidebar-primary-foreground',
      'sidebar-accent',
      'sidebar-accent-foreground',
      'sidebar-border',
      'sidebar-ring',
      'font-sans',
      'font-serif',
      'font-mono',
      'shadow-color',
      'shadow-opacity',
      'shadow-blur',
      'shadow-spread',
      'shadow-offset-x',
      'shadow-offset-y',
      'letter-spacing',
      'spacing',
      'shadow-2xs',
      'shadow-xs',
      'shadow-sm',
      'shadow',
      'shadow-md',
      'shadow-lg',
      'shadow-xl',
      'shadow-2xl',
      'tracking-normal',
      'tracking-tighter',
      'tracking-tight',
      'tracking-wide',
      'tracking-wider',
      'tracking-widest',
    ];

    themeVars.forEach(varName => {
      style.removeProperty(`--${varName}`);
    });
  }

  /**
   * Get theme preview colors for UI display
   */
  getThemePreview(theme: ThemeConfig): { light: string; dark: string; primary: string } {
    return {
      light: theme.cssVars.light.background || '#ffffff',
      dark: theme.cssVars.dark.background || '#000000',
      primary: theme.cssVars.light.primary || theme.cssVars.dark.primary || '#3b82f6',
    };
  }
}

export const themeService = ThemeService.getInstance();
