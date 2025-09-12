/**
 * Google Apps Script Template for Smart Spreadsheet Assistant
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Copy this entire file content
 * 2. Go to https://script.google.com
 * 3. Create a new project
 * 4. Replace the default Code.gs content with this code
 * 5. Save the project
 * 6. Deploy as web app:
 *    - New deployment > Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 7. Copy the web app URL and use it in your React app
 * 
 * IMPORTANT: This template is production-ready but requires proper configuration
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
      <body>
        <h1>Smart Spreadsheet Assistant API</h1>
        <p>This is the backend service for the Smart Spreadsheet Assistant.</p>
        <p>Send POST requests with JSON payload to interact with Google Sheets.</p>
        <h3>Supported Actions:</h3>
        <ul>
          <li>listTabs - List all tabs in a spreadsheet</li>
          <li>fetchTabData - Fetch tab data with schema analysis</li>
          <li>updateCell - Update a single cell</li>
          <li>addRow - Add a new row</li>
          <li>readRange - Read a specific range</li>
          <li>discoverAll - Discover accessible spreadsheets</li>
        </ul>
      </body>
    </html>
  `);
}

/**
 * Main API endpoint - handles all POST requests
 */
function doPost(e) {
  try {
    // Validate request
    if (!e?.postData?.contents) {
      return jsonResponse(400, { success: false, error: 'No request body provided' });
    }

    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return jsonResponse(400, { success: false, error: 'Invalid JSON in request body' });
    }

    // Validate action
    if (!payload.action) {
      return jsonResponse(400, { success: false, error: 'Missing required field: action' });
    }

    const allowedActions = ['listTabs', 'fetchTabData', 'updateCell', 'addRow', 'readRange', 'discoverAll'];
    if (!allowedActions.includes(payload.action)) {
      return jsonResponse(400, { success: false, error: `Unknown action: ${payload.action}` });
    }

    // Quick validation
    const validation = quickValidate(payload);
    if (!validation.valid) {
      return jsonResponse(422, { 
        success: false, 
        error: 'Validation failed', 
        details: validation.errors 
      });
    }

    // Route to appropriate handler
    switch (payload.action) {
      case 'listTabs':
        return handleListTabs(payload);
      case 'fetchTabData':
        return handleFetchTabData(payload);
      case 'readRange':
        return handleReadRange(payload);
      case 'updateCell':
        return handleUpdateCell(payload);
      case 'addRow':
        return handleAddRow(payload);
      case 'discoverAll':
        return handleDiscoverAll(payload);
      default:
        return jsonResponse(400, { success: false, error: 'Unhandled action' });
    }

  } catch (error) {
    console.error('doPost error:', error);
    return jsonResponse(500, { 
      success: false, 
      error: 'Internal server error: ' + String(error) 
    });
  }
}

/**
 * Lists all tabs in a spreadsheet
 */
function handleListTabs(payload) {
  const { spreadsheetId } = payload;
  
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheets = spreadsheet.getSheets();
    
    const tabList = sheets.map(sheet => ({
      name: sheet.getName(),
      gid: sheet.getSheetId(),
      rows: sheet.getMaxRows(),
      cols: sheet.getMaxColumns(),
      hidden: sheet.isSheetHidden()
    }));

    return jsonResponse(200, { 
      success: true, 
      sheets: tabList,
      spreadsheetName: spreadsheet.getName()
    });
    
  } catch (error) {
    console.error('handleListTabs error:', error);
    
    if (error.message.includes('Requested entity was not found')) {
      return jsonResponse(404, { success: false, error: 'Spreadsheet not found or access denied' });
    }
    
    return jsonResponse(400, { 
      success: false, 
      error: 'Failed to access spreadsheet: ' + String(error) 
    });
  }
}

/**
 * Fetches tab data with schema analysis
 */
function handleFetchTabData(payload) {
  const { spreadsheetId, tabName, options = {} } = payload;
  const sampleMaxRows = options.sampleMaxRows || 500;

  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(tabName);
    
    if (!sheet) {
      return jsonResponse(404, { success: false, error: `Tab '${tabName}' not found` });
    }

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    if (lastRow === 0 || lastCol === 0) {
      return jsonResponse(200, {
        success: true,
        data: {
          sheetName: tabName,
          dimensions: { rows: 0, cols: 0, sampledRows: 0 },
          headers: [],
          schema: [],
          sampleValues: []
        }
      });
    }

    // Determine data range to sample
    const sampleRows = Math.min(lastRow, sampleMaxRows);
    const dataRange = `A1:${columnToLetter(lastCol)}${sampleRows}`;
    const values = sheet.getRange(dataRange).getValues();

    // Detect headers
    const headerInfo = detectHeaders(values);
    
    // Analyze schema
    const schema = analyzeColumns(values, headerInfo);

    return jsonResponse(200, {
      success: true,
      data: {
        sheetName: tabName,
        dimensions: { 
          rows: lastRow, 
          cols: lastCol, 
          sampledRows: sampleRows 
        },
        headers: headerInfo.detected,
        headerRowIndex: headerInfo.headerRowIndex,
        schema: schema,
        sampleValues: values
      }
    });

  } catch (error) {
    console.error('handleFetchTabData error:', error);
    return jsonResponse(400, { 
      success: false, 
      error: 'Failed to fetch tab data: ' + String(error) 
    });
  }
}

