/**
 * Apps Script Service for Smart Spreadsheet Assistant
 * Handles all interactions with the Apps Script backend
 */
export default class AppsScriptService {
  constructor(url) { 
    this.url = url;
    this.timeout = 30000; // 30 second timeout
  }

  /**
   * Makes a POST request to the Apps Script endpoint
   * @param {Object} payload - The request payload
   * @returns {Promise<Object>} Response from Apps Script
   */
  async post(payload) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller?.abort(), this.timeout);
      
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller?.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response?.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response?.json();
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('Request timeout - Apps Script may be slow to respond');
      }
      console.error('Apps Script request failed:', error);
      throw error;
    }
  }

  /**
   * Lists all tabs in a spreadsheet
   * @param {string} spreadsheetId - The spreadsheet ID
   * @returns {Promise<Object>} List of tabs with metadata
   */
  async listTabs(spreadsheetId) {
    return this.post({ 
      action: 'listTabs', 
      spreadsheetId 
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
      options 
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
      options 
    });
  }

  /**
   * Reads a specific range
   * @param {string} spreadsheetId - The spreadsheet ID
   * @param {string} tabName - The tab name
   * @param {string} range - A1 notation range
   * @returns {Promise<Object>} Range data
   */
  async readRange(spreadsheetId, tabName, range) {
    return this.post({ 
      action: 'readRange', 
      spreadsheetId, 
      tabName, 
      range 
    });
  }

  /**
   * Discovers all accessible spreadsheets
   * @returns {Promise<Object>} Discovery results
   */
  async discoverAll() {
    return this.post({ action: 'discoverAll' });
  }

  /**
   * Validates payload format before sending
   * @param {Object} payload - The payload to validate
   * @returns {boolean} Validation result
   */
  validatePayload(payload) {
    const allowedActions = [
      'listTabs', 'fetchTabData', 'updateCell', 
      'addRow', 'readRange', 'discoverAll'
    ];
    
    if (!payload?.action || !allowedActions?.includes(payload?.action)) {
      return false;
    }
    
    if (payload?.action !== 'discoverAll' && !payload?.spreadsheetId) {
      return false;
    }
    
    const needsTab = ['fetchTabData', 'updateCell', 'addRow', 'readRange'];
    if (needsTab?.includes(payload?.action) && !payload?.tabName) {
      return false;
    }
    
    return true;
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