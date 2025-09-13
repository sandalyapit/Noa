/**
 * Test individual imports to find syntax error
 */

async function testImports() {
  console.log('Testing individual imports...');
  
  try {
    console.log('1. Testing configService...');
    const configService = await import('./src/services/configService.js');
    console.log('✅ configService imported successfully');
    
    console.log('2. Testing geminiClient...');
    const geminiClient = await import('./src/services/geminiClient.js');
    console.log('✅ geminiClient imported successfully');
    
    console.log('3. Testing serviceManager...');
    const serviceManager = await import('./src/services/serviceManager.js');
    console.log('✅ serviceManager imported successfully');
    console.log('   Type:', typeof serviceManager.default);
    console.log('   Constructor:', serviceManager.default?.constructor?.name);
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error('Stack:', error.stack?.split('\n').slice(0, 3).join('\n'));
  }
}

testImports();