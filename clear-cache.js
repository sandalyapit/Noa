#!/usr/bin/env node

/**
 * Cache clearing script for development environment
 * Clears localStorage entries that might contain outdated URLs
 */

console.log('=== Cache Clearing Script ===');

// Instructions for manual localStorage clearing
console.log('\n⚠️  MANUAL ACTIONS REQUIRED:');
console.log('1. Open your browser developer tools (F12)');
console.log('2. Go to Application/Storage tab');
console.log('3. Under Local Storage, find localhost:3000 or localhost:4028');
console.log('4. Clear all entries or specifically look for:');
console.log('   - ssa_config');
console.log('   - Any entries containing Apps Script URLs');
console.log('5. Refresh the page after clearing');

console.log('\n📋 Environment Variables Check:');
console.log('Current environment variables from .env file:');

// Read .env file and display current values
const fs = require('fs');
const path = require('path');

try {
  const envPath = path.join(__dirname, '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const envLines = envContent.split('\n').filter(line => 
    line.includes('VITE_APPS_SCRIPT') && !line.startsWith('#')
  );
  
  envLines.forEach(line => {
    console.log(`✓ ${line}`);
  });
} catch (error) {
  console.log('❌ Could not read .env file:', error.message);
}

console.log('\n🔍 What to look for in browser network tab:');
console.log('- The request should go to the correct URL ending with ...YF7tRaLamjA2DLn8...');
console.log('- In development, requests should go through proxy: /api/apps-script/...');
console.log('- If you see ...za0-ZRbg6YM8TXtOiX0... that is the OLD URL (incorrect)');

console.log('\n🚀 Next steps:');
console.log('1. Clear browser cache and localStorage as described above');
console.log('2. Restart the development server');
console.log('3. Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)');
console.log('4. Check network requests in browser dev tools');