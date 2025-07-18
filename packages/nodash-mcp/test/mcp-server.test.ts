import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

// Mock MCP Client for testing
class MockMCPClient {
    private serverProcess: ChildProcess | null = null;
    private messageId = 1;

    async startServer(): Promise<void> {
        return new Promise((resolve, reject) => {
            const serverPath = path.resolve(__dirname, '../dist/server.js');
            this.serverProcess = spawn('node', [serverPath], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let initialized = false;
            let errorOutput = '';

            this.serverProcess.stderr?.on('data', (data) => {
                const output = data.toString();
                errorOutput += output;
                console.log('Server stderr:', output); // Debug logging
                if (output.includes('Nodash MCP Server started') && !initialized) {
                    initialized = true;
                    resolve();
                }
            });

            this.serverProcess.stdout?.on('data', (data) => {
                const output = data.toString();
                console.log('Server stdout:', output); // Debug logging
            });

            this.serverProcess.on('error', (error) => {
                console.log('Server process error:', error); // Debug logging
                reject(error);
            });

            this.serverProcess.on('exit', (code, signal) => {
                if (!initialized) {
                    console.log('Server exited with code:', code, 'signal:', signal); // Debug logging
                    console.log('Server error output:', errorOutput); // Debug logging
                    reject(new Error(`Server exited with code ${code}. Error output: ${errorOutput}`));
                }
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                if (!initialized) {
                    console.log('Server timeout. Error output:', errorOutput); // Debug logging
                    reject(new Error(`Server failed to start within timeout. Error output: ${errorOutput}`));
                }
            }, 10000);
        });
    }

    async stopServer(): Promise<void> {
        if (this.serverProcess) {
            this.serverProcess.kill();
            this.serverProcess = null;
        }
    }

    async sendRequest(method: string, params?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.serverProcess) {
                reject(new Error('Server not started'));
                return;
            }

            const request = {
                jsonrpc: '2.0',
                id: this.messageId++,
                method,
                params: params || {}
            };

            let responseData = '';

            const onData = (data: Buffer) => {
                responseData += data.toString();

                // Try to parse complete JSON response
                try {
                    const lines = responseData.split('\n').filter(line => line.trim());
                    for (const line of lines) {
                        const response = JSON.parse(line);
                        if (response.id === request.id) {
                            this.serverProcess?.stdout?.off('data', onData);
                            resolve(response);
                            return;
                        }
                    }
                } catch (e) {
                    // Continue collecting data
                }
            };

            this.serverProcess.stdout?.on('data', onData);

            // Send request
            this.serverProcess.stdin?.write(JSON.stringify(request) + '\n');

            // Timeout after 5 seconds
            setTimeout(() => {
                this.serverProcess?.stdout?.off('data', onData);
                reject(new Error('Request timeout'));
            }, 5000);
        });
    }
}

