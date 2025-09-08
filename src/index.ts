#!/usr/bin/env bun
/**
 * Obsidian RAG MCP Server
 *
 * Main entry point for the Model Context Protocol server that provides
 * RAG capabilities for Obsidian vaults.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { CompositionRoot } from './infrastructure/composition/composition-root';

// Server metadata
const SERVER_NAME = 'obsidian-rag';
const SERVER_VERSION = '0.1.0';

async function main() {
  try {
    // Initialize composition root
    const compositionRoot = new CompositionRoot();
    await compositionRoot.init();
    await compositionRoot.initialize();

    // Get MCP adapter
    const mcpAdapter = compositionRoot.getMCPAdapter();

    // Create MCP server
    const server = new Server(
      {
        name: SERVER_NAME,
        version: SERVER_VERSION,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      },
    );

    // Register tool handlers
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: await mcpAdapter.listTools(),
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const result = await mcpAdapter.callTool(name, args || {});
      return result;
    });

    // Register resource handlers
    server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: await mcpAdapter.listResources(),
    }));

    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      const result = await mcpAdapter.readResource(uri);
      return result;
    });

    // Error handling
    server.onerror = (error) => {
      console.error('[MCP Server Error]', error);
    };

    // Create transport (stdio for Phase 1)
    const transport = new StdioServerTransport();

    // Handle shutdown gracefully
    process.on('SIGINT', async () => {
      console.error('Received SIGINT, shutting down gracefully...');
      await compositionRoot.shutdown();
      await server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('Received SIGTERM, shutting down gracefully...');
      await compositionRoot.shutdown();
      await server.close();
      process.exit(0);
    });

    // Connect and run
    console.error(`Starting ${SERVER_NAME} v${SERVER_VERSION}...`);
    await server.connect(transport);
    console.error('MCP server running on stdio transport');

    // Keep the process alive
    process.stdin.resume();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
