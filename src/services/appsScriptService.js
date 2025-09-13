/**
 * Apps Script Service for Smart Spreadsheet Assistant
 * Handles all interactions with the Apps Script backend with token authentication
 * and optional hidden parser integration for data normalization
 */
export default class AppsScriptService {
  constructor(url, token = null, hiddenParserUrl = null) { 
    this.url = url;
    this.token = token;
    this.hiddenParserUrl = hiddenParserUrl;
    this.timeout = 30000; // 30 second timeout
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Sets the API token for authentication
   * @param {string} token - The API token
   */
  setToken(token) {
    this.token = token;
  }

  /**
   * Sets the hidden parser URL for data normalization
   * @param {string} url - The hidden parser URL
   */
  setHiddenParserUrl(url) {
    this.hiddenParserUrl = url;
  }

  /**
   * Makes a POST request to the Apps Script endpoint with token authentication
   * @param {Object} payload - The request payload
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response from Apps Script
   */
  async post(payload, options = {}) {
    const { skipNormalization = false, retryCount = 0 } = options;
    
    try {
      // Add token to payload if available
      const authenticatedPayload = {
        ...payload,
        ...(this.token && { token: this.token })
      };

      // Validate payload before sending
      if (!this.validatePayload(authenticatedPayload)) {
        throw new Error('Invalid payload format');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller?.abort(), this.timeout);
      
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authenticatedPayload),
        signal: controller?.signal
      });
      
      clearTimeout(timeoutId);
      
      const responseData = await response?.json();
      
      // Handle different response status codes
      if (!response?.ok) {
        return this.handleErrorResponse(response, responseData, payload, options);
      }
      
