import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';

/**
 * Configuration schema with validation and defaults.
 * This is declarative - we define the shape and constraints, not how to load it.
 */
const AppConfigSchema = z.object({
  vaultPath: z
    .string()
    .default('~/Documents/Obsidian/main')
    .transform((val) => {
      // Expand home directory
      if (val.startsWith('~')) {
        // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation
        const home = process.env['HOME'] || process.env['USERPROFILE'] || '';
        return path.join(home, val.slice(1));
      }
      // Make absolute
      if (!path.isAbsolute(val)) {
        return path.resolve(val);
      }
      return val;
    })
    .refine((val) => fs.existsSync(val), { message: 'Vault path does not exist' }),

  ignoredFolders: z.array(z.string()).default(['.obsidian', '.trash', '.git']),

  cacheSize: z.number().min(0).default(1000),

  searchLimit: z.number().min(1).max(100).default(50),

  enablePerformanceMonitoring: z.boolean().default(false),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

/**
 * Load and validate configuration.
 * Priority order (each overrides the previous):
 * 1. Default values from schema
 * 2. config.json file (if exists)
 * 3. Environment variables (OBSIDIAN_RAG_*)
 */
export async function loadConfig(configPath = './config.json'): Promise<AppConfig> {
  let configData: unknown = {};

  // Try to load config file
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      configData = JSON.parse(content);
      console.error(`Loaded config from: ${configPath}`);
    } catch (_error) {
      console.error(`Warning: Failed to parse ${configPath}, using defaults`);
    }
  }

  // Apply environment variable overrides in a declarative way
  const envOverrides: Partial<AppConfig> = {};

  // Map environment variables to config properties
  const envMappings = {
    // biome-ignore lint/style/useNamingConvention: Environment variables use UPPER_SNAKE_CASE
    OBSIDIAN_RAG_VAULT_PATH: 'vaultPath',
    // biome-ignore lint/style/useNamingConvention: Environment variables use UPPER_SNAKE_CASE
    OBSIDIAN_RAG_CACHE_SIZE: 'cacheSize',
    // biome-ignore lint/style/useNamingConvention: Environment variables use UPPER_SNAKE_CASE
    OBSIDIAN_RAG_SEARCH_LIMIT: 'searchLimit',
    // biome-ignore lint/style/useNamingConvention: Environment variables use UPPER_SNAKE_CASE
    OBSIDIAN_RAG_ENABLE_PERFORMANCE_MONITORING: 'enablePerformanceMonitoring',
  } as const;

  for (const [envKey, configKey] of Object.entries(envMappings)) {
    const envValue = process.env[envKey];
    if (envValue !== undefined) {
      // Parse the value based on the config key type
      if (configKey === 'cacheSize' || configKey === 'searchLimit') {
        envOverrides[configKey] = Number.parseInt(envValue, 10);
      } else if (configKey === 'enablePerformanceMonitoring') {
        envOverrides[configKey] = envValue === 'true';
      } else {
        envOverrides[configKey] = envValue;
      }
    }
  }

  // Merge config sources
  const mergedConfig = {
    ...(typeof configData === 'object' && configData !== null ? configData : {}),
    ...envOverrides,
  };

  // Parse and validate with schema
  const result = await AppConfigSchema.parseAsync(mergedConfig);

  return result;
}

/**
 * Create a default config file if it doesn't exist
 */
export function createDefaultConfig(configPath = './config.json'): void {
  if (!fs.existsSync(configPath)) {
    const defaultConfig = {
      vaultPath: '~/Documents/Obsidian/main',
      ignoredFolders: ['.obsidian', '.trash', '.git'],
      cacheSize: 1000,
      searchLimit: 50,
      enablePerformanceMonitoring: false,
    };

    fs.writeFileSync(configPath, `${JSON.stringify(defaultConfig, null, 2)}\n`, 'utf-8');

    console.error(`Created default config at: ${configPath}`);
  }
}
