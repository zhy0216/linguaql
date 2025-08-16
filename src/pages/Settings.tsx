import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../stores/settingsStore';
import { OpenAIConfig, ThemeConfig } from '../types/config';
import { themeService } from '../services/ThemeService';

interface SettingsProps {
  onBack: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const {
    settings,
    updateOpenAIConfig,
    resetOpenAIConfig,
    updateLanguage,
    getLanguage,
    getSQLValidationConfig,
    updateStatementTypeRequiresSafetyCheck,
    resetSQLValidationConfig,
    getThemeSettings,
    setSelectedTheme,
    loadAvailableThemes,
  } = useSettingsStore();
  const [showApiKey, setShowApiKey] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(getLanguage());
  const [sqlConfig, setSqlConfig] = useState(getSQLValidationConfig());
  const [themeSettings, setThemeSettings] = useState(getThemeSettings());
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load available themes on component mount
  useEffect(() => {
    const initializeThemes = async () => {
      await loadAvailableThemes();
      setThemeSettings(getThemeSettings());
    };
    initializeThemes();
  }, [loadAvailableThemes, getThemeSettings]);

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsThemeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (language: string) => {
    setCurrentLanguage(language);
    updateLanguage(language);
  };

  const handleStatementTypeToggle = (type: string, requiresSafetyCheck: boolean) => {
    updateStatementTypeRequiresSafetyCheck(type, requiresSafetyCheck);
    setSqlConfig(getSQLValidationConfig());
  };

  const handleInputChange = (field: keyof OpenAIConfig, value: string) => {
    const newConfig = {
      ...settings.openai,
      [field]: value,
    };
    updateOpenAIConfig(newConfig);
  };

  const handleThemeChange = async (themeName: string) => {
    setSelectedTheme(themeName);
    setThemeSettings(getThemeSettings());

    // Apply the theme immediately
    try {
      const theme = await themeService.getTheme(themeName);
      if (theme) {
        themeService.applyTheme(theme, isDarkMode);
      }
    } catch (error) {
      console.error('Failed to apply theme:', error);
    }
  };

