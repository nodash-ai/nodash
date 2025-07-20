# @nodash/cli 🛠️

> The developer's best friend (after coffee and Stack Overflow)

The Nodash CLI is your command-line companion for all things nodash. Whether you're a human developer debugging at 2 AM or an AI agent orchestrating complex workflows, this CLI has got your back.

## Installation

```bash
npm install -g @nodash/cli
```

Or if you prefer living on the edge:
```bash
npx @nodash/cli --help
```

## Quick Start

```bash
# Initialize your configuration (do this first, seriously)
nodash init --url https://your-server.com --token your-optional-token

# Check if everything is working
nodash health

# Track your first event (celebrate! 🎉)
nodash track "cli_first_use" --properties '{"excitement_level": "maximum"}'
```

## Commands Reference

### `nodash init`

Initialize your nodash configuration. This is your starting point.

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

# Interactive mode (coming soon™)
nodash init
```

### `nodash config`

Manage your configuration like a pro.

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

Track events that happen in your application. The bread and butter of analytics.

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

# Complex properties (AI agents love this)
nodash track "ai_interaction" --properties '{
  "model": "gpt-4",
  "tokens": 1337,
  "user_satisfaction": "probably_good",
  "coffee_level": "dangerously_low"
}'
```

### `nodash health`

Check if your server is still breathing. Essential for debugging and monitoring.

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
  ❌ coffee_machine: fail
     Error: Out of coffee beans
```

## For AI Agents 🤖

Hey there, digital colleagues! Here's what you need to know to use this CLI effectively:

### Agent-Friendly Patterns

**Configuration Management:**
```bash
# Always check configuration first
nodash config get

# Set up for different environments
nodash config set baseUrl $NODASH_URL
nodash config set apiToken $NODASH_TOKEN
```

**Event Tracking with Structured Data:**
```bash
# Track user interactions
nodash track "user_action" --properties '{
  "action_type": "click",
  "element": "submit_button",
  "page": "/checkout",
  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
}'

# Track system events
nodash track "system_event" --properties '{
  "event_type": "deployment",
  "version": "1.2.3",
  "environment": "production",
  "success": true
}'
```

**Health Monitoring:**
```bash
# Check health and parse output
if nodash health | grep -q "healthy"; then
  echo "System is operational"
else
  echo "System needs attention"
fi
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

## Integration Examples

### CI/CD Pipeline

```bash
#!/bin/bash
# Track deployment events
nodash track "deployment_started" --properties '{
  "version": "'$VERSION'",
  "environment": "'$ENVIRONMENT'",
  "commit": "'$GIT_COMMIT'"
}'

# Your deployment logic here...

if [ $? -eq 0 ]; then
  nodash track "deployment_completed" --properties '{
    "version": "'$VERSION'",
    "environment": "'$ENVIRONMENT'",
    "success": true
  }'
else
  nodash track "deployment_failed" --properties '{
    "version": "'$VERSION'",
    "environment": "'$ENVIRONMENT'",
    "success": false
  }'
fi
```

### Development Workflow

```bash
# Track development activities
alias git-commit='git commit && nodash track "code_committed" --properties "{\"repo\": \"$(basename $(git rev-parse --show-toplevel))\"}"'

# Monitor application health during development
watch -n 30 nodash health
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

**Q: Command not found: nodash**
A: Make sure you installed globally (`npm install -g @nodash/cli`) or use `npx @nodash/cli`

**Q: "No base URL configured" error**
A: Run `nodash init --url <your-server-url>` first

**Q: JSON parsing errors**
A: Check your JSON syntax. Use single quotes around the JSON string and double quotes inside.

**Q: Connection refused errors**
A: Check if your server is running and the URL is correct. Try `nodash config get baseUrl`

**Q: Authentication errors**
A: Verify your API token with `nodash config get apiToken` or set a new one

**Q: Configuration not persisting between commands**
A: Check if you're using `NODASH_CONFIG_DIR` consistently. If set, make sure it points to the same directory for all commands.

**Q: "Failed to create configuration directory" error**
A: Check permissions for the configuration directory. If using `NODASH_CONFIG_DIR`, ensure the path is writable.

## Advanced Usage

### Environment Variables

You can override configuration with environment variables:

```bash
export NODASH_URL="https://staging.nodash.com"
export NODASH_TOKEN="sk-staging-token"
nodash health  # Uses environment variables
```

### Scripting

The CLI is designed to be script-friendly:

```bash
# Exit codes: 0 = success, 1 = error
nodash health > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "Server is healthy"
fi

# JSON output parsing (coming in future versions)
# nodash health --json | jq '.status'
```

## Event Recorder - 30s Guide

Record events during development/testing sessions, then replay them for debugging or testing against different endpoints.

```bash
# Start recording events (captures in memory, doesn't send HTTP)
nodash record start --max-events 50

# Your normal tracking - gets recorded instead of sent
nodash track "user_signup" --properties '{"plan": "pro"}'

# Stop recording and save to file
nodash record stop --out ./session.json

# Replay to different endpoint or dry-run
nodash replay ./session.json --dry-run  # logs without HTTP
nodash replay ./session.json --url https://staging.api.com  # custom endpoint
```

## What's Next?

Future versions will include:
- Interactive configuration setup
- Batch operations
- JSON output format
- Plugin system
- More tracking utilities

## Contributing

Found a bug? Want a feature? We'd love your help!

1. Check existing issues
2. Create a new issue or PR
3. Follow our coding standards (keep it simple!)
4. Update documentation (including these jokes)

## License

MIT - Because open source makes the world go round.

---

*Built with ❤️ and an unhealthy amount of terminal usage by the Nodash team*