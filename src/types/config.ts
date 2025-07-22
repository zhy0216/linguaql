export interface OpenAIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface LanguageConfig {
  language: string;
}

export interface SettingsConfig {
  openai: OpenAIConfig;
  language: LanguageConfig;
}
