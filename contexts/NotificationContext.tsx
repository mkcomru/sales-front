import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useRealtimeEvent } from '../hooks/useRealtimeEvent';
import { useIdentityContext } from './IdentityContext';
import { notificationsService } from '../services/notifications';
import type { NotificationRecipientResponse } from '../types/api';
import type { RealtimeEvent } from '../hooks/useWebSocket';
import { logger } from '../utils/logger';

interface NotificationState {
  items: NotificationRecipientResponse[];
  unread_count: number;
  isLoaded: boolean;
  pendingToast: NotificationRecipientResponse | null;
}

type NotificationAction =
  | { type: 'LOAD'; payload: { items: NotificationRecipientResponse[]; unread_count: number } }
  | { type: 'PREPEND'; payload: NotificationRecipientResponse }
  | { type: 'MARK_READ'; payload: number }
  | { type: 'MARK_ALL_READ' }
  | { type: 'REMOVE_NOTIFICATION'; payload: number }
  | { type: 'CLEAR_PENDING_TOAST' }
  | { type: 'RESET' };

const initialState: NotificationState = {
  items: [],
  unread_count: 0,
  isLoaded: false,
  pendingToast: null,
};

function reducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'LOAD':
      return {
        ...state,
        items: action.payload.items,
        unread_count: action.payload.unread_count,
        isLoaded: true,
      };
    case 'PREPEND': {
      const already = state.items.some((i) => i.id === action.payload.id);
      if (already) return state;
      return {
        ...state,
        items: [action.payload, ...state.items],
        unread_count: state.unread_count + 1,
        pendingToast: action.payload,
      };
    }
    case 'MARK_READ': {
      const updated = state.items.map((i) =>
        i.id === action.payload ? { ...i, is_read: true } : i,
      );
      const wasUnread = state.items.find((i) => i.id === action.payload && !i.is_read);
      return {
        ...state,
        items: updated,
        unread_count: wasUnread ? Math.max(0, state.unread_count - 1) : state.unread_count,
      };
    }
    case 'MARK_ALL_READ':
      return {
        ...state,
        items: state.items.map((i) => ({ ...i, is_read: true })),
        unread_count: 0,
      };
    case 'REMOVE_NOTIFICATION': {
      const removed = state.items.find((i) => i.notification.id === action.payload);
      const wasUnread = removed && !removed.is_read;
      const pendingToast =
        state.pendingToast?.notification.id === action.payload ? null : state.pendingToast;
      return {
        ...state,
        items: state.items.filter((i) => i.notification.id !== action.payload),
        unread_count: wasUnread ? Math.max(0, state.unread_count - 1) : state.unread_count,
        pendingToast,
      };
    }
    case 'CLEAR_PENDING_TOAST':
      return { ...state, pendingToast: null };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface NotificationContextType {
  state: NotificationState;
  load: (companyId: number) => Promise<void>;
  markRead: (companyId: number, recipientId: number) => Promise<void>;
  markAllRead: (companyId: number) => Promise<void>;
  clearPendingToast: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ companyId: number; children: ReactNode }> = ({
  companyId,
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { identityState } = useIdentityContext();
  const userId = identityState.currentUser?.id;
  const topic = userId ? `user:${userId}` : '';

  // Guard against running load() concurrently
  const loadingRef = useRef(false);

  const load = useCallback(async (cid: number) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const data = await notificationsService.getList(cid, { limit: 50 });
      dispatch({ type: 'LOAD', payload: { items: data.items, unread_count: data.unread_count } });
    } catch (error) {
      logger.error('Failed to load notifications', error, { companyId: cid });
    } finally {
      loadingRef.current = false;
    }
  }, []);

  const markRead = useCallback(async (cid: number, recipientId: number) => {
    dispatch({ type: 'MARK_READ', payload: recipientId });
    await notificationsService.markRead(cid, recipientId);
  }, []);

  const markAllRead = useCallback(async (cid: number) => {
    dispatch({ type: 'MARK_ALL_READ' });
    await notificationsService.markAllRead(cid);
  }, []);

  const clearPendingToast = useCallback(() => {
    dispatch({ type: 'CLEAR_PENDING_TOAST' });
  }, []);

  useEffect(() => {
    dispatch({ type: 'RESET' });
    if (!userId) {
      return;
    }
    void load(companyId);
  }, [companyId, userId, load]);

  useRealtimeEvent(topic, (event: RealtimeEvent) => {
    if (event.event_type === 'notification_resolved') {
      const notificationId = event.payload.notification_id as number;
      dispatch({ type: 'REMOVE_NOTIFICATION', payload: notificationId });
      return;
    }
    if (event.event_type !== 'notification') return;
    const p = event.payload as {
      notification_id: number;
      recipient_id: number;
      type: string;
      title: string;
      body: string;
      is_read: boolean;
      context: Record<string, unknown>;
    };
    const item: NotificationRecipientResponse = {
      id: p.recipient_id,
      notification: {
        id: p.notification_id,
        company_id: companyId,
        type: p.type as NotificationRecipientResponse['notification']['type'],
        title: p.title,
        body: p.body,
        payload: p.context ?? {},
        created_at: event.emitted_at,
        resolved_at: null,
      },
      is_read: p.is_read,
      read_at: null,
    };
    dispatch({ type: 'PREPEND', payload: item });
  });

  const value: NotificationContextType = {
    state,
    load,
    markRead,
    markAllRead,
    clearPendingToast,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export function useNotificationContext(): NotificationContextType {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotificationContext must be used within NotificationProvider');
  return ctx;
}
