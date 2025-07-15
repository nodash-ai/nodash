# CLI Integration Guide

This guide covers the CLI integration features of the Nodash MCP Server, providing detailed information on how to use the enhanced CLI-powered tools and workflows.

## Overview

The Nodash MCP Server now includes comprehensive CLI integration that enhances the development experience by providing:

- **Live command execution** with safety checks
- **Automated workflows** for common tasks
- **Real-time validation** and health monitoring
- **Secure configuration management**
- **Intelligent error handling** and troubleshooting

## Prerequisites

### Required
- Node.js ≥ 18.0.0
- MCP-compatible client (Claude Desktop, etc.)
- Nodash MCP Server installed and configured

### Optional but Recommended
- Nodash CLI installed globally for enhanced functionality:
```bash
npm install -g @nodash/cli
```

## CLI Integration Tools

### 1. Complete Setup Tool

**Tool**: `setup_nodash_complete`

Performs a complete Nodash setup including configuration, project analysis, and validation.

**Parameters**:
```json
{
  "apiToken": "your-api-token",
  "environment": "dev|staging|prod",
  "generateSetupFiles": true
}
```

**Example Usage**:
```
"Set up Nodash completely with API token abc123 for development environment"
```

**What it does**:
1. Securely stores your API token
2. Analyzes your project structure
3. Tests connectivity and authentication
4. Generates framework-specific setup files
5. Provides comprehensive recommendations

### 2. CLI Command Execution Tool

**Tool**: `execute_cli_command`

Executes any Nodash CLI command with built-in safety checks and validation.

**Parameters**:
```json
{
  "command": "config|track|metric|health|analyze",
  "args": ["arg1", "arg2"],
  "options": {
    "dryRun": true,
    "format": "json|table",
    "verbose": false
  },
  "requireConfirmation": true
}
```

**Example Usage**:
```
"Check my current configuration"
"Test tracking a user_login event in dry-run mode"
"Run a health check with verbose output"
```

**Safety Features**:
- Commands default to dry-run mode
- Input sanitization prevents command injection
- Destructive operations require explicit confirmation
- Only allowed commands can be executed

### 3. Implementation Validation Tool

**Tool**: `validate_implementation`

Runs comprehensive validation of your Nodash implementation using CLI diagnostics.

**Parameters**:
```json
{
  "includeHealthCheck": true,
  "testEvents": ["user_login", "page_view"],
  "testMetrics": [
    {"name": "response_time", "value": 150}
  ]
}
```

**Example Usage**:
```
"Validate my Nodash implementation with health checks and test events"
```

**Validation Steps**:
1. Configuration validation
2. Service health check
3. Event tracking tests (dry-run)
4. Metric sending tests (dry-run)
5. Comprehensive reporting

### 4. Automated Troubleshooting Tool

**Tool**: `troubleshoot_issues`

Provides automated diagnostics and troubleshooting for common issues.

**Parameters**:
```json
{
  "symptoms": ["token error", "connection failed"],
  "runDiagnostics": true,
  "includeProjectAnalysis": true
}
```

**Example Usage**:
```
"I'm getting authentication errors, help me troubleshoot"
"My events aren't being tracked, run diagnostics"
```

**Diagnostic Process**:
1. Analyzes reported symptoms
2. Runs targeted diagnostic commands
3. Provides specific solutions
4. Offers step-by-step remediation

### 5. Workflow Execution Tool

**Tool**: `execute_workflow`

Executes predefined workflows for common tasks.

**Parameters**:
```json
{
  "workflowName": "setup|validation|health-check",
  "context": {
    "projectPath": ".",
    "confirmDestructive": true,
    "verboseOutput": false
  }
}
```

**Available Workflows**:
- **setup**: Complete project setup and configuration
- **validation**: Comprehensive implementation validation
- **health-check**: Service health and connectivity testing

## Security Considerations

### Command Validation
All CLI commands go through multiple security layers:

1. **Allowed Commands**: Only specific commands are permitted
   - `config` - Configuration management
   - `track` - Event tracking
   - `metric` - Metric sending
   - `health` - Health checks
   - `analyze` - Project analysis

2. **Argument Sanitization**: Dangerous arguments are blocked
   - `--force`, `--no-confirm`, `-f` are restricted
   - Input is sanitized to prevent injection attacks

3. **Confirmation Requirements**: Destructive operations require explicit confirmation
   - Token configuration changes
   - Non-dry-run operations

### Token Security
- Tokens are validated for format and length
- Tokens are masked in logs and output
- Secure storage mechanisms are used

## Workflow Examples

### Complete Setup Workflow

```
Human: "Set up Nodash for my React project with token abc123"

AI: I'll help you set up Nodash completely for your React project. Let me use the CLI integration to configure everything properly.

[Uses setup_nodash_complete tool]

✅ Setup completed successfully!

Configuration:
- API token configured and validated
- React framework detected
- TypeScript support confirmed
- Health check passed

Generated Files:
- .nodash/setup/react-integration.tsx
- .nodash/setup/event-types.ts
- .nodash/setup/analytics-provider.tsx

Next Steps:
1. Copy the generated files to your src/ directory
2. Import the AnalyticsProvider in your App.tsx
3. Start tracking events using the provided examples

Would you like me to show you how to implement the generated code?
```

