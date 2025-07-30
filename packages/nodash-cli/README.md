# @nodash/cli

The Nodash CLI is a command-line interface for the Nodash analytics ecosystem. It provides developers and AI agents with comprehensive tools for event tracking, configuration management, and server monitoring. The CLI is built on top of the Nodash SDK and offers both interactive and programmatic usage patterns.

## Installation

```bash
npm install -g @nodash/cli
```

Or run without installation:
```bash
npx @nodash/cli --help
```

## Architecture

The CLI operates as the developer layer in the Nodash ecosystem:

```
┌─────────────────┐
│   @nodash/mcp   │  ← AI Agent Layer
│  (AI Agents)    │
└─────────────────┘
         ↑
┌─────────────────┐
│   @nodash/cli   │  ← Developer Layer (this package)
│  (Developer)    │
└─────────────────┘
         ↑
┌─────────────────┐
│   @nodash/sdk   │  ← Foundation Layer
│   (Foundation)  │
└─────────────────┘
```

The CLI provides:
- **Command-line Interface**: Direct access to Nodash functionality from terminal
- **Configuration Management**: Persistent configuration storage and management
- **Query Interface**: Command-line access to analytics data
- **Agent Integration**: Structured output and error handling for AI agents

## Quick Start

```bash
# Initialize your configuration
nodash init --url https://your-server.com --token your-optional-token

# Check server connectivity
nodash health

# Track your first event
nodash track "cli_first_use" --properties '{"source": "documentation"}'
```

## Commands Reference

### `nodash init`

Initialize your nodash configuration. This command sets up the CLI with your server URL and authentication token.

```bash
nodash init [options]
```

**Options:**
- `--url, -u <url>`: Base URL for your nodash server
- `--token, -t <token>`: API token (optional, depends on your server)

**Examples:**
```bash
# Full setup
nodash init --url https://api.nodash.com --token sk-your-secret-token

# Just the URL (for servers that don't need tokens)
nodash init --url http://localhost:3000

# Interactive mode (prompts for configuration)
nodash init
```

### `nodash config`

Manage your configuration settings.

```bash
nodash config <action> [key] [value]
```

**Actions:**
- `get`: Retrieve configuration values
- `set`: Set configuration values

**Examples:**
```bash
# View all configuration
nodash config get

# Get specific value
nodash config get baseUrl

# Set a value
nodash config set baseUrl https://new-server.com
nodash config set apiToken your-new-token
```

### `nodash track`

Track events that happen in your application.

```bash
nodash track <event> [options]
```

**Options:**
- `--properties, -p <json>`: Event properties as JSON string

**Examples:**
```bash
# Simple event
nodash track "user_login"

# Event with properties
nodash track "purchase_completed" --properties '{"amount": 99.99, "currency": "USD"}'

# Complex properties for AI agent tracking
nodash track "ai_interaction" --properties '{
  "model": "gpt-4",
  "tokens": 1337,
  "user_satisfaction": "high",
  "response_time_ms": 250
}'
```

### `nodash health`

Check server health status. Essential for debugging and monitoring.

```bash
nodash health
```

**Example Output:**
```
🏥 Server Health Status:
Status: healthy
Version: 1.0.0
Uptime: 3600s

Health Checks:
  ✅ database: pass
  ✅ redis: pass
  ❌ storage: fail
     Error: Connection timeout
```

### `nodash query events`

Query events with filtering and pagination options.

```bash
nodash query events [options]
```

**Options:**
- `--type <types>`: Event types (comma-separated)
- `--user-id <userId>`: Filter by user ID
- `--start-date <date>`: Start date (ISO 8601 format)
- `--end-date <date>`: End date (ISO 8601 format)
- `--properties <json>`: Filter by properties (JSON string)
- `--sort-by <field>`: Sort by field (timestamp, eventName, userId)
- `--sort-order <order>`: Sort order (asc, desc)
- `--limit <number>`: Maximum number of results
- `--offset <number>`: Number of results to skip
- `--format <format>`: Output format (json, table, csv)

**Examples:**
```bash
# Query recent events
nodash query events --limit 10 --sort-by timestamp --sort-order desc

# Query specific event types
nodash query events --type "user_signup,purchase" --start-date "2024-01-01"

# Query with property filters
nodash query events --properties '{"plan": "premium"}' --format table
```

### `nodash query users`

Query users with filtering and pagination options.

```bash
nodash query users [options]
```

