# Apps Script URL Setup Guide

This guide explains how to set up the Google Apps Script Web App URL for synchronization with the Smart Spreadsheet Assistant.

## Overview

The Apps Script URL serves as an intermediary between your frontend application and Google Sheets, providing:

- **Gatekeeper**: Frontend only communicates with Apps Script URL
- **Router**: Handles validation and optionally forwards to Hidden Parser
- **Audit & Snapshot**: Creates logs and maintains telemetry
- **Security**: Token-based authentication to prevent abuse

## Architecture Flow

```
Frontend → Apps Script URL → Google Sheets
    ↓           ↓
Hidden Parser ←  ↑ (optional normalization)
```

## Step 1: Create Google Apps Script Project

1. Go to [Google Apps Script](https://script.google.com)
2. Click "New Project"
3. Replace the default `Code.gs` content with the code from `/public/apps-script-sample.gs`

## Step 2: Configure Script Properties

Set up the required configuration in Apps Script:

1. In the Apps Script editor, go to **Project Settings** (gear icon)
2. Scroll down to **Script Properties**
3. Add the following properties:

### Required Properties

| Property | Value | Description |
|----------|-------|-------------|
| `API_TOKEN` | `your-secure-random-token` | Long random string for authentication |

### Optional Properties

| Property | Value | Description |
|----------|-------|-------------|
| `HIDDEN_PARSER_URL` | `https://your-parser-service.com` | URL for data normalization service |

### Generating a Secure API Token

Use one of these methods to generate a secure token:

```bash
# Method 1: Using openssl (Linux/Mac)
openssl rand -base64 32

# Method 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Method 3: Online generator
# Visit: https://www.random.org/strings/
```

## Step 3: Deploy as Web App

1. In the Apps Script editor, click **Deploy** → **New deployment**
2. Choose **Web app** as the type
3. Configure the deployment:
   - **Description**: "Smart Spreadsheet Assistant API"
   - **Execute as**: "Me"
   - **Who has access**: "Anyone" (or "Anyone with Google account" for more security)
4. Click **Deploy**
5. **Copy the Web App URL** - you'll need this for your frontend configuration

## Step 4: Configure Frontend

### Environment Variables

Add these to your `.env` file:

```env
VITE_APPS_SCRIPT_URL="https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
VITE_APPS_SCRIPT_TOKEN="your-secure-api-token"
VITE_HIDDEN_PARSER_URL="https://your-parser-service.com"  # Optional
VITE_HIDDEN_PARSER_API_KEY="your-parser-api-key"         # Optional
```

### Using the Configuration Component

The `AppsScriptConfig` component provides a UI for configuration:

```jsx
import AppsScriptConfig from './components/AppsScriptConfig';

function App() {
  return (
    <div>
      <AppsScriptConfig onConfigChange={(config) => console.log(config)} />
    </div>
  );
}
```

## Step 5: Test the Connection

Use the built-in test functionality:

```javascript
import serviceManager from './services/serviceManager';

// Initialize services
await serviceManager.initialize();

// Test Apps Script connection
const appsScript = serviceManager.getAppsScriptService();
const healthResult = await appsScript.getHealthStatus();
console.log('Health check:', healthResult);

// Test basic functionality
const tabsResult = await appsScript.listTabs('your-spreadsheet-id');
console.log('Tabs:', tabsResult);
```

## API Endpoints

The Apps Script Web App supports these actions:

### Core Actions

| Action | Description | Required Parameters |
|--------|-------------|-------------------|
| `listTabs` | List all tabs in a spreadsheet | `spreadsheetId` |
| `fetchTabData` | Get tab data with schema | `spreadsheetId`, `tabName` |
| `addRow` | Add a new row | `spreadsheetId`, `tabName`, `data` |
| `updateCell` | Update a single cell | `spreadsheetId`, `tabName`, `range`, `data` |
| `readRange` | Read a specific range | `spreadsheetId`, `tabName`, `range` |
| `discoverAll` | Find all accessible spreadsheets | None |
| `batch` | Execute multiple actions | `data` (array of actions) |
| `health` | Health check | None |

### Request Format

```javascript
{
  "token": "your-api-token",
  "action": "listTabs",
  "spreadsheetId": "1uus7f...",
  "options": {
    "author": "user@example.com",
    "dryRun": false
  }
}
```

### Response Format

```javascript
{
  "success": true,
  "sheets": [...],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Error Handling

The system handles various error scenarios:

### HTTP Status Codes

| Code | Description | Action |
|------|-------------|--------|
| 401 | Unauthorized | Check API token |
| 422 | Validation failed | May trigger normalization |
| 429 | Rate limited | Wait and retry |
| 500 | Server error | Check Apps Script logs |

### Error Response Format

```javascript
{
  "success": false,
  "error": "Validation failed",
  "details": ["spreadsheetId is required"],
  "code": 422
}
```

## Hidden Parser Integration (Optional)

The Hidden Parser provides data normalization for AI-generated requests:

### Setup

1. Deploy a serverless function that accepts POST requests to `/normalize`
2. Configure the `HIDDEN_PARSER_URL` in Apps Script properties
3. The parser should accept this format:

```javascript
// Request to parser
{
  "raw": { /* raw LLM output */ }
}

// Response from parser
{
  "ok": true,
  "data": { /* normalized Apps Script payload */ }
}
```

### Flow Options

Choose one of these integration patterns:

1. **Frontend → Apps Script → Hidden Parser** (Apps Script forwards)
2. **Frontend → Hidden Parser → Apps Script** (recommended)
3. **Hybrid**: Apps Script returns 422 with normalization hint

## Security Best Practices

### Token Management

- Generate long, random tokens (32+ characters)
- Rotate tokens periodically
- Don't hardcode tokens in client-side code
- Use environment variables or secure configuration

### Apps Script Security

- Set "Execute as: Me" to use your permissions
- Consider "Anyone with Google account" for access control
- Monitor usage through Apps Script dashboard
- Enable logging for audit trails

### Rate Limiting

Implement rate limiting to prevent abuse:

```javascript
// In Apps Script
function checkRateLimit(token) {
  const cache = CacheService.getScriptCache();
  const key = 'rate_limit_' + token;
  const count = cache.get(key) || 0;
  
  if (count > 60) { // 60 requests per minute
    throw new Error('Rate limit exceeded');
  }
  
  cache.put(key, parseInt(count) + 1, 60); // 1 minute TTL
}
```

## Monitoring and Debugging

### Apps Script Logs

1. In Apps Script editor, go to **Executions**
2. View logs for each request
3. Monitor for errors and performance issues

### Frontend Debugging

```javascript
// Enable debug logging
localStorage.setItem('ssa_debug', 'true');

// Check service health
const health = await serviceManager.getServicesHealth();
console.log('Services health:', health);
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|---------|
| 401 Unauthorized | Wrong token | Check token in Script Properties |
| 403 Forbidden | Permission issue | Check deployment settings |
| Timeout | Slow response | Increase timeout or optimize queries |
| CORS errors | Wrong URL | Verify Web App URL |

## Performance Optimization

### Batch Operations

Use batch operations for multiple actions:

```javascript
const actions = [
  { action: 'updateCell', spreadsheetId: 'id', tabName: 'Sheet1', range: 'A1', data: { value: 'Hello' } },
  { action: 'updateCell', spreadsheetId: 'id', tabName: 'Sheet1', range: 'A2', data: { value: 'World' } }
];

const result = await appsScript.batchOperation(actions);
```

### Caching

Implement caching for frequently accessed data:

```javascript
// Cache tab data for 5 minutes
const cacheKey = `tab_${spreadsheetId}_${tabName}`;
const cached = localStorage.getItem(cacheKey);

if (cached && Date.now() - JSON.parse(cached).timestamp < 300000) {
  return JSON.parse(cached).data;
}
```

## Troubleshooting

### Connection Issues

1. **Verify Web App URL**: Ensure it ends with `/exec`
2. **Check deployment**: Make sure it's deployed as "Web app"
3. **Test manually**: Use curl or Postman to test the endpoint
4. **Check permissions**: Ensure the script has access to your sheets

### Authentication Issues

1. **Verify token**: Check Script Properties
2. **Case sensitivity**: Tokens are case-sensitive
3. **Special characters**: Avoid special characters in tokens
4. **Token rotation**: Update both Apps Script and frontend

### Data Issues

1. **Spreadsheet ID**: Extract from URL correctly
2. **Tab names**: Use exact names (case-sensitive)
3. **Range notation**: Use proper A1 notation (e.g., "A1:B10")
4. **Data types**: Ensure data matches expected types

## Support

For additional help:

1. Check the [Apps Script documentation](https://developers.google.com/apps-script)
2. Review the sample code in `/public/apps-script-sample.gs`
3. Use the built-in configuration component for testing
4. Monitor the browser console for detailed error messages

## Migration Guide

If upgrading from a previous version:

1. **Backup**: Export your current configuration
2. **Update**: Replace Apps Script code with new version
3. **Migrate**: Update Script Properties with new format
4. **Test**: Verify all functionality works
5. **Deploy**: Update frontend configuration