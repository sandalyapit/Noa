/**
 * Service Manager
 * Orchestrates all guardrail layers and services according to the defined flow:
 * 1. User Action → Agent AI
 * 2. Regex Check → Normalizer → Schema Validator → Hidden Parser
 * 3. Apps Script Execution
 */

import ConfigService from './configService.js';
import RegexCheckService from './regexCheckService.js';
import NormalizerService from './normalizerService.js';
import SchemaValidatorService from './schemaValidatorService.js';
import OpenRouterService from './openRouterService.js';
import HiddenParserService from './hiddenParserService.js';
import GeminiService from './geminiService.js';
import AppsScriptService from './appsScriptService.js';

class ServiceManager {
  constructor() {
    // Initialize core services
    this.configService = new ConfigService();
    
    // Initialize guardrail services
    this.regexCheckService = new RegexCheckService();
    this.normalizerService = new NormalizerService();
    this.schemaValidatorService = new SchemaValidatorService();
    
    // Initialize AI services
    this.geminiService = new GeminiService(this.configService);
    this.openRouterService = new OpenRouterService(this.configService);
    this.hiddenParserService = new HiddenParserService(this.configService, this.openRouterService);
    
    // Initialize Apps Script service
    this.appsScriptService = new AppsScriptService(this.configService);
    
    this.isInitialized = false;
  }

  /**
   * Initializes all services
   * @returns {Promise<Object>} Initialization result
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Service Manager...');
      
      // Validate configuration
      const configValidation = this.configService.validateConfig();
      if (!configValidation.valid) {
        console.warn('⚠️ Configuration issues detected:', configValidation.errors);
      }

      // Test service connections
      const connectionTests = await this.testConnections();
      
      this.isInitialized = true;
      
      console.log('✅ Service Manager initialized successfully');
      
      return {
        success: true,
        configValidation,
        connectionTests,
        services: this.getServiceStatus()
      };

    } catch (error) {
      console.error('❌ Service Manager initialization failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Main processing pipeline - implements the complete flow
   * @param {string} userPrompt - User's natural language request
   * @param {Object} context - Additional context (spreadsheetId, tabName, etc.)
   * @returns {Promise<Object>} Processing result
   */
  async processUserRequest(userPrompt, context = {}) {
    const processingResult = {
      success: false,
      steps: [],
      finalResult: null,
      error: null,
      debug: {
        userPrompt,
        context,
        timestamp: new Date().toISOString()
      }
    };

    try {
      console.log('🔄 Starting user request processing...');
      
      // Step 1: Generate AI response
      const aiStep = await this.generateAIResponse(userPrompt, context);
      processingResult.steps.push(aiStep);
      
      if (!aiStep.success) {
        processingResult.error = 'AI generation failed';
        return processingResult;
      }

      // Step 2: Process through guardrail layers
      const guardrailStep = await this.processGuardrailLayers(aiStep.output, context);
      processingResult.steps.push(guardrailStep);
      
      if (!guardrailStep.success) {
        processingResult.error = 'Guardrail processing failed';
        return processingResult;
      }

      // Step 3: Execute via Apps Script
      const executionStep = await this.executeAppsScriptAction(guardrailStep.validJson);
      processingResult.steps.push(executionStep);
      
      if (!executionStep.success) {
        processingResult.error = 'Apps Script execution failed';
        return processingResult;
      }

      processingResult.success = true;
      processingResult.finalResult = executionStep.result;
      
      console.log('✅ User request processed successfully');
      return processingResult;

    } catch (error) {
      console.error('❌ Request processing failed:', error);
      processingResult.error = error.message;
      return processingResult;
    }
  }

