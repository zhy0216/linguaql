import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SettingsConfig, OpenAIConfig, LanguageConfig } from '../types/config';
import i18n from '../i18n';

interface SettingsState {
  settings: SettingsConfig;

  // Actions
  updateOpenAIConfig: (config: Partial<OpenAIConfig>) => void;
  resetOpenAIConfig: () => void;
  getOpenAIConfig: () => OpenAIConfig;
  updateLanguage: (language: string) => void;
  getLanguage: () => string;
}

const defaultOpenAIConfig: OpenAIConfig = {
  apiKey: '',
  baseUrl: 'https://openrouter.ai/api/v1',
  model: 'gpt-3.5-turbo',
};

const defaultLanguageConfig: LanguageConfig = {
  language: 'en',
};

const defaultSettings: SettingsConfig = {
  openai: defaultOpenAIConfig,
  language: defaultLanguageConfig,
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
    }),
    {
      name: 'settings-storage',
      partialize: state => ({
        settings: state.settings,
      }),
    }
  )
);
