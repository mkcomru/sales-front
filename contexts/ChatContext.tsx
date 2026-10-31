import React, { createContext, useContext, useReducer, useCallback, useMemo, type ReactNode } from 'react';
import type { AssistantMode } from '../types/api';
import type { ChatSession, Manager, Message, Stage } from '../types';
import { isAiManagedFromAssistantMode } from '../utils/assistantMode';
import { formatThreadTime } from '../utils/formatThreadTime';
import type { AiRoutingSkipReason } from '../utils/aiRoutingSkip';
import { hydrateLocalEcho, matchesLocalEcho } from '../utils/messageLocalEcho';

export interface AiRoutingSkipBannerState {
  threadId: string;
  reason: AiRoutingSkipReason;
}

export interface ChatState {
  threads: ChatSession[];
  activeMessages: Message[];
  selectedChatId: string;
  threadsFilter: string;
  isThreadsLoading: boolean;
  isThreadsLoadingMore: boolean;
  isMessagesLoading: boolean;
  isLoadingOlderMessages: boolean;
  stagesConfig: Stage[];
  orderUpdateSignal: number | null;
  assistantTypingByThreadId: Record<string, boolean>;
  aiRoutingSkip: AiRoutingSkipBannerState | null;
}

export type ChatAction =
  | { type: 'SET_THREADS'; payload: ChatSession[] }
  | { type: 'APPEND_THREADS'; payload: ChatSession[] }
  | { type: 'UPDATE_THREAD'; payload: { id: string; updates: Partial<ChatSession> } }
  | {
      type: 'APPLY_THREAD_LIST_UPDATE';
      payload: {
        id: string;
        last_message_preview?: string;
        last_message_at?: string;
        assistant_mode?: AssistantMode;
        unread_count_delta?: number;
        assignee?: Manager | null;
        metadata?: Record<string, unknown>;
      };
    }
  | { type: 'SET_ACTIVE_MESSAGES'; payload: Message[] }
  | { type: 'PREPEND_ACTIVE_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'ADD_MESSAGE_IF_NEW'; payload: Message }
  | { type: 'ADD_OR_MERGE_THREAD_MESSAGE'; payload: Message }
  | { type: 'REPLACE_OPTIMISTIC_MESSAGE'; payload: { tempId: string; message: Message } }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; updates: Partial<Message> } }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_SELECTED_CHAT_ID'; payload: string }
  | { type: 'SET_THREADS_FILTER'; payload: string }
  | { type: 'SET_THREADS_LOADING'; payload: boolean }
  | { type: 'SET_THREADS_LOADING_MORE'; payload: boolean }
  | { type: 'SET_MESSAGES_LOADING'; payload: boolean }
  | { type: 'SET_LOADING_OLDER_MESSAGES'; payload: boolean }
  | { type: 'SET_STAGES_CONFIG'; payload: Stage[] }
  | {
      type: 'APPLY_FIELDS_UPDATE';
      payload: {
        threadId: string;
        customer_fields?: Record<string, string | number | boolean | null>;
        order_id?: number;
      };
    }
  | { type: 'SET_ORDER_UPDATE_SIGNAL'; payload: number }
  | { type: 'CONSUME_ORDER_UPDATE'; payload: number }
  | { type: 'SET_ASSISTANT_TYPING'; payload: { threadId: string; active: boolean } }
  | { type: 'SET_AI_ROUTING_SKIP'; payload: AiRoutingSkipBannerState }
  | { type: 'CLEAR_AI_ROUTING_SKIP'; payload: { threadId: string } }
  | { type: 'RESET_CHAT' };

export const chatInitialState: ChatState = {
  threads: [],
  activeMessages: [],
  selectedChatId: '',
  threadsFilter: 'all',
  isThreadsLoading: false,
  isThreadsLoadingMore: false,
  isMessagesLoading: false,
  isLoadingOlderMessages: false,
  stagesConfig: [],
  orderUpdateSignal: null,
  assistantTypingByThreadId: {},
  aiRoutingSkip: null,
};

function sortMessagesChronologically(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return ta - tb;
  });
}

function syncThreadMessages(
  state: ChatState,
  messages: Message[],
  threadId: string = state.selectedChatId,
): ChatState {
  if (!threadId) return { ...state, activeMessages: messages };
  return {
    ...state,
    activeMessages: messages,
    threads: state.threads.map((thread) =>
      thread.id === threadId ? { ...thread, messages } : thread
    ),
  };
}

