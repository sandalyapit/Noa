# 🤖 Smart Spreadsheet Assistant

Sistem AI canggih dengan **Guardrail Layer** lengkap untuk interaksi Google Sheets yang aman dan reliable.

## 🎯 Flow Sistem

```
User Action → Agent AI → Guardrail Layers → Apps Script → Google Sheets
                         ↓
                    1. Regex Check
                    2. Normalizer  
                    3. Schema Validator
                    4. Hidden Parser (Fallback)
```

## ✨ Fitur Utama

### 🛡️ **Guardrail System**
- **Regex Check**: Validasi struktur JSON dasar
- **Normalizer**: Perbaikan format otomatis (quotes, commas, dll)
- **Schema Validator**: Validasi ketat dengan predefined schema
- **Hidden Parser**: Fallback LLM untuk parsing kompleks

### 🤖 **AI Models**
- **Primary**: Google Gemini (fast, reliable)
- **Fallback**: OpenRouter (multiple models: Claude, GPT-4, Llama)
- **Auto-switching**: Otomatis beralih jika primary gagal

### 📊 **Google Sheets Integration**
- **Apps Script Backend**: Secure, production-ready
- **Real-time Operations**: List tabs, fetch data, update cells, add rows
- **Security Features**: Token auth, audit logging, snapshots

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Clone repository
git clone <repo-url>
cd smart-spreadsheet-assistant

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env dengan API keys Anda
```

### 2. Deploy Apps Script

1. Copy isi file `Code.gs` 
2. Buka [script.google.com](https://script.google.com)
3. Buat project baru, paste code
4. Deploy sebagai Web App
5. Copy URL ke `.env`

### 3. Start Development

```bash
npm run dev
# Buka http://localhost:5173
```

### 4. Test System

- Buka `/debug` untuk Service Debugger
- Test complete flow dengan natural language
- Monitor guardrail layers

## 📁 Struktur Project

```
src/
├── services/
│   ├── serviceManager.js          # Orchestrator utama
│   ├── regexCheckService.js       # Layer 1: Regex validation
│   ├── normalizerService.js       # Layer 2: Format fixing
│   ├── schemaValidatorService.js  # Layer 3: Schema validation
│   ├── hiddenParserService.js     # Layer 4: Fallback parsing
│   ├── openRouterService.js       # Fallback AI models
│   ├── geminiService.js           # Primary AI model
│   ├── appsScriptService.js       # Google Sheets integration
│   └── configService.js           # Configuration management
├── hooks/
│   └── useServiceManager.js       # React hook for services
├── components/
│   └── ServiceDebugger.jsx        # Debug & testing interface
└── pages/
    └── [existing pages]
```

## 🔧 Configuration

### Environment Variables

```env
# Required: Primary AI model
VITE_GEMINI_API_KEY="your_gemini_api_key"

# Optional: Fallback models
VITE_OPENROUTER_API_KEY="your_openrouter_api_key"

# Apps Script (setelah deployment)
VITE_APPS_SCRIPT_URL="https://script.google.com/macros/s/.../exec"
VITE_APPS_SCRIPT_TOKEN="your_secure_token"

# Optional: Hidden parser service
VITE_HIDDEN_PARSER_URL="your_parser_service_url"
VITE_HIDDEN_PARSER_API_KEY="your_parser_api_key"
```

### API Keys

1. **Gemini API**: [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **OpenRouter**: [OpenRouter Keys](https://openrouter.ai/keys)

## 🧪 Testing

### Service Debugger (`/debug`)

Interface lengkap untuk testing:
- **Service Status**: Monitor semua services
- **Connection Tests**: Test koneksi ke semua APIs
- **Request Testing**: Test complete flow dengan natural language

### Example Test Requests

```javascript
// List tabs
"List all tabs in spreadsheet 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"

// Fetch data
"Get data from tab 'Class Data'"

// Update cell
"Update cell A1 to 'Hello World' in sheet 'Data'"

// Add row
"Add new row with data: Name=John, Age=25, City=Jakarta"
```

## 🛡️ Guardrail Layers Detail

### 1. Regex Check
- Deteksi struktur JSON dasar
- Validasi required keys (action, spreadsheetId, dll)
- Context-specific validation

### 2. Normalizer
- Fix quotes (single → double)
- Remove trailing commas
- Add quotes to unquoted keys
- Fix common typos (True → true, None → null)

### 3. Schema Validator
- Validasi ketat dengan JSON Schema
- Type checking (string, number, boolean)
- Required fields validation
- Pattern matching (cell ranges, etc)

### 4. Hidden Parser
- External LLM service fallback
- OpenRouter multi-model fallback
- Rule-based parsing sebagai last resort

## 📊 Apps Script Actions

| Action | Required Fields | Description |
|--------|----------------|-------------|
| `listTabs` | action, spreadsheetId | List semua tabs |
| `fetchTabData` | action, spreadsheetId, tabName | Ambil data tab |
| `updateCell` | action, spreadsheetId, tabName, range, data | Update cell |
| `addRow` | action, spreadsheetId, tabName, data | Tambah row |
| `readRange` | action, spreadsheetId, tabName, range | Baca range |
| `discoverAll` | action | Cari semua spreadsheets |
| `health` | action | Health check |

## 🔒 Security Features

- **Token Authentication**: Secure API access
- **Input Sanitization**: Prevent formula injection
- **Audit Logging**: Track semua operations
- **Snapshots**: Backup sebelum write operations
- **Rate Limiting**: Prevent abuse

## 🚀 Production Deployment

### Build & Deploy

```bash
# Build for production
npm run build

# Deploy ke Vercel
vercel --prod

# Atau deploy ke Netlify
netlify deploy --prod --dir=dist
```

### Environment Setup

Set environment variables di hosting platform:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables

## 📈 Monitoring

### Performance Metrics
- Processing time per request
- Success rate per guardrail layer
- API response times
- Error rates

### Debug Logging

```javascript
// Enable debug mode
localStorage.setItem('ssa_debug', 'true');

// Check service status
const status = serviceManager.getServiceStatus();
console.log(status);
```

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Test dengan Service Debugger
4. Submit pull request

## 📞 Support

- **Service Debugger**: `/debug` untuk troubleshooting
- **Console Logs**: Check browser console untuk detailed errors
- **Service Status**: Monitor real-time service health

## 🎯 Roadmap

- [ ] Advanced caching system
- [ ] Batch operations support
- [ ] Real-time collaboration
- [ ] Advanced analytics dashboard
- [ ] Custom model integration
- [ ] Multi-language support

---

**🎉 Smart Spreadsheet Assistant** - AI-powered Google Sheets automation dengan guardrail system yang robust!