  /**
   * Step 1: Generate AI response using Gemini (with OpenRouter fallback)
   * @param {string} userPrompt - User's request
   * @param {Object} context - Request context
   * @returns {Promise<Object>} AI generation result
   */
  async generateAIResponse(userPrompt, context) {
    const step = {
      name: 'AI Generation',
      success: false,
      output: null,
      error: null,
      attempts: []
    };

    try {
      // Try Gemini first
      console.log('🤖 Generating AI response with Gemini...');
      
      const geminiResult = await this.geminiService.generateSpreadsheetAction(userPrompt, context);
      step.attempts.push({
        service: 'gemini',
        success: geminiResult.success,
        error: geminiResult.error
      });

      if (geminiResult.success) {
        step.success = true;
        step.output = geminiResult.response;
        return step;
      }

      // Fallback to OpenRouter
      console.log('🔄 Falling back to OpenRouter...');
      
      const systemPrompt = this.buildSystemPrompt();
      const openRouterResult = await this.openRouterService.tryMultipleModels(
        `${systemPrompt}\n\nUser request: ${userPrompt}\nContext: ${JSON.stringify(context)}`,
        { temperature: 0.7, maxTokens: 500 }
      );

      step.attempts.push({
        service: 'openrouter',
        success: openRouterResult.success,
        error: openRouterResult.error
      });

      if (openRouterResult.success) {
        step.success = true;
        step.output = openRouterResult.content;
        return step;
      }

      step.error = 'Both Gemini and OpenRouter failed';
      return step;

    } catch (error) {
      step.error = error.message;
      return step;
    }
  }

  /**
   * Step 2: Process through guardrail layers
   * @param {string} aiOutput - Raw AI output
   * @param {Object} context - Request context
   * @returns {Promise<Object>} Guardrail processing result
   */
  async processGuardrailLayers(aiOutput, context) {
    const step = {
      name: 'Guardrail Processing',
      success: false,
      validJson: null,
      error: null,
      layers: []
    };

    try {
      console.log('🛡️ Processing through guardrail layers...');

      // Layer 1: Regex Check
      console.log('1️⃣ Regex Check...');
      const regexResult = this.regexCheckService.validate(aiOutput);
      step.layers.push({
        name: 'Regex Check',
        success: regexResult.valid,
        result: regexResult
      });

      if (regexResult.valid) {
        step.success = true;
        step.validJson = regexResult.extractedJson;
        return step;
      }

      // Layer 2: Normalizer
      console.log('2️⃣ Normalizer...');
      const normalizeResult = this.normalizerService.normalize(aiOutput);
      step.layers.push({
        name: 'Normalizer',
        success: normalizeResult.success,
        result: normalizeResult
      });

      if (normalizeResult.success) {
        // Layer 3: Schema Validator
        console.log('3️⃣ Schema Validator...');
        const schemaResult = this.schemaValidatorService.validate(normalizeResult.json);
        step.layers.push({
          name: 'Schema Validator',
          success: schemaResult.valid,
          result: schemaResult
        });

        if (schemaResult.valid) {
          step.success = true;
          step.validJson = normalizeResult.json;
          return step;
        }
      }

      // Layer 4: Hidden Parser (Final fallback)
      console.log('4️⃣ Hidden Parser...');
      const parserResult = await this.hiddenParserService.parse(aiOutput, context);
      step.layers.push({
        name: 'Hidden Parser',
        success: parserResult.success,
        result: parserResult
      });

      if (parserResult.success) {
        // Final schema validation
        const finalSchemaResult = this.schemaValidatorService.validate(parserResult.json);
        if (finalSchemaResult.valid) {
          step.success = true;
          step.validJson = parserResult.json;
          return step;
        }
      }

      step.error = 'All guardrail layers failed';
      return step;

    } catch (error) {
      step.error = error.message;
      return step;
    }
  }

  /**
   * Step 3: Execute action via Apps Script
   * @param {Object} validJson - Validated JSON action
   * @returns {Promise<Object>} Execution result
   */
  async executeAppsScriptAction(validJson) {
    const step = {
      name: 'Apps Script Execution',
      success: false,
      result: null,
      error: null
    };

    try {
      console.log('📊 Executing Apps Script action...');
      
      const result = await this.appsScriptService.executeAction(validJson);
      
      step.success = result.success;
      step.result = result;
      
      if (!result.success) {
        step.error = result.error;
      }

      return step;

    } catch (error) {
      step.error = error.message;
      return step;
    }
  }

