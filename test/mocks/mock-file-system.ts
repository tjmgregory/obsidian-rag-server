import type { FileStats, FileSystemAdapter } from '../../src/services/file-system.interface';

export class MockFileSystem implements FileSystemAdapter {
  private files: Map<string, string> = new Map();
  private directories: Set<string> = new Set();
  private watchCallbacks: ((event: string, filename: string) => void)[] = [];

  constructor() {
    this.seedTestData();
  }

  async readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (!content) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    return content;
  }

  async readdir(path: string): Promise<string[]> {
    const files: string[] = [];
    const prefix = path.endsWith('/') ? path : `${path}/`;

    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(prefix)) {
        const relativePath = filePath.substring(prefix.length);
        const firstPart = relativePath.split('/')[0];
        if (firstPart && !files.includes(firstPart)) {
          files.push(firstPart);
        }
      }
    }
    return files;
  }

  async stat(path: string): Promise<FileStats> {
    const isFile = this.files.has(path);
    const isDir = this.directories.has(path);

    if (!isFile && !isDir) {
      throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
    }

    return {
      isFile: () => isFile,
      isDirectory: () => isDir,
      mtime: new Date('2024-01-15'),
      birthtime: new Date('2024-01-01'),
    };
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path) || this.directories.has(path);
  }

  watch(_path: string, callback: (event: string, filename: string) => void): void {
    this.watchCallbacks.push(callback);
  }

  unwatch(): void {
    this.watchCallbacks = [];
  }

  // Test helper methods
  addFile(path: string, content: string): void {
    this.files.set(path, content);
    for (const cb of this.watchCallbacks) {
      cb('add', path);
    }
  }

  private seedTestData(): void {
    // Set up directory structure
    this.directories.add('/');
    this.directories.add('/projects');

    // Add test files - minimal for first test
    this.files.set(
      '/projects/project-alpha.md',
      `---
title: Project Alpha
status: active
tags: [project, development]
---

# Project Alpha

Key project for Q1 2024. Working with team on implementation.

## Goals
- Implement search functionality
- Build robust testing framework
- Deploy to production

#important #deadline-q1`,
    );

    this.files.set(
      '/projects/project-beta.md',
      `---
title: Project Beta
---

# Project Beta

Secondary project for testing.`,
    );
  }
}
