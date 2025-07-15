import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { ProjectAnalysisService } from '../services/project-analysis.js';
import { AdvancedAnalysisService } from '../services/advanced-analysis.js';
import { ImplementationGuideService } from '../services/code-generator.js';
import { MCPDevelopmentError, MCPErrorFactory, MCPValidator, withErrorHandling } from '../utils/errors.js';

// Helper functions for development-focused tools
function generateEventTemplates(businessType: string) {
  const templates = {
    'e-commerce': [
      {
        name: 'Product Viewed',
        eventName: 'product_viewed',
        description: 'Track when users view product details',
        usage: 'Product detail pages, search results, recommendations',
        properties: {
          product_id: 'string',
          product_name: 'string',
          category: 'string',
          price: 'number',
          currency: 'string'
        },
        propertyDescriptions: {
          product_id: 'Unique product identifier',
          product_name: 'Human-readable product name',
          category: 'Product category or department',
          price: 'Product price in cents',
          currency: 'Currency code (USD, EUR, etc.)'
        },
        exampleValues: {
          product_id: '"prod_123"',
          product_name: '"Wireless Headphones"',
          category: '"Electronics"',
          price: '9999',
          currency: '"USD"'
        }
      },
      {
        name: 'Add to Cart',
        eventName: 'add_to_cart',
        description: 'Track when users add items to their cart',
        usage: 'Product pages, quick add buttons, bulk actions',
        properties: {
          product_id: 'string',
          quantity: 'number',
          price: 'number',
          cart_total: 'number'
        },
        propertyDescriptions: {
          product_id: 'Product being added',
          quantity: 'Number of items added',
          price: 'Unit price of the item',
          cart_total: 'Total cart value after addition'
        },
        exampleValues: {
          product_id: '"prod_123"',
          quantity: '1',
          price: '9999',
          cart_total: '19998'
        }
      }
    ],
    'saas': [
      {
        name: 'Feature Used',
        eventName: 'feature_used',
        description: 'Track feature adoption and usage patterns',
        usage: 'Any feature interaction, button clicks, tool usage',
        properties: {
          feature_name: 'string',
          feature_category: 'string',
          user_plan: 'string',
          session_duration: 'number'
        },
        propertyDescriptions: {
          feature_name: 'Name of the feature used',
          feature_category: 'Category or module of the feature',
          user_plan: 'User subscription plan',
          session_duration: 'Time spent in current session'
        },
        exampleValues: {
          feature_name: '"Export Data"',
          feature_category: '"Analytics"',
          user_plan: '"Pro"',
          session_duration: '1200'
        }
      }
    ],
    'general': [
      {
        name: 'Page View',
        eventName: 'page_view',
        description: 'Track page navigation and content consumption',
        usage: 'All page loads, route changes, content views',
        properties: {
          page_title: 'string',
          page_url: 'string',
          referrer: 'string',
          load_time: 'number'
        },
        propertyDescriptions: {
          page_title: 'Title of the page viewed',
          page_url: 'Full URL of the page',
          referrer: 'Previous page URL',
          load_time: 'Page load time in milliseconds'
        },
        exampleValues: {
          page_title: '"Home Page"',
          page_url: '"/home"',
          referrer: '"https://google.com"',
          load_time: '850'
        }
      }
    ]
  };

  return templates[businessType as keyof typeof templates] || templates.general;
}

function validateEventSchema(eventName: string, properties: any, context?: string) {
  const issues: Array<{severity: string, message: string}> = [];
  const recommendations: string[] = [];
  
  // Validate event name
  if (!eventName.match(/^[a-z][a-z0-9_]*$/)) {
    issues.push({
      severity: 'error',
      message: 'Event name should be lowercase with underscores (snake_case)'
    });
  }
  
  // Validate properties
  if (!properties || typeof properties !== 'object') {
    issues.push({
      severity: 'error',
      message: 'Properties should be an object with property definitions'
    });
  }
  
  // Check for common missing properties
  const commonProps = ['timestamp', 'user_id', 'session_id'];
  const missingCommon = commonProps.filter(prop => !(prop in properties));
  if (missingCommon.length > 0) {
    recommendations.push(`Consider adding common properties: ${missingCommon.join(', ')}`);
  }
  
  // Improved schema
  const improvedSchema = {
    eventName: eventName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    properties: {
      ...properties,
      timestamp: 'string',
      user_id: 'string (optional)',
      session_id: 'string (optional)'
    }
  };
  
  return {
    isValid: issues.length === 0,
    issues,
    recommendations,
    improvedSchema
  };
}

