# Environment Variables Setup

This document describes all environment variables used in the sales-front application.

## Required Variables

**None** - All variables have defaults, but some are recommended for production.

## Optional Variables (with defaults)

### `VITE_SERVICE_API_KEY`
- **Type:** `string`
- **Default:** `1251431351` (development only)
- **Description:** Service API key for backend authentication. This key is sent in the `X-Service-Key` header with all API requests.
- **Required for:** Production environments
- **Example:** `VITE_SERVICE_API_KEY=your-production-api-key-here`

### `VITE_API_BASE_URL`
- **Type:** `string`
- **Default:** `` (empty string - uses Vite proxy)
- **Description:** Base URL for the backend API. If left empty, the app uses Vite's proxy configuration (see `vite.config.ts`).
- **Required for:** Production environments (when not using Vite dev server)
- **Example:** `VITE_API_BASE_URL=https://sales-back.ai-gency.ru`

### `VITE_LOG_LEVEL`
- **Type:** `'debug' | 'info' | 'warn' | 'error' | 'silent'`
- **Default:** `'debug'` in development, `'error'` in production
- **Description:** Minimum log level to display. Logs at or above this level will be shown.
- **Required for:** Optional - defaults are sensible
- **Example:** `VITE_LOG_LEVEL=warn` (shows warnings and errors only)

### `VITE_ENABLE_LOGGING`
- **Type:** `'true' | 'false'` (as string)
- **Default:** `'true'` in development, `'false'` in production
- **Description:** Enable or disable logging entirely. When `'false'`, no logs are shown regardless of log level.
- **Required for:** Optional - defaults are sensible
- **Example:** `VITE_ENABLE_LOGGING=false` (disable all logging)

### `MODE` (Automatic - Do Not Set)
- **Type:** `string`
- **Default:** Automatically set by Vite based on command
- **Description:** Environment mode. Automatically determined by Vite:
  - `npm run dev` → `'development'`
  - `npm run build` → `'production'`
  - `vite build --mode staging` → `'staging'`
- **Note:** Do not set manually - Vite handles this automatically
- **Access:** Use `import.meta.env.MODE` or `import.meta.env.DEV` / `import.meta.env.PROD` for boolean checks

## Setup Instructions

### Development
1. Create a `.env.local` file in the project root (this file is gitignored)
2. Optionally set `VITE_SERVICE_API_KEY` if you need a different key than the default
3. Leave `VITE_API_BASE_URL` empty to use Vite proxy

**Example `.env.local` for development:**
```env
# Optional: Override default service key
VITE_SERVICE_API_KEY=your-dev-key-here

# Leave empty to use Vite proxy (configured in vite.config.ts)
VITE_API_BASE_URL=

# Optional: Control logging (defaults: debug level, enabled)
VITE_LOG_LEVEL=debug
VITE_ENABLE_LOGGING=true
```

### Production
1. Set `VITE_SERVICE_API_KEY` to your production API key
2. Set `VITE_API_BASE_URL` to your production backend URL
3. Build the app: `npm run build`

**Example `.env.production`:**
```env
VITE_SERVICE_API_KEY=your-production-api-key
VITE_API_BASE_URL=https://sales-back.ai-gency.ru

# Optional: Control logging (defaults: error level, disabled)
# VITE_LOG_LEVEL=error
# VITE_ENABLE_LOGGING=false
```

## Current Configuration

The app uses Vite's proxy in development (see `vite.config.ts`):
- All `/api/*` requests are proxied to `https://sales-back.ai-gency.ru`
- This allows CORS-free development without setting `VITE_API_BASE_URL`

## Security Notes

⚠️ **Important:**
- Never commit `.env.local` or `.env.production` files to git
- The default `VITE_SERVICE_API_KEY` value (`1251431351`) is for development only
- Always use a secure, unique API key in production
- Environment variables prefixed with `VITE_` are exposed to the client bundle - do not put secrets here

## File Locations

- Configuration: `config/env.ts`
- Example file: `.env.example` (if created)
- Your local config: `.env.local` (create this file, gitignored)
