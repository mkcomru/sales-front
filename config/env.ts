// Environment configuration with validation
//
// How Vite Environment Works:
// - Vite uses `import.meta.env.MODE` which is automatically set based on the command:
//   * `npm run dev` → MODE = 'development'
//   * `npm run build` → MODE = 'production'
//   * `vite build --mode staging` → MODE = 'staging'
// - Vite also automatically sets:
//   * `import.meta.env.DEV` → true in dev mode
//   * `import.meta.env.PROD` → true in production mode
// - You can create .env files for each mode:
//   * .env.development (loaded in dev)
//   * .env.production (loaded in build)
//   * .env.local (always loaded, gitignored)

interface EnvConfig {
  VITE_API_BASE_URL?: string;
  VITE_LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  VITE_ENABLE_LOGGING?: string; // 'true' | 'false' as string
  MODE: 'development' | 'production' | 'test' | string;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key];
  if (value !== undefined && value !== '') {
    return value;
  }
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  throw new Error(`Missing required environment variable: ${key}`);
}

function getOptionalEnvVar(key: string): string | undefined {
  const value = import.meta.env[key];
  return value !== undefined && value !== '' ? value : undefined;
}

function validateEnv(): EnvConfig {
  return {
    VITE_API_BASE_URL: getOptionalEnvVar('VITE_API_BASE_URL'),
    VITE_LOG_LEVEL: getOptionalEnvVar('VITE_LOG_LEVEL') as 'debug' | 'info' | 'warn' | 'error' | 'silent' | undefined,
    VITE_ENABLE_LOGGING: getOptionalEnvVar('VITE_ENABLE_LOGGING'),
    MODE: import.meta.env.MODE || 'development',
  };
}

export const env = validateEnv();

// Export individual values for convenience
export const API_BASE_URL = env.VITE_API_BASE_URL || '';
export const MODE = env.MODE;

// Convenience flags (using Vite's built-in flags)
export const IS_DEVELOPMENT = import.meta.env.DEV;
export const IS_PRODUCTION = import.meta.env.PROD;

// Logging configuration
export const LOG_LEVEL = env.VITE_LOG_LEVEL || (IS_DEVELOPMENT ? 'debug' : 'error');
export const ENABLE_LOGGING = env.VITE_ENABLE_LOGGING !== 'false' && (IS_DEVELOPMENT || env.VITE_ENABLE_LOGGING === 'true');

/** Header quick search (clients + nav shortcuts). Off unless `VITE_SHOW_HEADER_QUICK_SEARCH=true`. */
export const SHOW_HEADER_QUICK_SEARCH = getOptionalEnvVar('VITE_SHOW_HEADER_QUICK_SEARCH') === 'true';