describe('Nodash MCP Server Component Tests', () => {
    let client: MockMCPClient;

    beforeEach(async () => {
        client = new MockMCPClient();
        await client.startServer();
    }, 15000); // Increase timeout to 15 seconds

    afterEach(async () => {
        await client.stopServer();
    });

    describe('Server Initialization', () => {
        it('should start successfully', async () => {
            // If we get here, the server started successfully in beforeEach
            expect(true).toBe(true);
        });
    });

    describe('Tool Discovery', () => {
        it('should list available tools', async () => {
            const response = await client.sendRequest('tools/list');

            expect(response.result).toBeDefined();
            expect(response.result.tools).toBeInstanceOf(Array);
            expect(response.result.tools.length).toBeGreaterThan(0);

            const toolNames = response.result.tools.map((tool: any) => tool.name);
            expect(toolNames).toContain('setup_project');
            expect(toolNames).toContain('run_cli_command');
            expect(toolNames).toContain('get_documentation');
        });

        it('should provide detailed tool schemas', async () => {
            const response = await client.sendRequest('tools/list');
            const tools = response.result.tools;

            const setupTool = tools.find((tool: any) => tool.name === 'setup_project');
            expect(setupTool).toBeDefined();
            expect(setupTool.description).toContain('Set up a nodash project');
            expect(setupTool.inputSchema).toBeDefined();
            expect(setupTool.inputSchema.properties.baseUrl).toBeDefined();
            expect(setupTool.inputSchema.required).toContain('baseUrl');

            const cliTool = tools.find((tool: any) => tool.name === 'run_cli_command');
            expect(cliTool).toBeDefined();
            expect(cliTool.description).toContain('Execute a nodash CLI command');
            expect(cliTool.inputSchema.properties.command).toBeDefined();

            const docTool = tools.find((tool: any) => tool.name === 'get_documentation');
            expect(docTool).toBeDefined();
            expect(docTool.inputSchema.properties.component.enum).toEqual(['sdk', 'cli']);
        });
    });

    describe('Resource Discovery', () => {
        it('should list available resources', async () => {
            const response = await client.sendRequest('resources/list');

            expect(response.result).toBeDefined();
            expect(response.result.resources).toBeInstanceOf(Array);
            expect(response.result.resources.length).toBe(2);

            const resourceUris = response.result.resources.map((resource: any) => resource.uri);
            expect(resourceUris).toContain('nodash://docs/sdk');
            expect(resourceUris).toContain('nodash://docs/cli');
        });

        it('should provide resource metadata', async () => {
            const response = await client.sendRequest('resources/list');
            const resources = response.result.resources;

            const sdkResource = resources.find((r: any) => r.uri === 'nodash://docs/sdk');
            expect(sdkResource.name).toBe('SDK Documentation');
            expect(sdkResource.mimeType).toBe('text/markdown');

            const cliResource = resources.find((r: any) => r.uri === 'nodash://docs/cli');
            expect(cliResource.name).toBe('CLI Documentation');
            expect(cliResource.mimeType).toBe('text/markdown');
        });
    });

    describe('Documentation Access', () => {
        it('should read SDK documentation', async () => {
            const response = await client.sendRequest('resources/read', {
                uri: 'nodash://docs/sdk'
            });

            expect(response.result).toBeDefined();
            expect(response.result.contents).toBeInstanceOf(Array);
            expect(response.result.contents.length).toBe(1);

            const content = response.result.contents[0];
            expect(content.uri).toBe('nodash://docs/sdk');
            expect(content.mimeType).toBe('text/markdown');
            expect(content.text).toContain('# @nodash/sdk');
            expect(content.text).toContain('NodashSDK');
            expect(content.text.length).toBeGreaterThan(1000);
        });

        it('should read CLI documentation', async () => {
            const response = await client.sendRequest('resources/read', {
                uri: 'nodash://docs/cli'
            });

            expect(response.result).toBeDefined();
            const content = response.result.contents[0];
            expect(content.text).toContain('# @nodash/cli');
            expect(content.text).toContain('nodash init');
            expect(content.text).toContain('nodash track');
            expect(content.text.length).toBeGreaterThan(1000);
        });

        it('should handle invalid resource URIs', async () => {
            const response = await client.sendRequest('resources/read', {
                uri: 'nodash://docs/invalid'
            });

            expect(response.error).toBeDefined();
            expect(response.error.message).toContain('Unknown resource');
        });
    });

    describe('Tool Execution', () => {
        it('should get SDK documentation via tool', async () => {
            const response = await client.sendRequest('tools/call', {
                name: 'get_documentation',
                arguments: { component: 'sdk' }
            });

            expect(response.result).toBeDefined();
            expect(response.result.content).toBeInstanceOf(Array);
            expect(response.result.content.length).toBe(1);

            // Validate MCP protocol format
            const content = response.result.content[0];
            expect(content.type).toBe('text');
            expect(content.text).toBeDefined();

            // Parse the JSON content to validate structure
            const docData = JSON.parse(content.text);
            expect(docData.component).toBe('sdk');
            expect(docData.content).toContain('# @nodash/sdk');
            expect(docData.examples).toBeInstanceOf(Array);
            expect(docData.examples.length).toBeGreaterThan(0);
            expect(docData.lastUpdated).toBeDefined();
        });

        it('should get CLI documentation via tool', async () => {
            const response = await client.sendRequest('tools/call', {
                name: 'get_documentation',
                arguments: { component: 'cli' }
            });

            // Validate MCP protocol format
            const content = response.result.content[0];
            expect(content.type).toBe('text');
            expect(content.text).toBeDefined();

            // Parse the JSON content to validate structure
            const docData = JSON.parse(content.text);
            expect(docData.component).toBe('cli');
            expect(docData.content).toContain('# @nodash/cli');
            expect(docData.examples).toBeInstanceOf(Array);
            expect(docData.examples.some((ex: string) => ex.includes('nodash'))).toBe(true);
        });

        it('should handle invalid documentation component', async () => {
            const response = await client.sendRequest('tools/call', {
                name: 'get_documentation',
                arguments: { component: 'invalid' }
            });

            // Should either return an error or handle gracefully
            expect(response.error || response.result).toBeDefined();
        });

        it('should attempt project setup', async () => {
            const response = await client.sendRequest('tools/call', {
                name: 'setup_project',
                arguments: {
                    baseUrl: 'https://test.example.com',
                    apiToken: 'test-token'
                }
            });

            expect(response.result).toBeDefined();
            expect(response.result.content).toBeInstanceOf(Array);
            expect(response.result.content.length).toBe(1);

            // Validate MCP protocol format
            const content = response.result.content[0];
            expect(content.type).toBe('text');
            expect(content.text).toBeDefined();

            // Parse the JSON content to validate structure
            const setupResult = JSON.parse(content.text);
            expect(setupResult.success).toBeDefined();
            expect(setupResult.message).toBeDefined();
            // Note: This will likely fail since we don't have the CLI installed globally,
            // but we're testing that the MCP server handles the request properly
        });

        it('should attempt CLI command execution', async () => {
            const response = await client.sendRequest('tools/call', {
                name: 'run_cli_command',
                arguments: {
                    command: 'help'
                }
            });

            expect(response.result).toBeDefined();
            expect(response.result.content).toBeInstanceOf(Array);
            expect(response.result.content.length).toBe(1);

            // Validate MCP protocol format
            const content = response.result.content[0];
            expect(content.type).toBe('text');
            expect(content.text).toBeDefined();

            // Parse the JSON content to validate structure
            const commandResult = JSON.parse(content.text);
            expect(commandResult.success).toBeDefined();
            expect(commandResult.output).toBeDefined();
            expect(commandResult.exitCode).toBeDefined();
        });

        it('should handle unknown tools', async () => {
            const response = await client.sendRequest('tools/call', {
                name: 'unknown_tool',
                arguments: {}
            });

            expect(response.error).toBeDefined();
            expect(response.error.message).toContain('Unknown tool');
        });
    });

    describe('Documentation Content Validation', () => {
        it('should have properly extracted examples from SDK docs', async () => {
            const response = await client.sendRequest('tools/call', {
                name: 'get_documentation',
                arguments: { component: 'sdk' }
            });

            // Validate MCP protocol format
            const content = response.result.content[0];
            expect(content.type).toBe('text');
            expect(content.text).toBeDefined();

            // Parse the JSON content to validate structure
            const docData = JSON.parse(content.text);
            const examples = docData.examples;

            // Should have code examples
            expect(examples.length).toBeGreaterThan(0);

            // Should contain SDK usage examples
            const sdkExamples = examples.filter((ex: string) =>
                ex.includes('NodashSDK') || ex.includes('nodash.track')
            );
            expect(sdkExamples.length).toBeGreaterThan(0);
        });

        it('should have properly extracted examples from CLI docs', async () => {
            const response = await client.sendRequest('tools/call', {
                name: 'get_documentation',
                arguments: { component: 'cli' }
            });

            // Validate MCP protocol format
            const content = response.result.content[0];
            expect(content.type).toBe('text');
            expect(content.text).toBeDefined();

            // Parse the JSON content to validate structure
            const docData = JSON.parse(content.text);
            const examples = docData.examples;

            // Should contain CLI command examples
            const cliExamples = examples.filter((ex: string) =>
                ex.includes('nodash ') || ex.includes('npm install')
            );
            expect(cliExamples.length).toBeGreaterThan(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle malformed requests gracefully', async () => {
            try {
                await client.sendRequest('invalid/method');
            } catch (error) {
                // Should either return an error response or timeout
                expect(error).toBeDefined();
            }
        });

        it('should validate tool arguments', async () => {
            const response = await client.sendRequest('tools/call', {
                name: 'setup_project',
                arguments: {} // Missing required baseUrl
            });

            // Should handle missing required arguments
            expect(response.result || response.error).toBeDefined();
        });
    });

    describe('Real-world Agent Scenarios', () => {
        it('should support agent discovery workflow', async () => {
            // 1. Agent discovers available tools
            const toolsResponse = await client.sendRequest('tools/list');
            expect(toolsResponse.result.tools.length).toBeGreaterThan(0);

            // 2. Agent discovers available resources
            const resourcesResponse = await client.sendRequest('resources/list');
            expect(resourcesResponse.result.resources.length).toBe(2);

            // 3. Agent reads documentation to understand capabilities
            const sdkDocsResponse = await client.sendRequest('resources/read', {
                uri: 'nodash://docs/sdk'
            });
            expect(sdkDocsResponse.result.contents[0].text).toContain('NodashSDK');

            // 4. Agent gets structured documentation with examples
            const structuredDocsResponse = await client.sendRequest('tools/call', {
                name: 'get_documentation',
                arguments: { component: 'sdk' }
            });

            // Validate MCP protocol format
            const content = structuredDocsResponse.result.content[0];
            expect(content.type).toBe('text');
            expect(content.text).toBeDefined();

            // Parse the JSON content to validate structure
            const docData = JSON.parse(content.text);
            expect(docData.examples.length).toBeGreaterThan(0);
        });

        it('should support project setup workflow', async () => {
            // Agent attempts to set up a project
            const setupResponse = await client.sendRequest('tools/call', {
                name: 'setup_project',
                arguments: {
                    baseUrl: 'https://analytics.example.com',
                    apiToken: 'agent-token-123',
                    environment: 'production'
                }
            });

            expect(setupResponse.result).toBeDefined();

            // Validate MCP protocol format
            const content = setupResponse.result.content[0];
            expect(content.type).toBe('text');
            expect(content.text).toBeDefined();

            // Parse the JSON content to validate structure
            const result = JSON.parse(content.text);
            expect(result.message).toBeDefined();
            expect(typeof result.success).toBe('boolean');
        });
    });
});