function findLocalEchoMatchIndex(messages: Message[], incoming: Message): number {
  return messages.findIndex((message) => matchesLocalEcho(message, incoming));
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_THREADS':
      return { ...state, threads: action.payload };
    case 'APPEND_THREADS': {
      const existingIds = new Set(state.threads.map((t) => t.id));
      const toAdd = action.payload.filter((t) => !existingIds.has(t.id));
      return { ...state, threads: [...state.threads, ...toAdd] };
    }
    case 'UPDATE_THREAD':
      return {
        ...state,
        threads: state.threads.map((t) =>
          t.id === action.payload.id ? { ...t, ...action.payload.updates } : t
        ),
      };
    case 'APPLY_THREAD_LIST_UPDATE': {
      const { id, last_message_preview, last_message_at, assistant_mode, unread_count_delta, metadata } = action.payload;
      const hasAssignee = Object.prototype.hasOwnProperty.call(action.payload, 'assignee');
      return {
        ...state,
        threads: state.threads.map((t) => {
          if (t.id !== id) return t;
          return {
            ...t,
            ...(last_message_preview !== undefined && { lastMessage: last_message_preview }),
            ...(last_message_at !== undefined && {
              lastMessageTime: formatThreadTime(last_message_at),
            }),
            ...(assistant_mode !== undefined && {
              assistantMode: assistant_mode,
              isAiManaged: isAiManagedFromAssistantMode(assistant_mode),
            }),
            ...(unread_count_delta !== undefined && {
              unreadCount: (t.unreadCount || 0) + unread_count_delta,
            }),
            ...(hasAssignee && { assignee: action.payload.assignee }),
            ...(metadata && { metadata: { ...(t.metadata || {}), ...metadata } }),
          };
        }),
      };
    }
    case 'SET_ACTIVE_MESSAGES':
      return syncThreadMessages(state, action.payload);
    case 'PREPEND_ACTIVE_MESSAGES': {
      const seen = new Set<string>();
      const merged: Message[] = [];
      for (const m of action.payload) {
        if (seen.has(m.id)) continue;
        merged.push(m);
        seen.add(m.id);
      }
      for (const m of state.activeMessages) {
        if (seen.has(m.id)) continue;
        merged.push(m);
        seen.add(m.id);
      }
      return syncThreadMessages(state, sortMessagesChronologically(merged));
    }
    case 'ADD_MESSAGE':
      return syncThreadMessages(state, [...state.activeMessages, action.payload]);
    case 'ADD_MESSAGE_IF_NEW': {
      if (state.activeMessages.some((m) => m.id === action.payload.id)) return state;
      const localEchoIdx = findLocalEchoMatchIndex(state.activeMessages, action.payload);
      if (localEchoIdx === -1) {
        return syncThreadMessages(state, [...state.activeMessages, action.payload]);
      }
      const next = [...state.activeMessages];
      next[localEchoIdx] = hydrateLocalEcho(action.payload, next[localEchoIdx]);
      return syncThreadMessages(state, next);
    }
    case 'ADD_OR_MERGE_THREAD_MESSAGE': {
      const idx = state.activeMessages.findIndex((m) => m.id === action.payload.id);
      if (idx === -1) {
        const localEchoIdx = findLocalEchoMatchIndex(state.activeMessages, action.payload);
        if (localEchoIdx !== -1) {
          const next = [...state.activeMessages];
          next[localEchoIdx] = hydrateLocalEcho(action.payload, next[localEchoIdx]);
          return syncThreadMessages(state, next);
        }
        return syncThreadMessages(state, [...state.activeMessages, action.payload]);
      }
      const next = [...state.activeMessages];
      next[idx] = { ...next[idx], ...action.payload };
      return syncThreadMessages(state, next);
    }
    case 'REPLACE_OPTIMISTIC_MESSAGE': {
      const { tempId, message } = action.payload;
      const tempIdx = state.activeMessages.findIndex((m) => m.id === tempId);
      const serverIdx = state.activeMessages.findIndex((m) => m.id === message.id);

      if (tempIdx === -1) {
        if (serverIdx === -1) {
          return syncThreadMessages(state, [...state.activeMessages, message]);
        }
        const next = [...state.activeMessages];
        next[serverIdx] = { ...next[serverIdx], ...message };
        return syncThreadMessages(state, next);
      }

      const next = [...state.activeMessages];
      next[tempIdx] = { ...next[tempIdx], ...message };

      if (serverIdx !== -1 && serverIdx !== tempIdx) {
        next.splice(serverIdx, 1);
      }

      return syncThreadMessages(state, next);
    }
    case 'UPDATE_MESSAGE':
      return syncThreadMessages(
        state,
        state.activeMessages.map((m) =>
          m.id === action.payload.id ? { ...m, ...action.payload.updates } : m
        )
      );
    case 'CLEAR_MESSAGES':
      return syncThreadMessages(state, []);
    case 'SET_SELECTED_CHAT_ID': {
      const id = action.payload;
      if (!id) {
        return { ...state, selectedChatId: id };
      }
      return {
        ...state,
        selectedChatId: id,
        threads: state.threads.map((t) => (t.id === id ? { ...t, unreadCount: 0 } : t)),
      };
    }
    case 'SET_THREADS_FILTER':
      return { ...state, threadsFilter: action.payload };
    case 'SET_THREADS_LOADING':
      return { ...state, isThreadsLoading: action.payload };
    case 'SET_THREADS_LOADING_MORE':
      return { ...state, isThreadsLoadingMore: action.payload };
    case 'SET_MESSAGES_LOADING':
      return { ...state, isMessagesLoading: action.payload };
    case 'SET_LOADING_OLDER_MESSAGES':
      return { ...state, isLoadingOlderMessages: action.payload };
    case 'SET_STAGES_CONFIG':
      return { ...state, stagesConfig: action.payload };
    case 'APPLY_FIELDS_UPDATE': {
      const { threadId, customer_fields, order_id } = action.payload;
      let next = state;
      if (customer_fields) {
        next = {
          ...next,
          threads: next.threads.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  details: {
                    ...t.details,
                    customer_fields: { ...(t.details.customer_fields || {}), ...customer_fields },
                  },
                }
              : t
          ),
        };
      }
      if (order_id) {
        next = { ...next, orderUpdateSignal: order_id };
      }
      return next;
    }
    case 'SET_ORDER_UPDATE_SIGNAL':
      return { ...state, orderUpdateSignal: action.payload };
    case 'CONSUME_ORDER_UPDATE':
      return state.orderUpdateSignal === action.payload
        ? { ...state, orderUpdateSignal: null }
        : state;
    case 'SET_ASSISTANT_TYPING': {
      const { threadId, active } = action.payload;
      const nextTyping = { ...state.assistantTypingByThreadId };
      if (active) {
        nextTyping[threadId] = true;
      } else {
        delete nextTyping[threadId];
      }
      let aiRoutingSkip = state.aiRoutingSkip;
      if (active && aiRoutingSkip?.threadId === threadId) {
        aiRoutingSkip = null;
      }
      return { ...state, assistantTypingByThreadId: nextTyping, aiRoutingSkip };
    }
    case 'SET_AI_ROUTING_SKIP':
      return { ...state, aiRoutingSkip: action.payload };
    case 'CLEAR_AI_ROUTING_SKIP':
      if (state.aiRoutingSkip?.threadId !== action.payload.threadId) return state;
      return { ...state, aiRoutingSkip: null };
    case 'RESET_CHAT':
      return chatInitialState;
    default:
      return state;
  }
}

