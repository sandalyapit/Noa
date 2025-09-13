/**
 * Google Apps Script Web App for Smart Spreadsheet Assistant
 * This file should be deployed as a Web App in Google Apps Script
 * 
 * Setup Instructions:
 * 1. Create a new Google Apps Script project
 * 2. Replace Code.gs content with this file
 * 3. Set up Script Properties:
 *    - API_TOKEN: Your secure API token
 *    - HIDDEN_PARSER_URL: Optional URL for hidden parser service
 * 4. Deploy as Web App with "Execute as: Me" and "Who has access: Anyone"
 * 5. Copy the Web App URL to your frontend configuration
 */

/**
 * Main entry point for POST requests
 * Handles all spreadsheet operations with token authentication
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonOut({ success: false, error: 'Missing request body', code: 400 });
    }

    var payload = JSON.parse(e.postData.contents);
    var props = PropertiesService.getScriptProperties();
    var apiToken = props.getProperty('API_TOKEN');

    // Token verification
    if (!payload.token || payload.token !== apiToken) {
      return jsonOut({ success: false, error: 'Unauthorized (invalid token)', code: 401 });
    }

    // Quick validation
    var validation = quickValidate(payload);
    if (!validation.valid) {
      // Try hidden parser if configured and validation failed
      var parserUrl = props.getProperty('HIDDEN_PARSER_URL');
      if (parserUrl && payload.raw) {
        var normalized = callHiddenParser(parserUrl, payload.raw || payload);
        if (normalized && normalized.ok && normalized.data) {
          payload = normalized.data; // Use normalized payload
        } else {
          return jsonOut({ 
            success: false, 
            error: 'Validation failed', 
            details: validation.errors,
            needsNormalization: true,
            code: 422 
          });
        }
      } else {
        return jsonOut({ 
          success: false, 
          error: 'Validation failed', 
          details: validation.errors,
          code: 422 
        });
      }
    }

    // Route to appropriate handler
    var action = payload.action;
    switch(action) {
      case 'listTabs': return handleListTabs(payload);
      case 'fetchTabData': return handleFetchTabData(payload);
      case 'addRow': return handleAddRow(payload);
      case 'updateCell': return handleUpdateCell(payload);
      case 'readRange': return handleReadRange(payload);
      case 'discoverAll': return handleDiscoverAll(payload);
      case 'batch': return handleBatch(payload);
      case 'health': return handleHealth(payload);
      default: return jsonOut({ success: false, error: 'Unknown action', code: 400 });
    }
  } catch (err) {
    console.error('doPost fatal error:', err);
    return jsonOut({ success: false, error: String(err), code: 500 });
  }
}

/**
 * Calls hidden parser for data normalization
 */
function callHiddenParser(parserUrl, rawPayload) {
  try {
    var resp = UrlFetchApp.fetch(parserUrl + '/normalize', {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      payload: JSON.stringify({ raw: rawPayload })
    });
    return JSON.parse(resp.getContentText());
  } catch (e) {
    console.error('Hidden parser error:', e);
    return { ok: false, error: String(e) };
  }
}

/**
 * Quick payload validation
 */