function generateTrackingCode(eventName: string, framework: string, properties?: any) {
  const frameworks = {
    react: {
      language: 'typescript',
      basic: `import { useNodash } from '@nodash/sdk';

function MyComponent() {
  const { track } = useNodash();
  
  const handleClick = () => {
    track('${eventName}', {
      ${properties ? Object.keys(properties).map(key => `${key}: 'value'`).join(',\n      ') : 'property: "value"'}
    });
  };
  
  return <button onClick={handleClick}>Track Event</button>;
}`,
      advanced: `import { useNodash } from '@nodash/sdk';
import { useCallback } from 'react';

function MyComponent() {
  const { track } = useNodash();
  
  const handleTrackEvent = useCallback(async () => {
    try {
      await track('${eventName}', {
        ${properties ? Object.keys(properties).map(key => `${key}: 'value'`).join(',\n        ') : 'property: "value"'},
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }, [track]);
  
  return <button onClick={handleTrackEvent}>Track Event</button>;
}`,
      component: `// Complete component example
import React, { useEffect } from 'react';
import { useNodash } from '@nodash/sdk';

export function ${eventName.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')}Component() {
  const { track } = useNodash();
  
  useEffect(() => {
    // Track component mount
    track('${eventName}', {
      component: '${eventName}Component',
      action: 'mounted'
    });
  }, [track]);
  
  return (
    <div>
      <h2>Component with Analytics</h2>
      <button onClick={() => track('${eventName}', { action: 'clicked' })}>
        Click Me
      </button>
    </div>
  );
}`,
      requirements: [
        'Install @nodash/sdk: npm install @nodash/sdk',
        'Wrap app with NodashProvider',
        'Configure API token in environment variables'
      ],
      testing: `// Test the tracking
import { render, fireEvent } from '@testing-library/react';
import { MyComponent } from './MyComponent';

test('tracks ${eventName} on click', () => {
  const mockTrack = jest.fn();
  render(<MyComponent track={mockTrack} />);
  
  fireEvent.click(screen.getByText('Track Event'));
  expect(mockTrack).toHaveBeenCalledWith('${eventName}', expect.any(Object));
});`,
      bestPractices: [
        'Use useCallback to prevent unnecessary re-renders',
        'Handle tracking errors gracefully',
        'Include relevant context in event properties',
        'Test tracking in development mode first'
      ]
    },
    vue: {
      language: 'typescript',
      basic: `<template>
  <button @click="handleClick">Track Event</button>
</template>

<script setup lang="ts">
import { useNodash } from '@nodash/sdk';

const { track } = useNodash();

const handleClick = () => {
  track('${eventName}', {
    ${properties ? Object.keys(properties).map(key => `${key}: 'value'`).join(',\n    ') : 'property: "value"'}
  });
};
</script>`,
      advanced: `<template>
  <button @click="handleTrackEvent" :disabled="isTracking">
    {{ isTracking ? 'Tracking...' : 'Track Event' }}
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useNodash } from '@nodash/sdk';

const { track } = useNodash();
const isTracking = ref(false);

const handleTrackEvent = async () => {
  isTracking.value = true;
  try {
    await track('${eventName}', {
      ${properties ? Object.keys(properties).map(key => `${key}: 'value'`).join(',\n      ') : 'property: "value"'},
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to track event:', error);
  } finally {
    isTracking.value = false;
  }
};
</script>`,
      component: `<template>
  <div>
    <h2>Component with Analytics</h2>
    <button @click="trackClick">Click Me</button>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useNodash } from '@nodash/sdk';

const { track } = useNodash();

onMounted(() => {
  track('${eventName}', {
    component: '${eventName}Component',
    action: 'mounted'
  });
});

const trackClick = () => {
  track('${eventName}', { action: 'clicked' });
};
</script>`,
      requirements: [
        'Install @nodash/sdk: npm install @nodash/sdk',
        'Add Nodash plugin to Vue app',
        'Configure API token'
      ],
      testing: `// Test with Vue Test Utils
import { mount } from '@vue/test-utils';
import MyComponent from './MyComponent.vue';

test('tracks ${eventName} on click', async () => {
  const mockTrack = vi.fn();
  const wrapper = mount(MyComponent, {
    global: {
      provide: { track: mockTrack }
    }
  });
  
  await wrapper.find('button').trigger('click');
  expect(mockTrack).toHaveBeenCalledWith('${eventName}', expect.any(Object));
});`,
      bestPractices: [
        'Use composition API for better TypeScript support',
        'Handle async tracking with proper loading states',
        'Use onMounted for component lifecycle tracking',
        'Provide fallbacks for tracking failures'
      ]
    }
  };
  
  return frameworks[framework as keyof typeof frameworks] || frameworks.react;
}

