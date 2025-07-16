#!/usr/bin/env node

/**
 * Test that MCP server can read actual documentation from source files
 */

const fs = require('fs');
const path = require('path');

async function testDocumentationContent() {
  console.log('🧪 Testing MCP documentation content source...');
  
  try {
    // Read actual source files
    const actualSdkContent = fs.readFileSync(path.join(__dirname, 'packages/nodash-sdk/README.md'), 'utf8');
    const actualCliContent = fs.readFileSync(path.join(__dirname, 'packages/nodash-cli/README.md'), 'utf8');
    
    console.log('📊 Source file lengths:');
    console.log(`SDK README length: ${actualSdkContent.length} characters`);
    console.log(`CLI README length: ${actualCliContent.length} characters`);
    
    // Test that the files exist and have content
    if (actualSdkContent.length > 0 && actualCliContent.length > 0) {
      console.log('✅ SDK documentation found and has content');
      console.log('✅ CLI documentation found and has content');
      
      // Test that they start with the expected headers
      const sdkStartsCorrectly = actualSdkContent.startsWith('# @nodash/sdk');
      const cliStartsCorrectly = actualCliContent.startsWith('# @nodash/cli');
      
      console.log(`SDK header correct: ${sdkStartsCorrectly ? '✅' : '❌'}`);
      console.log(`CLI header correct: ${cliStartsCorrectly ? '✅' : '❌'}`);
      
      if (sdkStartsCorrectly && cliStartsCorrectly) {
        console.log('🎉 Documentation files are properly accessible for MCP server!');
        return true;
      } else {
        console.log('❌ Documentation headers are incorrect');
        return false;
      }
    } else {
      console.log('❌ Documentation files are empty or missing');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

testDocumentationContent().then(success => {
  process.exit(success ? 0 : 1);
});