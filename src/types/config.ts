export interface OpenAIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface SettingsConfig {
  openai: OpenAIConfig;
}