function getExampleValue(type: string): string {
  const examples = {
    'string': '"example"',
    'number': '123',
    'boolean': 'true',
    'object': '{}',
    'array': '[]'
  };
  return examples[type as keyof typeof examples] || '"value"';
}

export function setupToolHandlers(
  server: Server,
  projectService: ProjectAnalysisService,
  advancedAnalysisService: AdvancedAnalysisService,
  implementationGuideService: ImplementationGuideService
) {
  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'readme',
          description: 'Get comprehensive guide on how to use Nodash MCP server effectively',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'analyze_project',
          description: 'Analyze current project structure and provide implementation recommendations',
          inputSchema: {
            type: 'object',
            properties: {
              project_path: {
                type: 'string',
                description: 'Path to project directory (defaults to current directory)',
              },
            },
          },
        },
        {
          name: 'get_event_templates',
          description: 'Get event schema templates and examples for common use cases',
          inputSchema: {
            type: 'object',
            properties: {
              business_type: {
                type: 'string',
                description: 'Type of business (e-commerce, saas, content, etc.)',
              },
            },
          },
        },
        {
          name: 'validate_event_schema',
          description: 'Validate an event schema design and provide recommendations',
          inputSchema: {
            type: 'object',
            properties: {
              event_name: {
                type: 'string',
                description: 'Name of the event to validate',
              },
              properties: {
                type: 'object',
                description: 'Event properties schema to validate',
              },
              context: {
                type: 'string',
                description: 'Context where this event will be used',
              },
            },
            required: ['event_name', 'properties'],
          },
        },
        {
          name: 'generate_tracking_code',
          description: 'Generate code examples for tracking specific events',
          inputSchema: {
            type: 'object',
            properties: {
              event_name: {
                type: 'string',
                description: 'Name of the event to generate code for',
              },
              framework: {
                type: 'string',
                description: 'Target framework (react, vue, angular, etc.)',
              },
              properties: {
                type: 'object',
                description: 'Event properties to include in the code',
              },
            },
            required: ['event_name', 'framework'],
          },
        },
        {
          name: 'advanced_analysis',
          description: 'Perform deep code analysis including security, performance, and event opportunities',
          inputSchema: {
            type: 'object',
            properties: {
              project_path: {
                type: 'string',
                description: 'Path to project directory (defaults to current directory)',
              },
            },
          },
        },
        {
          name: 'implementation_guide',
          description: 'Generate step-by-step implementation guide for integrating analytics into your project',
          inputSchema: {
            type: 'object',
            properties: {
              framework: {
                type: 'string',
                description: 'Target framework (react, nextjs, vue, express, angular, vanilla)',
              },
              language: {
                type: 'string',
                enum: ['javascript', 'typescript'],
                description: 'Programming language preference',
              },
              complexity: {
                type: 'string',
                enum: ['basic', 'advanced', 'enterprise'],
                description: 'Integration complexity level',
                default: 'basic',
              },
            },
            required: ['framework', 'language'],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'readme':
          return {
            content: [
              {
                type: 'text',
                text: `# Nodash MCP Server Usage Guide

## 🎯 Overview
The Nodash MCP server provides analytics capabilities through tools, resources, and prompts. Here's how to use each effectively:

## 🔧 TOOLS (Use these for actions and data operations)

### 1. **analyze_project**
- **Purpose**: Analyze project structure and get recommendations
- **Usage**: Call this first to understand the project
- **Example**: "Analyze my current project structure"

### 2. **get_event_templates**
- **Purpose**: Get event schema templates for common use cases
- **Usage**: See what events you can track for your business type
- **Example**: "Get event templates for e-commerce business"

### 3. **validate_event_schema**
- **Purpose**: Validate event schema design and get recommendations
- **Usage**: Check if your event schema follows best practices
- **Example**: "Validate my 'user_signup' event schema"

### 4. **generate_tracking_code**
- **Purpose**: Generate framework-specific tracking code examples
- **Usage**: Get implementation code for specific events and frameworks
- **Example**: "Generate React tracking code for 'button_click' event"

### 6. **advanced_analysis** 🔥 NEW!
- **Purpose**: Deep code analysis with AI-powered insights
- **Usage**: Get comprehensive analysis of tracking opportunities
- **Example**: "Perform advanced analysis on my project"

### 7. **implementation_guide** 🔥 NEW!
- **Purpose**: Get step-by-step implementation instructions
- **Usage**: Receive detailed guidance for integrating analytics
- **Example**: "Generate implementation guide for React with TypeScript"

## 📚 RESOURCES (Use these for documentation and context)

### 1. **nodash://framework-guides**
- **Purpose**: Framework-specific integration guides
- **Usage**: Get detailed documentation for your framework
- **Example**: "Show me the React integration guide"

### 2. **nodash://event-catalog**
- **Purpose**: Browse available event templates
- **Usage**: See what events you can track
- **Example**: "What events can I track for e-commerce?"

### 3. **nodash://best-practices**
- **Purpose**: Analytics implementation best practices
- **Usage**: Learn how to implement analytics effectively
- **Example**: "What are the best practices for event tracking?"

## 💡 PROMPTS (Use these for guidance and suggestions)

### 1. **analytics_setup**
- **Purpose**: Get personalized setup recommendations
- **Usage**: Receive tailored advice for your project
- **Example**: "What's the best way to set up analytics for my Next.js app?"

### 2. **event_planning**
- **Purpose**: Plan your event tracking strategy
- **Usage**: Get help designing your analytics schema
- **Example**: "Help me plan events for my SaaS dashboard"

### 3. **troubleshooting**
- **Purpose**: Debug analytics implementation issues
- **Usage**: Get help when things aren't working
- **Example**: "My events aren't showing up, what should I check?"

## 🚀 RECOMMENDED WORKFLOW

1. **Start with project analysis**: Use 'analyze_project' to understand your codebase
2. **Get comprehensive insights**: Use 'advanced_analysis' for AI-powered recommendations
3. **Get implementation guidance**: Use 'implementation_guide' for step-by-step instructions
4. **Get event templates**: Use 'get_event_templates' to see common event patterns
5. **Validate your schemas**: Use 'validate_event_schema' to ensure best practices
6. **Generate code examples**: Use 'generate_tracking_code' for implementation help

## 💡 PRO TIPS

- Always run 'analyze_project' first - it provides context for all other tools
- Use 'advanced_analysis' to discover tracking opportunities you might miss
- The 'implementation_guide' provides detailed instructions - perfect for local agents
- Combine tools: analyze → get guide → implement → test → query
- Use resources for additional context and documentation
- Use prompts when you need personalized advice

## 🔗 Integration with Local Agents

This MCP server is designed to work with local agents that have full codebase context:
- **MCP Server Role**: Provides analysis, guidance, and recommendations
- **Local Agent Role**: Implements the actual code changes
- **Perfect Partnership**: MCP analyzes, agent implements

Ready to get started? Try: "Analyze my project and give me an implementation guide for React with TypeScript"`,
              },
            ],
          };

        case 'analyze_project': {
          const projectPath = typeof args?.project_path === 'string' ? args.project_path : undefined;
          const analysis = await projectService.analyzeProject(projectPath);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(analysis, null, 2),
              },
            ],
          };
        }

        case 'get_event_templates': {
          const businessType = (args?.business_type as string) || 'general';
          const templates = generateEventTemplates(businessType);
          return {
            content: [
              {
                type: 'text',
                text: `# Event Templates for ${businessType.charAt(0).toUpperCase() + businessType.slice(1)} Business

${templates.map(template => `
## ${template.name}
**Description**: ${template.description}
**When to use**: ${template.usage}

### Event Schema
\`\`\`typescript
{
  event: '${template.eventName}',
  properties: {
${Object.entries(template.properties).map(([key, type]) => `    ${key}: ${type} // ${(template.propertyDescriptions as any)[key] || 'No description'}`).join(',\n')}
  }
}
\`\`\`

### Implementation Example
\`\`\`typescript
// Track this event in your application
nodash.track('${template.eventName}', {
${Object.keys(template.properties).map(key => `  ${key}: ${(template.exampleValues as any)[key] || 'value'}`).join(',\n')}
});
\`\`\`
`).join('\n')}

