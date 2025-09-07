import { beforeEach, describe, expect, test } from 'bun:test';
import { VaultService } from '../../src/services/vault-service';
import { MockFileSystem } from '../mocks/mock-file-system';

describe('search_vault tool', () => {
  let mockFS: MockFileSystem;
  let vaultService: VaultService;

  beforeEach(async () => {
    mockFS = new MockFileSystem();
    vaultService = new VaultService(
      {
        vaultPath: '/',
        ignoredFolders: ['.obsidian'],
        cacheSize: 100,
        searchLimit: 10,
      },
      mockFS,
    );
    await vaultService.initialize();
  });

  test('finds notes by exact keyword match', async () => {
    const results = await vaultService.searchNotes('Project Alpha');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.note.title).toBe('Project Alpha');
  });

  test('finds notes by partial keyword match', async () => {
    const results = await vaultService.searchNotes('testing');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.snippet).toContain('testing');
  });

  test('returns empty array when no matches found', async () => {
    const results = await vaultService.searchNotes('nonexistent');
    expect(results).toEqual([]);
  });

  test('respects search limit', async () => {
    const results = await vaultService.searchNotes('project', 1);
    expect(results.length).toBeLessThanOrEqual(1);
  });
});
