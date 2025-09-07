export interface Note {
  path: string;
  title: string;
  content: string;
  frontmatter: Record<string, any>;
  tags: string[];
  links: string[];
  modified: Date;
  created: Date;
}

export interface SearchResult {
  note: Note;
  score: number;
  snippet: string;
}

export interface VaultConfig {
  vaultPath: string;
  ignoredFolders: string[];
  cacheSize: number;
  searchLimit: number;
}