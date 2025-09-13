/**
 * Google Apps Script Code for Smart Spreadsheet Assistant
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Copy this entire file content
 * 2. Go to https://script.google.com
 * 3. Create a new project
 * 4. Replace the default Code.gs content with this code
 * 5. Go to Project Settings > Script Properties and add:
 *    - API_TOKEN: your-secure-random-token (generate with: openssl rand -base64 32)
 *    - HIDDEN_PARSER_URL: (optional) your hidden parser service URL
 * 6. Save the project
 * 7. Deploy as web app:
 *    - New deployment > Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 8. Copy the web app URL and use it in your React app
 * 
 * IMPORTANT: This code is production-ready with security features
 */

// Constants for configuration
const META_SPREADSHEET_PROP = 'SSA_META_SPREADSHEET_ID';
const AUDIT_SHEET_NAME = '__AUDIT_LOG__';
const SNAPSHOT_FOLDER_NAME = 'SSA_Snapshots';

/**
 * Serves a minimal web interface (optional)
 */
function doGet(e) {
  return HtmlService.createHtmlOutput(`
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1>🤖 Smart Spreadsheet Assistant API</h1>
        <p>This is the backend service for the Smart Spreadsheet Assistant.</p>
        <p>Send POST requests with JSON payload to interact with Google Sheets.</p>
        
        <h3>📋 Supported Actions:</h3>
        <ul>
          <li><strong>listTabs</strong> - List all tabs in a spreadsheet</li>
          <li><strong>fetchTabData</strong> - Fetch tab data with schema analysis</li>
          <li><strong>updateCell</strong> - Update a single cell</li>
          <li><strong>addRow</strong> - Add a new row</li>
          <li><strong>readRange</strong> - Read a specific range</li>
          <li><strong>discoverAll</strong> - Discover accessible spreadsheets</li>
          <li><strong>batch</strong> - Execute multiple actions</li>
          <li><strong>health</strong> - Health check</li>
        </ul>
        
        <h3>🔧 Configuration Status:</h3>
        <ul>
          <li>API Token: ${PropertiesService.getScriptProperties().getProperty('API_TOKEN') ? '✅ Configured' : '❌ Missing'}</li>
          <li>Hidden Parser: ${PropertiesService.getScriptProperties().getProperty('HIDDEN_PARSER_URL') ? '✅ Configured' : '⚠️ Optional'}</li>
        </ul>
        
        <h3>📖 Example Request:</h3>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px;">
{
  "token": "your-api-token",
  "action": "listTabs",
  "spreadsheetId": "1uus7f...",
  "options": {
    "author": "user@example.com"
  }
}
        </pre>
        
        <p><em>Status: Ready for deployment</em></p>
      </body>
    </html>
  `);
}

/**
 * Main API endpoint - handles all POST requests
 */
function doPost(e) {
  try {
    // Parse request body
    const payload = JSON.parse(e.postData.contents);
    
    // Authenticate request
    if (!authenticateRequest(payload)) {
      return createErrorResponse('Unauthorized', 401);
    }
    
    // Quick validation
    const validationResult = quickValidate(payload);
    if (!validationResult.valid) {
      // Try hidden parser if available and validation failed
      if (validationResult.needsNormalization) {
        const normalizedPayload = tryHiddenParser(payload);
        if (normalizedPayload) {
          return processAction(normalizedPayload);
        }
      }
      return createErrorResponse('Validation failed', 422, validationResult.errors);
    }
    
    // Process the action
    return processAction(payload);
    
  } catch (error) {
    console.error('doPost error:', error);
    return createErrorResponse('Internal server error: ' + error.message, 500);
  }
}

/**
 * Authenticates the request using API token
 */
function authenticateRequest(payload) {
  const expectedToken = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
  if (!expectedToken) {
    console.error('API_TOKEN not configured in Script Properties');
    return false;
  }
  
  return payload.token === expectedToken;
}

/**
 * Quick validation of payload structure
 */
function quickValidate(payload) {
  const errors = [];
  let needsNormalization = false;
  
  if (!payload.action) {
    errors.push('action is required');
    needsNormalization = true;
  }
  
  // Action-specific validation
  switch (payload.action) {
    case 'listTabs':
    case 'fetchTabData':
    case 'updateCell':
    case 'addRow':
    case 'readRange':
      if (!payload.spreadsheetId) {
        errors.push('spreadsheetId is required');
        needsNormalization = true;
      }
      break;
    case 'discoverAll':
    case 'health':
      // No additional validation needed
      break;
    case 'batch':
      if (!payload.data || !Array.isArray(payload.data)) {
        errors.push('data array is required for batch operations');
      }
      break;
    default:
      errors.push('Unknown action: ' + payload.action);
  }
  
  return {
    valid: errors.length === 0,
    errors: errors,
    needsNormalization: needsNormalization
  };
}

