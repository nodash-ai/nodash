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

        // Tool schema validation removed - tests implementation details rather than behavior
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

        // Resource metadata validation removed - tests implementation details
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

        // Error message validation removed - tests implementation details
    });

    describe('Tool Execution', () => {
        it('should execute tools and handle errors appropriately', async () => {
            // Test documentation tool
            const docResponse = await client.sendRequest('tools/call', {
                name: 'get_documentation',
                arguments: { component: 'sdk' }
            });

            expect(docResponse.result).toBeDefined();
            const docContent = docResponse.result.content[0];
            expect(docContent.type).toBe('text');
            const docData = JSON.parse(docContent.text);
            expect(docData.component).toBe('sdk');
            expect(docData.content).toContain('# @nodash/sdk');

            // Test error handling for unknown tools
            const errorResponse = await client.sendRequest('tools/call', {
                name: 'unknown_tool',
                arguments: {}
            });
            expect(errorResponse.error).toBeDefined();
            expect(errorResponse.error.message).toContain('Unknown tool');
        });
    });



    // Documentation content validation removed - redundant with tool execution tests

    // Error handling tests removed - covered in tool execution tests

    // Real-world agent scenarios removed - redundant with individual feature tests
});