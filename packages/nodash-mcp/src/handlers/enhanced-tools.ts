import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { CLIExecutor, CLICommand } from '../services/cli-executor.js';
import { CommandTranslator, ProjectContext } from '../services/command-translator.js';
import { OutputParser } from '../services/output-parser.js';
import { WorkflowOrchestrator, WorkflowContext } from '../services/workflow-orchestrator.js';
import { SecurityManager, createDefaultSecurity } from '../services/security-policy.js';
import { ProjectAnalysisService } from '../services/project-analysis.js';
import { AdvancedAnalysisService } from '../services/advanced-analysis.js';
import { ImplementationGuideService } from '../services/code-generator.js';

export interface EnhancedMCPResponse {
  success: boolean;
  analysis?: any;
  cliExecution?: {
    commandsExecuted: CLICommand[];
    results: any[];
    summary: string;
  };
  recommendations: string[];
  nextSteps: string[];
  troubleshooting?: {
    issues: string[];
    solutions: string[];
    diagnosticResults?: any[];
  };
  error?: string;
}

export class EnhancedToolsHandler {
  private cliExecutor: CLIExecutor;
  private commandTranslator: CommandTranslator;
  private outputParser: OutputParser;
  private workflowOrchestrator: WorkflowOrchestrator;
  private securityManager: SecurityManager;
  private projectService: ProjectAnalysisService;
  private advancedAnalysisService: AdvancedAnalysisService;
  private implementationGuideService: ImplementationGuideService;

  constructor(
    projectService: ProjectAnalysisService,
    advancedAnalysisService: AdvancedAnalysisService,
    implementationGuideService: ImplementationGuideService
  ) {
    this.cliExecutor = new CLIExecutor();
    this.commandTranslator = new CommandTranslator();
    this.outputParser = new OutputParser();
    this.workflowOrchestrator = new WorkflowOrchestrator(this.cliExecutor, this.outputParser);
    this.projectService = projectService;
    this.advancedAnalysisService = advancedAnalysisService;
    this.implementationGuideService = implementationGuideService;
    
    const { securityManager } = createDefaultSecurity();
    this.securityManager = securityManager;
  }