      return responseData;
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('Request timeout - Apps Script may be slow to respond');
      }
      
      // Retry logic for network errors
      if (retryCount < this.retryAttempts && this.isRetryableError(error)) {
        await this.delay(this.retryDelay * (retryCount + 1));
        return this.post(payload, { ...options, retryCount: retryCount + 1 });
      }
      
      console.error('Apps Script request failed:', error);
      throw error;
    }
  }

  /**
   * Handles error responses from Apps Script
   * @param {Response} response - The HTTP response
   * @param {Object} responseData - The parsed response data
   * @param {Object} originalPayload - The original request payload
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Processed response or throws error
   */
  async handleErrorResponse(response, responseData, originalPayload, options) {
    const { skipNormalization = false } = options;
    
    switch (response.status) {
      case 401:
        throw new Error('Unauthorized: Invalid or missing API token');
      
      case 422:
        // Validation failed - try hidden parser if available and not already attempted
        if (!skipNormalization && this.hiddenParserUrl && responseData?.needsNormalization) {
          try {
            const normalizedPayload = await this.callHiddenParser(originalPayload);
            return this.post(normalizedPayload, { ...options, skipNormalization: true });
          } catch (normalizationError) {
            console.error('Normalization failed:', normalizationError);
            throw new Error(`Validation failed: ${responseData?.error || 'Unknown validation error'}`);
          }
        }
        throw new Error(`Validation failed: ${responseData?.error || 'Invalid request format'}`);
      
      case 429:
        throw new Error('Rate limit exceeded. Please wait before making another request.');
      
      case 500:
        throw new Error(`Server error: ${responseData?.error || 'Internal server error'}`);
      
      default:
        throw new Error(`HTTP error! status: ${response.status}, message: ${responseData?.error || 'Unknown error'}`);
    }
  }

  /**
   * Calls the hidden parser for data normalization
   * @param {Object} rawPayload - The raw payload to normalize
   * @returns {Promise<Object>} Normalized payload
   */
  async callHiddenParser(rawPayload) {
    if (!this.hiddenParserUrl) {
      throw new Error('Hidden parser URL not configured');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller?.abort(), this.timeout);
      
      const response = await fetch(this.hiddenParserUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: rawPayload }),
        signal: controller?.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response?.ok) {
        throw new Error(`Hidden parser error! status: ${response.status}`);
      }
      
      const result = await response?.json();
      
      if (!result?.ok || !result?.data) {
        throw new Error(result?.error || 'Normalization failed');
      }
      
      return result.data;
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('Hidden parser timeout');
      }
      console.error('Hidden parser request failed:', error);
      throw error;
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
      'Failed to fetch'
    ];
    
    return retryableErrors.some(errorType => 
      error?.name === errorType || error?.message?.includes(errorType)
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
   * Lists all tabs in a spreadsheet
   * @param {string} spreadsheetId - The spreadsheet ID
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} List of tabs with metadata
   */
  async listTabs(spreadsheetId, options = {}) {
    return this.post({ 
      action: 'listTabs', 
      spreadsheetId,
      options: {
        author: options.author || 'user',
        ...options
      }
    });
  }

  /**
   * Fetches tab data with schema analysis
   * @param {string} spreadsheetId - The spreadsheet ID
   * @param {string} tabName - The tab name
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Tab data with schema
   */
  async fetchTabData(spreadsheetId, tabName, options = {}) {
    return this.post({ 
      action: 'fetchTabData', 
      spreadsheetId, 
      tabName, 
      options: {
        sampleMaxRows: 500,
        author: options.author || 'user',
        ...options
      }
    });
  }

  /**
   * Updates a single cell
   * @param {string} spreadsheetId - The spreadsheet ID
   * @param {string} tabName - The tab name
   * @param {string} range - A1 notation range
   * @param {any} value - The value to set
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Update result
   */
  async updateCell(spreadsheetId, tabName, range, value, options = {}) {
    return this.post({ 
      action: 'updateCell', 
      spreadsheetId, 
      tabName, 
      range, 
      data: { value }, 
      options: {
        dryRun: options.dryRun || false,
        author: options.author || 'user',
        ...options
      }
    });
  }

  /**
   * Adds a row to the spreadsheet
   * @param {string} spreadsheetId - The spreadsheet ID
   * @param {string} tabName - The tab name
   * @param {Object|Array} rowData - The row data
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Add row result
   */
  async addRow(spreadsheetId, tabName, rowData, options = {}) {
    return this.post({ 
      action: 'addRow', 
      spreadsheetId, 
      tabName, 
      data: rowData, 
      options: {
        dryRun: options.dryRun || false,
        author: options.author || 'user',
        ...options
      }
    });
  }

  /**
   * Reads a specific range
   * @param {string} spreadsheetId - The spreadsheet ID
   * @param {string} tabName - The tab name
   * @param {string} range - A1 notation range
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Range data
   */
  async readRange(spreadsheetId, tabName, range, options = {}) {
    return this.post({ 
      action: 'readRange', 
      spreadsheetId, 
      tabName, 
      range,
      options: {
        author: options.author || 'user',
        ...options
      }
    });
  }

  /**
   * Discovers all accessible spreadsheets
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Discovery results
   */
  async discoverAll(options = {}) {
    return this.post({ 
      action: 'discoverAll',
      options: {
        author: options.author || 'user',
        ...options
      }
    });
  }

  /**
   * Performs a batch operation with multiple actions
   * @param {Array} actions - Array of action objects
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Batch operation results
   */
  async batchOperation(actions, options = {}) {
    return this.post({
      action: 'batch',
      data: actions,
      options: {
        dryRun: options.dryRun || false,
        author: options.author || 'user',
        ...options
      }
    });
  }

  /**
   * Gets the health status of the Apps Script service
   * @returns {Promise<Object>} Health status
   */
  async getHealthStatus() {
    return this.post({ 
      action: 'health',
      options: { timestamp: Date.now() }
    });
  }

  /**
   * Validates payload format before sending
   * @param {Object} payload - The payload to validate
   * @returns {Object} Validation result with details
   */
  validatePayload(payload) {
    const allowedActions = [
      'listTabs', 'fetchTabData', 'updateCell', 
      'addRow', 'readRange', 'discoverAll', 'batch', 'health'
    ];
    
    const errors = [];
    
    // Check action
    if (!payload?.action) {
      errors.push('Action is required');
    } else if (!allowedActions?.includes(payload?.action)) {
      errors.push(`Invalid action: ${payload?.action}. Allowed: ${allowedActions.join(', ')}`);
    }
    
    // Check spreadsheet ID for actions that need it
    const needsSpreadsheetId = ['listTabs', 'fetchTabData', 'updateCell', 'addRow', 'readRange'];
    if (needsSpreadsheetId?.includes(payload?.action) && !payload?.spreadsheetId) {
      errors.push('spreadsheetId is required for this action');
    }
    
    // Check tab name for actions that need it
    const needsTab = ['fetchTabData', 'updateCell', 'addRow', 'readRange'];
    if (needsTab?.includes(payload?.action) && !payload?.tabName) {
      errors.push('tabName is required for this action');
    }
    
    // Check range for actions that need it
    const needsRange = ['updateCell', 'readRange'];
    if (needsRange?.includes(payload?.action) && !payload?.range) {
      errors.push('range is required for this action');
    }
    
    // Check data for actions that need it
    const needsData = ['updateCell', 'addRow'];
    if (needsData?.includes(payload?.action) && !payload?.data) {
      errors.push('data is required for this action');
    }
    
    // Validate batch operations
    if (payload?.action === 'batch') {
      if (!Array.isArray(payload?.data)) {
        errors.push('batch action requires data to be an array');
      } else {
        payload.data.forEach((action, index) => {
          const actionValidation = this.validatePayload(action);
          if (!actionValidation.valid) {
            errors.push(`Batch action ${index}: ${actionValidation.errors.join(', ')}`);
          }
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Quick validation for basic payload structure
   * @param {Object} payload - The payload to validate
   * @returns {boolean} Basic validation result
   */
  quickValidate(payload) {
    const validation = this.validatePayload(payload);
    return validation.valid;
  }

  /**
   * Extracts spreadsheet ID from URL or returns raw ID
   * @param {string} urlOrId - URL or ID
   * @returns {string|null} Extracted ID
   */
  static extractSpreadsheetId(urlOrId) {
    if (!urlOrId) return null;
    
    // Try to extract from URL
    const match = urlOrId?.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match?.[1]) return match?.[1];
    
    // Check if it's already an ID
    if (/^[a-zA-Z0-9-_]{25,}$/?.test(urlOrId)) return urlOrId;
    
    return null;
  }
}