**Options:**
- `--user-id <userId>`: Filter by specific user ID
- `--active-since <date>`: Filter users active since date
- `--active-until <date>`: Filter users active until date
- `--properties <json>`: Filter by user properties (JSON string)
- `--sort-by <field>`: Sort by field (firstSeen, lastSeen, eventCount, sessionCount)
- `--sort-order <order>`: Sort order (asc, desc)
- `--limit <number>`: Maximum number of results
- `--offset <number>`: Number of results to skip
- `--format <format>`: Output format (json, table, csv)

**Examples:**
```bash
# Query active users
nodash query users --active-since "2024-01-01" --sort-by lastSeen

# Query users with specific properties
nodash query users --properties '{"plan": "pro"}' --format csv

# Query top users by activity
nodash query users --sort-by eventCount --sort-order desc --limit 20
```

## AI Agent Integration

The CLI is designed for programmatic use by AI agents with structured output and comprehensive error handling:

### Agent-Friendly Patterns

**Configuration Management:**
```bash
# Verify current configuration
nodash config get

# Environment-based setup
nodash config set baseUrl $NODASH_URL
nodash config set apiToken $NODASH_TOKEN
nodash config set environment $ENVIRONMENT
```

**Event Tracking with Structured Data:**
```bash
# Track user interactions with comprehensive metadata
nodash track "user_action" --properties '{
  "action_type": "click",
  "element": "submit_button",
  "page": "/checkout",
  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
  "user_agent": "AI-Agent/1.0",
  "session_id": "session-123"
}'

# Track system events with deployment context
nodash track "system_event" --properties '{
  "event_type": "deployment",
  "version": "1.2.3",
  "environment": "production",
  "success": true,
  "duration_ms": 45000,
  "commit_hash": "'$GIT_COMMIT'"
}'

# Track AI agent interactions
nodash track "ai_interaction" --properties '{
  "model": "gpt-4",
  "tokens_used": 1337,
  "response_time_ms": 250,
  "task_type": "code_generation",
  "success": true
}'
```

**Health Monitoring and Error Handling:**
```bash
# Check health with structured error handling
if nodash health | grep -q "healthy"; then
  echo "System operational"
  exit 0
else
  echo "System health check failed"
  exit 1
fi

# Parse health output for detailed status
HEALTH_OUTPUT=$(nodash health 2>&1)
if echo "$HEALTH_OUTPUT" | grep -q "healthy"; then
  echo "All systems operational"
else
  echo "Health issues detected: $HEALTH_OUTPUT"
fi
```

**Data Querying for Analysis:**
```bash
# Query recent events for analysis
nodash query events --limit 100 --format json > recent_events.json

# Query user activity for specific time period
nodash query users --active-since "2024-01-01" --format csv > user_activity.csv

# Query specific event types with filters
nodash query events --type "error,warning" --start-date "2024-01-01" --format table
```

### JSON Property Guidelines

When using `--properties`, ensure your JSON is valid:

✅ **Good:**
```bash
nodash track "event" --properties '{"key": "value", "number": 42}'
```

❌ **Bad:**
```bash
nodash track "event" --properties "{key: value}"  # Missing quotes
nodash track "event" --properties '{'key': 'value'}'  # Wrong quotes
```

### Error Handling

The CLI provides clear error messages:

```bash
# Missing configuration
$ nodash track "test"
❌ Track error: No base URL configured. Run "nodash config set baseUrl <url>" first.

# Invalid JSON
$ nodash track "test" --properties '{invalid}'
❌ Invalid JSON in properties

# Network issues
$ nodash health
❌ Health check failed: Request failed: connect ECONNREFUSED 127.0.0.1:3000
```

## Configuration File

The CLI stores configuration in `~/.nodash/config.json` by default:

```json
{
  "baseUrl": "https://api.nodash.com",
  "apiToken": "sk-your-token",
  "environment": "production"
}
```

You can edit this file directly if you prefer, but using `nodash config` is safer.

### Configuration Options

| Key | Description | Default | Environment Variable |
|-----|-------------|---------|---------------------|
| `baseUrl` | Server URL | None | `NODASH_URL` |
| `apiToken` | Authentication token | None | `NODASH_TOKEN` |
| `environment` | Environment name | None | `NODASH_ENVIRONMENT` |
| `timeout` | Request timeout (ms) | 5000 | `NODASH_TIMEOUT` |
| `retries` | Max retry attempts | 3 | `NODASH_RETRIES` |
| `customHeaders` | Additional HTTP headers | {} | N/A |

### Environment Variable Override

Environment variables take precedence over configuration file settings:

