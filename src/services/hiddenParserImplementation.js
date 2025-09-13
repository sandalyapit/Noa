/**
 * Hidden LLM Normalizer Implementation
 * A serverless function that normalizes malformed LLM outputs into valid Apps Script payloads
 * 
 * This can be deployed to:
 * - Vercel Functions
 * - Netlify Functions  
 * - AWS Lambda
 * - Google Cloud Functions
 * - Any Node.js serverless platform
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// Initialize AJV for schema validation
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Apps Script payload schemas
const schemas = {
  listTabs: {
    type: 'object',
    properties: {
      action: { type: 'string', const: 'listTabs' },
      spreadsheetId: { type: 'string', pattern: '^[a-zA-Z0-9-_]{25,}$' },
      options: { type: 'object' }
    },
    required: ['action', 'spreadsheetId'],
    additionalProperties: false
  },
  
  fetchTabData: {
    type: 'object',
    properties: {
      action: { type: 'string', const: 'fetchTabData' },
      spreadsheetId: { type: 'string', pattern: '^[a-zA-Z0-9-_]{25,}$' },
      tabName: { type: 'string', minLength: 1 },
      options: { 
        type: 'object',
        properties: {
          sampleMaxRows: { type: 'number', minimum: 1, maximum: 10000 },
          author: { type: 'string' }
        }
      }
    },
    required: ['action', 'spreadsheetId', 'tabName'],
    additionalProperties: false
  },
  
  updateCell: {
    type: 'object',
    properties: {
      action: { type: 'string', const: 'updateCell' },
      spreadsheetId: { type: 'string', pattern: '^[a-zA-Z0-9-_]{25,}$' },
      tabName: { type: 'string', minLength: 1 },
      range: { type: 'string', pattern: '^[A-Z]+[0-9]+(:[A-Z]+[0-9]+)?$' },
      data: { 
        type: 'object',
        properties: {
          value: {}
        },
        required: ['value']
      },
      options: { 
        type: 'object',
        properties: {
          dryRun: { type: 'boolean' },
          author: { type: 'string' }
        }
      }
    },
    required: ['action', 'spreadsheetId', 'tabName', 'range', 'data'],
    additionalProperties: false
  },
  
  addRow: {
    type: 'object',
    properties: {
      action: { type: 'string', const: 'addRow' },
      spreadsheetId: { type: 'string', pattern: '^[a-zA-Z0-9-_]{25,}$' },
      tabName: { type: 'string', minLength: 1 },
      data: { 
        oneOf: [
          { type: 'array' },
          { type: 'object' }
        ]
      },
      options: { 
        type: 'object',
        properties: {
          dryRun: { type: 'boolean' },
          author: { type: 'string' }
        }
      }
    },
    required: ['action', 'spreadsheetId', 'tabName', 'data'],
    additionalProperties: false
  },
  
  readRange: {
    type: 'object',
    properties: {
      action: { type: 'string', const: 'readRange' },
      spreadsheetId: { type: 'string', pattern: '^[a-zA-Z0-9-_]{25,}$' },
      tabName: { type: 'string', minLength: 1 },
      range: { type: 'string', pattern: '^[A-Z]+[0-9]+(:[A-Z]+[0-9]+)?$' },
      options: { type: 'object' }
    },
    required: ['action', 'spreadsheetId', 'tabName', 'range'],
    additionalProperties: false
  }
};

// Compile validators
const validators = {};
Object.keys(schemas).forEach(action => {
  validators[action] = ajv.compile(schemas[action]);
});

/**
 * Main normalization function
 * @param {Object} rawData - Raw data from LLM or user input
 * @param {Object} options - Normalization options
 * @returns {Object} Normalized result
 */