  const toggleDarkMode = async () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);

    // Toggle dark class on document
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Reapply current theme with new mode
    try {
      const currentTheme = await themeService.getTheme(themeSettings.selectedTheme);
      if (currentTheme) {
        themeService.applyTheme(currentTheme, newDarkMode);
      }
    } catch (error) {
      console.error('Failed to apply theme:', error);
    }
  };

  const getThemePreview = (theme: ThemeConfig) => {
    return themeService.getThemePreview(theme);
  };

  const commonModels = [
    'qwen/qwen-turbo',
    'openai/gpt-4.1',
    'anthropic/claude-3.7-sonnet',
    'deepseek/deepseek-r1-0528',
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('settings.settings')}</h1>
            <p className="text-muted-foreground mt-1">{t('settings.configurePreferences')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              ← {t('common.back')}
            </button>
          </div>
        </div>

        {/* Language Configuration Card */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
          <div className="flex items-center mb-4">
            <h2 className="text-xl font-semibold text-card-foreground">{t('settings.language')}</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('settings.selectLanguage')}
              </label>
              <select
                value={currentLanguage}
                onChange={e => handleLanguageChange(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent appearance-none bg-background text-foreground"
              >
                <option value="en">{t('settings.english')}</option>
                <option value="zh">{t('settings.chinese')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Theme Configuration Card */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-card-foreground">{t('settings.theme')}</h2>
            <button
              onClick={toggleDarkMode}
              className={`px-4 py-2 rounded-lg text-sm transition-colors border ${
                isDarkMode
                  ? 'bg-secondary text-secondary-foreground border-border hover:bg-secondary/80'
                  : 'bg-background text-foreground border-border hover:bg-accent'
              }`}
            >
              {isDarkMode ? '🌙 Dark' : '☀️ Light'}
            </button>
          </div>

          <p className="text-sm text-muted-foreground mb-4">{t('settings.themeDescription')}</p>

          {/* Theme Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
              className="w-full px-4 py-3 text-left bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent hover:border-border transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* Current theme preview */}
                  {(() => {
                    const currentTheme = themeSettings.availableThemes.find(
                      t => t.name === themeSettings.selectedTheme
                    );
                    if (currentTheme) {
                      const preview = getThemePreview(currentTheme);
                      return (
                        <>
                          <div className="flex space-x-1">
                            <div
                              className="w-4 h-4 rounded-full border border-border"
                              style={{ backgroundColor: preview.light }}
                            />
                            <div
                              className="w-4 h-4 rounded-full border border-border"
                              style={{ backgroundColor: preview.dark }}
                            />
                            <div
                              className="w-4 h-4 rounded-full border border-border"
                              style={{ backgroundColor: preview.primary }}
                            />
                          </div>
                          <span className="font-medium text-foreground">{currentTheme.title}</span>
                        </>
                      );
                    }
                    return <span className="text-muted-foreground">Select a theme</span>;
                  })()}
                </div>
                <svg
                  className={`w-5 h-5 text-muted-foreground transition-transform ${
                    isThemeDropdownOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </button>

            {/* Dropdown Menu */}
            {isThemeDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-96 overflow-y-auto">
                {themeSettings.availableThemes.map(theme => {
                  const preview = getThemePreview(theme);
                  const isSelected = theme.name === themeSettings.selectedTheme;

                  return (
                    <div
                      key={theme.name}
                      className={`p-4 cursor-pointer transition-colors hover:bg-accent border-b border-border last:border-b-0 ${
                        isSelected ? 'bg-accent' : ''
                      }`}
                      onClick={() => {
                        handleThemeChange(theme.name);
                        setIsThemeDropdownOpen(false);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {/* Theme Preview */}
                          <div className="flex space-x-1">
                            <div
                              className="w-4 h-4 rounded-full border border-border"
                              style={{ backgroundColor: preview.light }}
                            />
                            <div
                              className="w-4 h-4 rounded-full border border-border"
                              style={{ backgroundColor: preview.dark }}
                            />
                            <div
                              className="w-4 h-4 rounded-full border border-border"
                              style={{ backgroundColor: preview.primary }}
                            />
                          </div>

                          {/* Theme Info */}
                          <div>
                            <h3 className="font-medium text-popover-foreground">{theme.title}</h3>
                            <p className="text-sm text-muted-foreground">{theme.description}</p>
                          </div>
                        </div>

                        {/* Selected Indicator */}
                        {isSelected && (
                          <svg
                            className="w-5 h-5 text-primary"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {themeSettings.availableThemes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z"
                />
              </svg>
              <p>{t('settings.loadingThemes')}</p>
            </div>
          )}
        </div>

        {/* OpenAI Configuration Card */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-card-foreground">
              {t('settings.openaiConfig')}
            </h2>
            <button
              onClick={resetOpenAIConfig}
              className="px-4 py-2 text-sm text-destructive hover:text-destructive/80 hover:bg-destructive/10 rounded-lg transition-colors border border-destructive/20"
            >
              {t('settings.resetSettings')}
            </button>
          </div>

          <div className="space-y-4">
            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('settings.apiKey')}
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.openai.apiKey}
                  onChange={e => handleInputChange('apiKey', e.target.value)}
                  placeholder="Enter your OpenAI API key"
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent pr-10 bg-background text-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464m1.414 1.414L8.464 8.464m5.656 5.656l1.414 1.414m-1.414-1.414l1.414 1.414M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Base URL */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('settings.baseUrl')}
              </label>
              <input
                type="url"
                value={settings.openai.baseUrl}
                onChange={e => handleInputChange('baseUrl', e.target.value)}
                placeholder="https://openrouter.ai/api/v1"
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">Default: OpenRouter API endpoint</p>
            </div>

            {/* Model */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('settings.model')}
              </label>
              <div className="relative">
                <select
                  value={settings.openai.model}
                  onChange={e => handleInputChange('model', e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent appearance-none bg-background text-foreground"
                >
                  {commonModels.map(model => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-foreground">
                  <svg
                    className="fill-current h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Or enter a custom model name</p>
            </div>

            {/* Custom Model Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('settings.customModel')}
              </label>
              <input
                type="text"
                value={commonModels.includes(settings.openai.model) ? '' : settings.openai.model}
                onChange={e => handleInputChange('model', e.target.value)}
                placeholder="Enter custom model name"
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
              />
            </div>
          </div>
          {/* Info Card */}
          <div className="bg-accent border border-border rounded-lg p-4 mt-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-accent-foreground">
                  {t('settings.aboutOpenRouter')}
                </h3>
                <div className="mt-2 text-sm text-accent-foreground">
                  <p>{t('settings.openRouterInfo')}</p>
                  <p className="mt-2">
                    <a
                      href="https://openrouter.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium underline hover:text-primary"
                    >
                      {t('settings.getApiKeyLink')}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SQL Statement Types Configuration Card */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-card-foreground">
              {t('settings.sqlStatementTypes')}
            </h2>
            <button
              onClick={() => {
                resetSQLValidationConfig();
                setSqlConfig(getSQLValidationConfig());
              }}
              className="px-4 py-2 rounded-lg text-sm text-destructive hover:text-destructive/80 hover:bg-destructive/10 transition-colors border border-destructive/20"
            >
              {t('settings.resetSettings')}
            </button>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            {t('settings.sqlStatementTypesDescription')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sqlConfig.enabledStatementTypes.map(statementType => (
              <div
                key={statementType.type}
                className="flex items-start space-x-3 p-3 border border-border rounded-lg hover:bg-accent"
              >
                <input
                  type="checkbox"
                  id={`stmt-${statementType.type}`}
                  checked={statementType.requiresSafetyCheck}
                  onChange={e => handleStatementTypeToggle(statementType.type, e.target.checked)}
                  className="mt-1 h-4 w-4 text-primary focus:ring-ring border-input rounded"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={`stmt-${statementType.type}`}
                      className="block text-sm font-medium text-foreground cursor-pointer"
                    >
                      {statementType.type.toUpperCase()}
                    </label>
                    {statementType.requiresSafetyCheck && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                        {t('settings.safetyCheck')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t(`settings.statementTypes.${statementType.type}`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