/**
 * Reads a specific range
 */
function handleReadRange(payload) {
  const { spreadsheetId, tabName, range } = payload;

  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(tabName);
    
    if (!sheet) {
      return jsonResponse(404, { success: false, error: `Tab '${tabName}' not found` });
    }

    const values = sheet.getRange(range).getValues();

    return jsonResponse(200, {
      success: true,
      data: {
        range: range,
        values: values,
        sheetName: tabName
      }
    });

  } catch (error) {
    console.error('handleReadRange error:', error);
    return jsonResponse(400, { 
      success: false, 
      error: 'Failed to read range: ' + String(error) 
    });
  }
}

/**
 * Updates a single cell
 */
function handleUpdateCell(payload) {
  const { spreadsheetId, tabName, range, data, options = {} } = payload;
  const value = data?.value;

  // Handle dry run
  if (options.dryRun) {
    return jsonResponse(200, {
      success: true,
      dryRun: true,
      preview: {
        action: 'updateCell',
        spreadsheetId,
        tabName,
        range,
        newValue: sanitizeCell(value)
      }
    });
  }

  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(tabName);
    
    if (!sheet) {
      return jsonResponse(404, { success: false, error: `Tab '${tabName}' not found` });
    }

    // Create snapshot if needed
    const snapshot = createSnapshotIfNeeded(spreadsheet, sheet, 'updateCell');

    // Sanitize and set value
    const sanitizedValue = sanitizeCell(value);
    sheet.getRange(range).setValue(sanitizedValue);

    // Log the operation
    writeAudit({
      action: 'updateCell',
      target: { spreadsheetId, tabName, range },
      data: { value: sanitizedValue },
      options: options
    }, {
      message: 'Cell updated successfully',
      snapshot: snapshot
    });

    return jsonResponse(200, {
      success: true,
      result: {
        range: range,
        newValue: sanitizedValue,
        snapshot: snapshot
      }
    });

  } catch (error) {
    console.error('handleUpdateCell error:', error);
    return jsonResponse(400, { 
      success: false, 
      error: 'Failed to update cell: ' + String(error) 
    });
  }
}

/**
 * Adds a new row
 */
function handleAddRow(payload) {
  const { spreadsheetId, tabName, data, options = {} } = payload;

  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(tabName);
    
    if (!sheet) {
      return jsonResponse(404, { success: false, error: `Tab '${tabName}' not found` });
    }

    // Prepare row data
    let rowData = [];
    
    if (Array.isArray(data)) {
      rowData = data.map(cell => sanitizeCell(cell));
    } else if (typeof data === 'object' && data !== null) {
      // Map object keys to column positions
      const lastCol = sheet.getLastColumn();
      const headerValues = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
      
      rowData = headerValues.map(header => {
        const value = data[header];
        return sanitizeCell(value || '');
      });
    } else {
      return jsonResponse(400, { success: false, error: 'Invalid data format for addRow' });
    }

    // Handle dry run
    if (options.dryRun) {
      return jsonResponse(200, {
        success: true,
        dryRun: true,
        preview: rowData
      });
    }

    // Create snapshot if needed
    const snapshot = createSnapshotIfNeeded(spreadsheet, sheet, 'addRow');

    // Add the row
    sheet.appendRow(rowData);

    // Log the operation
    writeAudit({
      action: 'addRow',
      target: { spreadsheetId, tabName },
      data: { appendedRow: rowData },
      options: options
    }, {
      message: 'Row added successfully',
      snapshot: snapshot
    });

    return jsonResponse(200, {
      success: true,
      result: {
        appended: 1,
        rowData: rowData,
        snapshot: snapshot
      }
    });

  } catch (error) {
    console.error('handleAddRow error:', error);
    return jsonResponse(400, { 
      success: false, 
      error: 'Failed to add row: ' + String(error) 
    });
  }
}

/**
 * Discovers all accessible spreadsheets (limited for performance)
 */
