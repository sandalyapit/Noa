/**
 * Configuration Service for Smart Spreadsheet Assistant
 * Manages Apps Script URLs, tokens, and service configurations
 */
class ConfigService {
  constructor() {
    this.config = {
      appsScript: {
        url: null,
        token: null,
        timeout: 30000,
        retryAttempts: 3
      },
      hiddenParser: {
        url: null,
        apiKey: null,
        timeout: 15000,
        retryAttempts: 2
      },
      gemini: {
        apiKey: null,
        model: 'gemini-1.5-flash',
        temperature: 0.7
      },
      openRouter: {
        apiKey: null,
        baseUrl: 'https://openrouter.ai/api/v1',
        timeout: 30000,
        retryAttempts: 2
      },
      ui: {
        theme: 'light',
        language: 'en',
        autoSave: true,
        confirmDestructiveActions: true
      },
      security: {
        enableTokenValidation: true,
        enableRateLimiting: true,
        maxRequestsPerMinute: 60
      }
    };

    this.loadFromStorage();
  }

  /**
   * Loads configuration from localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem('ssa_config');
      if (stored) {
        const parsedConfig = JSON.parse(stored);
        this.config = { ...this.config, ...parsedConfig };
      }
    } catch (error) {
      console.warn('Failed to load config from storage:', error);
    }

    // Load from environment variables if available
    this.loadFromEnvironment();
  }

  /**
   * Loads configuration from environment variables
   */
  loadFromEnvironment() {
    // Apps Script configuration
    if (import.meta.env.VITE_APPS_SCRIPT_URL) {
      this.config.appsScript.url = import.meta.env.VITE_APPS_SCRIPT_URL;
    }
    
    if (import.meta.env.VITE_APPS_SCRIPT_TOKEN) {
      this.config.appsScript.token = import.meta.env.VITE_APPS_SCRIPT_TOKEN;
    }

    // Hidden Parser configuration
    if (import.meta.env.VITE_HIDDEN_PARSER_URL) {
      this.config.hiddenParser.url = import.meta.env.VITE_HIDDEN_PARSER_URL;
    }
    
    if (import.meta.env.VITE_HIDDEN_PARSER_API_KEY) {
      this.config.hiddenParser.apiKey = import.meta.env.VITE_HIDDEN_PARSER_API_KEY;
    }

    // Gemini configuration
    if (import.meta.env.VITE_GEMINI_API_KEY) {
      this.config.gemini.apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    }

    // OpenRouter configuration
    if (import.meta.env.VITE_OPENROUTER_API_KEY) {
      this.config.openRouter.apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    }
  }

  /**
   * Saves configuration to localStorage
   */
  saveToStorage() {
    try {
      // Don't save sensitive data to localStorage in production
      const configToSave = {
        ...this.config,
        appsScript: {
          ...this.config.appsScript,
          token: null // Don't persist token
        },
        hiddenParser: {
          ...this.config.hiddenParser,
          apiKey: null // Don't persist API key
        },
        gemini: {
          ...this.config.gemini,
          apiKey: null // Don't persist API key
        },
        openRouter: {
          ...this.config.openRouter,
          apiKey: null // Don't persist API key
        }
      };

      localStorage.setItem('ssa_config', JSON.stringify(configToSave));
    } catch (error) {
      console.warn('Failed to save config to storage:', error);
    }
  }

  /**
   * Gets the complete configuration
   * @returns {Object} Configuration object
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Gets Apps Script configuration
   * @returns {Object} Apps Script config
   */
  getAppsScriptConfig() {
    return { ...this.config.appsScript };
  }

  /**
   * Sets Apps Script URL
   * @param {string} url - Apps Script Web App URL
   */
  setAppsScriptUrl(url) {
    this.config.appsScript.url = url;
    this.saveToStorage();
  }

  /**
   * Sets Apps Script token
   * @param {string} token - API token
   */
  setAppsScriptToken(token) {
    this.config.appsScript.token = token;
    // Don't save token to storage for security
  }

  /**
   * Gets Hidden Parser configuration
   * @returns {Object} Hidden Parser config
   */
  getHiddenParserConfig() {
    return { ...this.config.hiddenParser };
  }

  /**
   * Sets Hidden Parser URL
   * @param {string} url - Hidden Parser service URL
   */
  setHiddenParserUrl(url) {
    this.config.hiddenParser.url = url;
    this.saveToStorage();
  }

  /**
   * Sets Hidden Parser API key
   * @param {string} apiKey - API key
   */
  setHiddenParserApiKey(apiKey) {
    this.config.hiddenParser.apiKey = apiKey;
    // Don't save API key to storage for security
  }

  /**
   * Gets Gemini configuration
   * @returns {Object} Gemini config
   */
  getGeminiConfig() {
    return { ...this.config.gemini };
  }

  /**
   * Sets Gemini API key
   * @param {string} apiKey - Gemini API key
   */
  setGeminiApiKey(apiKey) {
    this.config.gemini.apiKey = apiKey;
    // Don't save API key to storage for security
  }

  /**
   * Gets OpenRouter configuration
   * @returns {Object} OpenRouter config
   */
  getOpenRouterConfig() {
    return { ...this.config.openRouter };
  }

  /**
   * Sets OpenRouter API key
   * @param {string} apiKey - OpenRouter API key
   */
  setOpenRouterApiKey(apiKey) {
    this.config.openRouter.apiKey = apiKey;
    // Don't save API key to storage for security
  }

