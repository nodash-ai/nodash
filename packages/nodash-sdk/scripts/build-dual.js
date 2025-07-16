#!/usr/bin/env node

/**
 * Build script to create both CommonJS and ESM versions
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function buildDual() {
  console.log('🔨 Building dual CommonJS/ESM package...');
  
  try {
    // Clean dist directory
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true });
    }
    if (fs.existsSync('dist-esm')) {
      fs.rmSync('dist-esm', { recursive: true });
    }
    
    // Build CommonJS version
    console.log('📦 Building CommonJS version...');
    execSync('npx tsc -p tsconfig.json', { stdio: 'inherit' });
    
    // Build ESM version
    console.log('📦 Building ESM version...');
    execSync('npx tsc -p tsconfig.esm.json', { stdio: 'inherit' });
    
    // Copy ESM files to dist with .esm.js extension
    console.log('📋 Copying ESM files...');
    const esmFiles = fs.readdirSync('dist-esm');
    esmFiles.forEach(file => {
      if (file.endsWith('.js')) {
        const newName = file.replace('.js', '.esm.js');
        fs.copyFileSync(
          path.join('dist-esm', file),
          path.join('dist', newName)
        );
      }
    });
    
    // Clean up temporary ESM directory
    fs.rmSync('dist-esm', { recursive: true });
    
    console.log('✅ Dual build completed successfully!');
    console.log('   - CommonJS: dist/index.js');
    console.log('   - ESM: dist/index.esm.js');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

buildDual();