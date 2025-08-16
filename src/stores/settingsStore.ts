import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  SettingsConfig,
  OpenAIConfig,
  LanguageConfig,
  SQLValidationConfig,
  SQLSecurityConfig,
  ThemeSettings,
} from '../types/config';
import { themeService } from '../services/ThemeService';
import i18n from '../i18n';

interface SettingsState {
  settings: SettingsConfig;

  // Actions
  updateOpenAIConfig: (config: Partial<OpenAIConfig>) => void;
  resetOpenAIConfig: () => void;
  getOpenAIConfig: () => OpenAIConfig;
  updateLanguage: (language: string) => void;
  getLanguage: () => string;
  updateSQLValidationConfig: (config: Partial<SQLValidationConfig>) => void;
  resetSQLValidationConfig: () => void;
  getSQLValidationConfig: () => SQLValidationConfig;
  updateStatementTypeRequiresSafetyCheck: (type: string, requiresSafetyCheck: boolean) => void;
  getEnabledStatementTypes: () => string[];
  getStatementTypesWithoutSafetyCheck: () => string[];
  updateSQLSecurityConfig: (config: Partial<SQLSecurityConfig>) => void;
  resetSQLSecurityConfig: () => void;
  getSQLSecurityConfig: () => SQLSecurityConfig;
  updateThemeSettings: (settings: Partial<ThemeSettings>) => void;
  getThemeSettings: () => ThemeSettings;
  setSelectedTheme: (themeName: string) => void;
  getSelectedTheme: () => string;
  loadAvailableThemes: () => Promise<void>;
}

const defaultOpenAIConfig: OpenAIConfig = {
  apiKey: '',
  baseUrl: 'https://openrouter.ai/api/v1',
  model: 'qwen/qwen-turbo',
};

const defaultLanguageConfig: LanguageConfig = {
  language: 'en',
};

// 创建默认SQL验证配置的函数，支持国际化
const createDefaultSQLValidationConfig = (): SQLValidationConfig => ({
  enabledStatementTypes: [
    // 读操作 - 不需要安全检查
    {
      type: 'select',
      description: 'SELECT statements for querying data',
      requiresSafetyCheck: false,
    },
    {
      type: 'with',
      description: 'WITH clauses for common table expressions',
      requiresSafetyCheck: false,
    },
    {
      type: 'union',
      description: 'UNION operations for combining results',
      requiresSafetyCheck: false,
    },
    {
      type: 'intersect',
      description: 'INTERSECT operations for common results',
      requiresSafetyCheck: false,
    },
    {
      type: 'except',
      description: 'EXCEPT operations for difference results',
      requiresSafetyCheck: false,
    },

    // 写操作 - 需要安全检查
    {
      type: 'insert',
      description: 'INSERT statements for adding data',
      requiresSafetyCheck: true,
    },
    {
      type: 'update',
      description: 'UPDATE statements for modifying data',
      requiresSafetyCheck: true,
    },
    {
      type: 'delete',
      description: 'DELETE statements for removing data',
      requiresSafetyCheck: true,
    },

    // DDL操作 - 需要安全检查
    {
      type: 'create',
      description: 'CREATE statements for creating objects',
      requiresSafetyCheck: true,
    },
    {
      type: 'alter',
      description: 'ALTER statements for modifying objects',
      requiresSafetyCheck: true,
    },
    {
      type: 'drop',
      description: 'DROP statements for removing objects',
      requiresSafetyCheck: true,
    },
    {
      type: 'truncate',
      description: 'TRUNCATE statements for clearing tables',
      requiresSafetyCheck: true,
    },
  ],
});

const defaultSQLValidationConfig = createDefaultSQLValidationConfig();

const defaultSQLSecurityConfig: SQLSecurityConfig = {
  enabled: true,
  blockExecution: true,
  keywords: [
    // DDL Keywords
    { keyword: 'DROP', description: 'Drop database objects', enabled: true, category: 'DDL' },
    { keyword: 'ALTER', description: 'Alter database objects', enabled: true, category: 'DDL' },
    { keyword: 'CREATE', description: 'Create database objects', enabled: false, category: 'DDL' },
    { keyword: 'TRUNCATE', description: 'Truncate table data', enabled: true, category: 'DDL' },

    // DML Keywords
    { keyword: 'DELETE', description: 'Delete data from tables', enabled: true, category: 'DML' },
    { keyword: 'UPDATE', description: 'Update table data', enabled: false, category: 'DML' },
    { keyword: 'INSERT', description: 'Insert data into tables', enabled: false, category: 'DML' },

    // DCL Keywords
    { keyword: 'GRANT', description: 'Grant permissions', enabled: true, category: 'DCL' },
    { keyword: 'REVOKE', description: 'Revoke permissions', enabled: true, category: 'DCL' },

    // System Keywords
    { keyword: 'SHUTDOWN', description: 'Shutdown database', enabled: true, category: 'SYSTEM' },
    { keyword: 'EXEC', description: 'Execute system commands', enabled: true, category: 'SYSTEM' },
    {
      keyword: 'xp_cmdshell',
      description: 'Execute shell commands',
      enabled: true,
      category: 'SYSTEM',
    },
    {
      keyword: 'sp_configure',
      description: 'Configure server settings',
      enabled: true,
      category: 'SYSTEM',
    },
  ],
};

