import * as fs from 'node:fs/promises';
import type {
  FileStats,
  FileSystemPort,
} from '../../../application/ports/secondary/file-system-port';

class BunFileStats implements FileStats {
  constructor(
    // biome-ignore lint/suspicious/noExplicitAny: Node fs.Stats type varies by platform
    private stats: any, // Bun/Node fs.Stats
  ) {}

  isDirectory(): boolean {
    return this.stats.isDirectory();
  }

  isFile(): boolean {
    return this.stats.isFile();
  }

  get modifiedAt(): Date {
    return new Date(this.stats.mtime);
  }

  get createdAt(): Date {
    return new Date(this.stats.birthtime || this.stats.ctime);
  }
}

export class BunFileSystem implements FileSystemPort {
  async readFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }

  async readdir(dirPath: string): Promise<string[]> {
    return await fs.readdir(dirPath);
  }

  async stat(filePath: string): Promise<FileStats> {
    const stats = await fs.stat(filePath);
    return new BunFileStats(stats);
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Watch is optional and not implemented for now
  // Could use chokidar or fs.watch if needed
}
