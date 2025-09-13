/**
 * Quick test to verify serviceManager fixes
 */

import serviceManager from './src/services/serviceManager.js';

async function testServiceManager() {
  console.log('🧪 Testing ServiceManager fixes...');
  
  try {
    // Test 1: Check if serviceManager is an instance (not a class)
    console.log('1️⃣ Testing serviceManager type:', typeof serviceManager);
    console.log('   serviceManager.initialize exists:', typeof serviceManager.initialize === 'function');
    console.log('   serviceManager.executeAction exists:', typeof serviceManager.executeAction === 'function');
    
    // Test 2: Try to initialize
    console.log('2️⃣ Testing initialization...');
    const initResult = await serviceManager.initialize();
    console.log('   Initialization result:', initResult.success ? '✅ Success' : '❌ Failed');
    
    if (!initResult.success) {
      console.log('   Error details:', initResult.error);
    }
    
    // Test 3: Test a simple health check action
    console.log('3️⃣ Testing health check action...');
    const healthAction = { action: 'health' };
    const healthResult = await serviceManager.executeAction(healthAction);
    console.log('   Health check result:', healthResult.success ? '✅ Success' : '❌ Failed');
    
    if (!healthResult.success) {
      console.log('   Error details:', healthResult.error);
    } else {
      console.log('   Health response:', healthResult.result);
    }
    
    console.log('🎉 ServiceManager test completed!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

// Run the test
testServiceManager();