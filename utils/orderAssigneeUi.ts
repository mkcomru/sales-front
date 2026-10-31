import type { Manager } from '../types';
import type { AssistantMode, OrderResponse } from '../types/api';
import { isAiManagedFromAssistantMode } from './assistantMode';

type OrderAssigneeFields = Pick<OrderResponse, 'assignee' | 'assistant_mode'>;

export function viewerIsThreadAssignee(
  assignee: Manager | null | undefined,
  viewerCompanyMemberId: string | null | undefined,
  viewerUserId?: number | null,
): boolean {
  const aid = assignee?.id;
  if (
    viewerCompanyMemberId != null &&
    viewerCompanyMemberId !== '' &&
    aid != null &&
    String(aid).length > 0 &&
    String(aid) === String(viewerCompanyMemberId)
  ) {
    return true;
  }
  const assigneeUserId = assignee?.user_id;
  if (
    viewerUserId != null &&
    assigneeUserId != null &&
    String(assigneeUserId) === String(viewerUserId)
  ) {
    return true;
  }
  return false;
}

export function showAiInterceptBar(
  chat: { assistantMode: AssistantMode; assignee?: Manager | null },
  viewerCompanyMemberId: string | null | undefined,
  viewerUserId?: number | null,
): boolean {
  return (
    chat.assistantMode === 'active' &&
    !viewerIsThreadAssignee(chat.assignee, viewerCompanyMemberId, viewerUserId)
  );
}

export function showAiAssistHint(
  chat: { assistantMode: AssistantMode },
): boolean {
  return chat.assistantMode === 'shadowing';
}

export function threadQualificationAssigneeId(input: {
  assignee?: Manager | null;
  isAiManaged: boolean;
}): string {
  const rawId = input.assignee?.id;
  if (rawId != null && String(rawId).length > 0) {
    return String(rawId);
  }
  if (input.isAiManaged) {
    return 'ai-agent';
  }
  return '';
}

export function orderQualificationAssigneeId(order: OrderAssigneeFields): string {
  if (order.assignee) {
    return String(order.assignee.id);
  }
  if (order.assistant_mode && isAiManagedFromAssistantMode(order.assistant_mode)) {
    return 'ai-agent';
  }
  return '';
}

export function orderAssigneeDisplayLabel(order: OrderAssigneeFields): string {
  if (order.assignee) {
    const n =
      `${order.assignee.first_name ?? ''} ${order.assignee.last_name ?? ''}`.trim();
    if (order.assistant_mode === 'shadowing') {
      return `${n || '—'} · AI в фоне`;
    }
    return n || '—';
  }
  if (order.assistant_mode === 'active') {
    return 'AI Agent';
  }
  if (order.assistant_mode === 'shadowing') {
    return 'AI в фоне';
  }
  return 'Не назначен';
}
