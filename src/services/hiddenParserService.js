/**
 * Hidden Parser Service for Smart Spreadsheet Assistant
 * Handles data normalization and validation for Apps Script integration
 * This service acts as an intermediary to normalize raw LLM output into structured data
 */
export default class HiddenParserService {
  constructor(url, apiKey = null) {
    this.url = url;
    this.apiKey = apiKey;
    this.timeout = 15000; // 15 second timeout for parser
    this.retryAttempts = 2;
    this.retryDelay = 500; // 500ms
  }

  /**
   * Sets the API key for authentication
   * @param {string} apiKey - The API key
   */
  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * Normalizes raw LLM output into structured Apps Script payload
   * @param {Object} rawData - Raw data from LLM or user input
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Normalized payload
   */
  async normalize(rawData, options = {}) {
    const { retryCount = 0 } = options;
    
    try {
      const payload = {
        raw: rawData,
        options: {
          strictValidation: options.strictValidation || false,
          targetSchema: options.targetSchema || null,
          context: options.context || null,
          timestamp: Date.now()
        }
      };

      // Add API key to headers if available
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller?.abort(), this.timeout);
      
      const response = await fetch(`${this.url}/normalize`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller?.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response?.ok) {
        throw new Error(`Parser error! status: ${response.status}`);
      }
      
      const result = await response?.json();
      
      if (!result?.ok) {
        throw new Error(result?.error || 'Normalization failed');
      }
      
      return {
        success: true,
        data: result.data,
        metadata: result.metadata || {},
        warnings: result.warnings || []
      };
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('Parser timeout');
      }
      
      // Retry logic for network errors
      if (retryCount < this.retryAttempts && this.isRetryableError(error)) {
        await this.delay(this.retryDelay * (retryCount + 1));
        return this.normalize(rawData, { ...options, retryCount: retryCount + 1 });
      }
      
      console.error('Hidden parser request failed:', error);
      throw error;
    }
  }

  /**
   * Validates data structure without normalization
   * @param {Object} data - Data to validate
   * @param {Object} schema - Expected schema
   * @returns {Promise<Object>} Validation result
   */
  async validate(data, schema = null) {
    try {
      const payload = {
        data,
        schema,
        validateOnly: true
      };

      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller?.abort(), this.timeout);
      
      const response = await fetch(`${this.url}/validate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller?.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response?.ok) {
        throw new Error(`Validation error! status: ${response.status}`);
      }
      
      const result = await response?.json();
      
      return {
        valid: result.valid || false,
        errors: result.errors || [],
        warnings: result.warnings || [],
        suggestions: result.suggestions || []
      };
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('Validation timeout');
      }
      
      console.error('Validation request failed:', error);
      throw error;
    }
  }

  /**
   * Extracts structured data from natural language text
   * @param {string} text - Natural language text
   * @param {Object} context - Context information
   * @returns {Promise<Object>} Extracted structured data
   */
  async extractStructuredData(text, context = {}) {
    try {
      const payload = {
        text,
        context: {
          spreadsheetId: context.spreadsheetId || null,
          tabName: context.tabName || null,
          headers: context.headers || [],
          sampleData: context.sampleData || [],
          ...context
        }
      };

      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller?.abort(), this.timeout);
      
      const response = await fetch(`${this.url}/extract`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller?.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response?.ok) {
        throw new Error(`Extraction error! status: ${response.status}`);
      }
      
      const result = await response?.json();
      
      return {
        success: result.success || false,
        data: result.data || null,
        confidence: result.confidence || 0,
        alternatives: result.alternatives || [],
        metadata: result.metadata || {}
      };
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('Extraction timeout');
      }
      
      console.error('Extraction request failed:', error);
      throw error;
    }
  }

  /**
   * Converts Apps Script action to natural language description
   * @param {Object} action - Apps Script action object
   * @returns {Promise<Object>} Natural language description
   */
  async actionToText(action) {
    try {
      const payload = { action };

      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller?.abort(), this.timeout);
      
      const response = await fetch(`${this.url}/describe`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller?.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response?.ok) {
        throw new Error(`Description error! status: ${response.status}`);
      }
      
      const result = await response?.json();
      
      return {
        description: result.description || 'Unknown action',
        details: result.details || [],
        risks: result.risks || [],
        suggestions: result.suggestions || []
      };
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('Description timeout');
      }
      
      console.error('Description request failed:', error);
      throw error;
    }
  }

  /**
   * Gets the health status of the parser service
   * @returns {Promise<Object>} Health status
   */
  async getHealthStatus() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller?.abort(), 5000); // 5 second timeout for health check
      
      const response = await fetch(`${this.url}/health`, {
        method: 'GET',
        signal: controller?.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response?.ok) {
        throw new Error(`Health check failed! status: ${response.status}`);
      }
      
      const result = await response?.json();
      
      return {
        healthy: result.healthy || false,
        version: result.version || 'unknown',
        uptime: result.uptime || 0,
        lastCheck: Date.now()
      };
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('Health check timeout');
      }
      
      console.error('Health check failed:', error);
      return {
        healthy: false,
        error: error.message,
        lastCheck: Date.now()
      };
    }
  }

  /**
   * Checks if an error is retryable
   * @param {Error} error - The error to check
   * @returns {boolean} Whether the error is retryable
   */
  isRetryableError(error) {
    const retryableErrors = [
      'NetworkError',
      'TypeError', // Often network-related
      'Failed to fetch',
      'timeout'
    ];
    
    return retryableErrors.some(errorType => 
      error?.name === errorType || error?.message?.toLowerCase()?.includes(errorType.toLowerCase())
    );
  }

  /**
   * Delays execution for the specified time
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after the delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Creates a batch normalization request
   * @param {Array} rawDataArray - Array of raw data objects
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Batch normalization results
   */
  async batchNormalize(rawDataArray, options = {}) {
    try {
      const payload = {
        batch: rawDataArray,
        options: {
          strictValidation: options.strictValidation || false,
          targetSchema: options.targetSchema || null,
          context: options.context || null,
          timestamp: Date.now()
        }
      };

      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller?.abort(), this.timeout * 2); // Double timeout for batch
      
      const response = await fetch(`${this.url}/batch-normalize`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller?.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response?.ok) {
        throw new Error(`Batch normalization error! status: ${response.status}`);
      }
      
      const result = await response?.json();
      
      return {
        success: result.success || false,
        results: result.results || [],
        errors: result.errors || [],
        metadata: result.metadata || {}
      };
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('Batch normalization timeout');
      }
      
      console.error('Batch normalization failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
let hiddenParserService = null;

/**
 * Factory function to create or get the hidden parser service instance
 * @param {string} url - Parser service URL
 * @param {string} apiKey - API key for authentication
 * @returns {HiddenParserService} Service instance
 */
export function createHiddenParserService(url, apiKey = null) {
  if (!hiddenParserService || hiddenParserService.url !== url) {
    hiddenParserService = new HiddenParserService(url, apiKey);
  } else if (apiKey && hiddenParserService.apiKey !== apiKey) {
    hiddenParserService.setApiKey(apiKey);
  }
  
  return hiddenParserService;
}

/**
 * Gets the current hidden parser service instance
 * @returns {HiddenParserService|null} Service instance or null if not initialized
 */
export function getHiddenParserService() {
  return hiddenParserService;
}