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
  description: string;
  requiresSafetyCheck: boolean; // 是否需要安全检查
}

export interface SQLValidationConfig {
  enabledStatementTypes: SQLStatementType[];
}

export interface SQLSecurityKeyword {
  keyword: string;
  description: string;
  enabled: boolean;
  category: 'DDL' | 'DML' | 'DCL' | 'SYSTEM';
}

export interface SQLSecurityConfig {
  enabled: boolean;
  blockExecution: boolean;
  keywords: SQLSecurityKeyword[];
}

export interface ThemeConfig {
  name: string;
  title: string;
  description: string;
  cssVars: {
    theme?: Record<string, string>;
    light: Record<string, string>;
    dark: Record<string, string>;
  };
}

export interface ThemeSettings {
  selectedTheme: string;
  availableThemes: ThemeConfig[];
}

export interface SettingsConfig {
  openai: OpenAIConfig;
  language: LanguageConfig;
  sqlValidation: SQLValidationConfig;
  sqlSecurity: SQLSecurityConfig;
  theme: ThemeSettings;
}
