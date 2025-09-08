import { describe, expect, it } from 'bun:test';
import { spawn } from 'node:child_process';
import * as path from 'node:path';

describe('MCP Server Integration', () => {
  const serverPath = path.join(import.meta.dir, '../../src/index.ts');
  const testTimeout = 5000;

  async function sendRequest(requests: unknown[]): Promise<unknown[]> {
    return new Promise((resolve, reject) => {
      const responses: unknown[] = [];
      const server = spawn('bun', ['run', serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let buffer = '';

      server.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() && line.startsWith('{')) {
            try {
              const response = JSON.parse(line);
              if (response.jsonrpc === '2.0') {
                responses.push(response);
                if (responses.length === requests.length) {
                  server.kill();
                  resolve(responses);
                }
              }
            } catch {
              // Ignore non-JSON lines (console.error output)
            }
          }
        }
      });

      server.on('error', reject);
      server.on('exit', () => {
        if (responses.length < requests.length) {
          reject(new Error('Server exited before all responses received'));
        }
      });

      // Send all requests
      for (const request of requests) {
        server.stdin.write(`${JSON.stringify(request)}\n`);
      }

      // Timeout after 5 seconds
      setTimeout(() => {
        server.kill();
        reject(new Error('Test timeout'));
      }, testTimeout);
    });
  }

  it('should initialize the server', async () => {
    const responses = await sendRequest([
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '0.1.0',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0.0' },
        },
      },
    ]);

    expect(responses).toHaveLength(1);
    expect(responses[0]).toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      result: {
        capabilities: {
          tools: {},
          resources: {},
        },
        serverInfo: {
          name: 'obsidian-rag',
          version: '0.1.0',
        },
      },
    });
  });

  it('should list available tools', async () => {
    const responses = await sendRequest([
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '0.1.0',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0.0' },
        },
      },
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      },
    ]);

    expect(responses).toHaveLength(2);
    const toolsResponse = responses[1];
    expect(toolsResponse).toMatchObject({
      jsonrpc: '2.0',
      id: 2,
      result: {
        tools: expect.arrayContaining([
          expect.objectContaining({
            name: 'search_vault',
            description: expect.any(String),
            inputSchema: expect.any(Object),
          }),
          expect.objectContaining({
            name: 'get_note',
            description: expect.any(String),
            inputSchema: expect.any(Object),
          }),
          expect.objectContaining({
            name: 'list_notes',
            description: expect.any(String),
            inputSchema: expect.any(Object),
          }),
        ]),
      },
    });
  });

  it('should list available resources', async () => {
    const responses = await sendRequest([
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '0.1.0',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0.0' },
        },
      },
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'resources/list',
        params: {},
      },
    ]);

    expect(responses).toHaveLength(2);
    const resourcesResponse = responses[1];
    expect(resourcesResponse).toMatchObject({
      jsonrpc: '2.0',
      id: 2,
      result: {
        resources: expect.arrayContaining([
          expect.objectContaining({
            uri: 'obsidian://vault/info',
            name: expect.any(String),
            mimeType: 'application/json',
          }),
          expect.objectContaining({
            uri: 'obsidian://vault/tags',
            name: expect.any(String),
            mimeType: 'application/json',
          }),
          expect.objectContaining({
            uri: 'obsidian://vault/recent',
            name: expect.any(String),
            mimeType: 'application/json',
          }),
        ]),
      },
    });
  });

  it('should call search_vault tool', async () => {
    const responses = await sendRequest([
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '0.1.0',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0.0' },
        },
      },
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'search_vault',
          arguments: {
            query: 'test',
            limit: 5,
          },
        },
      },
    ]);

    expect(responses).toHaveLength(2);
    const searchResponse = responses[1];
    expect(searchResponse).toMatchObject({
      jsonrpc: '2.0',
      id: 2,
      result: {
        content: expect.arrayContaining([
          expect.objectContaining({
            type: 'text',
            text: expect.any(String),
          }),
        ]),
      },
    });
  });

  it('should call list_notes tool', async () => {
    const responses = await sendRequest([
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '0.1.0',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0.0' },
        },
      },
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'list_notes',
          arguments: {},
        },
      },
    ]);

    expect(responses).toHaveLength(2);
    const listResponse = responses[1];
    expect(listResponse).toMatchObject({
      jsonrpc: '2.0',
      id: 2,
      result: {
        content: expect.arrayContaining([
          expect.objectContaining({
            type: 'text',
            text: expect.any(String),
          }),
        ]),
      },
    });
  });

  it('should read vault info resource', async () => {
    const responses = await sendRequest([
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '0.1.0',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0.0' },
        },
      },
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'resources/read',
        params: {
          uri: 'obsidian://vault/info',
        },
      },
    ]);

    expect(responses).toHaveLength(2);
    const resourceResponse = responses[1];
    expect(resourceResponse).toMatchObject({
      jsonrpc: '2.0',
      id: 2,
      result: {
        content: expect.arrayContaining([
          expect.objectContaining({
            type: 'text',
            text: expect.any(String),
          }),
        ]),
      },
    });

    // Parse and validate the JSON content if the response has content
    // biome-ignore lint/suspicious/noExplicitAny: Test code needs flexible typing
    const result = (resourceResponse as any).result;
    if (result?.content?.[0]?.text) {
      const content = JSON.parse(result.content[0].text);
      expect(content).toMatchObject({
        noteCount: expect.any(Number),
        lastUpdated: expect.any(String),
      });
    }
  });
});
