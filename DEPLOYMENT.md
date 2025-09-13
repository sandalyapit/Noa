# Smart Spreadsheet Assistant - Deployment Guide

## 🚀 Complete Deployment Flow

Sistem ini mengimplementasikan flow guardrail lengkap:
**User Action → Agent AI → Regex Check → Normalizer → Schema Validator → Hidden Parser → Apps Script**

## 📋 Prerequisites

1. **Google Account** dengan akses ke Google Sheets dan Apps Script
2. **API Keys** untuk AI services:
   - Google Gemini API Key (primary)
   - OpenRouter API Key (fallback, optional)
3. **Node.js** 18+ dan npm/yarn
4. **Git** untuk version control

## 🔧 Step 1: Environment Setup

### 1.1 Clone dan Install Dependencies

```bash
git clone <repository-url>
cd smart-spreadsheet-assistant
npm install
```

### 1.2 Environment Configuration

Copy `.env.example` to `.env` dan isi dengan API keys:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required: Google Gemini API Key (primary AI model)
VITE_GEMINI_API_KEY="your_google_gemini_api_key"

# Optional: OpenRouter API Key (fallback models)
VITE_OPENROUTER_API_KEY="your_openrouter_api_key"

# Will be filled after Apps Script deployment
VITE_APPS_SCRIPT_URL=""
VITE_APPS_SCRIPT_TOKEN=""

# Optional: Hidden parser service
VITE_HIDDEN_PARSER_URL=""
VITE_HIDDEN_PARSER_API_KEY=""
```

### 1.3 Get API Keys

**Google Gemini API Key:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create new API key
3. Copy key to `VITE_GEMINI_API_KEY`

**OpenRouter API Key (Optional):**
1. Go to [OpenRouter](https://openrouter.ai/keys)
2. Create account and generate API key
3. Copy key to `VITE_OPENROUTER_API_KEY`

## 🔧 Step 2: Google Apps Script Deployment

### 2.1 Deploy Apps Script

1. **Open Google Apps Script:**
   - Go to [script.google.com](https://script.google.com)
   - Click "New Project"

2. **Replace Code:**
   - Delete default `Code.gs` content
   - Copy entire content from `/Code.gs` file
   - Paste into Apps Script editor
   - Save project (Ctrl+S)

3. **Configure Script Properties:**
   - Click gear icon (Project Settings)
   - Go to "Script Properties"
   - Add properties:
     ```
     API_TOKEN: [generate with: openssl rand -base64 32]
     HIDDEN_PARSER_URL: [optional, your parser service URL]
     ```

4. **Deploy as Web App:**
   - Click "Deploy" → "New deployment"
   - Type: Web app
   - Execute as: Me
   - Who has access: Anyone (or "Anyone with Google account")
   - Click "Deploy"
   - **Copy the Web App URL** (important!)

### 2.2 Update Environment

Add Apps Script details to `.env`:

```env
VITE_APPS_SCRIPT_URL="https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
VITE_APPS_SCRIPT_TOKEN="your_generated_api_token"
```

## 🔧 Step 3: Frontend Development

### 3.1 Start Development Server

```bash
npm run dev
```

### 3.2 Test Service Integration

1. Open browser to `http://localhost:5173`
2. Navigate to Service Debugger (add route if needed)
3. Test the complete flow:
   - Service initialization
   - Connection tests
   - User request processing

### 3.3 Example Test Requests

```javascript
// Test 1: List tabs
"List all tabs in spreadsheet 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"

// Test 2: Fetch data
"Get data from tab 'Class Data' in the same spreadsheet"

// Test 3: Update cell
"Update cell A1 to 'Hello World' in sheet 'Class Data'"
```

## 🔧 Step 4: Production Deployment

### 4.1 Build for Production

```bash
npm run build
```

### 4.2 Deploy to Hosting Platform

**Vercel:**
```bash
npm install -g vercel
vercel --prod
```

**Netlify:**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

**GitHub Pages:**
```bash
npm run build
# Push dist/ folder to gh-pages branch
```

### 4.3 Environment Variables in Production

