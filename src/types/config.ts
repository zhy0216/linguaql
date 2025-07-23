export interface OpenAIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface LanguageConfig {
  language: string;
}

export interface SQLStatementType {
  type: string;
  enabled: boolean;
  description: string;
  requiresSafetyCheck: boolean; // 是否需要安全检查
}

export interface SQLValidationConfig {
  enabledStatementTypes: SQLStatementType[];
}

export interface SettingsConfig {
  openai: OpenAIConfig;
  language: LanguageConfig;
  sqlValidation: SQLValidationConfig;
}
