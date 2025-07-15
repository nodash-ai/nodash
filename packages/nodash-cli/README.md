# @nodash/cli

Command-line interface for Nodash analytics platform. Provides comprehensive analytics operations including event tracking, metrics monitoring, configuration management, and project analysis.

## Installation

```bash
# Run directly with npx (recommended)
npx @nodash/cli --help

# Or install globally
npm install -g @nodash/cli
```

## Quick Start

1. **Set up your API token:**
   ```bash
   nodash config set token your-api-token
   ```

2. **Test connectivity:**
   ```bash
   nodash health
   ```

3. **Analyze your project:**
   ```bash
   nodash analyze --setup
   ```

## Commands

### Configuration Management

#### `nodash config`

Manage CLI configuration and authentication:

```bash
# Set API token
nodash config set token your-api-token

# Set custom API base URL
nodash config set baseUrl https://api.nodash.ai

# Get specific configuration value
nodash config get token

# List all configuration
nodash config list

# List configuration as JSON
nodash config list --format json
```

### Event Tracking

#### `nodash track <event>`

Track analytics events directly from the command line:

```bash
# Track a simple event
nodash track user_signup

# Track event with properties
nodash track user_signup --properties '{"plan": "pro", "source": "cli"}'

# Track with user and session IDs
nodash track page_view --user-id user123 --session-id session456

# Dry run (show what would be sent)
nodash track purchase --properties '{"amount": 99.99}' --dry-run

# Output as JSON
nodash track login --format json
```

### Metrics Monitoring

#### `nodash metric <name> <value>`

Send metrics to Nodash monitoring:

```bash
# Send a simple metric
nodash metric response_time 150

# Send metric with unit
nodash metric response_time 150 --unit ms

# Send metric with tags
nodash metric cpu_usage 75 --tags service=api,region=us-east

# Dry run mode
nodash metric memory_usage 512 --unit MB --dry-run

# Output as JSON
nodash metric disk_usage 85 --format json
```

### Health Monitoring

#### `nodash health`

Check Nodash service health and connectivity:

```bash
# Basic health check
nodash health

# Verbose health information
nodash health --verbose

# Output as JSON
nodash health --format json

# Custom timeout
nodash health --timeout 5000
```

### Project Analysis

#### `nodash analyze [path]`

Analyze your project for analytics integration:

```bash
# Analyze current directory
nodash analyze

# Analyze specific directory
nodash analyze /path/to/project

# Show verbose information and code examples
nodash analyze --verbose

# Generate setup files
nodash analyze --setup

# Force re-analysis
nodash analyze --force

# Output as JSON
nodash analyze --json
```

## Features

### 🔧 Configuration Management
- Secure local storage of API credentials
- Support for user-level and project-level configuration
- Configuration validation with helpful error messages
- Masked display of sensitive values

### 📊 Event Tracking
- Direct event tracking via SDK integration
- JSON properties support with validation
- Dry-run mode for testing
- User and session ID support

### 📈 Metrics Monitoring
- Real-time metric sending
- Support for units and tags
- Comprehensive validation
- Dry-run capabilities

### 🏥 Health Monitoring
- Service connectivity testing
- Detailed health diagnostics
- Response time monitoring
- Troubleshooting guidance

### 🔍 Project Analysis
- Framework detection (React, Vue, Angular, Next.js, Express, etc.)
- SDK integration examples
- Setup file generation
- Configuration validation

### 🎨 User Experience
- Colored output with --no-color option
- Multiple output formats (table, JSON)
- Progress indicators and status messages
- Comprehensive error handling with solutions

## Configuration

The CLI stores configuration in two locations:

- **User-level**: `~/.nodash/config.json` (global defaults)
- **Project-level**: `./.nodash/config.json` (project-specific overrides)

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `token` | API authentication token | Required |
| `baseUrl` | API base URL | `https://api.nodash.ai` |
| `timeout` | Request timeout (ms) | `30000` |
| `retries` | Number of retry attempts | `3` |
| `defaultFormat` | Default output format | `table` |
| `verbose` | Enable verbose logging | `false` |

## Error Handling

The CLI provides comprehensive error handling with actionable solutions:

### Common Issues

**Missing API Token:**
```bash
❌ Configuration Error: API token not configured
💡 Run: nodash config set token <your-api-token>
```

**Network Connectivity:**
```bash
❌ Network Error: Unable to connect to Nodash API
💡 Check your internet connection
💡 Try: nodash health to test connectivity
```

**Invalid JSON Properties:**
```bash
❌ Validation Error: Invalid JSON in properties
💡 Example: nodash track signup --properties '{"plan": "pro"}'
```

## Examples

### Basic Workflow

```bash
# 1. Set up authentication
nodash config set token your-api-token

# 2. Test connectivity
nodash health

# 3. Track some events
nodash track app_started
nodash track user_action --properties '{"action": "click", "element": "button"}'

# 4. Send metrics
nodash metric response_time 245 --unit ms --tags endpoint=/api/users

# 5. Analyze your project
nodash analyze --setup
```

### Development Workflow

```bash
# Test events before implementing
nodash track user_signup --properties '{"plan": "pro"}' --dry-run

# Monitor API performance
nodash metric api_response_time 150 --unit ms --tags method=GET,endpoint=/users

# Check service health
nodash health --verbose

# Generate integration code
nodash analyze --setup --verbose
```

### CI/CD Integration

```bash
# Set token from environment
nodash config set token $NODASH_TOKEN

# Send deployment metrics
nodash metric deployment_duration 120 --unit seconds --tags environment=production

# Track deployment events
nodash track deployment_completed --properties '{"version": "1.2.3", "environment": "production"}'
```

## Global Options

All commands support these global options:

- `--no-color`: Disable colored output
- `--verbose`: Enable verbose logging
- `--format <format>`: Set output format (json, table)

## Requirements

- Node.js 18+
- Valid Nodash API token
- Internet connectivity for API calls

## Troubleshooting

### Configuration Issues
```bash
# Check current configuration
nodash config list

# Validate configuration
nodash health

# Reset configuration
rm ~/.nodash/config.json ./.nodash/config.json
```

### Network Issues
```bash
# Test connectivity
nodash health --verbose

# Check base URL
nodash config get baseUrl

# Use default URL
nodash config set baseUrl https://api.nodash.ai
```

### Authentication Issues
```bash
# Verify token
nodash config get token

# Test authentication
nodash health

# Set new token
nodash config set token your-new-token
```

## Support

- Documentation: https://docs.nodash.ai/cli
- Issues: https://github.com/nodash/nodash/issues
- Support: support@nodash.ai

## License

MIT 