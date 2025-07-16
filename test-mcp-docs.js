#!/usr/bin/env node

/**
 * Test MCP documentation synchronization
 */

const { DocumentationReader } = require('./packages/nodash-mcp/dist/documentation-reader.js');

async function testDocumentationSync() {
  console.log('🧪 Testing MCP documentation synchronization...');
  
  try {
    const reader = new DocumentationReader();
    
    // Test SDK documentation reading
    const sdkDocs = await reader.getSDKDocumentation();
    console.log('✅ SDK documentation loaded');
    console.log(`   - Content length: ${sdkDocs.content.length} characters`);
    console.log(`   - Examples found: ${sdkDocs.examples.length}`);
    
    // Test CLI documentation reading
    const cliDocs = await reader.getCLIDocumentation();
    console.log('✅ CLI documentation loaded');
    console.log(`   - Content length: ${cliDocs.content.length} characters`);
    console.log(`   - Examples found: ${cliDocs.examples.length}`);
    
    // Test getting all documentation
    const allDocs = await reader.getAllDocumentation();
    console.log('✅ All documentation loaded');
    console.log(`   - Total components: ${allDocs.length}`);
    
    // Verify examples are extracted correctly
    const sdkExamples = sdkDocs.examples.filter(ex => ex.includes('NodashSDK'));
    const cliExamples = cliDocs.examples.filter(ex => ex.includes('nodash'));
    
    console.log(`   - SDK examples with NodashSDK: ${sdkExamples.length}`);
    console.log(`   - CLI examples with nodash: ${cliExamples.length}`);
    
    if (sdkExamples.length > 0 && cliExamples.length > 0) {
      console.log('🎉 Documentation synchronization test passed!');
      return true;
    } else {
      console.log('❌ Examples not properly extracted');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Documentation sync test failed:', error.message);
    return false;
  }
}

testDocumentationSync().then(success => {
  process.exit(success ? 0 : 1);
});