### Validation Workflow

```
Human: "Validate my Nodash implementation"

AI: I'll run a comprehensive validation of your Nodash implementation using CLI diagnostics.

[Uses validate_implementation tool]

✅ Validation Results:

Configuration: ✅ Valid
- API token: Configured and authenticated
- Base URL: https://api.nodash.co
- Environment: development

Health Status: ✅ Healthy
- API connectivity: 120ms response time
- Authentication: Valid
- Service status: All systems operational

Event Tracking: ✅ Working
- test_event: Successfully validated (dry-run)
- user_login: Successfully validated (dry-run)

Your Nodash implementation is correctly configured and ready for production use!
```

### Troubleshooting Workflow

```
Human: "I'm getting authentication errors when tracking events"

AI: I'll help you troubleshoot the authentication issues. Let me run automated diagnostics.

[Uses troubleshoot_issues tool with symptoms: ["authentication error", "event tracking failed"]]

🔍 Diagnostic Results:

Issues Found:
- API token configuration issue detected
- Token format appears invalid

Solutions Applied:
1. Validated token configuration
2. Tested authentication endpoint
3. Checked token permissions

Recommendations:
1. Verify your API token format (should be 32+ characters)
2. Check token permissions in your Nodash dashboard
3. Ensure token hasn't expired

Would you like me to help you reconfigure your API token?
```

## Error Handling and Fallbacks

### CLI Unavailable
When the CLI is not available, the MCP server automatically:
- Falls back to MCP-only functionality
- Provides clear messaging about reduced capabilities
- Suggests CLI installation for enhanced features

### Command Failures
When CLI commands fail:
- Detailed error analysis is provided
- Specific troubleshooting steps are suggested
- Fallback recommendations are offered

### Network Issues
For connectivity problems:
- Network diagnostics are run automatically
- Proxy and firewall guidance is provided
- Alternative configuration options are suggested

## Performance Optimization

### Command Caching
- Frequently executed commands are cached
- Cache invalidation based on command type and parameters
- Significant performance improvement for repeated operations

### Async Execution
- Long-running commands execute asynchronously
- Progress reporting for extended operations
- Timeout management prevents hanging operations

### Resource Management
- Connection pooling for CLI processes
- Memory usage monitoring and cleanup
- Graceful handling of resource constraints

## Best Practices

### Development Workflow
1. Start with `setup_nodash_complete` for new projects
2. Use `validate_implementation` regularly during development
3. Run `troubleshoot_issues` when problems arise
4. Use dry-run mode for testing before production

### Security Best Practices
1. Always use dry-run mode for testing
2. Confirm destructive operations explicitly
3. Regularly validate token permissions
4. Monitor command execution logs

### Performance Best Practices
1. Use caching for repeated operations
2. Run diagnostics during off-peak hours
3. Monitor resource usage in production
4. Use verbose output only when debugging

## Advanced Usage

### Custom Workflows
While predefined workflows cover common scenarios, you can chain multiple CLI commands for custom workflows:

```
1. execute_cli_command: "config list" (check current config)
2. execute_cli_command: "analyze ." (analyze project)
3. execute_cli_command: "health --verbose" (detailed health check)
4. validate_implementation: comprehensive validation
```

### Integration with CI/CD
CLI integration tools can be used in automated environments:
- Validation in CI pipelines
- Health monitoring in deployment scripts
- Configuration validation in staging environments

### Monitoring and Alerting
Use CLI integration for monitoring:
- Regular health checks
- Configuration drift detection
- Performance monitoring
- Error rate tracking

## Troubleshooting Common Issues

### CLI Not Detected
**Symptoms**: "CLI not available - running in MCP-only mode"
**Solutions**:
1. Install CLI: `npm install -g @nodash/cli`
2. Verify PATH configuration
3. Check Node.js version compatibility
4. Restart MCP server after CLI installation

### Command Execution Failures
**Symptoms**: Commands fail with validation errors
**Solutions**:
1. Check command syntax and arguments
2. Verify permissions and file access
3. Use dry-run mode for testing
4. Review security policy restrictions

### Authentication Issues
**Symptoms**: "Authentication failed" or "Invalid token"
**Solutions**:
1. Verify token format and validity
2. Check token permissions in dashboard
3. Test with `execute_cli_command: "health"`
4. Reconfigure token if necessary

### Network Connectivity Problems
**Symptoms**: "Connection timeout" or "Network error"
**Solutions**:
1. Test basic connectivity
2. Check firewall and proxy settings
3. Verify DNS resolution
4. Use verbose mode for detailed diagnostics

## Support and Resources

### Getting Help
1. Use `troubleshoot_issues` for automated diagnostics
2. Check error messages for specific guidance
3. Review logs for detailed information
4. Use verbose mode for debugging

### Documentation
- [Main README](../README.md) - Complete MCP server documentation
- [Security Guide](./security-considerations.md) - Security best practices
- [API Reference](./api-reference.md) - Complete tool reference

### Community
- GitHub Issues for bug reports
- Discussions for questions and feedback
- Examples repository for implementation patterns

---

**Ready to enhance your development workflow with CLI integration?** Start with the complete setup tool and experience the power of integrated analytics development!