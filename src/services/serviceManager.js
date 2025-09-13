/**
 * Service Manager for Smart Spreadsheet Assistant
 * Orchestrates all services and handles integration between Apps Script, Hidden Parser, and Gemini
 */
import AppsScriptService from './appsScriptService.js';
import { createHiddenParserService } from './hiddenParserService.js';
import geminiService from './geminiService.js';
import configService from './configService.js';

class ServiceManager {
  constructor() {
    this.services = {
      appsScript: null,
      hiddenParser: null,
      gemini: geminiService,
      config: configService
    };

    this.initialized = false;
    this.initializationPromise = null;
  }

  /**
   * Initializes all services based on configuration
   * @returns {Promise<Object>} Initialization result
   */
  async initialize() {
    if (this.initialized) {
      return { success: true, message: 'Services already initialized' };
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._performInitialization();
    return this.initializationPromise;
  }

  /**
   * Performs the actual initialization
   * @private
   */
  async _performInitialization() {
    try {
      const config = this.services.config.getServiceInitConfig();
      const errors = [];
      const warnings = [];

      // Initialize Apps Script service
      if (config.appsScript.url) {
        this.services.appsScript = new AppsScriptService(
          config.appsScript.url,
          config.appsScript.token,
          config.appsScript.hiddenParserUrl
        );
        
        // Test Apps Script connection
        try {
          await this.services.appsScript.getHealthStatus();
        } catch (error) {
          warnings.push(`Apps Script service may not be available: ${error.message}`);
        }
      } else {
        errors.push('Apps Script URL not configured');
      }

      // Initialize Hidden Parser service
      if (config.hiddenParser.url) {
        this.services.hiddenParser = createHiddenParserService(
          config.hiddenParser.url,
          config.hiddenParser.apiKey
        );
        
        // Test Hidden Parser connection
        try {
          const health = await this.services.hiddenParser.getHealthStatus();
          if (!health.healthy) {
            warnings.push('Hidden Parser service is not healthy');
          }
        } catch (error) {
          warnings.push(`Hidden Parser service may not be available: ${error.message}`);
        }
      } else {
        warnings.push('Hidden Parser URL not configured - normalization features disabled');
      }

      // Gemini service is already initialized as singleton
      if (!config.gemini.apiKey) {
        warnings.push('Gemini API key not configured - AI features may not work');
      }

      this.initialized = true;

      return {
        success: errors.length === 0,
        errors,
        warnings,
        services: {
          appsScript: !!this.services.appsScript,
          hiddenParser: !!this.services.hiddenParser,
          gemini: !!this.services.gemini,
          config: !!this.services.config
        }
      };
    } catch (error) {
      console.error('Service initialization failed:', error);
      return {
        success: false,
        errors: [`Initialization failed: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Gets a specific service instance
   * @param {string} serviceName - Name of the service
   * @returns {Object|null} Service instance
   */
  getService(serviceName) {
    if (!this.initialized) {
      console.warn('Services not initialized. Call initialize() first.');
      return null;
    }

    return this.services[serviceName] || null;
  }

  /**
   * Gets the Apps Script service
   * @returns {AppsScriptService|null} Apps Script service instance
   */
  getAppsScriptService() {
    return this.getService('appsScript');
  }

  /**
   * Gets the Hidden Parser service
   * @returns {HiddenParserService|null} Hidden Parser service instance
   */
  getHiddenParserService() {
    return this.getService('hiddenParser');
  }

  /**
   * Gets the Gemini service
   * @returns {GeminiService} Gemini service instance
   */
  getGeminiService() {
    return this.getService('gemini');
  }

  /**
   * Gets the Config service
   * @returns {ConfigService} Config service instance
   */
  getConfigService() {
    return this.getService('config');
  }

  /**
   * Processes a user instruction with AI assistance and normalization
   * @param {string} instruction - User's natural language instruction
   * @param {Object} context - Current context (spreadsheet, tab, etc.)
   * @returns {Promise<Object>} Processed instruction result
   */
  async processUserInstruction(instruction, context = {}) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const gemini = this.getGeminiService();
      const hiddenParser = this.getHiddenParserService();
      const appsScript = this.getAppsScriptService();

      if (!gemini) {
        throw new Error('Gemini service not available');
      }

      // Step 1: Parse instruction with Gemini
      const aiResult = await gemini.parseUserInstruction(instruction, context);

      if (aiResult.type === 'text') {
        return {
          type: 'text',
          content: aiResult.content,
          requiresAction: false
        };
      }

      if (aiResult.type === 'action') {
        const action = aiResult.arguments;

        // Step 2: Normalize with Hidden Parser if available
        let normalizedAction = action;
        if (hiddenParser) {
          try {
            const normalizationResult = await hiddenParser.normalize(action, { context });
            if (normalizationResult.success) {
              normalizedAction = normalizationResult.data;
            }
          } catch (error) {
            console.warn('Normalization failed, using original action:', error);
          }
        }

        // Step 3: Execute with Apps Script if available
        let executionResult = null;
        if (appsScript && normalizedAction.action) {
          try {
            // Add context information to the action
            const contextualAction = {
              ...normalizedAction,
              spreadsheetId: normalizedAction.spreadsheetId || context.spreadsheetId,
              tabName: normalizedAction.tabName || context.tabName
            };

            executionResult = await this.executeAction(contextualAction);
          } catch (error) {
            console.error('Action execution failed:', error);
            executionResult = {
              success: false,
              error: error.message
            };
          }
        }

        return {
          type: 'action',
          originalInstruction: instruction,
          parsedAction: action,
          normalizedAction,
          executionResult,
          requiresAction: !executionResult
        };
      }

      return {
        type: 'unknown',
        content: 'Could not process the instruction',
        requiresAction: false
      };
    } catch (error) {
      console.error('Error processing user instruction:', error);
      return {
        type: 'error',
        content: `Error processing instruction: ${error.message}`,
        requiresAction: false
      };
    }
  }

  /**
   * Executes an action using the appropriate service
   * @param {Object} action - Action to execute
   * @returns {Promise<Object>} Execution result
   */
  async executeAction(action) {
    const appsScript = this.getAppsScriptService();
    
    if (!appsScript) {
      throw new Error('Apps Script service not available');
    }

    switch (action.action) {
      case 'listTabs':
        return appsScript.listTabs(action.spreadsheetId, action.options);
      
      case 'fetchTabData':
        return appsScript.fetchTabData(action.spreadsheetId, action.tabName, action.options);
      
      case 'updateCell':
        return appsScript.updateCell(
          action.spreadsheetId,
          action.tabName,
          action.range,
          action.data?.value,
          action.options
        );
      
      case 'addRow':
        return appsScript.addRow(action.spreadsheetId, action.tabName, action.data, action.options);
      
      case 'readRange':
        return appsScript.readRange(action.spreadsheetId, action.tabName, action.range, action.options);
      
      case 'discoverAll':
        return appsScript.discoverAll(action.options);
      
      case 'batch':
        return appsScript.batchOperation(action.data, action.options);
      
      default:
        throw new Error(`Unknown action: ${action.action}`);
    }
  }

  /**
   * Analyzes spreadsheet data with AI assistance
   * @param {Object} sheetData - Spreadsheet data
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeSpreadsheetData(sheetData) {
    try {
      const gemini = this.getGeminiService();
      
      if (!gemini) {
        throw new Error('Gemini service not available');
      }

      const analysis = await gemini.analyzeSpreadsheetSchema(sheetData);
      
      return {
        success: true,
        analysis,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error analyzing spreadsheet data:', error);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Gets the health status of all services
   * @returns {Promise<Object>} Health status of all services
   */
  async getServicesHealth() {
    const health = {
      timestamp: Date.now(),
      services: {}
    };

    // Apps Script health
    try {
      const appsScript = this.getAppsScriptService();
      if (appsScript) {
        const appsScriptHealth = await appsScript.getHealthStatus();
        health.services.appsScript = {
          available: true,
          healthy: appsScriptHealth.success || false,
          details: appsScriptHealth
        };
      } else {
        health.services.appsScript = {
          available: false,
          healthy: false,
          details: { error: 'Service not initialized' }
        };
      }
    } catch (error) {
      health.services.appsScript = {
        available: false,
        healthy: false,
        details: { error: error.message }
      };
    }

    // Hidden Parser health
    try {
      const hiddenParser = this.getHiddenParserService();
      if (hiddenParser) {
        const parserHealth = await hiddenParser.getHealthStatus();
        health.services.hiddenParser = {
          available: true,
          healthy: parserHealth.healthy || false,
          details: parserHealth
        };
      } else {
        health.services.hiddenParser = {
          available: false,
          healthy: false,
          details: { error: 'Service not configured' }
        };
      }
    } catch (error) {
      health.services.hiddenParser = {
        available: false,
        healthy: false,
        details: { error: error.message }
      };
    }

    // Gemini health (basic check)
    const gemini = this.getGeminiService();
    health.services.gemini = {
      available: !!gemini,
      healthy: !!gemini,
      details: gemini ? { status: 'available' } : { error: 'Service not available' }
    };

    // Config health
    const config = this.getConfigService();
    const configValidation = config.validateConfig();
    health.services.config = {
      available: !!config,
      healthy: configValidation.valid,
      details: configValidation
    };

    return health;
  }

  /**
   * Reconfigures services with new settings
   * @param {Object} newConfig - New configuration
   * @returns {Promise<Object>} Reconfiguration result
   */
  async reconfigure(newConfig) {
    try {
      // Update configuration
      const config = this.getConfigService();
      config.importConfig(newConfig);

      // Reset initialization state
      this.initialized = false;
      this.initializationPromise = null;

      // Reinitialize services
      const result = await this.initialize();

      return {
        success: result.success,
        message: 'Services reconfigured successfully',
        details: result
      };
    } catch (error) {
      console.error('Error reconfiguring services:', error);
      return {
        success: false,
        message: `Reconfiguration failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Shuts down all services gracefully
   */
  shutdown() {
    this.services.appsScript = null;
    this.services.hiddenParser = null;
    // Keep gemini and config as they are singletons
    
    this.initialized = false;
    this.initializationPromise = null;
  }
}

// Create singleton instance
const serviceManager = new ServiceManager();

export default serviceManager;