const defaultThemeSettings: ThemeSettings = {
  selectedTheme: 'default',
  availableThemes: [],
};

const defaultSettings: SettingsConfig = {
  openai: defaultOpenAIConfig,
  language: defaultLanguageConfig,
  sqlValidation: defaultSQLValidationConfig,
  sqlSecurity: defaultSQLSecurityConfig,
  theme: defaultThemeSettings,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,

      updateOpenAIConfig: config =>
        set(state => ({
          settings: {
            ...state.settings,
            openai: {
              ...state.settings.openai,
              ...config,
            },
          },
        })),

      resetOpenAIConfig: () =>
        set(state => ({
          settings: {
            ...state.settings,
            openai: defaultOpenAIConfig,
          },
        })),

      getOpenAIConfig: () => get().settings.openai,

      updateLanguage: (language: string) => {
        set(state => ({
          settings: {
            ...state.settings,
            language: { language },
          },
        }));
        i18n.changeLanguage(language);
      },

      getLanguage: () => {
        const state = get();
        // Handle legacy users who don't have language property
        if (!state.settings.language) {
          // Migrate by adding default language config
          set(currentState => ({
            settings: {
              ...currentState.settings,
              language: defaultLanguageConfig,
            },
          }));
          return defaultLanguageConfig.language;
        }
        return state.settings.language.language;
      },

      updateSQLValidationConfig: (config: Partial<SQLValidationConfig>) =>
        set(state => ({
          settings: {
            ...state.settings,
            sqlValidation: {
              ...state.settings.sqlValidation,
              ...config,
            },
          },
        })),

      resetSQLValidationConfig: () =>
        set(state => ({
          settings: {
            ...state.settings,
            sqlValidation: defaultSQLValidationConfig,
          },
        })),

      getSQLValidationConfig: () => {
        const state = get();
        // Handle legacy users who don't have sqlValidation property
        if (!state.settings.sqlValidation) {
          // Migrate by adding default SQL validation config
          set(currentState => ({
            settings: {
              ...currentState.settings,
              sqlValidation: defaultSQLValidationConfig,
            },
          }));
          return defaultSQLValidationConfig;
        }
        return state.settings.sqlValidation;
      },

      updateStatementTypeRequiresSafetyCheck: (type: string, requiresSafetyCheck: boolean) => {
        const state = get();
        const currentConfig = state.settings.sqlValidation || defaultSQLValidationConfig;
        const updatedStatementTypes = currentConfig.enabledStatementTypes.map(stmt =>
          stmt.type === type ? { ...stmt, requiresSafetyCheck } : stmt
        );

        set(currentState => ({
          settings: {
            ...currentState.settings,
            sqlValidation: {
              ...currentConfig,
              enabledStatementTypes: updatedStatementTypes,
            },
          },
        }));
      },

      getEnabledStatementTypes: () => {
        const state = get();
        const config = state.settings.sqlValidation || defaultSQLValidationConfig;
        return config.enabledStatementTypes.map(stmt => stmt.type);
      },

      getStatementTypesWithoutSafetyCheck: () => {
        const state = get();
        const config = state.settings.sqlValidation || defaultSQLValidationConfig;
        return config.enabledStatementTypes
          .filter(stmt => !stmt.requiresSafetyCheck)
          .map(stmt => stmt.type);
      },

      updateSQLSecurityConfig: (config: Partial<SQLSecurityConfig>) =>
        set(state => ({
          settings: {
            ...state.settings,
            sqlSecurity: {
              ...state.settings.sqlSecurity,
              ...config,
            },
          },
        })),

      resetSQLSecurityConfig: () =>
        set(state => ({
          settings: {
            ...state.settings,
            sqlSecurity: defaultSQLSecurityConfig,
          },
        })),

      getSQLSecurityConfig: () => {
        const state = get();
        if (!state.settings.sqlSecurity) {
          set(currentState => ({
            settings: {
              ...currentState.settings,
              sqlSecurity: defaultSQLSecurityConfig,
            },
          }));
          return defaultSQLSecurityConfig;
        }
        return state.settings.sqlSecurity;
      },

      updateThemeSettings: (settings: Partial<ThemeSettings>) =>
        set(state => ({
          settings: {
            ...state.settings,
            theme: {
              ...state.settings.theme,
              ...settings,
            },
          },
        })),

      getThemeSettings: () => {
        const state = get();
        if (!state.settings.theme) {
          set(currentState => ({
            settings: {
              ...currentState.settings,
              theme: defaultThemeSettings,
            },
          }));
          return defaultThemeSettings;
        }
        return state.settings.theme;
      },

      setSelectedTheme: (themeName: string) =>
        set(state => ({
          settings: {
            ...state.settings,
            theme: {
              ...state.settings.theme,
              selectedTheme: themeName,
            },
          },
        })),

      getSelectedTheme: () => {
        const state = get();
        return state.settings.theme?.selectedTheme || 'default';
      },

      loadAvailableThemes: async () => {
        try {
          const themes = await themeService.getAvailableThemes();
          set(state => ({
            settings: {
              ...state.settings,
              theme: {
                ...state.settings.theme,
                availableThemes: themes,
              },
            },
          }));
        } catch (error) {
          console.error('Failed to load available themes:', error);
        }
      },
    }),
    {
      name: 'settings-storage',
      partialize: state => ({
        settings: state.settings,
      }),
    }
  )
);
