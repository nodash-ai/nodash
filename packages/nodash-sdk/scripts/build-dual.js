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
    // Clean dist directories
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true });
    }
    if (fs.existsSync('dist-esm')) {
      fs.rmSync('dist-esm', { recursive: true });
    }
    
    // Build CommonJS version first
    console.log('📦 Building CommonJS version...');
    execSync('npx tsc -p tsconfig.build.json', { stdio: 'inherit' });
    
    // Check if CommonJS build was successful
    if (!fs.existsSync('dist') || !fs.existsSync('dist/index.js')) {
      throw new Error('CommonJS build failed - no output files generated');
    }
    
    // Build ESM version to separate directory
    console.log('📦 Building ESM version...');
    execSync('npx tsc -p tsconfig.esm.json', { stdio: 'inherit' });
    
    // Copy ESM .js files to dist with .esm.js extension
    console.log('📋 Copying ESM files...');
    const esmFiles = fs.readdirSync('dist-esm');
    esmFiles.forEach(file => {
      if (file.endsWith('.js')) {
        const esmName = file.replace('.js', '.esm.js');
        const srcPath = path.join('dist-esm', file);
        const destPath = path.join('dist', esmName);
        fs.copyFileSync(srcPath, destPath);
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