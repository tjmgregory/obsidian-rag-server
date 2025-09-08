import type { Resource, Tool } from '@modelcontextprotocol/sdk/types.js';
import type { GetNoteUseCase } from '../../../application/ports/primary/get-note-use-case';
import type { ListNotesUseCase } from '../../../application/ports/primary/list-notes-use-case';
import type { SearchVaultUseCase } from '../../../application/ports/primary/search-vault-use-case';

/**
 * MCP Server Adapter - Primary adapter that exposes use cases via MCP protocol.
 * Translates between MCP protocol and our application's use cases.
 */
export class MCPServerAdapter {
  constructor(
    private searchVaultUseCase: SearchVaultUseCase,
    private getNoteUseCase: GetNoteUseCase,
    private listNotesUseCase: ListNotesUseCase,
  ) {}

  /**
   * List available MCP tools.
   */
  async listTools(): Promise<Tool[]> {
    return [
      {
        name: 'search_vault',
        description: 'Search notes in the Obsidian vault by keyword',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to find notes',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 20)',
              minimum: 1,
              maximum: 100,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_note',
        description: 'Retrieve a specific note by its path',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the note file (e.g., "folder/note.md")',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'list_notes',
        description: 'List notes in the vault, optionally filtered by folder',
        inputSchema: {
          type: 'object',
          properties: {
            folder: {
              type: 'string',
              description: 'Filter notes by folder path',
            },
          },
        },
      },
    ];
  }

  /**
   * Execute an MCP tool.
   */
  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    switch (name) {
      case 'search_vault':
        return await this.handleSearchVault(args);
      case 'get_note':
        return await this.handleGetNote(args);
      case 'list_notes':
        return await this.handleListNotes(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * List available MCP resources.
   */
  async listResources(): Promise<Resource[]> {
    return [
      {
        uri: 'obsidian://vault/info',
        name: 'Vault Information',
        description: 'Statistics and metadata about the Obsidian vault',
        mimeType: 'application/json',
      },
      {
        uri: 'obsidian://vault/tags',
        name: 'Vault Tags',
        description: 'All tags used across the vault',
        mimeType: 'application/json',
      },
      {
        uri: 'obsidian://vault/recent',
        name: 'Recent Notes',
        description: 'Recently modified notes',
        mimeType: 'application/json',
      },
    ];
  }

  /**
   * Read an MCP resource.
   */
  async readResource(uri: string): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Phase 1: Return basic static responses
    // Phase 2: Will implement actual resource reading
    switch (uri) {
      case 'obsidian://vault/info':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                noteCount: 0,
                lastUpdated: new Date().toISOString(),
              }),
            },
          ],
        };
      case 'obsidian://vault/tags':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ tags: [] }),
            },
          ],
        };
      case 'obsidian://vault/recent':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ notes: [] }),
            },
          ],
        };
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  }

  private async handleSearchVault(
    args: Record<string, unknown>,
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
    const query = args['query'];
    if (typeof query !== 'string') {
      throw new Error('query parameter is required and must be a string');
    }

    // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
    const limit = typeof args['limit'] === 'number' ? args['limit'] : 20;

    try {
      const results = await this.searchVaultUseCase.execute(query, limit);

      const searchResults = results.map((sr) => ({
        path: sr.note.path,
        title: sr.note.title,
        score: sr.score,
        matches: sr.matchedFields,
        excerpt: sr.note.content.substring(0, 200),
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ results: searchResults }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              results: [],
            }),
          },
        ],
      };
    }
  }

  private async handleGetNote(
    args: Record<string, unknown>,
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
    const path = args['path'];
    if (typeof path !== 'string') {
      throw new Error('path parameter is required and must be a string');
    }

    try {
      const note = await this.getNoteUseCase.execute(path);

      if (!note) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Note not found',
                path,
              }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              path: note.path,
              title: note.title,
              content: note.content,
              frontmatter: note.frontmatter,
              tags: note.tags,
              links: note.links,
              created: note.createdAt.toISOString(),
              modified: note.modifiedAt.toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `Failed to retrieve note: ${error instanceof Error ? error.message : 'Unknown error'}`,
              path,
            }),
          },
        ],
      };
    }
  }

  private async handleListNotes(
    args: Record<string, unknown>,
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
    const folder = typeof args['folder'] === 'string' ? args['folder'] : undefined;

    try {
      const notes = await this.listNotesUseCase.execute(folder);

      const noteSummaries = notes.map((note) => ({
        path: note.path,
        title: note.title,
        tags: note.tags,
        modified: note.modifiedAt.toISOString(),
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ notes: noteSummaries }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `Failed to list notes: ${error instanceof Error ? error.message : 'Unknown error'}`,
              notes: [],
            }),
          },
        ],
      };
    }
  }
}