export function normalize(rawData, options = {}) {
  try {
    // Step 1: Basic cleanup and structure detection
    const cleaned = cleanupRawData(rawData);
    
    // Step 2: Attempt to identify the intended action
    const detectedAction = detectAction(cleaned);
    
    if (!detectedAction) {
      return {
        ok: false,
        error: 'Could not detect valid action from input',
        suggestions: ['Ensure the input contains an action field', 'Check spelling of action names']
      };
    }
    
    // Step 3: Normalize based on detected action
    const normalized = normalizeForAction(cleaned, detectedAction);
    
    // Step 4: Validate against schema
    const validator = validators[detectedAction];
    if (!validator) {
      return {
        ok: false,
        error: `No validator found for action: ${detectedAction}`
      };
    }
    
    const isValid = validator(normalized);
    
    if (!isValid) {
      // Step 5: Attempt to fix validation errors
      const fixed = attemptFix(normalized, validator.errors, detectedAction);
      
      if (fixed && validator(fixed)) {
        return {
          ok: true,
          data: fixed,
          metadata: {
            originalAction: detectedAction,
            fixesApplied: true,
            warnings: ['Data was automatically corrected']
          }
        };
      }
      
      return {
        ok: false,
        error: 'Validation failed after normalization',
        details: validator.errors,
        suggestions: generateSuggestions(validator.errors, detectedAction)
      };
    }
    
    return {
      ok: true,
      data: normalized,
      metadata: {
        originalAction: detectedAction,
        fixesApplied: false
      }
    };
    
  } catch (error) {
    return {
      ok: false,
      error: `Normalization failed: ${error.message}`,
      suggestions: ['Check input format', 'Ensure all required fields are present']
    };
  }
}

/**
 * Cleans up raw data from LLM output
 * @param {any} rawData - Raw input data
 * @returns {Object} Cleaned data object
 */
function cleanupRawData(rawData) {
  // Handle string input (might be JSON)
  if (typeof rawData === 'string') {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(rawData);
      return cleanupRawData(parsed);
    } catch {
      // If not JSON, try to extract structured data
      return extractFromText(rawData);
    }
  }
  
  // Handle array input (might be wrapped)
  if (Array.isArray(rawData) && rawData.length === 1) {
    return cleanupRawData(rawData[0]);
  }
  
  // Handle object input
  if (typeof rawData === 'object' && rawData !== null) {
    const cleaned = {};
    
    // Normalize keys (handle case variations, typos)
    Object.keys(rawData).forEach(key => {
      const normalizedKey = normalizeKey(key);
      if (normalizedKey) {
        cleaned[normalizedKey] = rawData[key];
      }
    });
    
    return cleaned;
  }
  
  return rawData;
}

/**
 * Normalizes object keys to standard format
 * @param {string} key - Original key
 * @returns {string} Normalized key
 */
function normalizeKey(key) {
  const keyMap = {
    // Action variations
    'action': 'action',
    'act': 'action',
    'operation': 'action',
    'command': 'action',
    
    // SpreadsheetId variations
    'spreadsheetid': 'spreadsheetId',
    'sheetid': 'spreadsheetId',
    'sheet_id': 'spreadsheetId',
    'spreadsheet_id': 'spreadsheetId',
    'id': 'spreadsheetId',
    
    // TabName variations
    'tabname': 'tabName',
    'tab_name': 'tabName',
    'sheetname': 'tabName',
    'sheet_name': 'tabName',
    'tab': 'tabName',
    'sheet': 'tabName',
    
    // Range variations
    'range': 'range',
    'cell': 'range',
    'cells': 'range',
    'address': 'range',
    
    // Data variations
    'data': 'data',
    'value': 'data',
    'values': 'data',
    'content': 'data',
    'payload': 'data',
    
    // Options variations
    'options': 'options',
    'opts': 'options',
    'config': 'options',
    'settings': 'options'
  };
  
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return keyMap[normalized] || key;
}

/**
 * Detects the intended action from cleaned data
 * @param {Object} data - Cleaned data
 * @returns {string|null} Detected action
 */
