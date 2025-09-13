/**
 * OpenRouter Service
 * Provides access to multiple AI models as fallback for Gemini
 */
class OpenRouterService {
  constructor(configService) {
    this.configService = configService;
    this.baseUrl = 'https://openrouter.ai/api/v1';
    this.defaultModel = 'anthropic/claude-3.5-sonnet';
    this.fallbackModels = [
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o-mini',
      'meta-llama/llama-3.1-8b-instruct:free',
      'microsoft/wizardlm-2-8x22b'
    ];
  }

  /**
   * Makes a request to OpenRouter API
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Request options
   * @returns {Promise<Object>} API response
   */
  async makeRequest(prompt, options = {}) {
    const config = this.configService.getOpenRouterConfig();
    
    if (!config.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const {
      model = this.defaultModel,
      temperature = 0.7,
      maxTokens = 1000,
      systemPrompt = null
    } = options;

    const messages = [];
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }
    
    messages.push({
      role: 'user',
      content: prompt
    });

    const requestBody = {
      model: model,
      messages: messages,
      temperature: temperature,
      max_tokens: maxTokens,
      stream: false
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Smart Spreadsheet Assistant'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        content: data.choices[0]?.message?.content || '',
        model: data.model,
        usage: data.usage,
        raw: data
      };

    } catch (error) {
      console.error('OpenRouter request failed:', error);
      return {
        success: false,
        error: error.message,
        content: null
      };
    }
  }

  /**
   * Tries multiple models in sequence until one succeeds
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Best available response
   */
  async tryMultipleModels(prompt, options = {}) {
    const modelsToTry = options.models || this.fallbackModels;
    const results = [];

    for (const model of modelsToTry) {
      try {
        console.log(`Trying OpenRouter model: ${model}`);
        
        const result = await this.makeRequest(prompt, {
          ...options,
          model: model
        });

        results.push({
          model: model,
          ...result
        });

        if (result.success) {
          console.log(`✅ Success with model: ${model}`);
          return {
            success: true,
            content: result.content,
            model: model,
            usage: result.usage,
            attempts: results.length,
            allResults: results
          };
        }

        console.log(`❌ Failed with model: ${model} - ${result.error}`);

      } catch (error) {
        console.error(`Error with model ${model}:`, error);
        results.push({
          model: model,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: false,
      error: 'All OpenRouter models failed',
      attempts: results.length,
      allResults: results
    };
  }

  /**
   * Parses AI output to JSON using OpenRouter models
   * @param {string} rawOutput - Raw AI output that needs parsing
   * @param {Object} context - Context about what the output should be
   * @returns {Promise<Object>} Parsed result
   */
  async parseToJson(rawOutput, context = {}) {
    const systemPrompt = `You are a JSON parser. Your job is to convert natural language or malformed JSON into valid JSON that matches the Smart Spreadsheet Assistant schema.

VALID ACTIONS: listTabs, fetchTabData, updateCell, addRow, readRange, discoverAll, health

REQUIRED FIELDS by action:
- listTabs: action, spreadsheetId
- fetchTabData: action, spreadsheetId, tabName
- updateCell: action, spreadsheetId, tabName, range, data (with value property)
- addRow: action, spreadsheetId, tabName, data
- readRange: action, spreadsheetId, tabName, range
- discoverAll: action
- health: action

RULES:
1. Always return valid JSON only, no explanations
2. Use double quotes for strings
3. Include all required fields
4. Use proper data types (strings, numbers, booleans)
5. If unclear, make reasonable assumptions based on context

EXAMPLES:
Input: "list tabs from spreadsheet 1abc123"
Output: {"action": "listTabs", "spreadsheetId": "1abc123"}

Input: "update cell A1 to hello world in sheet Data"
Output: {"action": "updateCell", "spreadsheetId": "SPREADSHEET_ID", "tabName": "Data", "range": "A1", "data": {"value": "hello world"}}`;

    const prompt = `Parse this into valid JSON for Smart Spreadsheet Assistant:

Raw output: ${rawOutput}

Context: ${JSON.stringify(context)}

Return only valid JSON:`;

    try {
      const result = await this.tryMultipleModels(prompt, {
        systemPrompt: systemPrompt,
        temperature: 0.1, // Low temperature for consistent parsing
        maxTokens: 500
      });

      if (!result.success) {
        return {
          success: false,
          error: 'Failed to parse with any OpenRouter model',
          details: result.allResults
        };
      }

      // Try to parse the response as JSON
      try {
        const parsed = JSON.parse(result.content.trim());
        return {
          success: true,
          json: parsed,
          model: result.model,
          rawResponse: result.content
        };
      } catch (parseError) {
        return {
          success: false,
          error: 'OpenRouter returned invalid JSON',
          rawResponse: result.content,
          parseError: parseError.message
        };
      }

    } catch (error) {
      return {
        success: false,
        error: `OpenRouter parsing failed: ${error.message}`
      };
    }
  }

  /**
   * Gets available models from OpenRouter
   * @returns {Promise<Array>} List of available models
   */
  async getAvailableModels() {
    const config = this.configService.getOpenRouterConfig();
    
    if (!config.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];

    } catch (error) {
      console.error('Failed to get OpenRouter models:', error);
      return [];
    }
  }

  /**
   * Tests the OpenRouter connection
   * @returns {Promise<Object>} Test result
   */
  async testConnection() {
    try {
      const result = await this.makeRequest('Hello, respond with "OK" if you can see this.', {
        model: this.defaultModel,
        maxTokens: 10,
        temperature: 0
      });

      return {
        success: result.success,
        model: result.model,
        response: result.content,
        error: result.error
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Gets service status and configuration
   * @returns {Object} Service status
   */
  getStatus() {
    const config = this.configService.getOpenRouterConfig();
    
    return {
      configured: !!config.apiKey,
      baseUrl: this.baseUrl,
      defaultModel: this.defaultModel,
      fallbackModels: this.fallbackModels,
      timeout: config.timeout,
      retryAttempts: config.retryAttempts
    };
  }
}

export default OpenRouterService;