```bash
export NODASH_URL="https://api.example.com"
export NODASH_TOKEN="your-api-token"
export NODASH_ENVIRONMENT="production"
export NODASH_TIMEOUT="10000"

# Commands will use environment variables
nodash health
nodash track "test_event"
```

### Custom Configuration Directory

You can customize where the CLI stores its configuration using the `NODASH_CONFIG_DIR` environment variable:

```bash
# Use a project-specific configuration directory
export NODASH_CONFIG_DIR="./config/nodash"
nodash init --url https://project-api.com

# Use different configurations for different environments
export NODASH_CONFIG_DIR="~/.config/nodash/staging"
nodash config set baseUrl https://staging-api.com

export NODASH_CONFIG_DIR="~/.config/nodash/production"
nodash config set baseUrl https://api.com
```

This is particularly useful for:
- **Testing**: Isolate test configurations from your personal settings
- **Multi-project workflows**: Keep separate configurations for different projects
- **CI/CD environments**: Use containerized or temporary configuration directories
- **Team collaboration**: Share project-specific configurations via version control

## Comprehensive Usage Examples

### CI/CD Pipeline Integration

```bash
#!/bin/bash
# Comprehensive deployment tracking script

# Set up environment-specific configuration
export NODASH_CONFIG_DIR="/tmp/nodash-${ENVIRONMENT}"
nodash init --url "$NODASH_URL" --token "$NODASH_TOKEN"

# Track deployment start with comprehensive metadata
nodash track "deployment_started" --properties '{
  "version": "'$VERSION'",
  "environment": "'$ENVIRONMENT'",
  "commit": "'$GIT_COMMIT'",
  "branch": "'$GIT_BRANCH'",
  "triggered_by": "'$TRIGGERED_BY'",
  "pipeline_id": "'$PIPELINE_ID'",
  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
}'

# Pre-deployment health check
if ! nodash health > /dev/null 2>&1; then
  nodash track "deployment_failed" --properties '{
    "version": "'$VERSION'",
    "environment": "'$ENVIRONMENT'",
    "failure_reason": "pre_deployment_health_check_failed",
    "stage": "pre_deployment"
  }'
  exit 1
fi

# Execute deployment
DEPLOY_START=$(date +%s)
./deploy.sh
DEPLOY_EXIT_CODE=$?
DEPLOY_END=$(date +%s)
DEPLOY_DURATION=$((DEPLOY_END - DEPLOY_START))

# Track deployment completion
if [ $DEPLOY_EXIT_CODE -eq 0 ]; then
  nodash track "deployment_completed" --properties '{
    "version": "'$VERSION'",
    "environment": "'$ENVIRONMENT'",
    "success": true,
    "duration_seconds": '$DEPLOY_DURATION',
    "stage": "deployment"
  }'
  
  # Post-deployment verification
  sleep 30
  if nodash health | grep -q "healthy"; then
    nodash track "deployment_verified" --properties '{
      "version": "'$VERSION'",
      "environment": "'$ENVIRONMENT'",
      "verification_passed": true
    }'
  else
    nodash track "deployment_verification_failed" --properties '{
      "version": "'$VERSION'",
      "environment": "'$ENVIRONMENT'",
      "verification_passed": false
    }'
  fi
else
  nodash track "deployment_failed" --properties '{
    "version": "'$VERSION'",
    "environment": "'$ENVIRONMENT'",
    "success": false,
    "exit_code": '$DEPLOY_EXIT_CODE',
    "duration_seconds": '$DEPLOY_DURATION',
    "stage": "deployment"
  }'
  exit $DEPLOY_EXIT_CODE
fi
```

### Development Workflow Integration

```bash
#!/bin/bash
# Enhanced development workflow tracking

# Set up development environment configuration
export NODASH_CONFIG_DIR="$HOME/.config/nodash/dev"
nodash init --url "http://localhost:3000"

# Enhanced git commit tracking
function enhanced_git_commit() {
  local commit_message="$1"
  local repo_name=$(basename $(git rev-parse --show-toplevel))
  local branch_name=$(git rev-parse --abbrev-ref HEAD)
  local commit_hash=$(git rev-parse HEAD)
  local files_changed=$(git diff --name-only HEAD~1 | wc -l)
  
  git commit -m "$commit_message"
  
  if [ $? -eq 0 ]; then
    nodash track "code_committed" --properties '{
      "repo": "'$repo_name'",
      "branch": "'$branch_name'",
      "commit_hash": "'$commit_hash'",
      "message": "'$commit_message'",
      "files_changed": '$files_changed',
      "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
    }'
  fi
}

# Continuous health monitoring with alerting
function monitor_health() {
  while true; do
    if ! nodash health > /dev/null 2>&1; then
      nodash track "development_server_down" --properties '{
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
        "environment": "development"
      }'
      echo "⚠️  Development server health check failed"
    fi
    sleep 30
  done
}

# Start background health monitoring
monitor_health &
MONITOR_PID=$!

# Cleanup on script exit
trap "kill $MONITOR_PID 2>/dev/null" EXIT
```