  /**
   * Builds system prompt for AI models
   * @returns {string} System prompt
   */
  buildSystemPrompt() {
    return `You are a Smart Spreadsheet Assistant. Convert user requests into valid JSON actions.

VALID ACTIONS:
- listTabs: List all tabs in a spreadsheet
- fetchTabData: Get data from a specific tab
- updateCell: Update a single cell
- addRow: Add a new row
- readRange: Read a range of cells
- discoverAll: Find all accessible spreadsheets
- health: Check system health

REQUIRED FIELDS:
- listTabs: action, spreadsheetId
- fetchTabData: action, spreadsheetId, tabName
- updateCell: action, spreadsheetId, tabName, range, data (with value)
- addRow: action, spreadsheetId, tabName, data
- readRange: action, spreadsheetId, tabName, range
- discoverAll: action
- health: action

RESPONSE FORMAT: Return only valid JSON, no explanations.

EXAMPLES:
{"action": "listTabs", "spreadsheetId": "1abc123"}
{"action": "updateCell", "spreadsheetId": "1abc123", "tabName": "Sheet1", "range": "A1", "data": {"value": "Hello"}}`;
  }

  /**
   * Tests connections to all services
   * @returns {Promise<Object>} Connection test results
   */
  async testConnections() {
    const tests = {};

    try {
      // Test Gemini
      tests.gemini = await this.geminiService.testConnection();
    } catch (error) {
      tests.gemini = { success: false, error: error.message };
    }

    try {
      // Test OpenRouter
      tests.openRouter = await this.openRouterService.testConnection();
    } catch (error) {
      tests.openRouter = { success: false, error: error.message };
    }

    try {
      // Test Apps Script
      tests.appsScript = await this.appsScriptService.testConnection();
    } catch (error) {
      tests.appsScript = { success: false, error: error.message };
    }

    return tests;
  }

  /**
   * Gets status of all services
   * @returns {Object} Service status
   */
  getServiceStatus() {
    return {
      initialized: this.isInitialized,
      config: this.configService.validateConfig(),
      services: {
        gemini: this.geminiService.getStatus(),
        openRouter: this.openRouterService.getStatus(),
        appsScript: this.appsScriptService.getStatus(),
        hiddenParser: this.hiddenParserService.getStatus()
      },
      guardrails: {
        regexCheck: { available: true },
        normalizer: { available: true },
        schemaValidator: { 
          available: true,
          actions: this.schemaValidatorService.getAvailableActions()
        }
      }
    };
  }

  /**
   * Gets configuration service
   * @returns {ConfigService} Configuration service instance
   */
  getConfigService() {
    return this.configService;
  }

  /**
   * Gets Apps Script service
   * @returns {AppsScriptService} Apps Script service instance
   */
  getAppsScriptService() {
    return this.appsScriptService;
  }

  /**
   * Gets Gemini service
   * @returns {GeminiService} Gemini service instance
   */
  getGeminiService() {
    return this.geminiService;
  }

  /**
   * Gets OpenRouter service
   * @returns {OpenRouterService} OpenRouter service instance
   */
  getOpenRouterService() {
    return this.openRouterService;
  }

  /**
   * Processes a simple action directly (bypassing AI generation)
   * @param {Object} action - Direct action object
   * @returns {Promise<Object>} Processing result
   */
  async processDirectAction(action) {
    try {
      // Validate the action
      const schemaResult = this.schemaValidatorService.validate(action);
      
      if (!schemaResult.valid) {
        return {
          success: false,
          error: 'Invalid action schema',
          details: schemaResult.errors
        };
      }

      // Execute directly
      const result = await this.appsScriptService.executeAction(action);
      
      return {
        success: result.success,
        result: result,
        bypassed: ['AI Generation', 'Guardrail Processing']
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default ServiceManager;