  /**
   * Gets UI configuration
   * @returns {Object} UI config
   */
  getUIConfig() {
    return { ...this.config.ui };
  }

  /**
   * Updates UI configuration
   * @param {Object} uiConfig - UI configuration updates
   */
  updateUIConfig(uiConfig) {
    this.config.ui = { ...this.config.ui, ...uiConfig };
    this.saveToStorage();
  }

  /**
   * Gets security configuration
   * @returns {Object} Security config
   */
  getSecurityConfig() {
    return { ...this.config.security };
  }

  /**
   * Updates security configuration
   * @param {Object} securityConfig - Security configuration updates
   */
  updateSecurityConfig(securityConfig) {
    this.config.security = { ...this.config.security, ...securityConfig };
    this.saveToStorage();
  }

  /**
   * Validates the current configuration
   * @returns {Object} Validation result
   */
  validateConfig() {
    const errors = [];
    const warnings = [];

    // Check Apps Script configuration
    if (!this.config.appsScript.url) {
      errors.push('Apps Script URL is required');
    } else if (!this.isValidUrl(this.config.appsScript.url)) {
      errors.push('Apps Script URL is not valid');
    }

    if (!this.config.appsScript.token) {
      warnings.push('Apps Script token is not set - authentication may fail');
    }

    // Check Hidden Parser configuration
    if (this.config.hiddenParser.url && !this.isValidUrl(this.config.hiddenParser.url)) {
      errors.push('Hidden Parser URL is not valid');
    }

    // Check Gemini configuration
    if (!this.config.gemini.apiKey) {
      warnings.push('Gemini API key is not set - AI features may not work');
    }

    // Check OpenRouter configuration
    if (!this.config.openRouter.apiKey) {
      warnings.push('OpenRouter API key is not set - fallback models disabled');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates if a string is a valid URL
   * @param {string} url - URL to validate
   * @returns {boolean} Whether the URL is valid
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resets configuration to defaults
   */
  resetToDefaults() {
    const defaultConfig = {
      appsScript: {
        url: null,
        token: null,
        timeout: 30000,
        retryAttempts: 3
      },
      hiddenParser: {
        url: null,
        apiKey: null,
        timeout: 15000,
        retryAttempts: 2
      },
      gemini: {
        apiKey: null,
        model: 'gemini-1.5-flash',
        temperature: 0.7
      },
      openRouter: {
        apiKey: null,
        baseUrl: 'https://openrouter.ai/api/v1',
        timeout: 30000,
        retryAttempts: 2
      },
      ui: {
        theme: 'light',
        language: 'en',
        autoSave: true,
        confirmDestructiveActions: true
      },
      security: {
        enableTokenValidation: true,
        enableRateLimiting: true,
        maxRequestsPerMinute: 60
      }
    };

    this.config = defaultConfig;
    this.saveToStorage();
  }

  /**
   * Exports configuration (without sensitive data)
   * @returns {Object} Exportable configuration
   */
  exportConfig() {
    return {
      appsScript: {
        url: this.config.appsScript.url,
        timeout: this.config.appsScript.timeout,
        retryAttempts: this.config.appsScript.retryAttempts
      },
      hiddenParser: {
        url: this.config.hiddenParser.url,
        timeout: this.config.hiddenParser.timeout,
        retryAttempts: this.config.hiddenParser.retryAttempts
      },
      gemini: {
        model: this.config.gemini.model,
        temperature: this.config.gemini.temperature
      },
      openRouter: {
        baseUrl: this.config.openRouter.baseUrl,
        timeout: this.config.openRouter.timeout,
        retryAttempts: this.config.openRouter.retryAttempts
      },
      ui: { ...this.config.ui },
      security: { ...this.config.security }
    };
  }

  /**
   * Imports configuration
   * @param {Object} importedConfig - Configuration to import
   */
  importConfig(importedConfig) {
    // Merge with current config, preserving sensitive data
    this.config = {
      ...this.config,
      ...importedConfig,
      appsScript: {
        ...this.config.appsScript,
        ...importedConfig.appsScript,
        token: this.config.appsScript.token // Preserve existing token
      },
      hiddenParser: {
        ...this.config.hiddenParser,
        ...importedConfig.hiddenParser,
        apiKey: this.config.hiddenParser.apiKey // Preserve existing API key
      },
      gemini: {
        ...this.config.gemini,
        ...importedConfig.gemini,
        apiKey: this.config.gemini.apiKey // Preserve existing API key
      }
    };

    this.saveToStorage();
  }

  /**
   * Gets configuration for service initialization
   * @returns {Object} Service initialization config
   */
  getServiceInitConfig() {
    return {
      appsScript: {
        url: this.config.appsScript.url,
        token: this.config.appsScript.token,
        hiddenParserUrl: this.config.hiddenParser.url
      },
      hiddenParser: {
        url: this.config.hiddenParser.url,
        apiKey: this.config.hiddenParser.apiKey
      },
      gemini: {
        apiKey: this.config.gemini.apiKey,
        model: this.config.gemini.model,
        temperature: this.config.gemini.temperature
      }
    };
  }

  /**
   * Checks if all required services are configured
   * @returns {Object} Service availability status
   */
  getServiceAvailability() {
    return {
      appsScript: !!(this.config.appsScript.url && this.config.appsScript.token),
      hiddenParser: !!this.config.hiddenParser.url,
      gemini: !!this.config.gemini.apiKey
    };
  }
}

// Create singleton instance
const configService = new ConfigService();

export default configService;