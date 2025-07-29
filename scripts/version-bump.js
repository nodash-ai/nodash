#!/usr/bin/env node

/**
 * Version Bump Script for Nodash Monorepo
 * 
 * Handles coordinated version bumping across all packages while maintaining 
 * proper dependency relationships.
 * 
 * Usage:
 *   node scripts/version-bump.js patch    # Bump all packages by patch
 *   node scripts/version-bump.js minor    # Bump all packages by minor  
 *   node scripts/version-bump.js major    # Bump all packages by major
 *   node scripts/version-bump.js --check  # Check for version inconsistencies
 */

const fs = require('fs');
const path = require('path');

const PACKAGES = [
  { name: '@nodash/sdk', path: './packages/nodash-sdk/package.json' },
  { name: '@nodash/cli', path: './packages/nodash-cli/package.json' },
  { name: '@nodash/mcp', path: './packages/nodash-mcp/package.json' }
];

const EXTERNAL_DEPENDENTS = [
  { name: '@nodash/api-service', path: '../nodash-dev/services/api-service/package.json' }
];

function readPackageJson(packagePath) {
  try {
    const fullPath = path.resolve(__dirname, '..', packagePath);
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (error) {
    console.warn(`⚠️  Could not read ${packagePath}: ${error.message}`);
    return null;
  }
}

function writePackageJson(packagePath, packageJson) {
  const fullPath = path.resolve(__dirname, '..', packagePath);
  fs.writeFileSync(fullPath, JSON.stringify(packageJson, null, 2) + '\n');
}

function bumpVersion(version, bumpType) {
  const [major, minor, patch] = version.split('.').map(Number);
  
  switch (bumpType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

function checkVersionConsistency() {
  console.log('🔍 Checking version consistency across packages...\n');
  
  const packages = {};
  let hasInconsistencies = false;
  
  // Read all package versions
  for (const pkg of PACKAGES) {
    const packageJson = readPackageJson(pkg.path);
    if (packageJson) {
      packages[pkg.name] = {
        version: packageJson.version,
        dependencies: packageJson.dependencies || {},
        devDependencies: packageJson.devDependencies || {}
      };
    }
  }
  
  // Check external dependents too
  for (const pkg of EXTERNAL_DEPENDENTS) {
    const packageJson = readPackageJson(pkg.path);
    if (packageJson) {
      packages[pkg.name] = {
        version: packageJson.version,
        dependencies: packageJson.dependencies || {},
        devDependencies: packageJson.devDependencies || {}
      };
    }
  }
  
  // Check for version mismatches
  for (const [packageName, packageInfo] of Object.entries(packages)) {
    console.log(`📦 ${packageName}: v${packageInfo.version}`);
    
    // Check dependencies
    for (const [depName, depVersion] of Object.entries(packageInfo.dependencies)) {
      if (packages[depName]) {
        const actualVersion = packages[depName].version;
        const expectedRange = depVersion.replace(/[\^~]/, '');
        
        if (actualVersion !== expectedRange) {
          console.log(`  ❌ ${depName}: expects ${depVersion}, actual is ${actualVersion}`);
          hasInconsistencies = true;
        } else {
          console.log(`  ✅ ${depName}: ${depVersion}`);
        }
      }
    }
  }
  
  if (hasInconsistencies) {
    console.log('\n❌ Version inconsistencies found! Run version bump to fix.');
    process.exit(1);
  } else {
    console.log('\n✅ All versions are consistent!');
  }
}

function bumpAllVersions(bumpType) {
  console.log(`🚀 Bumping all package versions (${bumpType})...\n`);
  
  const newVersions = {};
  
  // First pass: calculate new versions
  for (const pkg of PACKAGES) {
    const packageJson = readPackageJson(pkg.path);
    if (packageJson) {
      const newVersion = bumpVersion(packageJson.version, bumpType);
      newVersions[pkg.name] = newVersion;
      console.log(`📦 ${pkg.name}: ${packageJson.version} → ${newVersion}`);
    }
  }
  
  // Second pass: update package.json files with new versions and dependencies
  for (const pkg of PACKAGES) {
    const packageJson = readPackageJson(pkg.path);
    if (packageJson) {
      // Update own version
      packageJson.version = newVersions[pkg.name];
      
      // Update dependencies to other nodash packages
      if (packageJson.dependencies) {
        for (const depName of Object.keys(packageJson.dependencies)) {
          if (newVersions[depName]) {
            packageJson.dependencies[depName] = `^${newVersions[depName]}`;
          }
        }
      }
      
      writePackageJson(pkg.path, packageJson);
    }
  }
  
  // Third pass: update external dependents
  for (const pkg of EXTERNAL_DEPENDENTS) {
    const packageJson = readPackageJson(pkg.path);
    if (packageJson) {
      let updated = false;
      
      if (packageJson.dependencies) {
        for (const depName of Object.keys(packageJson.dependencies)) {
          if (newVersions[depName]) {
            packageJson.dependencies[depName] = `^${newVersions[depName]}`;
            updated = true;
          }
        }
      }
      
      if (updated) {
        writePackageJson(pkg.path, packageJson);
        console.log(`📦 Updated ${pkg.name} dependencies`);
      }
    }
  }
  
  console.log('\n✅ All versions updated successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Review changes: git diff');
  console.log('2. Test builds: npm run build');
  console.log('3. Run tests: npm run test:ci');
  console.log('4. Commit changes: git add . && git commit -m "chore: bump versions to X.X.X"');
  console.log('5. Push to trigger publishing: git push origin main');
}

function showCurrentVersions() {
  console.log('📦 Current package versions:\n');
  
  for (const pkg of PACKAGES) {
    const packageJson = readPackageJson(pkg.path);
    if (packageJson) {
      console.log(`${pkg.name}: v${packageJson.version}`);
    }
  }
  
  console.log('\n🔗 External dependents:\n');
  for (const pkg of EXTERNAL_DEPENDENTS) {
    const packageJson = readPackageJson(pkg.path);
    if (packageJson) {
      console.log(`${pkg.name}: v${packageJson.version}`);
      
      // Show nodash dependencies
      if (packageJson.dependencies) {
        for (const [depName, version] of Object.entries(packageJson.dependencies)) {
          if (depName.startsWith('@nodash/')) {
            console.log(`  └─ ${depName}: ${version}`);
          }
        }
      }
    }
  }
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.log('Usage: node scripts/version-bump.js <patch|minor|major|--check|--status>');
  process.exit(1);
}

switch (command) {
  case '--check':
    checkVersionConsistency();
    break;
  case '--status':
    showCurrentVersions();
    break;
  case 'patch':
  case 'minor':
  case 'major':
    bumpAllVersions(command);
    break;
  default:
    console.log('❌ Invalid command. Use: patch, minor, major, --check, or --status');
    process.exit(1);
}