function quickValidate(payload) {
  var allowedActions = ['listTabs', 'fetchTabData', 'updateCell', 'addRow', 'readRange', 'discoverAll', 'batch', 'health'];
  var errors = [];
  
  if (!payload.action) {
    errors.push('Action is required');
  } else if (allowedActions.indexOf(payload.action) === -1) {
    errors.push('Invalid action: ' + payload.action);
  }
  
  var needsSpreadsheetId = ['listTabs', 'fetchTabData', 'updateCell', 'addRow', 'readRange'];
  if (needsSpreadsheetId.indexOf(payload.action) !== -1 && !payload.spreadsheetId) {
    errors.push('spreadsheetId is required for this action');
  }
  
  var needsTab = ['fetchTabData', 'updateCell', 'addRow', 'readRange'];
  if (needsTab.indexOf(payload.action) !== -1 && !payload.tabName) {
    errors.push('tabName is required for this action');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Lists all tabs in a spreadsheet
 */
function handleListTabs(payload) {
  try {
    var spreadsheet = SpreadsheetApp.openById(payload.spreadsheetId);
    var sheets = spreadsheet.getSheets();
    var sheetInfo = sheets.map(function(sheet) {
      return {
        name: sheet.getName(),
        gid: sheet.getSheetId(),
        rows: sheet.getLastRow(),
        cols: sheet.getLastColumn(),
        hidden: sheet.isSheetHidden()
      };
    });
    
    return jsonOut({ 
      success: true, 
      sheets: sheetInfo,
      spreadsheetName: spreadsheet.getName(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return jsonOut({ success: false, error: String(error), code: 500 });
  }
}

/**
 * Fetches tab data with schema analysis
 */
function handleFetchTabData(payload) {
  try {
    var spreadsheet = SpreadsheetApp.openById(payload.spreadsheetId);
    var sheet = spreadsheet.getSheetByName(payload.tabName);
    
    if (!sheet) {
      return jsonOut({ success: false, error: 'Sheet not found: ' + payload.tabName, code: 404 });
    }
    
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    
    if (lastRow === 0 || lastCol === 0) {
      return jsonOut({ 
        success: true, 
        data: {
          sheetName: payload.tabName,
          dimensions: { rows: 0, cols: 0 },
          headers: [],
          sampleValues: [],
          schema: []
        }
      });
    }
    
    // Get headers (first row)
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    
    // Get sample data (limited by sampleMaxRows option)
    var sampleMaxRows = (payload.options && payload.options.sampleMaxRows) || 100;
    var sampleRows = Math.min(lastRow, sampleMaxRows + 1); // +1 for headers
    var sampleValues = sheet.getRange(1, 1, sampleRows, lastCol).getValues();
    
    // Basic schema analysis
    var schema = analyzeSchema(headers, sampleValues.slice(1)); // Skip header row
    
    return jsonOut({ 
      success: true, 
      data: {
        sheetName: payload.tabName,
        dimensions: { rows: lastRow, cols: lastCol },
        headers: headers,
        sampleValues: sampleValues,
        schema: schema,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return jsonOut({ success: false, error: String(error), code: 500 });
  }
}

/**
 * Adds a row to the spreadsheet
 */
function handleAddRow(payload) {
  try {
    var spreadsheet = SpreadsheetApp.openById(payload.spreadsheetId);
    var sheet = spreadsheet.getSheetByName(payload.tabName);
    
    if (!sheet) {
      return jsonOut({ success: false, error: 'Sheet not found: ' + payload.tabName, code: 404 });
    }
    
    // Check for dry run
    if (payload.options && payload.options.dryRun) {
      return jsonOut({ 
        success: true, 
        dryRun: true,
        message: 'Dry run - no data was actually added',
        wouldAdd: payload.data
      });
    }
    
    var rowData = Array.isArray(payload.data) ? payload.data : Object.values(payload.data);
    var lastRow = sheet.getLastRow();
    var targetRow = lastRow + 1;
    
    sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
    
    return jsonOut({ 
      success: true, 
      addedRow: targetRow,
      data: rowData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return jsonOut({ success: false, error: String(error), code: 500 });
  }
}

/**
 * Updates a single cell
 */
function handleUpdateCell(payload) {
  try {
    var spreadsheet = SpreadsheetApp.openById(payload.spreadsheetId);
    var sheet = spreadsheet.getSheetByName(payload.tabName);
    
    if (!sheet) {
      return jsonOut({ success: false, error: 'Sheet not found: ' + payload.tabName, code: 404 });
    }
    
    // Check for dry run
    if (payload.options && payload.options.dryRun) {
      return jsonOut({ 
        success: true, 
        dryRun: true,
        message: 'Dry run - no data was actually updated',
        wouldUpdate: { range: payload.range, value: payload.data.value }
      });
    }
    
    var range = sheet.getRange(payload.range);
    range.setValue(payload.data.value);
    
    return jsonOut({ 
      success: true, 
      updatedRange: payload.range,
      value: payload.data.value,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return jsonOut({ success: false, error: String(error), code: 500 });
  }
}

/**
 * Reads a specific range
 */
function handleReadRange(payload) {
  try {
    var spreadsheet = SpreadsheetApp.openById(payload.spreadsheetId);
    var sheet = spreadsheet.getSheetByName(payload.tabName);
    
    if (!sheet) {
      return jsonOut({ success: false, error: 'Sheet not found: ' + payload.tabName, code: 404 });
    }
    
    var range = sheet.getRange(payload.range);
    var values = range.getValues();
    
    return jsonOut({ 
      success: true, 
      range: payload.range,
      values: values,
      dimensions: { rows: values.length, cols: values[0] ? values[0].length : 0 },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return jsonOut({ success: false, error: String(error), code: 500 });
  }
}

/**
 * Discovers all accessible spreadsheets
 */
function handleDiscoverAll(payload) {
  try {
    var files = DriveApp.getFilesByType(MimeType.GOOGLE_SHEETS);
    var spreadsheets = [];
    
    while (files.hasNext() && spreadsheets.length < 50) { // Limit to 50 for performance
      var file = files.next();
      spreadsheets.push({
        id: file.getId(),
        name: file.getName(),
        url: file.getUrl(),
        lastModified: file.getLastUpdated().toISOString(),
        owner: file.getOwner().getEmail()
      });
    }
    
    return jsonOut({ 
      success: true, 
      spreadsheets: spreadsheets,
      count: spreadsheets.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return jsonOut({ success: false, error: String(error), code: 500 });
  }
}

/**
 * Handles batch operations
 */
function handleBatch(payload) {
  try {
    if (!Array.isArray(payload.data)) {
      return jsonOut({ success: false, error: 'Batch data must be an array', code: 400 });
    }
    
    var results = [];
    var errors = [];
    
    for (var i = 0; i < payload.data.length; i++) {
      var action = payload.data[i];
      try {
        var result = null;
        switch(action.action) {
          case 'updateCell': result = handleUpdateCell(action); break;
          case 'addRow': result = handleAddRow(action); break;
          case 'readRange': result = handleReadRange(action); break;
          default: 
            errors.push({ index: i, error: 'Unknown action: ' + action.action });
            continue;
        }
        results.push({ index: i, result: JSON.parse(result.getContent()) });
      } catch (error) {
        errors.push({ index: i, error: String(error) });
      }
    }
    
    return jsonOut({ 
      success: errors.length === 0, 
      results: results,
      errors: errors,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return jsonOut({ success: false, error: String(error), code: 500 });
  }
}

/**
 * Health check endpoint
 */
function handleHealth(payload) {
  return jsonOut({ 
    success: true, 
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: 'N/A' // Apps Script doesn't have uptime concept
  });
}

/**
 * Basic schema analysis
 */
function analyzeSchema(headers, dataRows) {
  var schema = [];
  
  for (var col = 0; col < headers.length; col++) {
    var columnData = dataRows.map(function(row) { return row[col]; });
    var nonEmptyData = columnData.filter(function(val) { return val !== null && val !== undefined && val !== ''; });
    
    var dataType = 'text';
    if (nonEmptyData.length > 0) {
      var sample = nonEmptyData[0];
      if (typeof sample === 'number') {
        dataType = 'number';
      } else if (sample instanceof Date) {
        dataType = 'date';
      } else if (typeof sample === 'boolean') {
        dataType = 'boolean';
      }
    }
    
    schema.push({
      name: headers[col],
      index: col,
      dataType: { type: dataType },
      stats: {
        total: dataRows.length,
        nonEmpty: nonEmptyData.length,
        empty: dataRows.length - nonEmptyData.length
      }
    });
  }
  
  return schema;
}

/**
 * Creates JSON response
 */
function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Setup function - run this once to set your API token
 * Replace 'your-secure-api-token-here' with a long, random string
 */
function setupApiToken() {
  var token = 'your-secure-api-token-here'; // Generate a secure random token
  PropertiesService.getScriptProperties().setProperty('API_TOKEN', token);
  console.log('API token set successfully');
}

/**
 * Setup function for hidden parser URL (optional)
 * Replace with your actual hidden parser service URL
 */
function setupHiddenParser() {
  var parserUrl = 'https://your-hidden-parser-service.com';
  PropertiesService.getScriptProperties().setProperty('HIDDEN_PARSER_URL', parserUrl);
  console.log('Hidden parser URL set successfully');
}