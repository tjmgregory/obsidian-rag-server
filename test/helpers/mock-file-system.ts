import type {
  FileStats,
  FileSystemPort,
} from '../../src/application/ports/secondary/file-system-port';

class MockFileStats implements FileStats {
  constructor(
    private isFileFlag: boolean,
    public modifiedAt: Date,
    public createdAt: Date,
  ) {}

  isDirectory(): boolean {
    return !this.isFileFlag;
  }

  isFile(): boolean {
    return this.isFileFlag;
  }
}

export class MockFileSystem implements FileSystemPort {
  private files: Map<string, string> = new Map();
  private directories: Set<string> = new Set();

  constructor() {
    // Add root directory
    this.directories.add('/');
  }

  async readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (!content) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    return content;
  }

  async readdir(path: string): Promise<string[]> {
    if (!this.directories.has(path)) {
      throw new Error(`ENOTDIR: not a directory, scandir '${path}'`);
    }

    const normalizedPath = path.endsWith('/') ? path : `${path}/`;
    const entries: Set<string> = new Set();

    // Find all files and directories that are direct children of this path
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(normalizedPath)) {
        const relativePath = filePath.slice(normalizedPath.length);
        const firstSlash = relativePath.indexOf('/');
        if (firstSlash === -1) {
          // Direct file
          entries.add(relativePath);
        } else {
          // Directory
          entries.add(relativePath.slice(0, firstSlash));
        }
      }
    }

    for (const dirPath of this.directories) {
      if (dirPath !== path && dirPath.startsWith(normalizedPath)) {
        const relativePath = dirPath.slice(normalizedPath.length);
        if (relativePath && !relativePath.includes('/')) {
          entries.add(relativePath);
        }
      }
    }

    return Array.from(entries);
  }

  async stat(path: string): Promise<FileStats> {
    if (this.files.has(path)) {
      return new MockFileStats(true, new Date(), new Date());
    }
    if (this.directories.has(path)) {
      return new MockFileStats(false, new Date(), new Date());
    }
    throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path) || this.directories.has(path);
  }

  // Test helper methods
  addFile(path: string, content: string): void {
    this.files.set(path, content);
    // Ensure parent directories exist
    const parts = path.split('/').filter((p) => p);
    let currentPath = '';
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath += `/${parts[i]}`;
      this.directories.add(currentPath);
    }
  }

  addDirectory(path: string): void {
    this.directories.add(path);
  }

  clear(): void {
    this.files.clear();
    this.directories.clear();
    this.directories.add('/');
  }
}
