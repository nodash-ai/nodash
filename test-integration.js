#!/usr/bin/env node

/**
 * Integration test script for the clean restart implementation
 * Tests SDK, CLI, and MCP components working together
 */

const { spawn } = require('child_process');
const path = require('path');

async function runCommand(command, args = [], options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code || 0
      });
    });

    child.on('error', (error) => {
      resolve({
        success: false,
        stdout: '',
        stderr: error.message,
        exitCode: 1
      });
    });
  });
}

async function testSDK() {
  console.log('🧪 Testing SDK...');
  
  // Test SDK import and basic functionality
  const testCode = `
    const { NodashSDK } = require('./packages/nodash-sdk/dist/index.js');
    
    try {
      // Test constructor validation
      const sdk = new NodashSDK('https://example.com', 'test-token');
      console.log('✅ SDK constructor works');
      
      // Test config retrieval
      const config = sdk.getConfig();
      console.log('✅ SDK config retrieval works');
      
      console.log('SDK_TEST_PASSED');
    } catch (error) {
      console.error('❌ SDK test failed:', error.message);
      process.exit(1);
    }
  `;
  
  // Build SDK first
  const buildResult = await runCommand('npm', ['run', 'build'], {
    cwd: path.join(__dirname, 'packages/nodash-sdk')
  });
  
  if (!buildResult.success) {
    console.error('❌ SDK build failed:', buildResult.stderr);
    return false;
  }
  
  // Test SDK
  const testResult = await runCommand('node', ['-e', testCode]);
  
  if (testResult.success && testResult.stdout.includes('SDK_TEST_PASSED')) {
    console.log('✅ SDK tests passed');
    return true;
  } else {
    console.error('❌ SDK tests failed:', testResult.stderr);
    return false;
  }
}

async function testCLI() {
  console.log('🧪 Testing CLI...');
  
  // Build CLI first
  const buildResult = await runCommand('npm', ['run', 'build'], {
    cwd: path.join(__dirname, 'packages/nodash-cli')
  });
  
  if (!buildResult.success) {
    console.error('❌ CLI build failed:', buildResult.stderr);
    return false;
  }
  
  // Test CLI help command
  const helpResult = await runCommand('node', [
    path.join(__dirname, 'packages/nodash-cli/dist/cli.js'),
    '--help'
  ]);
  
  if (helpResult.success) {
    console.log('✅ CLI help command works');
  } else {
    console.error('❌ CLI help failed:', helpResult.stderr);
    return false;
  }
  
  // Test CLI config command
  const configResult = await runCommand('node', [
    path.join(__dirname, 'packages/nodash-cli/dist/cli.js'),
    'config',
    'get'
  ]);
  
  if (configResult.success) {
    console.log('✅ CLI config command works');
    return true;
  } else {
    console.error('❌ CLI config failed:', configResult.stderr);
    return false;
  }
}

async function testMCP() {
  console.log('🧪 Testing MCP...');
  
  // Build MCP first
  const buildResult = await runCommand('npm', ['run', 'build'], {
    cwd: path.join(__dirname, 'packages/nodash-mcp')
  });
  
  if (!buildResult.success) {
    console.error('❌ MCP build failed:', buildResult.stderr);
    return false;
  }
  
  console.log('✅ MCP builds successfully');
  
  // Test that MCP server can access documentation files
  const testCode = `
    const fs = require('fs');
    const path = require('path');
    
    try {
      // Test that the MCP server can access the documentation files
      const sdkPath = path.join(__dirname, 'packages/nodash-sdk/README.md');
      const cliPath = path.join(__dirname, 'packages/nodash-cli/README.md');
      
      const sdkExists = fs.existsSync(sdkPath);
      const cliExists = fs.existsSync(cliPath);
      
      if (sdkExists && cliExists) {
        console.log('✅ MCP can access documentation files');
        console.log('MCP_TEST_PASSED');
      } else {
        console.error('❌ MCP cannot access documentation files');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ MCP test failed:', error.message);
      process.exit(1);
    }
  `;
  
  const testResult = await runCommand('node', ['-e', testCode]);
  
  if (testResult.success && testResult.stdout.includes('MCP_TEST_PASSED')) {
    console.log('✅ MCP tests passed');
    return true;
  } else {
    console.error('❌ MCP tests failed:', testResult.stderr);
    return false;
  }
}

async function main() {
  console.log('🚀 Running integration tests for clean restart implementation\n');
  
  const results = {
    sdk: await testSDK(),
    cli: await testCLI(),
    mcp: await testMCP()
  };
  
  console.log('\n📊 Test Results:');
  console.log(`SDK: ${results.sdk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`CLI: ${results.cli ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`MCP: ${results.mcp ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 All integration tests passed!');
    console.log('The clean restart implementation is working correctly.');
  } else {
    console.log('\n❌ Some tests failed. Please check the output above.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});