### Agent Automation

```bash
#!/bin/bash
# Agent script for monitoring and tracking

# Check system health
HEALTH=$(nodash health 2>&1)
if echo "$HEALTH" | grep -q "healthy"; then
  nodash track "health_check" --properties '{"status": "healthy", "automated": true}'
else
  nodash track "health_check" --properties '{"status": "unhealthy", "automated": true}'
  # Trigger alerts or remediation
fi
```

### Testing with Configuration Isolation

```bash
#!/bin/bash
# Test script with isolated configuration

# Set up test-specific configuration directory
export NODASH_CONFIG_DIR="./test-config"

# Initialize test configuration
nodash init --url http://localhost:3001 --token test-token

# Run your tests
npm test

# Configuration is isolated - won't affect your personal settings
# Clean up test config if needed
rm -rf ./test-config
```

### Multi-Environment CI/CD

```bash
#!/bin/bash
# CI/CD script supporting multiple environments

case "$ENVIRONMENT" in
  "staging")
    export NODASH_CONFIG_DIR="/tmp/nodash-staging"
    nodash init --url https://staging-api.example.com --token "$STAGING_TOKEN"
    ;;
  "production")
    export NODASH_CONFIG_DIR="/tmp/nodash-production"
    nodash init --url https://api.example.com --token "$PRODUCTION_TOKEN"
    ;;
  *)
    export NODASH_CONFIG_DIR="/tmp/nodash-dev"
    nodash init --url http://localhost:3000
    ;;
esac

# Deploy and track
nodash track "deployment_started" --properties "{\"environment\": \"$ENVIRONMENT\"}"
# ... deployment logic ...
nodash track "deployment_completed" --properties "{\"environment\": \"$ENVIRONMENT\"}"
```

## Troubleshooting

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| `Command not found: nodash` | CLI not installed globally | Run `npm install -g @nodash/cli` or use `npx @nodash/cli` |
| `No base URL configured` | Missing configuration | Run `nodash init --url <your-server-url>` |
| `JSON parsing errors` | Invalid JSON syntax | Use single quotes around JSON string, double quotes inside |
| `Connection refused` | Server not reachable | Verify server URL and network connectivity |
| `401 Unauthorized` | Invalid API token | Check token with `nodash config get apiToken` |
| `Configuration not persisting` | Inconsistent `NODASH_CONFIG_DIR` | Ensure environment variable points to same directory |
| `Permission denied` | Insufficient file permissions | Check write permissions for configuration directory |

### Debug Mode

Enable debug output for troubleshooting:

```bash
export DEBUG=nodash:*
nodash track "debug_event"
```

### Configuration Validation

Validate your current configuration:

```bash
# Check all configuration values
nodash config get

# Test connectivity
nodash health

# Verify token format (for multi-tenant setups)
nodash config get apiToken | grep -E '^[a-zA-Z0-9]+-[a-zA-Z0-9]+-[a-zA-Z0-9]+$'
```

### Error Codes and Handling

The CLI uses standard exit codes for programmatic error handling:

| Exit Code | Meaning | Common Causes | Recovery Actions |
|-----------|---------|---------------|------------------|
| 0 | Success | Command completed successfully | Continue normal operation |
| 1 | General error | Unexpected failures | Check logs, retry operation |
| 2 | Configuration error | Missing or invalid config | Run `nodash init` or fix config |
| 3 | Network error | Server unreachable | Check connectivity, verify URL |
| 4 | Authentication error | Invalid or missing token | Verify token, check permissions |
| 5 | Validation error | Invalid parameters or data | Check command syntax and data |

### Error Response Format

CLI commands return structured error information:

```bash
# Successful command
$ nodash health
✅ Server healthy

# Error with details
$ nodash track ""
❌ Validation Error: Event name is required
   Command: nodash track ""
   Error Code: 5
   Suggestion: Provide a non-empty event name
   
# Network error with context
$ nodash health
❌ Network Error: Connection refused
   Server: https://api.example.com
   Error Code: 3
   Suggestion: Check server status and network connectivity
```

