import React, { useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { OpenAIConfig } from '../types/config';

interface SettingsProps {
  onBack: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const { settings, updateOpenAIConfig, resetOpenAIConfig } = useSettingsStore();
  const [localConfig, setLocalConfig] = useState(settings.openai);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      updateOpenAIConfig(localConfig);
      // Show success message briefly
      setTimeout(() => {
        setIsSaving(false);
      }, 500);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    resetOpenAIConfig();
    setLocalConfig({
      apiKey: '',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'qwen/qwen-turbo',
    });
  };

  const handleInputChange = (field: keyof OpenAIConfig, value: string) => {
    setLocalConfig((prev: OpenAIConfig) => ({
      ...prev,
      [field]: value,
    }));
  };

  const commonModels = [
    'qwen/qwen-turbo',
    'openai/gpt-4.1',
    'anthropic/claude-3.7-sonnet',
    'deepseek/deepseek-r1-0528',
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">Configure your application preferences</p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* OpenAI Configuration Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">OpenAI Configuration</h2>
          </div>

          <div className="space-y-4">
            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={localConfig.apiKey}
                  onChange={e => handleInputChange('apiKey', e.target.value)}
                  placeholder="Enter your OpenAI API key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Base URL</label>
              <input
                type="url"
                value={localConfig.baseUrl}
                onChange={e => handleInputChange('baseUrl', e.target.value)}
                placeholder="https://openrouter.ai/api/v1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Default: OpenRouter API endpoint</p>
            </div>

            {/* Model */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
              <div className="relative">
                <select
                  value={localConfig.model}
                  onChange={e => handleInputChange('model', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  {commonModels.map(model => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg
                    className="fill-current h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Or enter a custom model name</p>
            </div>

            {/* Custom Model Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Model (Optional)
              </label>
              <input
                type="text"
                value={commonModels.includes(localConfig.model) ? '' : localConfig.model}
                onChange={e => handleInputChange('model', e.target.value)}
                placeholder="Enter custom model name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Reset to Defaults
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                isSaving
                  ? 'bg-green-500 text-white cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isSaving ? '✓ Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">About OpenRouter</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  OpenRouter provides access to multiple AI models through a unified API. You can
                  use models from OpenAI, Anthropic, and other providers with a single API key.
                </p>
                <p className="mt-2">
                  <a
                    href="https://openrouter.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline hover:text-blue-600"
                  >
                    Get your API key at openrouter.ai →
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
