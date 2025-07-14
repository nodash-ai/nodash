export class PromptsService {
  async generateImplementationPrompt(args: any): Promise<string> {
    const { framework = 'auto-detect' } = args;
    
    return `# Nodash Analytics Implementation Guide

Based on your project analysis, here's your step-by-step implementation plan:

## 1. Installation

\`\`\`bash
npm install @nodash/sdk
\`\`\`

## 2. Framework-Specific Setup

${framework === 'auto-detect' ? 'Based on your project structure, follow the appropriate guide:' : `For ${framework}:`}

**📖 Complete integration guides available in MCP resources**

## 3. Basic Implementation

Import and initialize the SDK in your main app file (e.g., index.ts or App.tsx):

\`\`\`typescript
import nodash from '@nodash/sdk';

// Initialize once at app startup
nodash.init({
  apiUrl: 'http://localhost:3001', // Or your server URL
  debug: true // Optional, for development
});

// Track a simple event
nodash.track('button_clicked', {
  button_id: 'signup',
  location: 'header'
});

// Identify a user
nodash.identify('user-123', { 
  email: 'user@example.com',
  name: 'John Doe',
  plan: 'premium'
});

// Track a page view
nodash.page({
  path: window.location.pathname,
  title: document.title
});
\`\`\`

// Use in components - Example in a React button:
\`\`\`tsx
import nodash from '@nodash/sdk';

function SignupButton() {
  const handleClick = () => {
    nodash.track('signup_button_clicked');
    // Your signup logic...
  };

  return <button onClick={handleClick}>Sign Up</button>;
}
\`\`\`

**Best Practices:**
- Call init() as early as possible in your app lifecycle.
- Use meaningful event names and properties.
- Handle errors gracefully, e.g., with try-catch around track calls.

**Need help?** Use the debug-analytics prompt for troubleshooting assistance.`;
  }

  async generateDebuggingPrompt(args: any): Promise<string> {
    const { issue_description, error_message } = args || {};
    
    return `# Nodash Analytics Debugging Guide

${issue_description ? `**Issue**: ${issue_description}` : ''}
${error_message ? `**Error**: ${error_message}` : ''}

## Debugging Checklist

### 1. Initialization Issues
- ✅ Verify \`nodash.init()\` is called before other methods
- ✅ Check token and API URL are correct
- ✅ Confirm environment variables are loaded

### 2. Network Issues
- ✅ Check if analytics server is running (default: http://localhost:3001)
- ✅ Verify network connectivity and CORS settings
- ✅ Inspect browser Network tab for failed requests

### 3. Event Tracking Issues
- ✅ Enable debug mode: \`debug: true\` in init config
- ✅ Check console for debug messages
- ✅ Verify event names and properties format

**Need specific help?** Describe your issue and I'll provide targeted solutions.`;
  }

  async generateEventDesignPrompt(args: any): Promise<string> {
    const { business_type, key_metrics } = args || {};
    
    return `# Event Schema Design Guide

**Business Type**: ${business_type || 'General'}
**Key Metrics**: ${key_metrics || 'Not specified'}

## Event Design Principles

### 1. Event Naming
- Use clear, descriptive names (e.g., "Product Viewed", "Order Completed")
- Follow consistent naming conventions
- Use past tense for completed actions

### 2. Property Structure
- Use snake_case for property names
- Include relevant context (user, product, session data)
- Add categorical properties for segmentation

**Ready to implement?** Use the implementation prompt to get started with code examples.`;
  }

  async generateMigrationPrompt(args: any): Promise<string> {
    const { current_solution, migration_scope } = args || {};
    
    return `# Analytics Migration Guide

**From**: ${current_solution || 'Current Solution'}
**Scope**: ${migration_scope || 'Full migration'}

## Migration Strategy

### 1. Assessment
- Audit current event tracking
- Map existing events to Nodash schema
- Identify data dependencies

### 2. Implementation
- Install Nodash SDK alongside existing solution
- Implement dual tracking during transition
- Validate data consistency

**Need specific mapping help?** Provide your current event structure for detailed migration guidance.`;
  }

  async generateOptimizationPrompt(args: any): Promise<string> {
    const { performance_issue } = args || {};
    
    return `# Performance Optimization Guide

**Issue**: ${performance_issue || 'General optimization'}

## Optimization Strategies

### 1. Batching & Queuing
\`\`\`typescript
nodash.init('token', {
  batchSize: 20,        // Increase batch size
  flushInterval: 5000,  // Reduce flush frequency
  maxRetries: 2         // Limit retry attempts
});
\`\`\`

### 2. Selective Tracking
- Track only essential events
- Use sampling for high-volume events
- Implement client-side filtering

**Need specific optimization?** Describe your performance requirements and current bottlenecks.`;
  }
} 