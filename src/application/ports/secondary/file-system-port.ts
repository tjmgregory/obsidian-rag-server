export interface FileStats {
  isDirectory(): boolean;
  isFile(): boolean;
  modifiedAt: Date;
  createdAt: Date;
}

export interface FileSystemPort {
  readFile(path: string): Promise<string>;
  readdir(path: string): Promise<string[]>;
  stat(path: string): Promise<FileStats>;
  exists(path: string): Promise<boolean>;
  watch?(path: string, callback: (event: string, filename: string) => void): void;
}