/**
 * Attempts to normalize payload using hidden parser service
 */
function tryHiddenParser(payload) {
  const hiddenParserUrl = PropertiesService.getScriptProperties().getProperty('HIDDEN_PARSER_URL');
  if (!hiddenParserUrl) {
    console.log('Hidden parser not configured, skipping normalization');
    return null;
  }
  
  try {
    const response = UrlFetchApp.fetch(hiddenParserUrl + '/normalize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({ raw: payload }),
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      const result = JSON.parse(response.getContentText());
      if (result.ok && result.data) {
        console.log('Hidden parser successfully normalized payload');
        return result.data;
      }
    }
    
    console.log('Hidden parser failed to normalize payload');
    return null;
    
  } catch (error) {
    console.error('Hidden parser error:', error);
    return null;
  }
}

/**
 * Routes and processes actions
 */
function processAction(payload) {
  const { action, options = {} } = payload;
  
  try {
    let result;
    
    switch (action) {
      case 'listTabs':
        result = handleListTabs(payload.spreadsheetId, options);
        break;
      case 'fetchTabData':
        result = handleFetchTabData(payload.spreadsheetId, payload.tabName, options);
        break;
      case 'updateCell':
        result = handleUpdateCell(payload.spreadsheetId, payload.tabName, payload.range, payload.data, options);
        break;
      case 'addRow':
        result = handleAddRow(payload.spreadsheetId, payload.tabName, payload.data, options);
        break;
      case 'readRange':
        result = handleReadRange(payload.spreadsheetId, payload.tabName, payload.range, options);
        break;
      case 'discoverAll':
        result = handleDiscoverAll(options);
        break;
      case 'batch':
        result = handleBatch(payload.data, options);
        break;
      case 'health':
        result = handleHealth();
        break;
      default:
        return createErrorResponse('Unknown action: ' + action, 400);
    }
    
    return createSuccessResponse(result);
    
  } catch (error) {
    console.error('Action processing error:', error);
    return createErrorResponse('Action failed: ' + error.message, 500);
  }
}

/**
 * Lists all tabs in a spreadsheet
 */
function handleListTabs(spreadsheetId, options = {}) {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheets = spreadsheet.getSheets();
  
  const tabs = sheets.map(sheet => ({
    name: sheet.getName(),
    id: sheet.getSheetId(),
    index: sheet.getIndex(),
    rowCount: sheet.getLastRow(),
    columnCount: sheet.getLastColumn(),
    hidden: sheet.isSheetHidden()
  }));
  
  writeAudit('listTabs', { spreadsheetId, tabCount: tabs.length }, options.author);
  
  return {
    spreadsheetId: spreadsheetId,
    spreadsheetName: spreadsheet.getName(),
    sheets: tabs,
    timestamp: new Date().toISOString()
  };
}

/**
 * Fetches tab data with schema analysis
 */
