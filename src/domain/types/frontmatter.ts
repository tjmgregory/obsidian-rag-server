/**
 * Frontmatter types based on real Obsidian vault patterns.
 *
 * Obsidian standard fields:
 * - tags: Always present, can be string[], string, or missing
 * - created: Date when note was created (YYYY-MM-DD format)
 * - updated: Date when note was last modified (YYYY-MM-DD format)
 *
 * Everything else is user-defined and varies widely.
 */

export interface ObsidianFrontmatter {
  // Standard Obsidian fields
  tags?: string | string[];
  created?: string | Date;
  updated?: string | Date;

  // Common optional fields seen in vaults
  aliases?: string | string[];
  cssclass?: string | string[];

  // Plugin-specific fields
  // biome-ignore lint/style/useNamingConvention: Obsidian plugin fields use underscores
  excalidraw_plugin?: string;
  // biome-ignore lint/style/useNamingConvention: Obsidian plugin fields use underscores
  kanban_plugin?: Record<string, unknown>;

  // User-defined fields (can be anything)
  // Using index signature to allow any additional properties
  [key: string]: unknown;
}

/**
 * Normalized frontmatter after processing.
 * This is what we work with internally.
 */
export interface NormalizedFrontmatter {
  // Always arrays for consistency
  tags: string[];
  aliases: string[];

  // Dates as Date objects
  created?: Date;
  updated?: Date;

  // Preserve all other fields as-is
  raw: ObsidianFrontmatter;
}

/**
 * Parse and normalize frontmatter from gray-matter.
 */
export function normalizeFrontmatter(raw: Record<string, unknown>): NormalizedFrontmatter {
  const frontmatter = raw as ObsidianFrontmatter;

  // Normalize tags to array
  const tags = normalizeToArray(frontmatter.tags);

  // Normalize aliases to array
  const aliases = normalizeToArray(frontmatter.aliases);

  // Parse dates if present
  const created = parseDate(frontmatter.created);
  const updated = parseDate(frontmatter.updated);

  return {
    tags,
    aliases,
    ...(created && { created }),
    ...(updated && { updated }),
    raw: frontmatter,
  };
}

/**
 * Helper to normalize string or array to array.
 */
function normalizeToArray(value: unknown): string[] {
  if (!value) {
    return [];
  }
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

/**
 * Helper to parse date from various formats.
 */
function parseDate(value: unknown): Date | undefined {
  if (!value) {
    return undefined;
  }

  // Already a Date object
  if (value instanceof Date) {
    return value;
  }

  // String date (YYYY-MM-DD or ISO format)
  if (typeof value === 'string') {
    const date = new Date(value);
    // Check if valid date
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return undefined;
}
