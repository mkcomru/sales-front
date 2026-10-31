import type { AssistantMode } from '../types/api';

export type AiStatusVariant = 'active' | 'shadowing' | 'inactive';

export interface AiStatusBadge {
  label: string;
  variant: AiStatusVariant;
}

export function resolveAiStatusBadge(mode: AssistantMode): AiStatusBadge {
  switch (mode) {
    case 'active':
      return { label: 'AI', variant: 'active' };
    case 'shadowing':
      return { label: 'AI в фоне', variant: 'shadowing' };
    case 'inactive':
      return { label: 'Оператор', variant: 'inactive' };
  }
}

export const AI_STATUS_STYLES: Record<AiStatusVariant, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  shadowing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  inactive: 'bg-gray-100 text-gray-500 border-gray-200',
};

export const AI_STATUS_ICON_COLOR: Record<AiStatusVariant, string> = {
  active: 'text-emerald-600',
  shadowing: 'text-indigo-600',
  inactive: 'text-gray-400',
};
