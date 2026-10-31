// Shared constants

export const POLLING_INTERVALS = {
  THREADS: 10000, // 10 seconds
  MESSAGES: 3000, // 3 seconds
} as const;

export const DEFAULT_PAGINATION = {
  LIMIT: 50,
  OFFSET: 0,
} as const;

export const AVATAR_BASE_URL = 'https://ui-avatars.com/api/';
