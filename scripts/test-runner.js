#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

class TestRunner {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  async runCommand(command, args, description, options = {}) {
    console.log(`\n🔄 Running ${description}...`);
    
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        cwd: process.cwd(),
        env: {
          ...process.env,
          // Performance optimizations
          NODE_OPTIONS: '--max-old-space-size=4096',
          // Enable parallel processing where possible
          FORCE_COLOR: '1',
          ...options.env
        }
      });

      const startTime = Date.now();
      
      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        const success = code === 0;
        
        this.results.push({
          description,
          success,
          duration,
          code
        });

        if (success) {
          console.log(`✅ ${description} completed in ${duration}ms`);
        } else {
          console.log(`❌ ${description} failed with code ${code} after ${duration}ms`);
        }
        
        resolve(success);
      });

      child.on('error', (error) => {
        console.error(`❌ Failed to start ${description}:`, error.message);
        this.results.push({
          description,
          success: false,
          duration: Date.now() - startTime,
          error: error.message
        });
        resolve(false);
      });
    });
  }

  async runAll() {
    console.log('🚀 Starting comprehensive test suite...\n');

    // Run TypeScript checks first
    const typecheckSuccess = await this.runCommand('npm', ['run', 'typecheck'], 'TypeScript Error Checking');
    
    // Run build verification
    const buildSuccess = await this.runCommand('node', ['scripts/build-verifier.js'], 'Build Verification');
    
    // Run component tests (existing tests in packages)
    const componentSuccess = await this.runCommand('npm', ['run', 'test:component'], 'Component Tests');
    
    // Run integration tests
    let integrationSuccess = true;
    if (require('fs').existsSync('vitest.integration.config.ts')) {
      integrationSuccess = await this.runCommand('npm', ['run', 'test:integration'], 'Integration Tests');
    } else {
      console.log('⏭️  Integration tests not configured yet');
    }
    
    // Run E2E tests
    let e2eSuccess = true;
    if (require('fs').existsSync('vitest.e2e.config.ts')) {
      e2eSuccess = await this.runCommand('npm', ['run', 'test:e2e'], 'End-to-End Tests');
    } else {
      console.log('⏭️  E2E tests not configured yet');
    }

    this.printSummary();
    
    const allSuccess = typecheckSuccess && buildSuccess && componentSuccess && integrationSuccess && e2eSuccess;
    process.exit(allSuccess ? 0 : 1);
  }

  async runFast() {
    console.log('⚡ Starting fast test suite (component tests + typecheck)...\n');

    // Run TypeScript checks
    const typecheckSuccess = await this.runCommand('npm', ['run', 'typecheck'], 'TypeScript Error Checking');
    
    // Run component tests only
    const componentSuccess = await this.runCommand('npm', ['run', 'test:component'], 'Component Tests');

    this.printSummary();
    
    const allSuccess = typecheckSuccess && componentSuccess;
    process.exit(allSuccess ? 0 : 1);
  }

  async runCI() {
    console.log('🤖 Starting CI test suite...\n');

    // Run all tests in CI mode with proper error handling
    const typecheckSuccess = await this.runCommand('npm', ['run', 'typecheck'], 'TypeScript Error Checking');
    const buildSuccess = await this.runCommand('node', ['scripts/build-verifier.js'], 'Build Verification');
    const componentSuccess = await this.runCommand('npm', ['run', 'test:component'], 'Component Tests');
    
    let integrationSuccess = true;
    let e2eSuccess = true;
    
    if (require('fs').existsSync('vitest.integration.config.ts')) {
      integrationSuccess = await this.runCommand('npm', ['run', 'test:integration'], 'Integration Tests');
    }
    
    if (require('fs').existsSync('vitest.e2e.config.ts')) {
      e2eSuccess = await this.runCommand('npm', ['run', 'test:e2e'], 'End-to-End Tests');
    }

    this.printSummary();
    
    const allSuccess = typecheckSuccess && buildSuccess && componentSuccess && integrationSuccess && e2eSuccess;
    
    // In CI, we want detailed output
    if (!allSuccess) {
      console.log('\n💥 CI Tests Failed - Details:');
      this.results.filter(r => !r.success).forEach(result => {
        console.log(`❌ ${result.description}: ${result.error || `Exit code ${result.code}`}`);
      });
    }
    
    process.exit(allSuccess ? 0 : 1);
  }

  printSummary() {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      console.log(`${status} ${result.description.padEnd(30)} ${duration.padStart(8)}`);
    });
    
    console.log('='.repeat(60));
    console.log(`📈 Results: ${passed} passed, ${failed} failed`);
    console.log(`⏱️  Total time: ${totalDuration}ms`);
    
    if (failed > 0) {
      console.log('\n❌ Some tests failed. Check the output above for details.');
    } else {
      console.log('\n🎉 All tests passed!');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new TestRunner();
  const mode = process.argv[2] || 'all';
  
  switch (mode) {
    case 'fast':
      runner.runFast().catch(error => {
        console.error('❌ Fast test runner failed:', error);
        process.exit(1);
      });
      break;
    case 'ci':
      runner.runCI().catch(error => {
        console.error('❌ CI test runner failed:', error);
        process.exit(1);
      });
      break;
    case 'all':
    default:
      runner.runAll().catch(error => {
        console.error('❌ Test runner failed:', error);
        process.exit(1);
      });
      break;
  }
}

module.exports = TestRunner;