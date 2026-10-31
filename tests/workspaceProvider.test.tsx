import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { WorkspaceProvider, useWorkspace } from '../contexts/WorkspaceContext';
import type { ReactNode } from 'react';

vi.mock('../utils/formatThreadTime', () => ({
  formatThreadTime: (input: string) => `formatted:${input}`,
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <WorkspaceProvider>{children}</WorkspaceProvider>
);

describe('WorkspaceProvider + useWorkspace', () => {
  it('provides initial state', () => {
    const { result } = renderHook(() => useWorkspace(), { wrapper });
    expect(result.current.state.currentView).toBe('inbox');
    expect(result.current.state.selectedChatId).toBe('');
    expect(result.current.state.threads).toEqual([]);
    expect(result.current.state.balance).toBeNull();
  });

  it('throws when used outside provider', () => {
    expect(() => {
      renderHook(() => useWorkspace());
    }).toThrow('must be used within');
  });

  it('setCurrentView updates state', () => {
    const { result } = renderHook(() => useWorkspace(), { wrapper });
    act(() => result.current.setCurrentView('settings'));
    expect(result.current.state.currentView).toBe('settings');
  });

  it('setSelectedChatId updates state', () => {
    const { result } = renderHook(() => useWorkspace(), { wrapper });
    act(() => result.current.setSelectedChatId('chat-1'));
    expect(result.current.state.selectedChatId).toBe('chat-1');
  });

  it('toggleProfile flips isProfileOpen', () => {
    const { result } = renderHook(() => useWorkspace(), { wrapper });
    const before = result.current.state.isProfileOpen;
    act(() => result.current.toggleProfile());
    expect(result.current.state.isProfileOpen).toBe(!before);
  });

  it('toggleUserModal flips isUserModalOpen', () => {
    const { result } = renderHook(() => useWorkspace(), { wrapper });
    act(() => result.current.toggleUserModal());
    expect(result.current.state.isUserModalOpen).toBe(true);
  });

  it('addMessage and clearMessages manage activeMessages', () => {
    const { result } = renderHook(() => useWorkspace(), { wrapper });
    const msg = { id: 'm1', type: 'CLIENT' as any, content: 'hi', timestamp: '', read: false };
    act(() => result.current.addMessage(msg));
    expect(result.current.state.activeMessages).toHaveLength(1);
    act(() => result.current.clearMessages());
    expect(result.current.state.activeMessages).toEqual([]);
  });

  it('updateThread merges partial update into matching thread', () => {
    const { result } = renderHook(() => useWorkspace(), { wrapper });
    const thread = {
      id: 't1', customerName: 'Alice', avatarUrl: '', status: 'online' as const,
      lastMessage: 'hi', lastMessageTime: '', unreadCount: 0, isAiManaged: true,
      intentLevel: '', dealStage: '', messages: [],
      details: { email: '', phone: '', location: '', customer_fields: {} },
    };
    act(() => result.current.dispatch({ type: 'SET_THREADS', payload: [thread] }));
    act(() => result.current.updateThread('t1', { lastMessage: 'updated' }));
    expect(result.current.state.threads[0].lastMessage).toBe('updated');
  });

  it('setCurrentUser and setCurrentCompanyMemberId update identity', () => {
    const { result } = renderHook(() => useWorkspace(), { wrapper });
    const user = { id: 1, email: 'a@b.com', first_name: 'A', last_name: 'B' } as any;
    act(() => {
      result.current.setCurrentUser(user);
      result.current.setCurrentCompanyMemberId('member-1');
    });
    expect(result.current.state.currentUser).toEqual(user);
    expect(result.current.state.currentCompanyMemberId).toBe('member-1');
  });

  it('setThreadsFilter updates filter', () => {
    const { result } = renderHook(() => useWorkspace(), { wrapper });
    act(() => result.current.setThreadsFilter('mine'));
    expect(result.current.state.threadsFilter).toBe('mine');
  });

  it('resetState returns to initial values', () => {
    const { result } = renderHook(() => useWorkspace(), { wrapper });
    act(() => {
      result.current.setCurrentView('settings');
      result.current.setSelectedChatId('chat-1');
      result.current.dispatch({ type: 'SET_BALANCE', payload: 100 });
    });
    expect(result.current.state.currentView).toBe('settings');
    act(() => result.current.resetState());
    expect(result.current.state.currentView).toBe('inbox');
    expect(result.current.state.selectedChatId).toBe('');
    expect(result.current.state.balance).toBeNull();
  });

  it('dispatch works for raw actions (SET_BALANCE)', () => {
    const { result } = renderHook(() => useWorkspace(), { wrapper });
    act(() => result.current.dispatch({ type: 'SET_BALANCE', payload: 42 }));
    expect(result.current.state.balance).toBe(42);
  });
});
