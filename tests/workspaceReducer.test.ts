import { describe, it, expect, vi } from 'vitest';
import { chatReducer, chatInitialState, type ChatState } from '../contexts/ChatContext';
import { identityReducer, identityInitialState, type IdentityState } from '../contexts/IdentityContext';
import { uiReducer, uiInitialState, type UIState } from '../contexts/UIContext';
import type { ChatSession, Message } from '../types';

vi.mock('../utils/formatThreadTime', () => ({
  formatThreadTime: (input: string) => `formatted:${input}`,
}));

const makeThread = (overrides: Partial<ChatSession> = {}): ChatSession => ({
  id: 'thread-1',
  customerName: 'Alice',
  avatarUrl: '',
  status: 'online',
  lastMessage: 'hello',
  lastMessageTime: '12:00',
  unreadCount: 0,
  assistantMode: 'active',
  isAiManaged: true,
  intentLevel: 'high',
  dealStage: 'new',
  messages: [],
  details: {
    email: '',
    phone: '',
    location: '',
    customer_fields: {},
  },
  connector_transport_type: 'telegram',
  ...overrides,
});

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-1',
  type: 'CLIENT' as any,
  content: 'hello',
  timestamp: '2024-01-01T00:00:00Z',
  read: false,
  ...overrides,
});

// --- UI Reducer ---

describe('uiReducer', () => {
  it('SET_CURRENT_VIEW', () => {
    const result = uiReducer(uiInitialState, { type: 'SET_CURRENT_VIEW', payload: 'settings' });
    expect(result.currentView).toBe('settings');
  });

  it('SET_PROFILE_OPEN', () => {
    const result = uiReducer(uiInitialState, { type: 'SET_PROFILE_OPEN', payload: false });
    expect(result.isProfileOpen).toBe(false);
  });

  it('TOGGLE_PROFILE_OPEN', () => {
    expect(uiInitialState.isProfileOpen).toBe(true);
    const result = uiReducer(uiInitialState, { type: 'TOGGLE_PROFILE_OPEN' });
    expect(result.isProfileOpen).toBe(false);
    const result2 = uiReducer(result, { type: 'TOGGLE_PROFILE_OPEN' });
    expect(result2.isProfileOpen).toBe(true);
  });

  it('SET_USER_MODAL_OPEN', () => {
    const result = uiReducer(uiInitialState, { type: 'SET_USER_MODAL_OPEN', payload: true });
    expect(result.isUserModalOpen).toBe(true);
  });

  it('TOGGLE_USER_MODAL_OPEN', () => {
    const result = uiReducer(uiInitialState, { type: 'TOGGLE_USER_MODAL_OPEN' });
    expect(result.isUserModalOpen).toBe(true);
  });

  it('SET_SEARCH_QUERY', () => {
    const result = uiReducer(uiInitialState, { type: 'SET_SEARCH_QUERY', payload: 'alice' });
    expect(result.searchQuery).toBe('alice');
  });

  it('SET_SEARCH_OPEN', () => {
    const result = uiReducer(uiInitialState, { type: 'SET_SEARCH_OPEN', payload: true });
    expect(result.isSearchOpen).toBe(true);
  });

  it('RESET_UI returns initial state', () => {
    const dirty: UIState = {
      ...uiInitialState,
      currentView: 'settings',
      searchQuery: 'x',
      isSearchOpen: true,
    };
    expect(uiReducer(dirty, { type: 'RESET_UI' })).toEqual(uiInitialState);
  });

  it('unknown action returns state unchanged', () => {
    const result = uiReducer(uiInitialState, { type: 'NONEXISTENT' } as any);
    expect(result).toBe(uiInitialState);
  });
});

// --- Chat Reducer ---

