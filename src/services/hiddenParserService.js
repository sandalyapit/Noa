/**
 * Hidden Parser Service
 * Fourth layer of guardrail - uses external LLM service for fallback parsing
 * This can be a separate microservice or use OpenRouter as backup
 */
class HiddenParserService {
  constructor(configService, openRouterService = null) {
    this.configService = configService;
    this.openRouterService = openRouterService;
  }

  /**
   * Attempts to parse raw AI output using hidden parser service
   * @param {string} rawOutput - Raw AI output that failed other validations
   * @param {Object} context - Context about the original request
   * @returns {Promise<Object>} Parsing result
   */
  async parse(rawOutput, context = {}) {
    const result = {
      success: false,
      source: null,
      json: null,
      error: null,
      attempts: []
    };

    // Try external hidden parser service first
    if (this.hasExternalParser()) {
      try {
        const externalResult = await this.parseWithExternalService(rawOutput, context);
        result.attempts.push({
          method: 'external',
          success: externalResult.success,
          error: externalResult.error
        });

        if (externalResult.success) {
          result.success = true;
          result.source = 'external';
          result.json = externalResult.json;
          return result;
        }
      } catch (error) {
        result.attempts.push({
          method: 'external',
          success: false,
          error: error.message
        });
      }
    }

    // Fallback to OpenRouter if available
    if (this.openRouterService) {
      try {
        const openRouterResult = await this.parseWithOpenRouter(rawOutput, context);
        result.attempts.push({
          method: 'openrouter',
          success: openRouterResult.success,
          error: openRouterResult.error
        });

        if (openRouterResult.success) {
          result.success = true;
          result.source = 'openrouter';
          result.json = openRouterResult.json;
          return result;
        }
      } catch (error) {
        result.attempts.push({
          method: 'openrouter',
          success: false,
          error: error.message
        });
      }
    }

    // Final fallback: rule-based parsing
    try {
      const ruleBasedResult = this.parseWithRules(rawOutput, context);
      result.attempts.push({
        method: 'rules',
        success: ruleBasedResult.success,
        error: ruleBasedResult.error
      });

      if (ruleBasedResult.success) {
        result.success = true;
        result.source = 'rules';
        result.json = ruleBasedResult.json;
        return result;
      }
    } catch (error) {
      result.attempts.push({
        method: 'rules',
        success: false,
        error: error.message
      });
    }

    result.error = 'All parsing methods failed';
    return result;
  }

  /**
   * Checks if external parser service is configured
   * @returns {boolean} Whether external parser is available
   */
  hasExternalParser() {
    const config = this.configService.getConfig();
    return !!(config.hiddenParser?.url && config.hiddenParser?.apiKey);
  }

