import type { Manager } from '../types';

function parseAssigneeValue(raw: unknown): Manager | null | undefined {
  if (raw === null) {
    return null;
  }
  if (typeof raw !== 'object') {
    return undefined;
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'number' || typeof o.user_id !== 'number') {
    return undefined;
  }
  if (typeof o.first_name !== 'string' || typeof o.last_name !== 'string' || typeof o.role !== 'string') {
    return undefined;
  }
  const name = `${o.first_name} ${o.last_name}`.trim();
  return {
    id: String(o.id),
    user_id: o.user_id,
    name: name || '—',
    role: o.role,
  };
}

export function patchAssigneeFromThreadListPayload(payload: Record<string, unknown>): {
  assignee?: Manager | null;
} {
  if (!Object.prototype.hasOwnProperty.call(payload, 'assignee')) {
    return {};
  }
  const parsed = parseAssigneeValue(payload.assignee);
  if (parsed === undefined) {
    return {};
  }
  return { assignee: parsed };
}
