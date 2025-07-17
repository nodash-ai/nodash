#!/usr/bin/env node

/**
 * Build script to bundle documentation from SDK and CLI packages
 * This runs at build time to embed the docs into the MCP package
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function bundleDocs() {
  console.log('📚 Bundling documentation...');
  
  try {
    // Read documentation from sibling packages
    const sdkReadmePath = path.resolve(__dirname, '../../nodash-sdk/README.md');
    const cliReadmePath = path.resolve(__dirname, '../../nodash-cli/README.md');
    
    const sdkContent = fs.readFileSync(sdkReadmePath, 'utf8');
    const cliContent = fs.readFileSync(cliReadmePath, 'utf8');
    
    // Create bundled documentation TypeScript file
    const bundledDocsContent = `// Auto-generated file - do not edit manually
// Generated at build time from SDK and CLI README files

export const SDK_DOCUMENTATION = ${JSON.stringify(sdkContent)};

export const CLI_DOCUMENTATION = ${JSON.stringify(cliContent)};

export function extractExamples(content: string): string[] {
  const examples: string[] = [];
  const codeBlockRegex = /\`\`\`(?:bash|typescript|javascript|json)\\n([\\s\\S]*?)\\n\`\`\`/g;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    examples.push(match[1].trim());
  }

  return examples;
}
`;
    
    // Write the bundled documentation file
    const outputPath = path.resolve(__dirname, '../src/bundled-docs.ts');
    fs.writeFileSync(outputPath, bundledDocsContent);
    
    console.log('✅ Documentation bundled successfully');
    console.log(`   SDK content: ${sdkContent.length} characters`);
    console.log(`   CLI content: ${cliContent.length} characters`);
    console.log(`   Output: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Failed to bundle documentation:', error.message);
    process.exit(1);
  }
}

bundleDocs();