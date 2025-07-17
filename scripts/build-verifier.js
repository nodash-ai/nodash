#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class BuildVerifier {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  async runCommand(command, args, cwd, description) {
    console.log(`\n🔧 ${description}...`);
    
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        cwd: cwd || process.cwd()
      });

      const startTime = Date.now();
      
      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        const success = code === 0;
        
        this.results.push({
          description,
          success,
          duration,
          code,
          cwd: cwd || process.cwd()
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
          error: error.message,
          cwd: cwd || process.cwd()
        });
        resolve(false);
      });
    });
  }

  async verifyPackageExports(packagePath, packageName) {
    console.log(`\n📦 Verifying exports for ${packageName}...`);
    
    const packageJsonPath = path.join(packagePath, 'package.json');
    const distPath = path.join(packagePath, 'dist');
    
    if (!fs.existsSync(packageJsonPath)) {
      console.log(`❌ package.json not found for ${packageName}`);
      return false;
    }

    if (!fs.existsSync(distPath)) {
      console.log(`❌ dist directory not found for ${packageName}`);
      return false;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const exports = packageJson.exports || {};
    const main = packageJson.main;
    const module = packageJson.module;
    const types = packageJson.types;

    let allExportsExist = true;

    // Check main export
    if (main) {
      const mainPath = path.join(packagePath, main);
      if (!fs.existsSync(mainPath)) {
        console.log(`❌ Main export not found: ${main}`);
        allExportsExist = false;
      } else {
        console.log(`✅ Main export exists: ${main}`);
      }
    }

    // Check module export
    if (module) {
      const modulePath = path.join(packagePath, module);
      if (!fs.existsSync(modulePath)) {
        console.log(`❌ Module export not found: ${module}`);
        allExportsExist = false;
      } else {
        console.log(`✅ Module export exists: ${module}`);
      }
    }

    // Check types export
    if (types) {
      const typesPath = path.join(packagePath, types);
      if (!fs.existsSync(typesPath)) {
        console.log(`❌ Types export not found: ${types}`);
        allExportsExist = false;
      } else {
        console.log(`✅ Types export exists: ${types}`);
      }
    }

    // Check package.json exports field
    if (exports && typeof exports === 'object') {
      for (const [exportKey, exportValue] of Object.entries(exports)) {
        if (typeof exportValue === 'object') {
          for (const [condition, filePath] of Object.entries(exportValue)) {
            const fullPath = path.join(packagePath, filePath);
            if (!fs.existsSync(fullPath)) {
              console.log(`❌ Export not found: ${exportKey}.${condition} -> ${filePath}`);
              allExportsExist = false;
            } else {
              console.log(`✅ Export exists: ${exportKey}.${condition} -> ${filePath}`);
            }
          }
        }
      }
    }

    return allExportsExist;
  }

  async verifyImportResolution(packagePath, packageName) {
    console.log(`\n🔍 Verifying import resolution for ${packageName}...`);
    
    // Create a temporary test file to verify imports work
    const testFilePath = path.join(packagePath, 'import-test.mjs');
    const testContent = `
try {
  const pkg = await import('./${path.basename(packagePath)}');
  console.log('✅ ESM import successful');
  process.exit(0);
} catch (error) {
  console.log('❌ ESM import failed:', error.message);
  process.exit(1);
}
`;

    try {
      fs.writeFileSync(testFilePath, testContent);
      
      const success = await this.runCommand(
        'node',
        [testFilePath],
        path.dirname(packagePath),
        `Import resolution test for ${packageName}`
      );

      // Clean up test file
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }

      return success;
    } catch (error) {
      console.log(`❌ Import resolution test failed: ${error.message}`);
      
      // Clean up test file
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
      
      return false;
    }
  }

  async verifyAllBuilds() {
    console.log('🏗️  Starting comprehensive build verification...\n');

    const packages = [
      { name: '@nodash/sdk', path: './packages/nodash-sdk' },
      { name: '@nodash/cli', path: './packages/nodash-cli' },
      { name: '@nodash/mcp', path: './packages/nodash-mcp' }
    ];

    let allSuccess = true;

    // 1. Clean all packages
    const cleanSuccess = await this.runCommand(
      'npm',
      ['run', 'clean'],
      process.cwd(),
      'Clean all packages'
    );

    if (!cleanSuccess) {
      allSuccess = false;
    }

    // 2. Build all packages
    for (const pkg of packages) {
      const buildSuccess = await this.runCommand(
        'npm',
        ['run', 'build'],
        pkg.path,
        `Build ${pkg.name}`
      );

      if (!buildSuccess) {
        allSuccess = false;
        continue;
      }

      // 3. Verify package exports
      const exportsSuccess = await this.verifyPackageExports(pkg.path, pkg.name);
      if (!exportsSuccess) {
        allSuccess = false;
      }

      this.results.push({
        description: `Export verification for ${pkg.name}`,
        success: exportsSuccess,
        duration: 0
      });
    }

    // 4. Verify TypeScript compilation (skip if no files to compile)
    console.log('\n🔧 TypeScript compilation check...');
    try {
      const typecheckSuccess = await this.runCommand(
        'npx',
        ['tsc', '--build', '--verbose'],
        process.cwd(),
        'TypeScript compilation check'
      );

      if (!typecheckSuccess) {
        allSuccess = false;
      }
    } catch (error) {
      // If no files to compile, that's okay for a monorepo where packages handle their own compilation
      console.log('⏭️  No TypeScript files to compile at root level (packages handle their own compilation)');
      this.results.push({
        description: 'TypeScript compilation check',
        success: true,
        duration: 0
      });
    }

    // 5. Test package installations (simulate npm install)
    for (const pkg of packages) {
      const packageJsonPath = path.join(pkg.path, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // Verify package.json has required fields
        const requiredFields = ['name', 'version', 'main', 'types'];
        let packageValid = true;
        
        for (const field of requiredFields) {
          if (!packageJson[field]) {
            console.log(`❌ ${pkg.name} missing required field: ${field}`);
            packageValid = false;
          }
        }

        if (packageValid) {
          console.log(`✅ ${pkg.name} package.json is valid`);
        }

        this.results.push({
          description: `Package.json validation for ${pkg.name}`,
          success: packageValid,
          duration: 0
        });

        if (!packageValid) {
          allSuccess = false;
        }
      }
    }

    this.printSummary();
    return allSuccess;
  }

  printSummary() {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    
    console.log('\n' + '='.repeat(60));
    console.log('🏗️  BUILD VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    
    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const duration = result.duration ? `${result.duration}ms` : '';
      console.log(`${status} ${result.description.padEnd(40)} ${duration.padStart(8)}`);
    });
    
    console.log('='.repeat(60));
    console.log(`📈 Results: ${passed} passed, ${failed} failed`);
    console.log(`⏱️  Total time: ${totalDuration}ms`);
    
    if (failed > 0) {
      console.log('\n❌ Some build verifications failed. Check the output above for details.');
    } else {
      console.log('\n🎉 All build verifications passed!');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const verifier = new BuildVerifier();
  verifier.verifyAllBuilds().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Build verification failed:', error);
    process.exit(1);
  });
}

module.exports = BuildVerifier;