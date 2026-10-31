import { useCallback, useRef, useEffect, useState } from 'react';
import { connectorsService, threadsService, THREAD_LIST_PAGE_SIZE } from '../services';
import { useChatContext } from '../contexts/ChatContext';
import { ChatSession } from '../types';
import { isAiManagedFromAssistantMode, DEFAULT_ASSISTANT_MODE } from '../utils/assistantMode';
import { formatThreadTime } from '../utils/formatThreadTime';
import { logger } from '../utils/logger';

const TAB_TO_API_FILTER: Record<string, string> = {
  all: 'all',
  mine: 'mine',
  ai: 'ai',
  managers: 'human',
};

export function useThreads(companyId: number | null) {
  const { chatState, chatDispatch, setSelectedChatId } = useChatContext();

  const stateRef = useRef(chatState);
  const listOffsetRef = useRef(0);
  const loadMoreLockRef = useRef(false);
  const syncCooldownRef = useRef(0);
  const wappiConnectorsCacheRef = useRef<{ companyId: number; ids: string[] } | null>(null);
  const [listPagination, setListPagination] = useState<{ offset: number; total: number | null }>({
    offset: 0,
    total: null,
  });

  useEffect(() => {
    stateRef.current = chatState;
  }, [chatState]);

  const threadsFilterRef = useRef(chatState.threadsFilter);

  useEffect(() => {
    listOffsetRef.current = 0;
    setListPagination({ offset: 0, total: null });
    wappiConnectorsCacheRef.current = null;
  }, [companyId]);

  const mapItemsToThreads = useCallback(
    (items: Awaited<ReturnType<typeof threadsService.getThreads>>['items']): ChatSession[] =>
      items.filter(Boolean).map((t) => {
        const idSuffix = (t.conversation_id || t.thread_id || '????').toString().slice(-4);
        const metaName =
          t.customer_name || t.metadata?.username || t.metadata?.first_name || t.metadata?.phone_number;
        const displayName = metaName ? String(metaName) : `GUEST (${idSuffix})`;
        const existing = stateRef.current.threads.find((p) => p.id === t.thread_id);

        const activeOrder = t.active_order;
        const assigneeInfo = activeOrder?.assignee;

        const apiDetails = t.details;
        const baseDetails = apiDetails
          ? {
              email: apiDetails.email ?? '-',
              phone: apiDetails.phone ?? '-',
              location: apiDetails.location ?? '-',
              username: apiDetails.username ?? '',
              customer_fields: apiDetails.customer_fields ?? {},
            }
          : existing?.details ?? {
              email: '-',
              phone: '-',
              location: '-',
              username: '',
              customer_fields: {},
            };
        return {
          id: t.thread_id,
          customerId: t.customer_id != null ? String(t.customer_id) : undefined,
          historySynced: t.history_synced,
          customerName: displayName,
          avatarUrl: `https://ui-avatars.com/api/?name=${displayName}&background=random`,
          status: 'offline' as const,
          lastMessage: t.last_message_preview || '',
          lastMessageTime: t.last_message_at ? formatThreadTime(t.last_message_at) : '',
          unreadCount: t.unread_count || 0,
          assistantMode: t.assistant_mode ?? DEFAULT_ASSISTANT_MODE,
          isAiManaged: isAiManagedFromAssistantMode(t.assistant_mode ?? DEFAULT_ASSISTANT_MODE),
          dealStage: activeOrder?.stage?.name || 'Без стадии',
          orderId: activeOrder?.id,
          orderStage: activeOrder?.stage ?? null,
          order: activeOrder ?? null,
          intentLevel: 'Уровень 1: Интерес',
          messages: existing?.messages || [],
          details: baseDetails,
          channel_type: t.channel_type,
          connector_transport_type: t.connector_transport_type,
          conversation_id: t.conversation_id,
          metadata: t.metadata || {},
          assignee: assigneeInfo
            ? {
                id: String(assigneeInfo.id),
                user_id: assigneeInfo.user_id,
                name: `${assigneeInfo.first_name} ${assigneeInfo.last_name}`.trim(),
                role: assigneeInfo.role,
              }
            : undefined,
        };
      }),
    [],
  );

  const fetchThreads = useCallback(
    async (silent = false, mode: 'replace' | 'append' = 'replace') => {
      if (!companyId) return;
      const apiFilter = TAB_TO_API_FILTER[chatState.threadsFilter] ?? 'all';

      if (mode === 'replace') {
        listOffsetRef.current = 0;
        setListPagination({ offset: 0, total: null });
      }

      const offset = listOffsetRef.current;

      try {
        if (mode === 'replace' && !silent) {
          chatDispatch({ type: 'SET_THREADS_LOADING', payload: true });
        }
        if (mode === 'append') {
          chatDispatch({ type: 'SET_THREADS_LOADING_MORE', payload: true });
        }

        const { items, total } = await threadsService.getThreads(companyId, {
          filter: apiFilter,
          limit: THREAD_LIST_PAGE_SIZE,
          offset,
        });

        const mappedThreads = mapItemsToThreads(items);
        const nextOffset = offset + items.length;
        listOffsetRef.current = nextOffset;
        setListPagination({ offset: nextOffset, total });

        if (mode === 'append') {
          chatDispatch({ type: 'APPEND_THREADS', payload: mappedThreads });
        } else {
          const currentSelectedChatId = stateRef.current.selectedChatId;
          const existingSelectedThread = currentSelectedChatId
            ? stateRef.current.threads.find((thread) => thread.id === currentSelectedChatId)
            : undefined;
          const selectedInResponse = currentSelectedChatId
            ? mappedThreads.some((thread) => thread.id === currentSelectedChatId)
            : false;
          const nextThreads =
            existingSelectedThread && !selectedInResponse
              ? [...mappedThreads, existingSelectedThread]
              : mappedThreads;

          chatDispatch({ type: 'SET_THREADS', payload: nextThreads });

          if (!currentSelectedChatId && items.length > 0) {
            setSelectedChatId(items[0].thread_id);
          }
        }
      } catch (error) {
        logger.error('Failed to fetch threads', error);
      } finally {
        if (mode === 'replace' && !silent) {
          chatDispatch({ type: 'SET_THREADS_LOADING', payload: false });
        }
        if (mode === 'append') {
          chatDispatch({ type: 'SET_THREADS_LOADING_MORE', payload: false });
        }
      }
    },
    [companyId, chatState.threadsFilter, chatDispatch, setSelectedChatId, mapItemsToThreads],
  );

  useEffect(() => {
    if (!companyId) return;
    if (threadsFilterRef.current === chatState.threadsFilter) return;
    threadsFilterRef.current = chatState.threadsFilter;
    listOffsetRef.current = 0;
    setListPagination({ offset: 0, total: null });
    wappiConnectorsCacheRef.current = null;
    void fetchThreads(true, 'replace');
  }, [companyId, chatState.threadsFilter, fetchThreads]);

  const triggerMoreChatsSync = useCallback(async () => {
    if (!companyId) return;
    let cache = wappiConnectorsCacheRef.current;
    if (!cache || cache.companyId !== companyId) {
      let list: Awaited<ReturnType<typeof connectorsService.list>> = [];
      try {
        list = await connectorsService.list(companyId);
      } catch (error) {
        logger.warn('Failed to list connectors for more-chats sync', { error });
      }
      const ids = list
        .filter((c) => c.type === 'wappi' && c.enabled !== false && Boolean(c.connector_id))
        .map((c) => c.connector_id as string);
      cache = { companyId, ids };
      wappiConnectorsCacheRef.current = cache;
    }
    for (const connectorId of cache.ids) {
      try {
        await connectorsService.syncMoreChats(companyId, connectorId);
      } catch (error) {
        logger.debug('syncMoreChats skipped or failed', { connectorId, error });
      }
    }
  }, [companyId]);

  const SYNC_COOLDOWN_MS = 30_000;

  const loadMoreThreads = useCallback(async () => {
    if (!companyId) return;
    if (chatState.isThreadsLoading || chatState.isThreadsLoadingMore) return;
    if (loadMoreLockRef.current) return;
    loadMoreLockRef.current = true;

    try {
      const dbHasMore =
        listPagination.total == null || listOffsetRef.current < listPagination.total;

      if (dbHasMore) {
        triggerMoreChatsSync().catch(() => {});
        await fetchThreads(true, 'append');
        return;
      }

      const now = Date.now();
      if (now - syncCooldownRef.current < SYNC_COOLDOWN_MS) return;
      syncCooldownRef.current = now;

      chatDispatch({ type: 'SET_THREADS_LOADING_MORE', payload: true });
      try {
        await triggerMoreChatsSync();
        await new Promise((r) => setTimeout(r, 3000));
        await fetchThreads(true, 'replace');
      } finally {
        chatDispatch({ type: 'SET_THREADS_LOADING_MORE', payload: false });
      }
    } finally {
      loadMoreLockRef.current = false;
    }
  }, [
    companyId,
    chatState.isThreadsLoading,
    chatState.isThreadsLoadingMore,
    listPagination.total,
    fetchThreads,
    triggerMoreChatsSync,
    chatDispatch,
  ]);

  const hasMoreThreads =
    listPagination.total != null && listPagination.offset < listPagination.total;

  return { fetchThreads, loadMoreThreads, hasMoreThreads };
}