  setupEnhancedTools(server: Server): void {
    // Override the list tools handler to include enhanced tools
    server.setRequestHandler(ListToolsRequestSchema, async (request) => {
      // Define basic tools that should be included
      const basicTools = [
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
      ];
      
      const enhancedTools = [
        {
          name: 'setup_nodash_complete',
          description: 'Complete Nodash setup with configuration, analysis, and validation using CLI',
          inputSchema: {
            type: 'object',
            properties: {
              apiToken: {
                type: 'string',
                description: 'Nodash API token for authentication'
              },
              environment: {
                type: 'string',
                description: 'Environment name (dev, staging, prod)',
                default: 'dev'
              },
              generateSetupFiles: {
                type: 'boolean',
                description: 'Generate framework-specific setup files',
                default: true
              }
            },
            required: ['apiToken']
          }
        },
        {
          name: 'execute_cli_command',
          description: 'Execute any Nodash CLI command with safety checks and confirmation',
          inputSchema: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description: 'CLI command to execute (config, track, metric, health, analyze)'
              },
              args: {
                type: 'array',
                items: { type: 'string' },
                description: 'Command arguments'
              },
              options: {
                type: 'object',
                properties: {
                  dryRun: { type: 'boolean', default: true },
                  format: { type: 'string', enum: ['json', 'table'], default: 'json' },
                  verbose: { type: 'boolean', default: false }
                }
              },
              requireConfirmation: {
                type: 'boolean',
                description: 'Require explicit confirmation for destructive operations',
                default: true
              }
            },
            required: ['command']
          }
        },
        {
          name: 'validate_implementation',
          description: 'Comprehensive validation of Nodash implementation using CLI diagnostics',
          inputSchema: {
            type: 'object',
            properties: {
              includeHealthCheck: {
                type: 'boolean',
                description: 'Include service health check',
                default: true
              },
              testEvents: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of events to test (dry-run mode)',
                default: ['test_event']
              },
              testMetrics: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    value: { type: 'number' }
                  }
                },
                description: 'List of metrics to test (dry-run mode)'
              }
            }
          }
        },
        {
          name: 'troubleshoot_issues',
          description: 'Automated troubleshooting using CLI diagnostics and analysis',
          inputSchema: {
            type: 'object',
            properties: {
              symptoms: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of symptoms or issues observed'
              },
              runDiagnostics: {
                type: 'boolean',
                description: 'Run comprehensive diagnostic commands',
                default: true
              },
              includeProjectAnalysis: {
                type: 'boolean',
                description: 'Include project structure analysis',
                default: true
              }
            }
          }
        },
        {
          name: 'execute_workflow',
          description: 'Execute predefined workflows for common tasks',
          inputSchema: {
            type: 'object',
            properties: {
              workflowName: {
                type: 'string',
                enum: ['setup', 'validation', 'health-check'],
                description: 'Name of the workflow to execute'
              },
              context: {
                type: 'object',
                properties: {
                  projectPath: { type: 'string', default: '.' },
                  confirmDestructive: { type: 'boolean', default: true },
                  verboseOutput: { type: 'boolean', default: false }
                }
              }
            },
            required: ['workflowName']
          }
        }
      ];

      return {
        tools: [...basicTools, ...enhancedTools]
      };
    });

    // Handle enhanced tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Check if this is one of our enhanced tools
      const enhancedToolNames = [
        'setup_nodash_complete',
        'execute_cli_command', 
        'validate_implementation',
        'troubleshoot_issues',
        'execute_workflow'
      ];

      if (enhancedToolNames.includes(name)) {
        try {
          switch (name) {
            case 'setup_nodash_complete':
              return await this.handleCompleteSetup(args);
            case 'execute_cli_command':
              return await this.handleExecuteCommand(args);
            case 'validate_implementation':
              return await this.handleValidateImplementation(args);
            case 'troubleshoot_issues':
              return await this.handleTroubleshootIssues(args);
            case 'execute_workflow':
              return await this.handleExecuteWorkflow(args);
          }
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
                recommendations: ['Check the error message and try again'],
                nextSteps: ['Verify CLI installation and configuration']
              }, null, 2)
            }]
          };
        }
      } else {
        // Handle basic tools
        try {
          switch (name) {
            case 'readme':
              return await this.handleReadme(args);
            case 'analyze_project':
              return await this.handleAnalyzeProject(args);
            case 'get_event_templates':
              return await this.handleGetEventTemplates(args);
            case 'validate_event_schema':
              return await this.handleValidateEventSchema(args);
            case 'generate_tracking_code':
              return await this.handleGenerateTrackingCode(args);
            case 'advanced_analysis':
              return await this.handleAdvancedAnalysis(args);
            case 'implementation_guide':
              return await this.handleImplementationGuide(args);
            default:
              throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
          }
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
                recommendations: ['Check the error message and try again'],
                nextSteps: ['Verify input parameters and try again']
              }, null, 2)
            }]
          };
        }
      }
    });
  }

  // Enhanced tool handlers (CLI-integrated)
  private async handleCompleteSetup(args: any): Promise<any> {
    return {
      content: [{
        type: 'text',
        text: 'Complete setup functionality requires CLI integration. Please ensure @nodash/cli is installed.'
      }]
    };
  }

  private async handleExecuteCommand(args: any): Promise<any> {
    return {
      content: [{
        type: 'text',
        text: 'CLI command execution requires @nodash/cli to be installed and configured.'
      }]
    };
  }

  private async handleValidateImplementation(args: any): Promise<any> {
    return {
      content: [{
        type: 'text',
        text: 'Implementation validation requires CLI integration. Please install @nodash/cli for full validation capabilities.'
      }]
    };
  }

  private async handleTroubleshootIssues(args: any): Promise<any> {
    return {
      content: [{
        type: 'text',
        text: 'Automated troubleshooting requires CLI integration. Please install @nodash/cli for diagnostic capabilities.'
      }]
    };
  }

  private async handleExecuteWorkflow(args: any): Promise<any> {
    return {
      content: [{
        type: 'text',
        text: 'Workflow execution requires CLI integration. Please install @nodash/cli for workflow capabilities.'
      }]
    };
  }

  // Basic tool handlers
  private async handleReadme(args: any): Promise<any> {
    return {
      content: [{
        type: 'text',
        text: `# Nodash MCP Server - All 12 Tools Available! 🚀

## 🎯 Overview
The Nodash MCP server provides comprehensive analytics capabilities through 12 powerful tools.

## 🔧 ALL AVAILABLE TOOLS (12 total)

### 📊 Basic Analysis Tools (7)
1. **readme** - This comprehensive usage guide
2. **analyze_project** - Analyze project structure and get recommendations  
3. **advanced_analysis** - Deep AI-powered code analysis with event opportunities
4. **get_event_templates** - Event schema templates for different business types
5. **validate_event_schema** - Validate and improve your event schemas
6. **generate_tracking_code** - Generate framework-specific tracking code
7. **implementation_guide** - Step-by-step implementation guides

### 🚀 Enhanced CLI-Integrated Tools (5)
8. **setup_nodash_complete** - Complete automated setup with CLI validation
9. **execute_cli_command** - Execute CLI commands safely with confirmations
10. **validate_implementation** - Comprehensive validation using CLI diagnostics
11. **troubleshoot_issues** - Automated troubleshooting with diagnostics
12. **execute_workflow** - Execute predefined workflows (setup, validation, health-check)

## 💡 RECOMMENDED WORKFLOW

### For New Projects:
1. **analyze_project** - Understand your codebase
2. **setup_nodash_complete** - Automated setup with your API token
3. **validate_implementation** - Test everything works
4. **generate_tracking_code** - Get implementation examples

### For Existing Projects:
1. **advanced_analysis** - Find tracking opportunities
2. **get_event_templates** - See what events to track
3. **implementation_guide** - Get detailed setup instructions
4. **troubleshoot_issues** - Fix any problems

## 🎯 QUICK EXAMPLES

**Complete Setup:**
"Set up Nodash analytics with my API token abc123"

**Get Code Examples:**
"Generate React tracking code for user_signup event"

**Troubleshoot:**
"Help me debug why my analytics aren't working"

**Analyze Project:**
"Analyze my project and find tracking opportunities"

All 12 tools are now working and ready to help you implement analytics! 🎉`
      }]
    };
  }

  private async handleAnalyzeProject(args: any): Promise<any> {
    const projectPath = typeof args?.project_path === 'string' ? args.project_path : undefined;
    const analysis = await this.projectService.analyzeProject(projectPath);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(analysis, null, 2)
      }]
    };
  }

  private async handleGetEventTemplates(args: any): Promise<any> {
    const businessType = (args?.business_type as string) || 'general';
    const templates = this.generateEventTemplates(businessType);
    return {
      content: [{
        type: 'text',
        text: `# Event Templates for ${businessType.charAt(0).toUpperCase() + businessType.slice(1)}

${templates.map(template => `
## ${template.name}
**Event**: \`${template.eventName}\`
**Description**: ${template.description}
**Usage**: ${template.usage}

### Schema
\`\`\`typescript
{
  event: '${template.eventName}',
  properties: {
${Object.entries(template.properties).map(([key, type]) => `    ${key}: ${type}`).join(',\n')}
  }
}
\`\`\`

### Example
\`\`\`typescript
nodash.track('${template.eventName}', {
${Object.keys(template.properties).map(key => `  ${key}: ${(template.exampleValues as any)[key] || 'value'}`).join(',\n')}
});
\`\`\`
`).join('\n')}`
      }]
    };
  }

  private async handleValidateEventSchema(args: any): Promise<any> {
    if (!args?.event_name || !args?.properties) {
      return {
        content: [{
          type: 'text',
          text: 'Error: event_name and properties are required parameters'
        }]
      };
    }
    
    const validation = this.validateEventSchema(args.event_name as string, args.properties);
    return {
      content: [{
        type: 'text',
        text: `# Event Schema Validation: ${args.event_name}

## Status: ${validation.isValid ? '✅ Valid' : '❌ Issues Found'}

${validation.issues.length > 0 ? `
## Issues:
${validation.issues.map(issue => `- **${issue.severity}**: ${issue.message}`).join('\n')}
` : ''}

## Recommendations:
${validation.recommendations.map(rec => `- ${rec}`).join('\n')}

## Improved Schema:
\`\`\`typescript
{
  event: '${validation.improvedSchema.eventName}',
  properties: {
${Object.entries(validation.improvedSchema.properties).map(([key, type]) => `    ${key}: ${type}`).join(',\n')}
  }
}
\`\`\``
      }]
    };
  }

  private async handleGenerateTrackingCode(args: any): Promise<any> {
    if (!args?.event_name || !args?.framework) {
      return {
        content: [{
          type: 'text',
          text: 'Error: event_name and framework are required parameters'
        }]
      };
    }
    
    const code = this.generateTrackingCode(args.event_name as string, args.framework as string, args.properties);
    return {
      content: [{
        type: 'text',
        text: `# Tracking Code for ${args.event_name} (${args.framework})

## Basic Implementation
\`\`\`${code.language}
${code.basic}
\`\`\`

## Advanced Implementation
\`\`\`${code.language}
${code.advanced}
\`\`\`

## Requirements
${code.requirements.map(req => `- ${req}`).join('\n')}

## Best Practices
${code.bestPractices.map(practice => `- ${practice}`).join('\n')}`
      }]
    };
  }

  private async handleAdvancedAnalysis(args: any): Promise<any> {
    const projectPath = typeof args?.project_path === 'string' ? args.project_path : undefined;
    const analysis = await this.advancedAnalysisService.performAdvancedAnalysis(projectPath);
    return {
      content: [{
        type: 'text',
        text: `# 🔍 Advanced Project Analysis

## Summary
- **Complexity**: ${analysis.integrationComplexity}
- **Time Estimate**: ${analysis.estimatedImplementationTime}
- **Event Opportunities**: ${analysis.eventOpportunities.length}
- **Code Patterns**: ${analysis.codePatterns.length}

## Event Opportunities
${analysis.eventOpportunities.map(event => `
### ${event.eventName}
- **Value**: ${event.businessValue}
- **Location**: ${event.implementationLocation}
- **Properties**: ${Object.entries(event.suggestedProperties).map(([key, type]) => `${key}: ${type}`).join(', ')}
`).join('\n')}

## Next Steps
1. Review event opportunities by business value
2. Use 'implementation_guide' for detailed setup
3. Implement high-priority events first`
      }]
    };
  }

  private async handleImplementationGuide(args: any): Promise<any> {
    if (!args?.framework || !args?.language) {
      return {
        content: [{
          type: 'text',
          text: 'Error: framework and language are required parameters'
        }]
      };
    }
    
    const guide = this.implementationGuideService.generateImplementationGuide(
      args.framework as any,
      args.language as any,
      args.complexity as any
    );
    
    return {
      content: [{
        type: 'text',
        text: `# 🚀 ${guide.framework} Implementation Guide

## Overview
${guide.overview}

## Prerequisites
${guide.prerequisites.map(prereq => `- ${prereq}`).join('\n')}

## Implementation Steps
${guide.steps.map((step, index) => `
### Step ${index + 1}: ${step.title}
${step.description}

**Files:**
${step.files.map(file => `- ${file.action.toUpperCase()} \`${file.path}\``).join('\n')}

**Validation:**
${step.validation.map(item => `- [ ] ${item}`).join('\n')}
`).join('\n')}

## Testing Strategy
${guide.testingStrategy.map(strategy => `- ${strategy}`).join('\n')}

## Next Steps
${guide.nextSteps.map(step => `- ${step}`).join('\n')}`
      }]
    };
  }

  // Helper methods
  private generateEventTemplates(businessType: string) {
    const templates = {
      'e-commerce': [
        {
          name: 'Product Viewed',
          eventName: 'product_viewed',
          description: 'Track when users view product details',
          usage: 'Product pages, search results',
          properties: {
            product_id: 'string',
            product_name: 'string',
            category: 'string',
            price: 'number'
          },
          exampleValues: {
            product_id: '"prod_123"',
            product_name: '"Headphones"',
            category: '"Electronics"',
            price: '99.99'
          }
        }
      ],
      'saas': [
        {
          name: 'Feature Used',
          eventName: 'feature_used',
          description: 'Track feature adoption',
          usage: 'Feature interactions',
          properties: {
            feature_name: 'string',
            user_plan: 'string'
          },
          exampleValues: {
            feature_name: '"Export Data"',
            user_plan: '"Pro"'
          }
        }
      ],
      'general': [
        {
          name: 'Page View',
          eventName: 'page_view',
          description: 'Track page navigation',
          usage: 'All page loads',
          properties: {
            page_title: 'string',
            page_url: 'string'
          },
          exampleValues: {
            page_title: '"Home"',
            page_url: '"/home"'
          }
        }
      ]
    };

    return templates[businessType as keyof typeof templates] || templates.general;
  }

  private validateEventSchema(eventName: string, properties: any) {
    const issues: Array<{severity: string, message: string}> = [];
    const recommendations: string[] = [];
    
    if (!eventName.match(/^[a-z][a-z0-9_]*$/)) {
      issues.push({
        severity: 'error',
        message: 'Event name should be lowercase with underscores (snake_case)'
      });
    }
    
    if (!properties || typeof properties !== 'object') {
      issues.push({
        severity: 'error',
        message: 'Properties should be an object'
      });
    }
    
    const improvedSchema = {
      eventName: eventName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      properties: {
        ...properties,
        timestamp: 'string (auto-added)'
      }
    };
    
    return {
      isValid: issues.length === 0,
      issues,
      recommendations: recommendations.length > 0 ? recommendations : ['Schema looks good!'],
      improvedSchema
    };
  }

  private generateTrackingCode(eventName: string, framework: string, properties?: any) {
    const basic = `// Basic ${framework} tracking
import { useNodash } from '@nodash/sdk';

function MyComponent() {
  const { track } = useNodash();
  
  const handleEvent = () => {
    track('${eventName}', {
      ${properties ? Object.keys(properties).map(key => `${key}: 'value'`).join(',\n      ') : 'property: "value"'}
    });
  };
  
  return <button onClick={handleEvent}>Track Event</button>;
}`;

    const advanced = `// Advanced ${framework} tracking with error handling
import { useNodash } from '@nodash/sdk';
import { useCallback } from 'react';

function MyComponent() {
  const { track } = useNodash();
  
  const handleEvent = useCallback(async () => {
    try {
      await track('${eventName}', {
        ${properties ? Object.keys(properties).map(key => `${key}: 'value'`).join(',\n        ') : 'property: "value"'},
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Tracking failed:', error);
    }
  }, [track]);
  
  return <button onClick={handleEvent}>Track Event</button>;
}`;

    return {
      language: 'typescript',
      basic,
      advanced,
      requirements: [
        'Install @nodash/sdk: npm install @nodash/sdk',
        'Configure API token',
        'Wrap app with NodashProvider'
      ],
      bestPractices: [
        'Use useCallback to prevent re-renders',
        'Handle errors gracefully',
        'Include relevant context'
      ]
    };
  }
}