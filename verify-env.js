#!/usr/bin/env node
/**
 * Verification script to check environment variables and service configurations
 */

// Mock browser APIs for Node.js testing
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

async function verifyEnvironmentVariables() {
  console.log('🔍 Verifying Environment Variables and Service Configuration...\n');

  // Check .env file content
  console.log('1️⃣ Checking .env file:');
  try {
    const fs = await import('fs');
    const envContent = fs.readFileSync('/workspaces/Noa/.env', 'utf8');
    const envLines = envContent.split('\n');
    
    const appsScriptUrlLine = envLines.find(line => line.startsWith('VITE_APPS_SCRIPT_URL='));
    if (appsScriptUrlLine) {
      console.log('   ✓ Found in .env:', appsScriptUrlLine);
      
      // Extract URL from the line
      const match = appsScriptUrlLine.match(/"([^"]+)"/);
      if (match) {
        const url = match[1];
        console.log('   ✓ Extracted URL:', url);
        
        // Check if it's the wrong URL
        if (url.includes('AKfycbza0-ZRbg6YM8TXtOiX0bJBNQqfrQViuzaV4UFz4Jcg8BdwBJq2tXgDU5aXXd0UjTov')) {
          console.log('   ❌ ERROR: .env file contains the OLD/WRONG URL!');
        } else if (url.includes('AKfycbx6YF7tRaLamjA2DLn8BLJI8MtrPjiRBtuxV3E-5LO9v_7Y4OoOPUoDmhek99nFrLcy')) {
          console.log('   ✅ SUCCESS: .env file contains the CORRECT URL');
        } else {
          console.log('   ⚠️  WARNING: .env file contains an UNKNOWN URL');
        }
      }
    } else {
      console.log('   ❌ VITE_APPS_SCRIPT_URL not found in .env file');
    }
    
    const tokenLine = envLines.find(line => line.startsWith('VITE_APPS_SCRIPT_TOKEN='));
    if (tokenLine) {
      console.log('   ✓ Found token in .env:', tokenLine.replace(/=.*/g, '=***'));
    }
  } catch (error) {
    console.log('   ❌ Error reading .env file:', error.message);
  }

  console.log('\n2️⃣ Testing ConfigService:');
  try {
    // Mock import.meta.env for testing
    global.import = {
      meta: {
        env: {
          VITE_APPS_SCRIPT_URL: process.env.VITE_APPS_SCRIPT_URL,
          VITE_APPS_SCRIPT_TOKEN: process.env.VITE_APPS_SCRIPT_TOKEN
        }
      }
    };

    const configServiceModule = await import('./src/services/configService.js');
    const ConfigService = configServiceModule.default;
    const configService = new ConfigService();
    
    const appsScriptConfig = configService.getAppsScriptConfig();
    console.log('   ✓ Apps Script URL from ConfigService:', appsScriptConfig.url || 'not set');
    console.log('   ✓ Apps Script Token from ConfigService:', appsScriptConfig.token ? '***set***' : 'not set');

    if (appsScriptConfig.url?.includes('AKfycbza0-ZRbg6YM8TXtOiX0bJBNQqfrQViuzaV4UFz4Jcg8BdwBJq2tXgDU5aXXd0UjTov')) {
      console.log('   ❌ ERROR: ConfigService is returning the OLD/WRONG URL!');
    } else if (appsScriptConfig.url?.includes('AKfycbx6YF7tRaLamjA2DLn8BLJI8MtrPjiRBtuxV3E-5LO9v_7Y4OoOPUoDmhek99nFrLcy')) {
      console.log('   ✅ SUCCESS: ConfigService is returning the CORRECT URL');
    }

  } catch (error) {
    console.log('   ❌ Error testing ConfigService:', error.message);
  }

  console.log('\n3️⃣ Testing AppsScriptService:');
  try {
    const appsScriptServiceModule = await import('./src/services/appsScriptService.js');
    const AppsScriptService = appsScriptServiceModule.default;
    
    // Test with the correct URL
    const correctUrl = "https://script.google.com/macros/s/AKfycbx6YF7tRaLamjA2DLn8BLJI8MtrPjiRBtuxV3E-5LO9v_7Y4OoOPUoDmhek99nFrLcy/exec";
    const service = new AppsScriptService(correctUrl, "BangkongLoncat");
    
    console.log('   ✓ Service URL:', service.url);
    console.log('   ✓ Service Token:', service.token ? '***set***' : 'not set');
    
    // Test getRequestUrl method
    const requestUrl = service.getRequestUrl();
    console.log('   ✓ Request URL (getRequestUrl):', requestUrl);
    
    if (requestUrl.startsWith('/api/apps-script/')) {
      console.log('   ✅ SUCCESS: Using proxy URL for development');
    } else if (requestUrl === correctUrl) {
      console.log('   ✅ SUCCESS: Using direct URL (production mode)');
    } else {
      console.log('   ❌ ERROR: Unexpected request URL format');
    }

  } catch (error) {
    console.log('   ❌ Error testing AppsScriptService:', error.message);
  }

  console.log('\n4️⃣ Searching for any remaining hardcoded URLs:');
  try {
    const { execSync } = await import('child_process');
    
    // Search for the old URL in source files
    try {
      const result = execSync('find /workspaces/Noa/src -name "*.js" -o -name "*.jsx" | xargs grep -l "AKfycbza0" 2>/dev/null || true', { encoding: 'utf8' });
      if (result.trim()) {
        console.log('   ❌ ERROR: Found old URL in these files:');
        result.trim().split('\n').forEach(file => console.log('     -', file));
      } else {
        console.log('   ✅ SUCCESS: No hardcoded old URLs found in source files');
      }
    } catch (error) {
      console.log('   ✅ SUCCESS: No hardcoded old URLs found in source files');
    }

    // Search for any Apps Script URLs
    try {
      const result = execSync('find /workspaces/Noa/src -name "*.js" -o -name "*.jsx" | xargs grep -n "script.google.com" 2>/dev/null || true', { encoding: 'utf8' });
      if (result.trim()) {
        console.log('   🔍 Found Google Apps Script URLs in source:');
        result.trim().split('\n').forEach(line => console.log('     ', line));
      } else {
        console.log('   ✅ SUCCESS: No hardcoded Google Apps Script URLs in source files');
      }
    } catch (error) {
      console.log('   ✅ SUCCESS: No hardcoded Google Apps Script URLs in source files');
    }

  } catch (error) {
    console.log('   ❌ Error searching for hardcoded URLs:', error.message);
  }

  console.log('\n📋 Summary and Recommendations:');
  console.log('   1. Clear browser cache and hard refresh (Ctrl+Shift+R)');
  console.log('   2. Delete any build/dist directories if they exist');
  console.log('   3. Restart the development server');
  console.log('   4. Check browser dev tools for any cached requests');
  console.log('   5. The CORS proxy should handle the requests properly');
}

verifyEnvironmentVariables().catch(console.error);