function handleDiscoverAll(payload) {
  try {
    const files = DriveApp.searchFiles(
      "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false"
    );
    
    const result = { 
      files: [], 
      totalSheets: 0, 
      lastDiscovered: new Date().toISOString() 
    };
    
    let count = 0;
    const maxFiles = 50; // Limit for performance

    while (files.hasNext() && count < maxFiles) {
      try {
        const file = files.next();
        const spreadsheet = SpreadsheetApp.openById(file.getId());
        const sheets = spreadsheet.getSheets();
        
        const fileInfo = {
          id: file.getId(),
          name: file.getName(),
          url: file.getUrl(),
          lastModified: file.getLastUpdated().toISOString(),
          sheets: sheets.map(sheet => ({
            name: sheet.getName(),
            gid: sheet.getSheetId(),
            hidden: sheet.isSheetHidden()
          }))
        };
        
        result.files.push(fileInfo);
        result.totalSheets += sheets.length;
        count++;
        
      } catch (error) {
        console.warn('Error processing file during discovery:', error);
        // Continue with next file
      }
    }

    return jsonResponse(200, { success: true, data: result });

  } catch (error) {
    console.error('handleDiscoverAll error:', error);
    return jsonResponse(400, { 
      success: false, 
      error: 'Discovery failed: ' + String(error) 
    });
  }
}

/**
 * Utility Functions
 */

function jsonResponse(status, body) {
  const output = ContentService.createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
  // Note: Apps Script doesn't allow setting HTTP status codes directly
  return output;
}

function quickValidate(payload) {
  const errors = [];
  const { action, spreadsheetId, tabName, range } = payload;

  if (!action) {
    errors.push('action is required');
  }

  if (action !== 'discoverAll' && !spreadsheetId) {
    errors.push('spreadsheetId is required');
  }

  const needsTab = ['fetchTabData', 'updateCell', 'addRow', 'readRange'];
  if (needsTab.includes(action) && !tabName) {
    errors.push(`tabName is required for ${action}`);
  }

  if (action === 'updateCell' && !range) {
    errors.push('range is required for updateCell');
  }

  return { valid: errors.length === 0, errors: errors };
}

function detectHeaders(values) {
  if (!values || values.length === 0) {
    return { detected: [], headerRowIndex: -1, confidence: 0 };
  }

  const maxRowsToCheck = Math.min(3, values.length);
  
  for (let rowIndex = 0; rowIndex < maxRowsToCheck; rowIndex++) {
    const row = values[rowIndex] || [];
    const confidence = calculateHeaderConfidence(row, values, rowIndex);
    
    if (confidence > 0.7) {
      const normalizedHeaders = row.map(cell => 
        String(cell || '').trim() || `Column${row.indexOf(cell) + 1}`
      );
      
      return { 
        detected: normalizedHeaders, 
        headerRowIndex: rowIndex, 
        confidence: confidence 
      };
    }
  }

  // Fallback: generate generic headers
  const maxCols = Math.max(...values.map(row => row.length));
  const generatedHeaders = [];
  for (let i = 0; i < maxCols; i++) {
    generatedHeaders.push(`Column${i + 1}`);
  }

  return { 
    detected: generatedHeaders, 
    headerRowIndex: 0, 
    confidence: 0.3,
    generated: true 
  };
}

function calculateHeaderConfidence(row, values, rowIndex) {
  if (!row || row.length === 0) return 0;

  let nonEmptyCount = 0;
  let stringCount = 0;
  const normalized = [];

  row.forEach(cell => {
    const str = String(cell || '').trim();
    if (str !== '') nonEmptyCount++;
    if (str !== '' && isNaN(cell)) stringCount++;
    normalized.push(str.toLowerCase());
  });

  const uniqueCount = new Set(normalized).size;
  const nonEmptyRatio = nonEmptyCount / Math.max(1, row.length);
  const stringRatio = stringCount / Math.max(1, row.length);
  const uniqueRatio = uniqueCount / Math.max(1, row.length);

  return Math.min(1, (nonEmptyRatio * 0.5) + (stringRatio * 0.3) + (uniqueRatio * 0.2));
}

function analyzeColumns(values, headerInfo) {
  const headers = headerInfo.detected || [];
  const startRow = Math.max(0, (headerInfo.headerRowIndex || 0) + 1);
  const analysis = [];

  for (let colIndex = 0; colIndex < headers.length; colIndex++) {
    const columnData = [];
    
    for (let rowIndex = startRow; rowIndex < values.length; rowIndex++) {
      const row = values[rowIndex] || [];
      const cellValue = row[colIndex];
      
      if (cellValue !== null && cellValue !== undefined && String(cellValue).trim() !== '') {
        columnData.push(cellValue);
      }
    }

    const dataType = detectColumnDataType(columnData);
    const stats = calculateColumnStats(columnData);
    const inputType = suggestInputType(dataType);

    analysis.push({
      name: headers[colIndex] || `Column${colIndex + 1}`,
      index: colIndex,
      letter: columnToLetter(colIndex + 1),
      dataType: dataType,
      stats: stats,
      inputType: inputType
    });
  }

  return analysis;
}