interface ChatContextType {
  chatState: ChatState;
  chatDispatch: React.Dispatch<ChatAction>;
  setSelectedChatId: (id: string) => void;
  updateThread: (id: string, updates: Partial<ChatSession>) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  clearMessages: () => void;
  setThreadsFilter: (filter: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [chatState, chatDispatch] = useReducer(chatReducer, chatInitialState);

  const setSelectedChatId = useCallback((id: string) => {
    chatDispatch({ type: 'SET_SELECTED_CHAT_ID', payload: id });
  }, []);

  const updateThread = useCallback((id: string, updates: Partial<ChatSession>) => {
    chatDispatch({ type: 'UPDATE_THREAD', payload: { id, updates } });
  }, []);

  const addMessage = useCallback((message: Message) => {
    chatDispatch({ type: 'ADD_MESSAGE', payload: message });
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    chatDispatch({ type: 'UPDATE_MESSAGE', payload: { id, updates } });
  }, []);

  const clearMessages = useCallback(() => {
    chatDispatch({ type: 'CLEAR_MESSAGES' });
  }, []);

  const setThreadsFilter = useCallback((filter: string) => {
    chatDispatch({ type: 'SET_THREADS_FILTER', payload: filter });
  }, []);

  const value = useMemo(() => ({
    chatState, chatDispatch,
    setSelectedChatId, updateThread, addMessage, updateMessage, clearMessages, setThreadsFilter,
  }), [chatState, setSelectedChatId, updateThread, addMessage, updateMessage, clearMessages, setThreadsFilter]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChatContext = (): ChatContextType => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
  return ctx;
};
