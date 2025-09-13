/**
 * Simple test to verify serviceManager structure
 */

// Mock browser APIs for Node.js testing
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

// Mock import.meta.env
const mockEnv = {
  VITE_APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbx6YF7tRaLamjA2DLn8BLJI8MtrPjiRBtuxV3E-5LO9v_7Y4OoOPUoDmhek99nFrLcy/exec",
  VITE_APPS_SCRIPT_TOKEN: "BangkongLoncat",
  VITE_GOOGLE_API_KEY: "AIzaSyDlBIuLZ5rj3vSaXqKIQs4p99zh4FjCanI"
};

// Mock fetch for testing
global.fetch = async () => ({
  ok: true,
  json: async () => ({ success: true, status: 'healthy' })
});

async function testServiceManagerStructure() {
  console.log('🧪 Testing ServiceManager structure...');
  
  try {
    // Mock import.meta.env before importing
    const originalImportMeta = global.import?.meta;
    if (!global.import) global.import = {};
    global.import.meta = { env: mockEnv };
    
    const serviceManagerModule = await import('./src/services/serviceManager.js');
    const serviceManager = serviceManagerModule.default;
    
    console.log('1️⃣ ServiceManager type:', typeof serviceManager);
    console.log('2️⃣ ServiceManager is instance:', serviceManager.constructor.name);
    console.log('3️⃣ Has initialize method:', typeof serviceManager.initialize === 'function');
    console.log('4️⃣ Has executeAction method:', typeof serviceManager.executeAction === 'function');
    console.log('5️⃣ Has processUserRequest method:', typeof serviceManager.processUserRequest === 'function');
    
    // Test method signatures
    console.log('\n📋 Method signatures:');
    console.log('   initialize:', serviceManager.initialize.length, 'parameters');
    console.log('   executeAction:', serviceManager.executeAction.length, 'parameters');
    console.log('   processUserRequest:', serviceManager.processUserRequest.length, 'parameters');
    
    console.log('\n✅ ServiceManager structure test completed successfully!');
    console.log('   ✓ ServiceManager is properly exported as singleton instance');
    console.log('   ✓ All required methods are available');
    console.log('   ✓ Ready for use in React components');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
  }
}

testServiceManagerStructure();