function detectColumnDataType(data) {
  if (!data || data.length === 0) {
    return { type: 'empty', confidence: 1 };
  }

  const counts = { number: 0, date: 0, email: 0, url: 0, boolean: 0, text: 0 };
  
  data.forEach(value => {
    const str = String(value).trim();
    if (str === '') return;

    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
      counts.email++;
    } else if (/^https?:\/\/.+/.test(str)) {
      counts.url++;
    } else if (/^(true|false|yes|no|1|0)$/i.test(str)) {
      counts.boolean++;
    } else if (!isNaN(Number(str)) && isFinite(Number(str))) {
      counts.number++;
    } else if (!isNaN(Date.parse(str))) {
      counts.date++;
    } else {
      counts.text++;
    }
  });

  const total = Math.max(1, Object.values(counts).reduce((a, b) => a + b, 0));
  let bestType = { type: 'text', confidence: 0.5 };

  Object.entries(counts).forEach(([type, count]) => {
    const confidence = count / total;
    if (confidence > bestType.confidence) {
      bestType = { type, confidence };
    }
  });

  return bestType;
}

function calculateColumnStats(data) {
  const nonEmptyCount = (data || []).filter(value => 
    value !== null && value !== undefined && String(value).trim() !== ''
  ).length;

  return {
    nonEmpty: nonEmptyCount,
    sampleValues: (data || []).slice(0, 5)
  };
}

function suggestInputType(dataType) {
  const typeMap = {
    'number': 'number',
    'date': 'date',
    'email': 'email',
    'url': 'url',
    'boolean': 'checkbox'
  };
  
  return typeMap[dataType.type] || 'text';
}

function columnToLetter(columnNumber) {
  let result = '';
  
  while (columnNumber > 0) {
    const remainder = (columnNumber - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    columnNumber = Math.floor((columnNumber - 1) / 26);
  }
  
  return result;
}

function sanitizeCell(value) {
  if (value === null || value === undefined) return '';
  
  const str = String(value);
  
  // Prevent formula injection
  if (/^[=+\-@]/.test(str)) {
    return "'" + str;
  }
  
  return str;
}

function createSnapshotIfNeeded(spreadsheet, sheet, action) {
  const snapshotActions = ['updateCell', 'addRow'];
  if (!snapshotActions.includes(action)) return null;

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotName = `${spreadsheet.getName()}_snapshot_${timestamp}`;
    const copy = spreadsheet.copy(snapshotName);
    
    // Move to snapshots folder
    const file = DriveApp.getFileById(copy.getId());
    const folder = getOrCreateSnapshotFolder();
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);
    
    return {
      snapshotId: copy.getId(),
      snapshotName: snapshotName,
      created: new Date().toISOString()
    };
  } catch (error) {
    console.warn('Snapshot creation failed:', error);
    return null;
  }
}

function getOrCreateSnapshotFolder() {
  const folders = DriveApp.getFoldersByName(SNAPSHOT_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(SNAPSHOT_FOLDER_NAME);
}

function writeAudit(operation, result) {
  try {
    const metaSpreadsheet = getOrCreateMetaSpreadsheet();
    let auditSheet = metaSpreadsheet.getSheetByName(AUDIT_SHEET_NAME);
    
    if (!auditSheet) {
      auditSheet = metaSpreadsheet.insertSheet(AUDIT_SHEET_NAME);
      // Add headers
      auditSheet.appendRow([
        'Timestamp', 'Author', 'Action', 'Target', 'Data', 'Result', 'Notes'
      ]);
    }

    const auditRow = [
      new Date().toISOString(),
      operation.options?.author || 'unknown',
      operation.action,
      JSON.stringify(operation.target || {}),
      JSON.stringify(operation.data || {}),
      JSON.stringify(result || {}),
      result.message || ''
    ];

    auditSheet.appendRow(auditRow);
  } catch (error) {
    console.warn('Audit logging failed:', error);
  }
}

function getOrCreateMetaSpreadsheet() {
  const properties = PropertiesService.getScriptProperties();
  const metaId = properties.getProperty(META_SPREADSHEET_PROP);

  if (metaId) {
    try {
      return SpreadsheetApp.openById(metaId);
    } catch (error) {
      console.warn('Could not open existing meta spreadsheet:', error);
    }
  }

  // Create new meta spreadsheet
  const metaSpreadsheet = SpreadsheetApp.create('__SSA_META_SPREADSHEET__');
  properties.setProperty(META_SPREADSHEET_PROP, metaSpreadsheet.getId());
  
  return metaSpreadsheet;
}