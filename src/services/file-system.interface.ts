export interface FileStats {
  isFile(): boolean;
  isDirectory(): boolean;
  mtime: Date;
  birthtime: Date;
}

export interface FileSystemAdapter {
  readFile(path: string): Promise<string>;
  readdir(path: string): Promise<string[]>;
  stat(path: string): Promise<FileStats>;
  exists(path: string): Promise<boolean>;
  watch?(path: string, callback: (event: string, filename: string) => void): void;
  unwatch?(): void;
}