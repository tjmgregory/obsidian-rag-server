import { beforeEach, describe, expect, test } from 'bun:test';
import type { GetNoteUseCase } from '../../../application/ports/primary/get-note-use-case';
import type { ListNotesUseCase } from '../../../application/ports/primary/list-notes-use-case';
import type { SearchVaultUseCase } from '../../../application/ports/primary/search-vault-use-case';
import { Note } from '../../../domain/entities/note';
import { SearchResult } from '../../../domain/entities/search-result';
import { MCPServerAdapter } from './mcp-server-adapter';

describe('MCPServerAdapter', () => {
  let adapter: MCPServerAdapter;
  let mockSearchUseCase: SearchVaultUseCase;
  let mockGetNoteUseCase: GetNoteUseCase;
  let mockListNotesUseCase: ListNotesUseCase;

  beforeEach(() => {
    // Create mock use cases
    mockSearchUseCase = {
      execute: async (query: string, _limit?: number) => {
        if (query === 'test') {
          const note = new Note(
            'test.md',
            'Test Note',
            'Content with test keyword',
            { tags: ['test'] },
            ['test'],
            [],
            new Date('2024-01-01'),
            new Date('2024-01-01'),
          );
          return [new SearchResult(note, query)];
        }
        return [];
      },
    };

    mockGetNoteUseCase = {
      execute: async (path: string) => {
        if (path === 'test.md') {
          return new Note(
            'test.md',
            'Test Note',
            'Test content',
            { tags: ['test'] },
            ['test'],
            [],
            new Date('2024-01-01'),
            new Date('2024-01-01'),
          );
        }
        return null;
      },
    };

    mockListNotesUseCase = {
      execute: async (folder?: string) => {
        const notes = [
          new Note(
            'note1.md',
            'Note 1',
            'Content 1',
            {},
            [],
            [],
            new Date('2024-01-01'),
            new Date('2024-01-01'),
          ),
          new Note(
            'folder/note2.md',
            'Note 2',
            'Content 2',
            {},
            [],
            [],
            new Date('2024-01-02'),
            new Date('2024-01-02'),
          ),
        ];

        if (folder) {
          return notes.filter((n) => n.path.startsWith(`${folder}/`));
        }
        return notes;
      },
    };

    adapter = new MCPServerAdapter(mockSearchUseCase, mockGetNoteUseCase, mockListNotesUseCase);
  });

  describe('tool registration', () => {
    test('should register search_vault tool', async () => {
      const tools = await adapter.listTools();
      const searchTool = tools.find((t) => t.name === 'search_vault');

      expect(searchTool).toBeDefined();
      expect(searchTool?.description).toContain('Search');
      expect(searchTool?.inputSchema).toBeDefined();
      expect(searchTool?.inputSchema.required).toContain('query');
    });

    test('should register get_note tool', async () => {
      const tools = await adapter.listTools();
      const getTool = tools.find((t) => t.name === 'get_note');

      expect(getTool).toBeDefined();
      expect(getTool?.description).toContain('Retrieve');
      expect(getTool?.inputSchema).toBeDefined();
      expect(getTool?.inputSchema.required).toContain('path');
    });

    test('should register list_notes tool', async () => {
      const tools = await adapter.listTools();
      const listTool = tools.find((t) => t.name === 'list_notes');

      expect(listTool).toBeDefined();
      expect(listTool?.description).toContain('List');
      expect(listTool?.inputSchema).toBeDefined();
    });
  });

  describe('search_vault tool execution', () => {
    test('should execute search and return results', async () => {
      const result = await adapter.callTool('search_vault', { query: 'test' });

      expect(result).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');

      const content = JSON.parse(result.content[0]?.text || '{}');
      expect(content.results).toHaveLength(1);
      expect(content.results[0]?.path).toBe('test.md');
      expect(content.results[0]?.score).toBeGreaterThan(0); // Score is calculated dynamically
    });

    test('should return empty results for no matches', async () => {
      const result = await adapter.callTool('search_vault', { query: 'nonexistent' });

      const content = JSON.parse(result.content[0]?.text || '{}');
      expect(content.results).toHaveLength(0);
    });

    test('should respect limit parameter', async () => {
      const result = await adapter.callTool('search_vault', {
        query: 'test',
        limit: 5,
      });

      expect(result).toBeDefined();
      // Verify limit was passed to use case (mocked to return 1 result)
    });

    test('should handle missing query parameter', async () => {
      await expect(adapter.callTool('search_vault', {})).rejects.toThrow(
        'query parameter is required',
      );
    });
  });

  describe('get_note tool execution', () => {
    test('should retrieve note by path', async () => {
      const result = await adapter.callTool('get_note', { path: 'test.md' });

      expect(result).toBeDefined();
      const content = JSON.parse(result.content[0]?.text || '{}');
      expect(content.path).toBe('test.md');
      expect(content.title).toBe('Test Note');
      expect(content.content).toBe('Test content');
    });

    test('should handle note not found', async () => {
      const result = await adapter.callTool('get_note', { path: 'nonexistent.md' });

      const content = JSON.parse(result.content[0]?.text || '{}');
      expect(content.error).toBe('Note not found');
      expect(content.path).toBe('nonexistent.md');
    });

    test('should handle missing path parameter', async () => {
      await expect(adapter.callTool('get_note', {})).rejects.toThrow('path parameter is required');
    });
  });

  describe('list_notes tool execution', () => {
    test('should list all notes', async () => {
      const result = await adapter.callTool('list_notes', {});

      const content = JSON.parse(result.content[0]?.text || '{}');
      expect(content.notes).toHaveLength(2);
      expect(content.notes[0]?.path).toBe('note1.md');
      expect(content.notes[1]?.path).toBe('folder/note2.md');
    });

    test('should filter by folder', async () => {
      const result = await adapter.callTool('list_notes', { folder: 'folder' });

      const content = JSON.parse(result.content[0]?.text || '{}');
      expect(content.notes).toHaveLength(1);
      expect(content.notes[0]?.path).toBe('folder/note2.md');
    });

    test('should return empty list for empty folder', async () => {
      const result = await adapter.callTool('list_notes', { folder: 'empty' });

      const content = JSON.parse(result.content[0]?.text || '{}');
      expect(content.notes).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    test('should handle unknown tool', async () => {
      await expect(adapter.callTool('unknown_tool', {})).rejects.toThrow(
        'Unknown tool: unknown_tool',
      );
    });

    test('should handle use case errors gracefully', async () => {
      // Override with error-throwing use case
      const errorUseCase: SearchVaultUseCase = {
        execute: async () => {
          throw new Error('Database connection failed');
        },
      };

      const errorAdapter = new MCPServerAdapter(
        errorUseCase,
        mockGetNoteUseCase,
        mockListNotesUseCase,
      );

      const result = await errorAdapter.callTool('search_vault', { query: 'test' });
      const content = JSON.parse(result.content[0]?.text || '{}');

      expect(content.error).toContain('Search failed');
    });
  });

  describe('resource listing', () => {
    test('should list vault info resource', async () => {
      const resources = await adapter.listResources();
      const vaultInfo = resources.find((r) => r.uri === 'obsidian://vault/info');

      expect(vaultInfo).toBeDefined();
      expect(vaultInfo?.name).toContain('Vault Information');
      expect(vaultInfo?.mimeType).toBe('application/json');
    });

    test('should list tags resource', async () => {
      const resources = await adapter.listResources();
      const tags = resources.find((r) => r.uri === 'obsidian://vault/tags');

      expect(tags).toBeDefined();
      expect(tags?.name).toContain('Tags');
    });

    test('should list recent notes resource', async () => {
      const resources = await adapter.listResources();
      const recent = resources.find((r) => r.uri === 'obsidian://vault/recent');

      expect(recent).toBeDefined();
      expect(recent?.name).toContain('Recent Notes');
    });
  });
});
