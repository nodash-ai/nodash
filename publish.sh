#!/bin/bash

# Nodash Package Publishing Script
# This script publishes all Nodash packages to npm

set -e

echo "🚀 Publishing Nodash packages to npm..."
echo "======================================"

# Check if logged in
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ You must be logged in to npm. Run: npm login"
    exit 1
fi

# Build all packages
echo "📦 Building all packages..."
npm run build

# Publish SDK
echo "📤 Publishing @nodash/sdk..."
cd packages/nodash-sdk
npm publish --access public
cd ../..

# Publish CLI
echo "📤 Publishing @nodash/cli..."
cd packages/nodash-cli
npm publish --access public
cd ../..

# Publish MCP Server
echo "📤 Publishing @nodash/mcp-server..."
cd packages/nodash-mcp-server
npm publish --access public
cd ../..

echo ""
echo "✅ All packages published successfully!"
echo ""
echo "📋 Package URLs:"
echo "   SDK: https://www.npmjs.com/package/@nodash/sdk"
echo "   CLI: https://www.npmjs.com/package/@nodash/cli"
echo "   MCP: https://www.npmjs.com/package/@nodash/mcp-server"
echo ""
echo "🎉 Users can now install with:"
echo "   npm install @nodash/sdk"
echo "   npx @nodash/cli analyze ."
echo "   npx @nodash/mcp-server" 