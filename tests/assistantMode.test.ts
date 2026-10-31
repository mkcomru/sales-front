import { describe, it, expect } from 'vitest';
import { isAiManagedFromAssistantMode, DEFAULT_ASSISTANT_MODE } from '../utils/assistantMode';
import { resolveAiStatusBadge } from '../utils/aiStatus';
import { showAiInterceptBar, showAiAssistHint, orderAssigneeDisplayLabel } from '../utils/orderAssigneeUi';
import type { AssistantMode } from '../types/api';

describe('isAiManagedFromAssistantMode', () => {
  it('active and shadowing are AI-managed', () => {
    expect(isAiManagedFromAssistantMode('active')).toBe(true);
    expect(isAiManagedFromAssistantMode('shadowing')).toBe(true);
  });

  it('inactive is not AI-managed', () => {
    expect(isAiManagedFromAssistantMode('inactive')).toBe(false);
  });
});

describe('DEFAULT_ASSISTANT_MODE', () => {
  it('defaults to active (matches backend default)', () => {
    expect(DEFAULT_ASSISTANT_MODE).toBe('active');
  });
});

describe('resolveAiStatusBadge', () => {
  it('active → green "AI" badge', () => {
    const b = resolveAiStatusBadge('active');
    expect(b).toEqual({ label: 'AI', variant: 'active' });
  });

  it('shadowing → indigo "AI в фоне" badge', () => {
    const b = resolveAiStatusBadge('shadowing');
    expect(b).toEqual({ label: 'AI в фоне', variant: 'shadowing' });
  });

  it('inactive → gray "Оператор" badge', () => {
    const b = resolveAiStatusBadge('inactive');
    expect(b).toEqual({ label: 'Оператор', variant: 'inactive' });
  });
});

describe('showAiInterceptBar', () => {
  const viewerId = '10';
  const otherAssignee = { id: '20', name: 'Other' };
  const myAssignee = { id: '10', name: 'Me' };

  it('shows when active and not assignee', () => {
    expect(showAiInterceptBar({ assistantMode: 'active', assignee: otherAssignee }, viewerId)).toBe(true);
    expect(showAiInterceptBar({ assistantMode: 'active', assignee: null }, viewerId)).toBe(true);
  });

  it('hides when active but viewer is assignee', () => {
    expect(showAiInterceptBar({ assistantMode: 'active', assignee: myAssignee }, viewerId)).toBe(false);
  });

  it('hides when shadowing (regardless of assignee)', () => {
    expect(showAiInterceptBar({ assistantMode: 'shadowing', assignee: otherAssignee }, viewerId)).toBe(false);
  });

  it('hides when inactive', () => {
    expect(showAiInterceptBar({ assistantMode: 'inactive', assignee: null }, viewerId)).toBe(false);
  });
});

describe('showAiAssistHint', () => {
  it('shows only for shadowing', () => {
    expect(showAiAssistHint({ assistantMode: 'shadowing' })).toBe(true);
    expect(showAiAssistHint({ assistantMode: 'active' })).toBe(false);
    expect(showAiAssistHint({ assistantMode: 'inactive' })).toBe(false);
  });
});

describe('orderAssigneeDisplayLabel', () => {
  it('active without assignee → "AI Agent"', () => {
    expect(orderAssigneeDisplayLabel({ assignee: null, assistant_mode: 'active' })).toBe('AI Agent');
  });

  it('shadowing without assignee → "AI в фоне"', () => {
    expect(orderAssigneeDisplayLabel({ assignee: null, assistant_mode: 'shadowing' })).toBe('AI в фоне');
  });

  it('inactive without assignee → "Не назначен"', () => {
    expect(orderAssigneeDisplayLabel({ assignee: null, assistant_mode: 'inactive' })).toBe('Не назначен');
  });

  it('shadowing with assignee → "Name · AI в фоне"', () => {
    const assignee = { id: 1, user_id: 1, first_name: 'John', last_name: 'Doe', role: 'manager' };
    expect(orderAssigneeDisplayLabel({ assignee, assistant_mode: 'shadowing' })).toBe('John Doe · AI в фоне');
  });

  it('active with assignee → just name', () => {
    const assignee = { id: 1, user_id: 1, first_name: 'John', last_name: 'Doe', role: 'manager' };
    expect(orderAssigneeDisplayLabel({ assignee, assistant_mode: 'active' })).toBe('John Doe');
  });

  it('no assistant_mode → "Не назначен" when no assignee', () => {
    expect(orderAssigneeDisplayLabel({ assignee: null, assistant_mode: undefined })).toBe('Не назначен');
  });
});