function detectAction(data) {
  // Direct action field
  if (data.action && typeof data.action === 'string') {
    const action = data.action.toLowerCase();
    const actionMap = {
      'listtabs': 'listTabs',
      'list_tabs': 'listTabs',
      'gettabs': 'listTabs',
      'tabs': 'listTabs',
      
      'fetchtabdata': 'fetchTabData',
      'fetch_tab_data': 'fetchTabData',
      'getdata': 'fetchTabData',
      'data': 'fetchTabData',
      
      'updatecell': 'updateCell',
      'update_cell': 'updateCell',
      'setcell': 'updateCell',
      'update': 'updateCell',
      
      'addrow': 'addRow',
      'add_row': 'addRow',
      'appendrow': 'addRow',
      'insert': 'addRow',
      
      'readrange': 'readRange',
      'read_range': 'readRange',
      'getrange': 'readRange',
      'read': 'readRange'
    };
    
    return actionMap[action] || data.action;
  }
  
  // Infer from data structure
  if (data.range && data.data && data.data.value !== undefined) {
    return 'updateCell';
  }
  
  if (data.data && (Array.isArray(data.data) || typeof data.data === 'object')) {
    return 'addRow';
  }
  
  if (data.range && !data.data) {
    return 'readRange';
  }
  
  if (data.tabName && !data.range && !data.data) {
    return 'fetchTabData';
  }
  
  if (data.spreadsheetId && !data.tabName) {
    return 'listTabs';
  }
  
  return null;
}

/**
 * Normalizes data for a specific action
 * @param {Object} data - Cleaned data
 * @param {string} action - Detected action
 * @returns {Object} Normalized data
 */
function normalizeForAction(data, action) {
  const normalized = {
    action: action,
    ...data
  };
  
  // Ensure required fields exist with defaults
  switch (action) {
    case 'listTabs':
      if (!normalized.options) normalized.options = {};
      break;
      
    case 'fetchTabData':
      if (!normalized.options) normalized.options = {};
      if (!normalized.options.sampleMaxRows) normalized.options.sampleMaxRows = 500;
      break;
      
    case 'updateCell':
      if (normalized.value && !normalized.data) {
        normalized.data = { value: normalized.value };
        delete normalized.value;
      }
      if (!normalized.options) normalized.options = {};
      break;
      
    case 'addRow':
      if (!normalized.options) normalized.options = {};
      break;
      
    case 'readRange':
      if (!normalized.options) normalized.options = {};
      break;
  }
  
  // Clean up extra fields
  delete normalized.value;
  
  return normalized;
}

/**
 * Attempts to fix validation errors
 * @param {Object} data - Data with validation errors
 * @param {Array} errors - Validation errors
 * @param {string} action - Action type
 * @returns {Object|null} Fixed data or null if unfixable
 */
function attemptFix(data, errors, action) {
  const fixed = { ...data };
  
  errors.forEach(error => {
    const { instancePath, keyword, params } = error;
    
    switch (keyword) {
      case 'required':
        // Add missing required fields
        if (params.missingProperty === 'spreadsheetId' && fixed.id) {
          fixed.spreadsheetId = fixed.id;
          delete fixed.id;
        }
        break;
        
      case 'pattern':
        // Fix spreadsheet ID format
        if (instancePath === '/spreadsheetId') {
          fixed.spreadsheetId = extractSpreadsheetId(fixed.spreadsheetId);
        }
        // Fix range format
        if (instancePath === '/range') {
          fixed.range = normalizeRange(fixed.range);
        }
        break;
        
      case 'type':
        // Fix type mismatches
        if (instancePath === '/options' && typeof fixed.options !== 'object') {
          fixed.options = {};
        }
        break;
    }
  });
  
  return fixed;
}

/**
 * Extracts spreadsheet ID from URL or validates existing ID
 * @param {string} input - URL or ID
 * @returns {string} Clean spreadsheet ID
 */