Set environment variables in your hosting platform:

- `VITE_GEMINI_API_KEY`
- `VITE_OPENROUTER_API_KEY`
- `VITE_APPS_SCRIPT_URL`
- `VITE_APPS_SCRIPT_TOKEN`

## 🧪 Step 5: Testing & Validation

### 5.1 Service Manager Test

```javascript
import ServiceManager from './src/services/serviceManager.js';

const serviceManager = new ServiceManager();
await serviceManager.initialize();

// Test complete flow
const result = await serviceManager.processUserRequest(
  "List tabs in my spreadsheet",
  { spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" }
);

console.log(result);
```

### 5.2 Guardrail Layer Testing

```javascript
// Test each layer individually
const regexResult = regexCheckService.validate(aiOutput);
const normalizeResult = normalizerService.normalize(aiOutput);
const schemaResult = schemaValidatorService.validate(json);
const parserResult = await hiddenParserService.parse(aiOutput, context);
```

### 5.3 Apps Script Testing

Test Apps Script directly:

```bash
curl -X POST "YOUR_APPS_SCRIPT_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your_api_token",
    "action": "health"
  }'
```

## 🔧 Step 6: Advanced Configuration

### 6.1 Hidden Parser Service (Optional)

If you want to deploy your own hidden parser service:

```javascript
// Example Express.js hidden parser
app.post('/parse', (req, res) => {
  const { raw, context } = req.body;
  
  // Your parsing logic here
  const parsed = parseWithCustomLogic(raw, context);
  
  res.json({
    success: true,
    parsed: parsed,
    confidence: 0.8,
    method: 'custom'
  });
});
```

### 6.2 Custom Model Configuration

Add custom models to OpenRouter service:

```javascript
const customModels = [
  'anthropic/claude-3.5-sonnet',
  'openai/gpt-4o-mini',
  'your-custom-model'
];
```

## 🚨 Troubleshooting

### Common Issues

1. **Apps Script CORS Error:**
   - Ensure deployment is set to "Anyone" access
   - Check API token is correct

2. **Gemini API Error:**
   - Verify API key is valid
   - Check quota limits

3. **Service Manager Not Initializing:**
   - Check all environment variables
   - Verify network connectivity

4. **Guardrail Layers Failing:**
   - Check console logs for specific layer errors
   - Test each layer individually

### Debug Mode

Enable debug logging:

```javascript
localStorage.setItem('ssa_debug', 'true');
```

### Service Status Check

```javascript
const status = serviceManager.getServiceStatus();
console.log('Service Status:', status);
```

## 📊 Monitoring & Analytics

### Performance Monitoring

```javascript
// Track processing times
const startTime = performance.now();
const result = await serviceManager.processUserRequest(prompt);
const processingTime = performance.now() - startTime;

console.log(`Processing took ${processingTime}ms`);
```

### Error Tracking

```javascript
// Log errors for analysis
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Send to your analytics service
});
```

## 🔒 Security Considerations

1. **API Keys:** Never expose API keys in client-side code
2. **Apps Script Token:** Use strong random tokens
3. **CORS:** Configure proper CORS policies
4. **Rate Limiting:** Implement rate limiting for production
5. **Input Validation:** Always validate user inputs

## 📈 Scaling Considerations

1. **Caching:** Implement response caching
2. **Load Balancing:** Use multiple Apps Script deployments
3. **Database:** Consider database for audit logs
4. **CDN:** Use CDN for static assets

## 🎯 Success Metrics

- ✅ Service Manager initializes successfully
- ✅ All connection tests pass
- ✅ User requests process through complete flow
- ✅ Apps Script executes actions correctly
- ✅ Guardrail layers catch and fix malformed outputs
- ✅ Fallback systems work when primary services fail

## 📞 Support

For issues or questions:
1. Check console logs for detailed error messages
2. Use Service Debugger component for testing
3. Verify all environment variables are set correctly
4. Test each service individually

---

**🎉 Congratulations!** Your Smart Spreadsheet Assistant with complete guardrail system is now deployed and ready to use!