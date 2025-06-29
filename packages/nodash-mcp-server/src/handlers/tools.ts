import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { ProjectAnalysisService } from '../services/project-analysis.js';
import { EventsService } from '../services/events.js';

export function setupToolHandlers(
  server: Server,
  projectService: ProjectAnalysisService,
  eventsService: EventsService
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
- **Example**: "Track a test login event"

## 📚 RESOURCES (Use these for documentation and reference)

### Available Resources:
- **nodash://sdk/readme** - Complete SDK documentation
- **nodash://sdk/quick-start** - 5-minute setup guide  
- **nodash://sdk/framework-guides** - React, Vue, Next.js guides
- **nodash://sdk/api-reference** - TypeScript API reference

### How to Access Resources:
Ask me to "read the SDK documentation" or "show me the quick start guide"

## 🎯 PROMPTS (Use these for guided workflows)

### Available Prompts:
- **analyze-and-implement** - Complete analytics implementation
- **define-events** - Business-goal-aligned event creation
- **generate-tracking-code** - Framework-specific code generation
- **analytics-audit** - Comprehensive analytics review

### How to Use Prompts:
Ask me to "help implement analytics" or "audit my current analytics setup"

## 💡 Best Practices

### 1. **Start with Project Analysis**
Always begin with: "Analyze my project structure"

### 2. **Define Events Before Implementation**
Use: "Help me define events for [your goal]"

### 3. **Get Framework-Specific Guidance**
Ask: "Show me React/Vue/Next.js implementation examples"

### 4. **Test Your Setup**
Use: "Track a test event to verify everything works"

## 🚀 Common Workflows

### **Complete Setup**
1. "Analyze my project structure"
2. "Help me define events for user engagement"
3. "Generate React tracking code"
4. "Track a test event"

### **Adding New Events**
1. "Show me current event schema"
2. "Define a new 'feature_used' event"
3. "Update my tracking code"

### **Troubleshooting**
1. "Audit my analytics setup"
2. "Show me recent events"
3. "Check if tracking is working"

## 🎪 Framework-Specific Help

### **React Projects**
- Get hooks and component examples
- Automatic context setup
- TypeScript integration

### **Vue Projects**  
- Plugin configuration
- Composition API examples
- Reactive tracking

### **Express APIs**
- Middleware setup
- Route tracking
- Error handling

### **Next.js Apps**
- App Router integration
- SSR considerations
- Route change tracking

## 🔍 Tips for Better Results

1. **Be Specific**: "Track user signup with email validation" vs "track signup"
2. **Mention Your Framework**: "I'm using React" helps me give better examples
3. **Ask for Examples**: "Show me code examples" gets you implementation details
4. **Use Business Context**: "For e-commerce conversion tracking" gets targeted advice

## 🆘 Getting Help

If you're stuck, just ask:
- "How do I get started with Nodash?"
- "What tools should I use for [specific task]?"
- "Show me examples for [your framework]"
- "Help me troubleshoot [specific issue]"

Remember: I can access documentation, generate code, analyze your project, and provide step-by-step guidance!`,
              },
            ],
          };

        case 'analyze_project':
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

        case 'get_events_schema':
          const schema = await eventsService.getEventsSchema();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(schema, null, 2),
              },
            ],
          };

        case 'set_event_definition':
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

        case 'query_events':
          const events = await eventsService.queryEvents(args);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(events, null, 2),
              },
            ],
          };

        case 'track_event':
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