### Programmatic Error Handling

```bash
#!/bin/bash
# Robust error handling in scripts

execute_with_retry() {
    local command="$1"
    local max_retries=3
    local retry_delay=2
    
    for ((i=1; i<=max_retries; i++)); do
        if eval "$command"; then
            return 0
        fi
        
        local exit_code=$?
        echo "Attempt $i failed with exit code $exit_code"
        
        case $exit_code in
            2) # Configuration error - don't retry
                echo "Configuration error - manual intervention required"
                return $exit_code
                ;;
            3) # Network error - retry with backoff
                if [ $i -lt $max_retries ]; then
                    echo "Network error - retrying in ${retry_delay}s..."
                    sleep $retry_delay
                    retry_delay=$((retry_delay * 2))
                fi
                ;;
            4) # Authentication error - don't retry
                echo "Authentication error - check token"
                return $exit_code
                ;;
            5) # Validation error - don't retry
                echo "Validation error - check command parameters"
                return $exit_code
                ;;
        esac
    done
    
    echo "Command failed after $max_retries attempts"
    return $exit_code
}

# Usage examples
if execute_with_retry "nodash health"; then
    echo "Health check successful"
else
    echo "Health check failed permanently"
    exit 1
fi

if execute_with_retry "nodash track 'deployment' --properties '{\"version\": \"1.0.0\"}'"; then
    echo "Event tracked successfully"
else
    echo "Failed to track deployment event"
fi
```

## Advanced Usage

### Environment Variables

Override configuration with environment variables for different environments:

```bash
# Production environment
export NODASH_URL="https://api.nodash.com"
export NODASH_TOKEN="prod-api-key-company"
export NODASH_ENVIRONMENT="production"

# Staging environment
export NODASH_URL="https://staging.api.nodash.com"
export NODASH_TOKEN="staging-api-key-company"
export NODASH_ENVIRONMENT="staging"

# Development environment
export NODASH_URL="http://localhost:3000"
unset NODASH_TOKEN  # No auth required for local dev
export NODASH_ENVIRONMENT="development"
```

### Scripting and Automation

The CLI is designed for programmatic use with structured output and reliable exit codes:

```bash
#!/bin/bash
# Script-friendly usage patterns

# Health check with proper error handling
check_health() {
  local output
  output=$(nodash health 2>&1)
  local exit_code=$?
  
  if [ $exit_code -eq 0 ]; then
    echo "✅ Server healthy"
    return 0
  else
    echo "❌ Server unhealthy: $output"
    return $exit_code
  fi
}

# Event tracking with error handling
track_event() {
  local event="$1"
  local properties="$2"
  
  if nodash track "$event" --properties "$properties" > /dev/null 2>&1; then
    echo "Event tracked: $event"
  else
    echo "Failed to track event: $event" >&2
    return 1
  fi
}

# Batch event processing
process_events() {
  local events_file="$1"
  
  while IFS=',' read -r event properties; do
    track_event "$event" "$properties" || {
      echo "Failed to process event: $event" >&2
      continue
    }
  done < "$events_file"
}

# Query data with output formatting
export_user_data() {
  local start_date="$1"
  local output_file="$2"
  
  nodash query users \
    --active-since "$start_date" \
    --format csv \
    --limit 1000 > "$output_file"
    
  if [ $? -eq 0 ]; then
    echo "User data exported to $output_file"
  else
    echo "Failed to export user data" >&2
    return 1
  fi
}
```

### Output Parsing

Parse CLI output for integration with other tools:

```bash
# Parse health status
HEALTH_STATUS=$(nodash health --format json | jq -r '.status')
if [ "$HEALTH_STATUS" = "healthy" ]; then
  echo "System operational"
fi

# Parse query results
EVENT_COUNT=$(nodash query events --limit 1 --format json | jq -r '.totalCount')
echo "Total events: $EVENT_COUNT"

# Extract configuration values
BASE_URL=$(nodash config get baseUrl)
echo "Configured server: $BASE_URL"
``` for load testing
## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Issues**: Check existing issues before creating new ones
2. **Pull Requests**: Create focused PRs with clear descriptions
3. **Code Style**: Follow established TypeScript and formatting conventions
4. **Testing**: Add tests for new features and ensure existing tests pass
5. **Documentation**: Update documentation for any CLI changes or new commands

## License

MIT License

---

*Built by the Nodash team*