  /**
   * Parses using external hidden parser service
   * @param {string} rawOutput - Raw AI output
   * @param {Object} context - Request context
   * @returns {Promise<Object>} Parsing result
   */
  async parseWithExternalService(rawOutput, context) {
    const config = this.configService.getConfig();
    const { url, apiKey, timeout = 15000 } = config.hiddenParser;

    const requestBody = {
      raw: rawOutput,
      context: context,
      target: 'spreadsheet_assistant',
      version: '1.0'
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${url}/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'Smart-Spreadsheet-Assistant/1.0'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`External parser error: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.parsed) {
        return {
          success: true,
          json: data.parsed,
          confidence: data.confidence || 0,
          method: data.method || 'unknown'
        };
      } else {
        return {
          success: false,
          error: data.error || 'External parser returned no result'
        };
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('External parser request timed out');
      }
      throw error;
    }
  }

  /**
   * Parses using OpenRouter as fallback
   * @param {string} rawOutput - Raw AI output
   * @param {Object} context - Request context
   * @returns {Promise<Object>} Parsing result
   */
  async parseWithOpenRouter(rawOutput, context) {
    if (!this.openRouterService) {
      return {
        success: false,
        error: 'OpenRouter service not available'
      };
    }

    return await this.openRouterService.parseToJson(rawOutput, context);
  }

  /**
   * Rule-based parsing as final fallback
   * @param {string} rawOutput - Raw AI output
   * @param {Object} context - Request context
   * @returns {Object} Parsing result
   */
  parseWithRules(rawOutput, context) {
    try {
      // Extract intent from natural language
      const intent = this.extractIntent(rawOutput);
      
      if (!intent.action) {
        return {
          success: false,
          error: 'Could not determine action from output'
        };
      }

      // Build JSON based on intent
      const json = this.buildJsonFromIntent(intent, context);

      return {
        success: true,
        json: json,
        confidence: intent.confidence
      };

    } catch (error) {
      return {
        success: false,
        error: `Rule-based parsing failed: ${error.message}`
      };
    }
  }

  /**
   * Extracts intent from natural language
   * @param {string} text - Input text
   * @returns {Object} Extracted intent
   */
  extractIntent(text) {
    const intent = {
      action: null,
      spreadsheetId: null,
      tabName: null,
      range: null,
      data: null,
      confidence: 0
    };

    const lowerText = text.toLowerCase();

    // Action detection
    const actionPatterns = {
      listTabs: /list\s+(tabs|sheets)|get\s+(tabs|sheets)|show\s+(tabs|sheets)/i,
      fetchTabData: /fetch\s+data|get\s+data|read\s+data|show\s+data/i,
      updateCell: /update\s+cell|set\s+cell|change\s+cell|modify\s+cell/i,
      addRow: /add\s+row|insert\s+row|append\s+row|new\s+row/i,
      readRange: /read\s+range|get\s+range|fetch\s+range/i,
      discoverAll: /discover|find\s+spreadsheets|list\s+spreadsheets/i,
      health: /health|status|ping|test/i
    };

    for (const [action, pattern] of Object.entries(actionPatterns)) {
      if (pattern.test(text)) {
        intent.action = action;
        intent.confidence += 0.3;
        break;
      }
    }

    // Spreadsheet ID detection
    const spreadsheetIdMatch = text.match(/[a-zA-Z0-9-_]{44}/);
    if (spreadsheetIdMatch) {
      intent.spreadsheetId = spreadsheetIdMatch[0];
      intent.confidence += 0.2;
    }

    // Tab name detection
    const tabNameMatch = text.match(/(?:tab|sheet)\s+["']?([^"'\s]+)["']?/i);
    if (tabNameMatch) {
      intent.tabName = tabNameMatch[1];
      intent.confidence += 0.2;
    }

    // Range detection
    const rangeMatch = text.match(/[A-Z]+[0-9]+(?::[A-Z]+[0-9]+)?/);
    if (rangeMatch) {
      intent.range = rangeMatch[0];
      intent.confidence += 0.2;
    }

    // Value detection for updates
    const valueMatch = text.match(/(?:to|with|value)\s+["']?([^"'\n]+)["']?/i);
    if (valueMatch && intent.action === 'updateCell') {
      intent.data = { value: valueMatch[1].trim() };
      intent.confidence += 0.1;
    }

    return intent;
  }

  /**
   * Builds JSON object from extracted intent
   * @param {Object} intent - Extracted intent
   * @param {Object} context - Request context
   * @returns {Object} JSON object
   */
  buildJsonFromIntent(intent, context) {
    const json = {
      action: intent.action
    };

    // Add required fields based on action
    switch (intent.action) {
      case 'listTabs':
        if (intent.spreadsheetId || context.spreadsheetId) {
          json.spreadsheetId = intent.spreadsheetId || context.spreadsheetId;
        } else {
          throw new Error('SpreadsheetId required for listTabs');
        }
        break;

      case 'fetchTabData':
        if (intent.spreadsheetId || context.spreadsheetId) {
          json.spreadsheetId = intent.spreadsheetId || context.spreadsheetId;
        } else {
          throw new Error('SpreadsheetId required for fetchTabData');
        }
        
        if (intent.tabName || context.tabName) {
          json.tabName = intent.tabName || context.tabName;
        } else {
          throw new Error('TabName required for fetchTabData');
        }
        break;

      case 'updateCell':
        if (intent.spreadsheetId || context.spreadsheetId) {
          json.spreadsheetId = intent.spreadsheetId || context.spreadsheetId;
        } else {
          throw new Error('SpreadsheetId required for updateCell');
        }
        
        if (intent.tabName || context.tabName) {
          json.tabName = intent.tabName || context.tabName;
        } else {
          throw new Error('TabName required for updateCell');
        }
        
        if (intent.range) {
          json.range = intent.range;
        } else {
          throw new Error('Range required for updateCell');
        }
        
        if (intent.data) {
          json.data = intent.data;
        } else {
          throw new Error('Data required for updateCell');
        }
        break;

      case 'addRow':
        if (intent.spreadsheetId || context.spreadsheetId) {
          json.spreadsheetId = intent.spreadsheetId || context.spreadsheetId;
        } else {
          throw new Error('SpreadsheetId required for addRow');
        }
        
        if (intent.tabName || context.tabName) {
          json.tabName = intent.tabName || context.tabName;
        } else {
          throw new Error('TabName required for addRow');
        }
        
        // Default empty row data if not specified
        json.data = intent.data || [];
        break;

      case 'readRange':
        if (intent.spreadsheetId || context.spreadsheetId) {
          json.spreadsheetId = intent.spreadsheetId || context.spreadsheetId;
        } else {
          throw new Error('SpreadsheetId required for readRange');
        }
        
        if (intent.tabName || context.tabName) {
          json.tabName = intent.tabName || context.tabName;
        } else {
          throw new Error('TabName required for readRange');
        }
        
        if (intent.range) {
          json.range = intent.range;
        } else {
          throw new Error('Range required for readRange');
        }
        break;

      case 'discoverAll':
      case 'health':
        // No additional fields required
        break;
    }

    return json;
  }

  /**
   * Gets service status
   * @returns {Object} Service status
   */
  getStatus() {
    const config = this.configService.getConfig();
    
    return {
      externalParser: {
        configured: this.hasExternalParser(),
        url: config.hiddenParser?.url || null,
        timeout: config.hiddenParser?.timeout || 15000
      },
      openRouterFallback: {
        available: !!this.openRouterService,
        configured: this.openRouterService ? this.openRouterService.getStatus().configured : false
      },
      ruleBasedFallback: {
        available: true,
        confidence: 'low'
      }
    };
  }
}

export default HiddenParserService;