function handleFetchTabData(spreadsheetId, tabName, options = {}) {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(tabName);
  
  if (!sheet) {
    throw new Error(`Tab "${tabName}" not found`);
  }
  
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  if (lastRow === 0 || lastCol === 0) {
    return {
      spreadsheetId: spreadsheetId,
      tabName: tabName,
      data: [],
      schema: {},
      isEmpty: true,
      timestamp: new Date().toISOString()
    };
  }
  
  // Get data range
  const range = sheet.getRange(1, 1, lastRow, lastCol);
  const values = range.getValues();
  
  // Detect headers and analyze schema
  const headers = detectHeaders(values);
  const schema = analyzeColumns(values, headers);
  
  // Convert to objects if headers detected
  let data = values;
  if (headers.detected) {
    data = values.slice(1).map(row => {
      const obj = {};
      headers.names.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
  }
  
  writeAudit('fetchTabData', { 
    spreadsheetId, 
    tabName, 
    rowCount: lastRow, 
    columnCount: lastCol 
  }, options.author);
  
  return {
    spreadsheetId: spreadsheetId,
    tabName: tabName,
    data: data,
    schema: schema,
    headers: headers,
    rowCount: lastRow,
    columnCount: lastCol,
    isEmpty: false,
    timestamp: new Date().toISOString()
  };
}

/**
 * Updates a single cell
 */
function handleUpdateCell(spreadsheetId, tabName, range, data, options = {}) {
  if (options.dryRun) {
    return {
      action: 'updateCell',
      spreadsheetId: spreadsheetId,
      tabName: tabName,
      range: range,
      data: data,
      dryRun: true,
      timestamp: new Date().toISOString()
    };
  }
  
  createSnapshotIfNeeded(spreadsheetId, tabName, options);
  
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(tabName);
  
  if (!sheet) {
    throw new Error(`Tab "${tabName}" not found`);
  }
  
  const cellRange = sheet.getRange(range);
  const sanitizedValue = sanitizeCell(data.value);
  
  cellRange.setValue(sanitizedValue);
  
  writeAudit('updateCell', {
    spreadsheetId,
    tabName,
    range,
    oldValue: cellRange.getValue(),
    newValue: sanitizedValue
  }, options.author);
  
  return {
    action: 'updateCell',
    spreadsheetId: spreadsheetId,
    tabName: tabName,
    range: range,
    success: true,
    timestamp: new Date().toISOString()
  };
}

/**
 * Adds a new row to a sheet
 */
function handleAddRow(spreadsheetId, tabName, data, options = {}) {
  if (options.dryRun) {
    return {
      action: 'addRow',
      spreadsheetId: spreadsheetId,
      tabName: tabName,
      data: data,
      dryRun: true,
      timestamp: new Date().toISOString()
    };
  }
  
  createSnapshotIfNeeded(spreadsheetId, tabName, options);
  
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(tabName);
  
  if (!sheet) {
    throw new Error(`Tab "${tabName}" not found`);
  }
  
  // Sanitize all values in the row
  const sanitizedData = Array.isArray(data) 
    ? data.map(sanitizeCell)
    : Object.values(data).map(sanitizeCell);
  
  sheet.appendRow(sanitizedData);
  
  writeAudit('addRow', {
    spreadsheetId,
    tabName,
    data: sanitizedData,
    newRowNumber: sheet.getLastRow()
  }, options.author);
  
  return {
    action: 'addRow',
    spreadsheetId: spreadsheetId,
    tabName: tabName,
    rowNumber: sheet.getLastRow(),
    success: true,
    timestamp: new Date().toISOString()
  };
}

/**
 * Reads a specific range
 */
function handleReadRange(spreadsheetId, tabName, range, options = {}) {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(tabName);
  
  if (!sheet) {
    throw new Error(`Tab "${tabName}" not found`);
  }
  
  const cellRange = sheet.getRange(range);
  const values = cellRange.getValues();
  
  writeAudit('readRange', {
    spreadsheetId,
    tabName,
    range,
    cellCount: values.length * (values[0] ? values[0].length : 0)
  }, options.author);
  
  return {
    spreadsheetId: spreadsheetId,
    tabName: tabName,
    range: range,
    data: values,
    timestamp: new Date().toISOString()
  };
}

/**
 * Discovers all accessible spreadsheets
 */
function handleDiscoverAll(options = {}) {
  const files = DriveApp.getFilesByType(MimeType.GOOGLE_SHEETS);
  const spreadsheets = [];
  
  while (files.hasNext() && spreadsheets.length < 50) { // Limit to 50 for performance
    const file = files.next();
    try {
      spreadsheets.push({
        id: file.getId(),
        name: file.getName(),
        url: file.getUrl(),
        lastModified: file.getLastUpdated().toISOString(),
        owner: file.getOwner().getEmail()
      });
    } catch (error) {
      // Skip files we can't access
      console.log('Skipping inaccessible file:', file.getName());
    }
  }
  
  writeAudit('discoverAll', { count: spreadsheets.length }, options.author);
  
  return {
    spreadsheets: spreadsheets,
    count: spreadsheets.length,
    timestamp: new Date().toISOString()
  };
}

/**
 * Handles batch operations
 */
function handleBatch(actions, options = {}) {
  const results = [];
  
  for (const action of actions) {
    try {
      const result = processAction({ ...action, options });
      results.push({
        success: true,
        action: action.action,
        result: result
      });
    } catch (error) {
      results.push({
        success: false,
        action: action.action,
        error: error.message
      });
    }
  }
  
  writeAudit('batch', { actionCount: actions.length, successCount: results.filter(r => r.success).length }, options.author);
  
  return {
    results: results,
    totalActions: actions.length,
    successCount: results.filter(r => r.success).length,
    timestamp: new Date().toISOString()
  };
}

/**
 * Health check endpoint
 */
function handleHealth() {
  const properties = PropertiesService.getScriptProperties();
  
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    configuration: {
      apiToken: !!properties.getProperty('API_TOKEN'),
      hiddenParser: !!properties.getProperty('HIDDEN_PARSER_URL')
    },
    version: '1.0.0'
  };
}

/**
 * Detects if first row contains headers
 */
function detectHeaders(values) {
  if (values.length === 0) {
    return { detected: false, names: [] };
  }
  
  const firstRow = values[0];
  const hasHeaders = firstRow.every(cell => 
    typeof cell === 'string' && 
    cell.trim().length > 0 && 
    !/^\d+$/.test(cell.trim())
  );
  
  return {
    detected: hasHeaders,
    names: hasHeaders ? firstRow.map(cell => cell.toString().trim()) : []
  };
}

/**
 * Analyzes column types and patterns
 */
function analyzeColumns(values, headers) {
  if (values.length <= 1) {
    return {};
  }
  
  const schema = {};
  const dataRows = headers.detected ? values.slice(1) : values;
  const columnNames = headers.detected ? headers.names : values[0].map((_, i) => `Column${i + 1}`);
  
  columnNames.forEach((name, index) => {
    const columnData = dataRows.map(row => row[index]).filter(cell => cell !== null && cell !== '');
    
    if (columnData.length === 0) {
      schema[name] = { type: 'empty', samples: [] };
      return;
    }
    
    // Analyze data types
    const types = {
      number: 0,
      date: 0,
      boolean: 0,
      string: 0
    };
    
    columnData.forEach(cell => {
      if (typeof cell === 'number') {
        types.number++;
      } else if (cell instanceof Date) {
        types.date++;
      } else if (typeof cell === 'boolean') {
        types.boolean++;
      } else {
        types.string++;
      }
    });
    
    const totalCells = columnData.length;
    const dominantType = Object.keys(types).reduce((a, b) => types[a] > types[b] ? a : b);
    
    schema[name] = {
      type: dominantType,
      confidence: types[dominantType] / totalCells,
      samples: columnData.slice(0, 3),
      uniqueValues: [...new Set(columnData)].length,
      totalValues: totalCells
    };
  });
  
  return schema;
}

/**
 * Sanitizes cell values to prevent formula injection
 */
function sanitizeCell(value) {
  if (typeof value !== 'string') {
    return value;
  }
  
  // Remove leading = + - @ to prevent formula injection
  if (/^[=+\-@]/.test(value)) {
    return "'" + value; // Prefix with single quote to make it literal
  }
  
  return value;
}

/**
 * Creates audit log entry
 */
function writeAudit(action, details, author = 'unknown') {
  try {
    const metaSpreadsheetId = PropertiesService.getScriptProperties().getProperty(META_SPREADSHEET_PROP);
    if (!metaSpreadsheetId) {
      console.log('Meta spreadsheet not configured, skipping audit');
      return;
    }
    
    const metaSpreadsheet = SpreadsheetApp.openById(metaSpreadsheetId);
    let auditSheet = metaSpreadsheet.getSheetByName(AUDIT_SHEET_NAME);
    
    if (!auditSheet) {
      auditSheet = metaSpreadsheet.insertSheet(AUDIT_SHEET_NAME);
      auditSheet.getRange(1, 1, 1, 6).setValues([
        ['Timestamp', 'Action', 'Author', 'Details', 'Session', 'Status']
      ]);
    }
    
    auditSheet.appendRow([
      new Date(),
      action,
      author,
      JSON.stringify(details),
      Session.getActiveUser().getEmail(),
      'success'
    ]);
    
  } catch (error) {
    console.error('Audit logging failed:', error);
  }
}

/**
 * Creates snapshot before write operations
 */
function createSnapshotIfNeeded(spreadsheetId, tabName, options = {}) {
  if (options.skipSnapshot) {
    return;
  }
  
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(tabName);
    
    if (!sheet) {
      return;
    }
    
    // Create snapshot folder if it doesn't exist
    const folders = DriveApp.getFoldersByName(SNAPSHOT_FOLDER_NAME);
    let snapshotFolder;
    
    if (folders.hasNext()) {
      snapshotFolder = folders.next();
    } else {
      snapshotFolder = DriveApp.createFolder(SNAPSHOT_FOLDER_NAME);
    }
    
    // Create a copy of the spreadsheet
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotName = `${spreadsheet.getName()}_${tabName}_${timestamp}`;
    
    const file = DriveApp.getFileById(spreadsheetId);
    const snapshot = file.makeCopy(snapshotName, snapshotFolder);
    
    console.log(`Snapshot created: ${snapshot.getId()}`);
    
  } catch (error) {
    console.error('Snapshot creation failed:', error);
  }
}

/**
 * Creates success response
 */
function createSuccessResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      ...data
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Creates error response
 */
function createErrorResponse(message, code = 400, details = null) {
  const response = {
    success: false,
    error: message,
    code: code
  };
  
  if (details) {
    response.details = details;
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}