function extractSpreadsheetId(input) {
  if (!input) return '';
  
  // Try to extract from URL
  const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  
  // Return as-is if it looks like an ID
  if (/^[a-zA-Z0-9-_]{25,}$/.test(input)) {
    return input;
  }
  
  return input;
}

/**
 * Normalizes range notation
 * @param {string} range - Range string
 * @returns {string} Normalized range
 */
function normalizeRange(range) {
  if (!range) return '';
  
  // Convert to uppercase and remove spaces
  const cleaned = range.toUpperCase().replace(/\s/g, '');
  
  // Basic A1 notation validation and correction
  const match = cleaned.match(/([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?/);
  if (match) {
    const [, col1, row1, col2, row2] = match;
    if (col2 && row2) {
      return `${col1}${row1}:${col2}${row2}`;
    }
    return `${col1}${row1}`;
  }
  
  return range;
}

/**
 * Extracts structured data from text
 * @param {string} text - Text input
 * @returns {Object} Extracted data
 */
function extractFromText(text) {
  const data = {};
  
  // Extract spreadsheet ID from URLs
  const urlMatch = text.match(/(?:https:\/\/docs\.google\.com\/spreadsheets\/d\/|spreadsheet\/d\/)([a-zA-Z0-9-_]+)/);
  if (urlMatch) {
    data.spreadsheetId = urlMatch[1];
  }
  
  // Extract tab names (quoted strings)
  const tabMatch = text.match(/(?:tab|sheet)(?:\s+name)?[:\s]+['""]([^'""]+)['""]?/i);
  if (tabMatch) {
    data.tabName = tabMatch[1];
  }
  
  // Extract ranges (A1 notation)
  const rangeMatch = text.match(/\b([A-Z]+\d+(?::[A-Z]+\d+)?)\b/);
  if (rangeMatch) {
    data.range = rangeMatch[1];
  }
  
  // Extract actions from keywords
  const actionKeywords = {
    'list': 'listTabs',
    'get': 'fetchTabData',
    'update': 'updateCell',
    'add': 'addRow',
    'read': 'readRange'
  };
  
  Object.keys(actionKeywords).forEach(keyword => {
    if (text.toLowerCase().includes(keyword)) {
      data.action = actionKeywords[keyword];
    }
  });
  
  return data;
}

/**
 * Generates helpful suggestions based on validation errors
 * @param {Array} errors - Validation errors
 * @param {string} action - Action type
 * @returns {Array} Suggestions
 */
function generateSuggestions(errors, action) {
  const suggestions = [];
  
  errors.forEach(error => {
    switch (error.keyword) {
      case 'required':
        suggestions.push(`Missing required field: ${error.params.missingProperty}`);
        break;
      case 'pattern':
        if (error.instancePath === '/spreadsheetId') {
          suggestions.push('Spreadsheet ID should be extracted from the Google Sheets URL');
        }
        if (error.instancePath === '/range') {
          suggestions.push('Range should be in A1 notation (e.g., A1, B2:D5)');
        }
        break;
      case 'type':
        suggestions.push(`Field ${error.instancePath} should be of type ${error.schema}`);
        break;
    }
  });
  
  return suggestions;
}

/**
 * Validates data against schema
 * @param {Object} data - Data to validate
 * @param {string} action - Action type
 * @returns {Object} Validation result
 */
export function validate(data, action) {
  const validator = validators[action];
  if (!validator) {
    return {
      valid: false,
      errors: [`No validator found for action: ${action}`]
    };
  }
  
  const isValid = validator(data);
  
  return {
    valid: isValid,
    errors: isValid ? [] : validator.errors,
    suggestions: isValid ? [] : generateSuggestions(validator.errors, action)
  };
}

/**
 * Health check function
 * @returns {Object} Health status
 */
export function health() {
  return {
    healthy: true,
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    schemas: Object.keys(schemas)
  };
}