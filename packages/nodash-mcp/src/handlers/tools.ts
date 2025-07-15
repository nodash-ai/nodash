import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { ProjectAnalysisService } from '../services/project-analysis';
import { EventsService } from '../services/events';
import { AdvancedAnalysisService } from '../services/advanced-analysis';
import { ImplementationGuideService } from '../services/code-generator';

export function setupToolHandlers(
  server: Server,
  projectService: ProjectAnalysisService,
  eventsService: EventsService,
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
          name: 'get_events_schema',
          description: 'Get current event schema definitions',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'set_event_definition',
          description: 'Define or update an event schema',
          inputSchema: {
            type: 'object',
            properties: {
              event_name: {
                type: 'string',
                description: 'Name of the event',
              },
              properties: {
                type: 'object',
                description: 'Event properties schema',
              },
              description: {
                type: 'string',
                description: 'Event description',
              },
            },
            required: ['event_name', 'properties'],
          },
        },
        {
          name: 'query_events',
          description: 'Query existing event data for analysis',
          inputSchema: {
            type: 'object',
            properties: {
              event_name: {
                type: 'string',
                description: 'Filter by event name (optional)',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of events to return',
                default: 100,
              },
            },
          },
        },
        {
          name: 'track_event',
          description: 'Track a test event (for testing purposes)',
          inputSchema: {
            type: 'object',
            properties: {
              event_name: {
                type: 'string',
                description: 'Name of the event to track',
              },
              properties: {
                type: 'object',
                description: 'Event properties',
              },
            },
            required: ['event_name'],
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

### 2. **get_events_schema** 
- **Purpose**: View current event definitions
- **Usage**: See what events are already defined
- **Example**: "Show me the current event schema"

### 3. **set_event_definition**
- **Purpose**: Define new events or update existing ones
- **Usage**: Create structured event schemas
- **Example**: "Define a 'user_signup' event with email and source properties"

### 4. **query_events**
- **Purpose**: Query and analyze tracked event data
- **Usage**: Get insights from collected events
- **Example**: "Show me the last 50 events"

### 5. **track_event**
- **Purpose**: Track test events for validation
- **Usage**: Test event tracking functionality
- **Example**: "Track a test 'button_click' event"

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
4. **Define your events**: Use 'set_event_definition' to create event schemas
5. **Test your setup**: Use 'track_event' to verify everything works
6. **Query your data**: Use 'query_events' to analyze collected data

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

        case 'get_events_schema': {
          const schema = await eventsService.getEventsSchema();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(schema, null, 2),
              },
            ],
          };
        }

        case 'set_event_definition': {
          if (!args?.event_name || !args?.properties) {
            throw new McpError(ErrorCode.InvalidParams, 'event_name and properties are required');
          }
          
          const result = await eventsService.setEventDefinition(args);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'query_events': {
          const events = await eventsService.queryEvents(args);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(events, null, 2),
              },
            ],
          };
        }

        case 'track_event': {
          if (!args?.event_name) {
            throw new McpError(ErrorCode.InvalidParams, 'event_name is required');
          }
          
          const trackResult = await eventsService.trackEvent(args);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(trackResult, null, 2),
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