## 💡 Best Practices
- Use consistent naming conventions across events
- Include relevant context properties
- Validate event data before sending
- Test events in development environment first`,
              },
            ],
          };
        }

        case 'validate_event_schema': {
          if (!args?.event_name || !args?.properties) {
            const error = MCPErrorFactory.invalidEventSchema(
              (args?.event_name as string) || 'undefined',
              ['event_name and properties are required']
            );
            return {
              content: [
                {
                  type: 'text',
                  text: error.toMCPResponse().helpText
                }
              ]
            };
          }
          
          // Validate event name format
          try {
            MCPValidator.validateEventName(args.event_name as string);
          } catch (error) {
            if (error instanceof MCPDevelopmentError) {
              return {
                content: [
                  {
                    type: 'text',
                    text: error.toMCPResponse().helpText
                  }
                ]
              };
            }
          }
          
          const validation = validateEventSchema(args.event_name as string, args.properties, args.context as string);
          return {
            content: [
              {
                type: 'text',
                text: `# Event Schema Validation: ${args.event_name}

## ✅ Validation Results
${validation.isValid ? '**Status**: Valid ✅' : '**Status**: Issues Found ❌'}

${validation.issues.length > 0 ? `
## ⚠️ Issues Found
${validation.issues.map(issue => `- **${issue.severity}**: ${issue.message}`).join('\n')}
` : ''}

