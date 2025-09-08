import type { FileSystemPort } from '../../application/ports/secondary/file-system-port';
import type { NoteRepository } from '../../application/ports/secondary/note-repository';
import { GetNoteUseCaseImpl } from '../../application/use-cases/get-note-use-case-impl';
import { ListNotesUseCaseImpl } from '../../application/use-cases/list-notes-use-case-impl';
import { SearchVaultUseCaseImpl } from '../../application/use-cases/search-vault-use-case-impl';
import { MCPServerAdapter } from '../adapters/primary/mcp-server-adapter';
import { BunFileSystem } from '../adapters/secondary/bun-file-system';
import { FileNoteRepository } from '../adapters/secondary/file-note-repository';
import { InMemoryCacheAdapter } from '../adapters/secondary/in-memory-cache';
import { type AppConfig, loadConfig } from '../config/config-loader';

/**
 * Composition Root - Wires all dependencies together.
 * This is the only place where we use concrete implementations.
 */
export class CompositionRoot {
  private config!: AppConfig;
  private fileSystem!: FileSystemPort;
  private noteRepository!: NoteRepository;
  private cache!: InMemoryCacheAdapter<unknown>;
  private mcpAdapter!: MCPServerAdapter;

  /**
   * Initialize the composition root with configuration
   */
  async init(configPath?: string): Promise<void> {
    // Load configuration
    this.config = await loadConfig(configPath);

    // Create infrastructure adapters
    this.fileSystem = new BunFileSystem();
    this.cache = new InMemoryCacheAdapter(this.config.cacheSize);

    // Create repository with performance monitoring if enabled
    this.noteRepository = new FileNoteRepository(
      this.config.vaultPath,
      this.fileSystem,
      this.config.ignoredFolders,
      this.config.enablePerformanceMonitoring,
    );

    // Create use cases
    const searchUseCase = new SearchVaultUseCaseImpl(this.noteRepository);
    const getNoteUseCase = new GetNoteUseCaseImpl(this.noteRepository);
    const listNotesUseCase = new ListNotesUseCaseImpl(this.noteRepository);

    // Create MCP adapter
    this.mcpAdapter = new MCPServerAdapter(searchUseCase, getNoteUseCase, listNotesUseCase);
  }

  /**
   * Get the configured MCP adapter for server setup.
   */
  getMCPAdapter(): MCPServerAdapter {
    if (!this.mcpAdapter) {
      throw new Error('CompositionRoot not initialized. Call init() first.');
    }
    return this.mcpAdapter;
  }

  /**
   * Get the configuration.
   */
  getConfig(): AppConfig {
    if (!this.config) {
      throw new Error('CompositionRoot not initialized. Call init() first.');
    }
    return this.config;
  }

  /**
   * Get the note repository (useful for testing and direct access).
   */
  getNoteRepository(): NoteRepository {
    if (!this.noteRepository) {
      throw new Error('CompositionRoot not initialized. Call init() first.');
    }
    return this.noteRepository;
  }

  /**
   * Initialize the system (load vault, warm cache, etc).
   */
  async initialize(): Promise<void> {
    console.error('Initializing Obsidian RAG Server...');
    console.error(`Vault path: ${this.config.vaultPath}`);
    console.error(`Cache size: ${this.config.cacheSize}`);
    console.error(`Ignored folders: ${this.config.ignoredFolders.join(', ')}`);

    // Load all notes to warm up the system
    const result = await this.noteRepository.findAll();

    if ('ok' in result && result.ok) {
      console.error(`Loaded ${result.value.length} notes from vault`);
    } else if ('ok' in result && !result.ok) {
      console.error('Failed to load notes:', result.error);
      throw result.error;
    }

    console.error('Initialization complete');
  }

  /**
   * Cleanup resources.
   */
  async shutdown(): Promise<void> {
    console.error('Shutting down...');
    this.cache.clear();
    console.error('Shutdown complete');
  }
}
