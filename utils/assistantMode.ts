import type { AssistantMode } from '../types/api';

export type { AssistantMode };

export const DEFAULT_ASSISTANT_MODE: AssistantMode = 'active';

export function isAiManagedFromAssistantMode(mode: AssistantMode): boolean {
  return mode === 'active' || mode === 'shadowing';
}
