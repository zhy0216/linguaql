import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SettingsConfig, OpenAIConfig } from '../types/config';

interface SettingsState {
  settings: SettingsConfig;

  // Actions
  updateOpenAIConfig: (config: Partial<OpenAIConfig>) => void;
  resetOpenAIConfig: () => void;
  getOpenAIConfig: () => OpenAIConfig;
}

const defaultOpenAIConfig: OpenAIConfig = {
  apiKey: '',
  baseUrl: 'https://openrouter.ai/api/v1',
  model: 'gpt-3.5-turbo',
};

const defaultSettings: SettingsConfig = {
  openai: defaultOpenAIConfig,
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
    }),
    {
      name: 'settings-storage',
      partialize: state => ({
        settings: state.settings,
      }),
    }
  )
);