## 📋 Recommendations
${validation.recommendations.map(rec => `- ${rec}`).join('\n')}

## 🔧 Improved Schema
\`\`\`typescript
{
  event: '${validation.improvedSchema.eventName}',
  properties: {
${Object.entries(validation.improvedSchema.properties).map(([key, type]) => `    ${key}: ${type}`).join(',\n')}
  }
}
\`\`\`

## 📝 Implementation Example
\`\`\`typescript
// Recommended implementation
nodash.track('${validation.improvedSchema.eventName}', {
${Object.entries(validation.improvedSchema.properties).map(([key, type]) => `  ${key}: ${getExampleValue(type as string)}`).join(',\n')}
});
\`\`\``,
              },
            ],
          };
        }

        case 'generate_tracking_code': {
          if (!args?.event_name || !args?.framework) {
            const error = new MCPDevelopmentError(
              'Missing required parameters for code generation',
              'MISSING_PARAMETERS',
              [
                'Provide both event_name and framework parameters',
                'event_name should be a valid event name (e.g., "user_signup")',
                'framework should be one of: react, vue, angular, express, nextjs',
                'Example: { "event_name": "button_click", "framework": "react" }'
              ],
              [
                {
                  title: 'Valid Parameters Example',
                  description: 'Example of correct parameters for code generation',
                  language: 'json',
                  code: `{
  "event_name": "user_signup",
  "framework": "react",
  "properties": {
    "email": "string",
    "source": "string",
    "plan": "string"
  }
}`
                }
              ]
            );
            return {
              content: [
                {
                  type: 'text',
                  text: error.toMCPResponse().helpText
                }
              ]
            };
          }
          
          const code = generateTrackingCode(args.event_name as string, args.framework as string, args.properties);
          return {
            content: [
              {
                type: 'text',
                text: `# Tracking Code for ${args.event_name} (${args.framework})

## 🎯 Event Implementation

### Basic Implementation
\`\`\`${code.language}
${code.basic}
\`\`\`

### Advanced Implementation with Error Handling
\`\`\`${code.language}
${code.advanced}
\`\`\`

### Component Integration Example
\`\`\`${code.language}
${code.component}
\`\`\`

## 📋 Setup Requirements
${code.requirements.map(req => `- ${req}`).join('\n')}

## 🧪 Testing
\`\`\`${code.language}
${code.testing}
\`\`\`

## 💡 Best Practices
${code.bestPractices.map(practice => `- ${practice}`).join('\n')}`,
              },
            ],
          };
        }

        case 'advanced_analysis': {
          const advancedProjectPath = typeof args?.project_path === 'string' ? args.project_path : undefined;
          const advancedAnalysis = await advancedAnalysisService.performAdvancedAnalysis(advancedProjectPath);
          return {
            content: [
              {
                type: 'text',
                text: `# 🔍 Advanced Project Analysis

## 📊 Analysis Summary
- **Integration Complexity**: ${advancedAnalysis.integrationComplexity}
- **Estimated Implementation Time**: ${advancedAnalysis.estimatedImplementationTime}
- **Code Patterns Found**: ${advancedAnalysis.codePatterns.length}
- **Event Opportunities**: ${advancedAnalysis.eventOpportunities.length}
- **Security Issues**: ${advancedAnalysis.securityIssues.length}
- **Performance Issues**: ${advancedAnalysis.performanceIssues.length}

## 🎯 Event Opportunities
${advancedAnalysis.eventOpportunities.map(event => `
### ${event.eventName}
- **Business Value**: ${event.businessValue}
- **Business Goal**: ${event.businessGoal}
- **Location**: ${event.implementationLocation}
- **Description**: ${event.description}
- **Properties**: ${Object.entries(event.suggestedProperties).map(([key, type]) => `${key}: ${type}`).join(', ')}
`).join('\n')}

## 🔧 Code Patterns
${advancedAnalysis.codePatterns.map(pattern => `
### ${pattern.name} (${pattern.type})
- **File**: ${pattern.file}:${pattern.line}
- **Priority**: ${pattern.priority}
- **Opportunity**: ${pattern.trackingOpportunity}
`).join('\n')}

## 🏗️ Architecture Recommendations
${advancedAnalysis.architectureRecommendations.map(rec => `
### ${rec.title}
- **Priority**: ${rec.priority}
- **Category**: ${rec.category}
- **Description**: ${rec.description}
- **Implementation**: ${rec.implementation}
- **Benefits**: ${rec.benefits.join(', ')}
`).join('\n')}

## 🔒 Security Issues
${advancedAnalysis.securityIssues.length > 0 ? 
  advancedAnalysis.securityIssues.map(issue => `
### ${issue.type} - ${issue.severity}
- **Description**: ${issue.description}
- **File**: ${issue.file || 'N/A'}
- **Recommendation**: ${issue.recommendation}
`).join('\n') : 'No security issues detected.'}

## ⚡ Performance Issues
${advancedAnalysis.performanceIssues.length > 0 ?
  advancedAnalysis.performanceIssues.map(issue => `
### ${issue.type} - ${issue.impact} impact
- **Description**: ${issue.description}
- **File**: ${issue.file || 'N/A'}
- **Recommendation**: ${issue.recommendation}
`).join('\n') : 'No performance issues detected.'}

## 🚀 Next Steps
1. Review event opportunities and prioritize by business value
2. Address high-priority architecture recommendations
3. Use the 'implementation_guide' tool with the identified events
4. Implement security and performance fixes
5. Test the analytics implementation

**Raw Data:**
\`\`\`json
${JSON.stringify(advancedAnalysis, null, 2)}
\`\`\``,
              },
            ],
          };
        }

        case 'implementation_guide': {
          if (!args?.framework || !args?.language) {
            throw new McpError(ErrorCode.InvalidParams, 'framework and language are required');
          }
          
          const guide = implementationGuideService.generateImplementationGuide(
            args.framework as any,
            args.language as any,
            args.complexity as any
          );
          
          return {
            content: [
              {
                type: 'text',
                text: `# 🚀 ${guide.framework} Implementation Guide

## 📋 Overview
${guide.overview}

## 🔧 Prerequisites
${guide.prerequisites.map(prereq => `- ${prereq}`).join('\n')}

## 📝 Implementation Steps

${guide.steps.map((step, index) => `
### Step ${index + 1}: ${step.title}
**Description**: ${step.description}

**Files to work with:**
${step.files.map(file => `- **${file.action.toUpperCase()}** \`${file.path}\` - ${file.purpose}`).join('\n')}

${step.codePatterns ? `**Code Patterns to Implement:**
${step.codePatterns.map(pattern => `- **${pattern.pattern}**: ${pattern.explanation} (${pattern.context})`).join('\n')}` : ''}

**Validation Checklist:**
${step.validation.map(item => `- [ ] ${item}`).join('\n')}

${step.dependencies ? `**Dependencies**: ${step.dependencies.join(', ')}` : ''}
`).join('\n')}

## 🧪 Testing Strategy
${guide.testingStrategy.map(test => `- ${test}`).join('\n')}

## 🔧 Troubleshooting
${guide.troubleshooting.map(item => `
### ${item.issue}
**Solution**: ${item.solution}
`).join('\n')}

## 🚀 Next Steps
${guide.nextSteps.map(step => `- ${step}`).join('\n')}

---

**💡 Implementation Tips:**
- Follow the steps in order - each builds on the previous
- Test after each step to catch issues early
- Use the validation checklists to ensure completeness
- Ask your local agent to implement each step with full project context
- The local agent has the best understanding of your specific codebase structure

**Need help with a specific step?** Ask me about any part of this implementation guide!`,
              },
            ],
          };
        }

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error}`);
    }
  });
} 