describe('chatReducer', () => {
  it('SET_SELECTED_CHAT_ID', () => {
    const result = chatReducer(chatInitialState, { type: 'SET_SELECTED_CHAT_ID', payload: 'chat-42' });
    expect(result.selectedChatId).toBe('chat-42');
  });

  it('SET_SELECTED_CHAT_ID clears unreadCount for the selected thread', () => {
    const state: ChatState = {
      ...chatInitialState,
      threads: [
        makeThread({ id: 't-open', unreadCount: 4 }),
        makeThread({ id: 't-other', unreadCount: 2 }),
      ],
    };
    const result = chatReducer(state, { type: 'SET_SELECTED_CHAT_ID', payload: 't-open' });
    expect(result.selectedChatId).toBe('t-open');
    expect(result.threads.find((t) => t.id === 't-open')?.unreadCount).toBe(0);
    expect(result.threads.find((t) => t.id === 't-other')?.unreadCount).toBe(2);
  });

  it('SET_SELECTED_CHAT_ID with empty id does not mutate thread unread counts', () => {
    const state: ChatState = {
      ...chatInitialState,
      selectedChatId: 't1',
      threads: [makeThread({ id: 't1', unreadCount: 3 })],
    };
    const result = chatReducer(state, { type: 'SET_SELECTED_CHAT_ID', payload: '' });
    expect(result.selectedChatId).toBe('');
    expect(result.threads[0].unreadCount).toBe(3);
  });

  it('SET_THREADS', () => {
    const threads = [makeThread(), makeThread({ id: 'thread-2' })];
    const result = chatReducer(chatInitialState, { type: 'SET_THREADS', payload: threads });
    expect(result.threads).toHaveLength(2);
  });

  it('APPEND_THREADS skips duplicate ids', () => {
    const state: ChatState = { ...chatInitialState, threads: [makeThread({ id: 'a' })] };
    const result = chatReducer(state, { type: 'APPEND_THREADS', payload: [makeThread({ id: 'a' }), makeThread({ id: 'b' })] });
    expect(result.threads.map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('PREPEND_ACTIVE_MESSAGES merges chronological order', () => {
    const mOld = makeMessage({ id: 'm1', createdAt: '2024-01-01T10:00:00Z' });
    const mNew = makeMessage({ id: 'm2', createdAt: '2024-01-01T11:00:00Z' });
    const state: ChatState = { ...chatInitialState, selectedChatId: 'thread-1', activeMessages: [mNew] };
    const result = chatReducer(state, { type: 'PREPEND_ACTIVE_MESSAGES', payload: [mOld] });
    expect(result.activeMessages.map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  it('UPDATE_THREAD updates matching thread only', () => {
    const state: ChatState = {
      ...chatInitialState,
      threads: [makeThread({ id: 't1' }), makeThread({ id: 't2' })],
    };
    const result = chatReducer(state, {
      type: 'UPDATE_THREAD',
      payload: { id: 't1', updates: { lastMessage: 'updated' } },
    });
    expect(result.threads[0].lastMessage).toBe('updated');
    expect(result.threads[1].lastMessage).toBe('hello');
  });

  it('UPDATE_THREAD leaves state unchanged for unknown id', () => {
    const state: ChatState = { ...chatInitialState, threads: [makeThread()] };
    const result = chatReducer(state, {
      type: 'UPDATE_THREAD',
      payload: { id: 'nonexistent', updates: { lastMessage: 'nope' } },
    });
    expect(result.threads[0].lastMessage).toBe('hello');
  });

  describe('APPLY_THREAD_LIST_UPDATE', () => {
    const stateWithThread: ChatState = {
      ...chatInitialState,
      threads: [makeThread({ id: 't1', unreadCount: 3, isAiManaged: true })],
    };

    it('updates lastMessage', () => {
      const result = chatReducer(stateWithThread, {
        type: 'APPLY_THREAD_LIST_UPDATE',
        payload: { id: 't1', last_message_preview: 'new preview' },
      });
      expect(result.threads[0].lastMessage).toBe('new preview');
    });

    it('formats and updates lastMessageTime', () => {
      const result = chatReducer(stateWithThread, {
        type: 'APPLY_THREAD_LIST_UPDATE',
        payload: { id: 't1', last_message_at: '2024-06-01T10:00:00Z' },
      });
      expect(result.threads[0].lastMessageTime).toBe('formatted:2024-06-01T10:00:00Z');
    });

    it('updates assistant_mode → assistantMode + isAiManaged', () => {
      const result = chatReducer(stateWithThread, {
        type: 'APPLY_THREAD_LIST_UPDATE',
        payload: { id: 't1', assistant_mode: 'inactive' },
      });
      expect(result.threads[0].assistantMode).toBe('inactive');
      expect(result.threads[0].isAiManaged).toBe(false);
    });

    it('maps assistant_mode "shadowing" to assistantMode + isAiManaged true', () => {
      const state: ChatState = {
        ...chatInitialState,
        threads: [makeThread({ id: 't1', assistantMode: 'inactive', isAiManaged: false })],
      };
      const result = chatReducer(state, {
        type: 'APPLY_THREAD_LIST_UPDATE',
        payload: { id: 't1', assistant_mode: 'shadowing' },
      });
      expect(result.threads[0].assistantMode).toBe('shadowing');
      expect(result.threads[0].isAiManaged).toBe(true);
    });

    it('increments unreadCount by delta', () => {
      const result = chatReducer(stateWithThread, {
        type: 'APPLY_THREAD_LIST_UPDATE',
        payload: { id: 't1', unread_count_delta: 2 },
      });
      expect(result.threads[0].unreadCount).toBe(5);
    });

    it('ignores unknown thread id', () => {
      const result = chatReducer(stateWithThread, {
        type: 'APPLY_THREAD_LIST_UPDATE',
        payload: { id: 'unknown', last_message_preview: 'x' },
      });
      expect(result.threads[0].lastMessage).toBe('hello');
    });

    it('clears assignee when payload assignee is null', () => {
      const state: ChatState = {
        ...chatInitialState,
        threads: [
          makeThread({
            id: 't1',
            assignee: { id: '1', user_id: 1, name: 'A B', role: 'manager' },
          }),
        ],
      };
      const result = chatReducer(state, {
        type: 'APPLY_THREAD_LIST_UPDATE',
        payload: { id: 't1', assignee: null },
      });
      expect(result.threads[0].assignee).toBeNull();
    });

    it('sets assignee from payload', () => {
      const mgr = { id: '5', user_id: 9, name: 'Jane Doe', role: 'manager' };
      const result = chatReducer(stateWithThread, {
        type: 'APPLY_THREAD_LIST_UPDATE',
        payload: { id: 't1', assignee: mgr },
      });
      expect(result.threads[0].assignee).toEqual(mgr);
    });
  });

  it('SET_ACTIVE_MESSAGES', () => {
    const msgs = [makeMessage(), makeMessage({ id: 'msg-2' })];
    const result = chatReducer(chatInitialState, { type: 'SET_ACTIVE_MESSAGES', payload: msgs });
    expect(result.activeMessages).toHaveLength(2);
  });

  it('ADD_MESSAGE appends to list', () => {
    const state: ChatState = {
      ...chatInitialState,
      activeMessages: [makeMessage({ id: 'existing' })],
    };
    const result = chatReducer(state, { type: 'ADD_MESSAGE', payload: makeMessage({ id: 'new' }) });
    expect(result.activeMessages).toHaveLength(2);
    expect(result.activeMessages[1].id).toBe('new');
  });

  it('ADD_MESSAGE_IF_NEW appends only when id is absent', () => {
    const state: ChatState = {
      ...chatInitialState,
      activeMessages: [makeMessage({ id: 'existing' })],
    };
    const unchanged = chatReducer(state, {
      type: 'ADD_MESSAGE_IF_NEW',
      payload: makeMessage({ id: 'existing' }),
    });
    expect(unchanged.activeMessages).toHaveLength(1);
    expect(unchanged).toBe(state);

    const added = chatReducer(state, {
      type: 'ADD_MESSAGE_IF_NEW',
      payload: makeMessage({ id: 'brand-new' }),
    });
    expect(added.activeMessages).toHaveLength(2);
  });

  it('REPLACE_OPTIMISTIC_MESSAGE deduplicates and replaces', () => {
    const state: ChatState = {
      ...chatInitialState,
      activeMessages: [
        makeMessage({ id: 'temp-1', content: 'optimistic' }),
        makeMessage({ id: 'real-1', content: 'ws-duplicate' }),
      ],
    };
    const realMsg = makeMessage({ id: 'real-1', content: 'from server' });
    const result = chatReducer(state, {
      type: 'REPLACE_OPTIMISTIC_MESSAGE',
      payload: { tempId: 'temp-1', message: realMsg },
    });
    expect(result.activeMessages).toHaveLength(1);
    expect(result.activeMessages[0].id).toBe('real-1');
    expect(result.activeMessages[0].content).toBe('from server');
  });

  it('REPLACE_OPTIMISTIC_MESSAGE keeps remote echo when websocket won the race', () => {
    const state: ChatState = {
      ...chatInitialState,
      activeMessages: [
        makeMessage({ id: 'real-1', clientId: 'temp-1', content: 'from ws' }),
      ],
    };
    const result = chatReducer(state, {
      type: 'REPLACE_OPTIMISTIC_MESSAGE',
      payload: {
        tempId: 'temp-1',
        message: makeMessage({ id: 'real-1', clientId: 'temp-1', content: 'from post' }),
      },
    });
    expect(result.activeMessages).toHaveLength(1);
    expect(result.activeMessages[0].id).toBe('real-1');
    expect(result.activeMessages[0].content).toBe('from post');
  });

  it('UPDATE_MESSAGE updates matching message', () => {
    const state: ChatState = {
      ...chatInitialState,
      activeMessages: [makeMessage({ id: 'm1', content: 'old' })],
    };
    const result = chatReducer(state, {
      type: 'UPDATE_MESSAGE',
      payload: { id: 'm1', updates: { content: 'new' } },
    });
    expect(result.activeMessages[0].content).toBe('new');
  });

  it('CLEAR_MESSAGES empties the array', () => {
    const state: ChatState = { ...chatInitialState, activeMessages: [makeMessage()] };
    const result = chatReducer(state, { type: 'CLEAR_MESSAGES' });
    expect(result.activeMessages).toEqual([]);
  });

  it('SET_STAGES_CONFIG', () => {
    const stages = [{ id: '1', name: 'New' }];
    const result = chatReducer(chatInitialState, { type: 'SET_STAGES_CONFIG', payload: stages });
    expect(result.stagesConfig).toEqual(stages);
  });

  it('SET_THREADS_LOADING', () => {
    expect(chatReducer(chatInitialState, { type: 'SET_THREADS_LOADING', payload: true }).isThreadsLoading).toBe(true);
    expect(
      chatReducer(chatInitialState, { type: 'SET_THREADS_LOADING_MORE', payload: true }).isThreadsLoadingMore,
    ).toBe(true);
  });

  it('SET_MESSAGES_LOADING', () => {
    expect(chatReducer(chatInitialState, { type: 'SET_MESSAGES_LOADING', payload: true }).isMessagesLoading).toBe(true);
    expect(
      chatReducer(chatInitialState, { type: 'SET_LOADING_OLDER_MESSAGES', payload: true }).isLoadingOlderMessages,
    ).toBe(true);
  });

  it('SET_THREADS_FILTER', () => {
    expect(chatReducer(chatInitialState, { type: 'SET_THREADS_FILTER', payload: 'mine' }).threadsFilter).toBe('mine');
  });

  describe('APPLY_FIELDS_UPDATE', () => {
    const stateWithThread: ChatState = {
      ...chatInitialState,
      threads: [makeThread({ id: 't1' })],
    };

    it('merges customer_fields into matching thread', () => {
      const result = chatReducer(stateWithThread, {
        type: 'APPLY_FIELDS_UPDATE',
        payload: { threadId: 't1', customer_fields: { budget: 5000 } },
      });
      expect(result.threads[0].details.customer_fields).toEqual({ budget: 5000 });
    });

    it('sets orderUpdateSignal when order_id is present', () => {
      const result = chatReducer(stateWithThread, {
        type: 'APPLY_FIELDS_UPDATE',
        payload: { threadId: 't1', order_id: 123 },
      });
      expect(result.orderUpdateSignal).toBe(123);
    });

    it('handles both customer_fields and order_id together', () => {
      const result = chatReducer(stateWithThread, {
        type: 'APPLY_FIELDS_UPDATE',
        payload: { threadId: 't1', customer_fields: { name: 'Bob' }, order_id: 77 },
      });
      expect(result.threads[0].details.customer_fields).toEqual({ name: 'Bob' });
      expect(result.orderUpdateSignal).toBe(77);
    });
  });

  it('SET_ORDER_UPDATE_SIGNAL', () => {
    expect(chatReducer(chatInitialState, { type: 'SET_ORDER_UPDATE_SIGNAL', payload: 42 }).orderUpdateSignal).toBe(42);
  });

  it('CONSUME_ORDER_UPDATE clears signal when matching', () => {
    const state: ChatState = { ...chatInitialState, orderUpdateSignal: 42 };
    expect(chatReducer(state, { type: 'CONSUME_ORDER_UPDATE', payload: 42 }).orderUpdateSignal).toBeNull();
  });

  it('CONSUME_ORDER_UPDATE ignores non-matching signal', () => {
    const state: ChatState = { ...chatInitialState, orderUpdateSignal: 42 };
    expect(chatReducer(state, { type: 'CONSUME_ORDER_UPDATE', payload: 99 }).orderUpdateSignal).toBe(42);
  });

  it('RESET_CHAT returns initial state', () => {
    const dirty: ChatState = { ...chatInitialState, selectedChatId: 'x', threads: [makeThread()], orderUpdateSignal: 5 };
    expect(chatReducer(dirty, { type: 'RESET_CHAT' })).toEqual(chatInitialState);
  });

  it('unknown action returns state unchanged', () => {
    const result = chatReducer(chatInitialState, { type: 'NONEXISTENT' } as any);
    expect(result).toBe(chatInitialState);
  });
});

// --- Identity Reducer ---

describe('identityReducer', () => {
  it('SET_CURRENT_USER', () => {
    const user = { id: 1, email: 'a@b.com', first_name: 'A', last_name: 'B' } as any;
    expect(identityReducer(identityInitialState, { type: 'SET_CURRENT_USER', payload: user }).currentUser).toEqual(user);
  });

  it('SET_CURRENT_COMPANY_MEMBER_ID', () => {
    expect(identityReducer(identityInitialState, { type: 'SET_CURRENT_COMPANY_MEMBER_ID', payload: 'member-42' }).currentCompanyMemberId).toBe('member-42');
  });

  it('SET_BALANCE', () => {
    expect(identityReducer(identityInitialState, { type: 'SET_BALANCE', payload: 99.5 }).balance).toBe(99.5);
  });

  it('SET_COMPANY_FIELDS', () => {
    const fields = [{ id: 1, company_id: 1, name: 'email', question: 'Email?', type: 'string', required: true, level: 'order' as const, is_system: false }];
    expect(identityReducer(identityInitialState, { type: 'SET_COMPANY_FIELDS', payload: fields }).companyFields).toEqual(fields);
  });

  it('SET_INITIALIZING', () => {
    expect(identityReducer(identityInitialState, { type: 'SET_INITIALIZING', payload: true }).isInitializing).toBe(true);
  });

  it('SET_INIT_ERROR', () => {
    expect(identityReducer(identityInitialState, { type: 'SET_INIT_ERROR', payload: 'boom' }).initError).toBe('boom');
  });

  it('RESET_IDENTITY returns initial state', () => {
    const dirty: IdentityState = { ...identityInitialState, balance: 100, initError: 'err' };
    expect(identityReducer(dirty, { type: 'RESET_IDENTITY' })).toEqual(identityInitialState);
  });

  it('unknown action returns state unchanged', () => {
    const result = identityReducer(identityInitialState, { type: 'NONEXISTENT' } as any);
    expect(result).toBe(identityInitialState);
  });
});
