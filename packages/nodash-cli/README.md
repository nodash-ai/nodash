# @nodash/cli

Command-line interface for Nodash analytics platform. Provides project analysis and setup guidance.

## Installation

```bash
# Run directly with npx (recommended)
npx @nodash/cli analyze .

# Or install globally
npm install -g @nodash/cli
```

## Commands

### analyze

Analyze your project for analytics integration opportunities:

```bash
# Analyze current directory
npx @nodash/cli analyze .

# Analyze specific directory
npx @nodash/cli analyze /path/to/project

# Get help
npx @nodash/cli analyze --help
```

## Features

- **Framework Detection**: Automatically detects React, Vue, Angular, Express, and more
- **Event Opportunities**: Identifies places where analytics events should be tracked
- **Integration Guidance**: Provides specific recommendations for your tech stack
- **Code Examples**: Shows exactly how to implement tracking in your codebase

## Output

The CLI provides detailed analysis including:

- Framework and technology detection
- Recommended tracking events
- Code examples for implementation
- Best practices for your specific setup

## Requirements

- Node.js 18+
- TypeScript projects supported
- Works with JavaScript projects

## License

MIT 