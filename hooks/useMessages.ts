import { useCallback, useRef, useEffect, useState } from 'react';
import { threadsService, THREAD_MESSAGES_PAGE_SIZE } from '../services';
import { useChatContext } from '../contexts/ChatContext';
import { ChatSession, Message, MessageType } from '../types';
import { NotFoundException } from '../utils/errors';
import { getMessagePreview } from '../utils/chatMessagePreview';
import { hydrateLocalEcho, isOptimisticLocalEcho, matchesLocalEcho } from '../utils/messageLocalEcho';
import { formatMessageClock } from '../utils/chatDate';
import type { ApiMessage } from '../types/api';

function shouldKeepLocalMessage(message: Message): boolean {
  return isOptimisticLocalEcho(message) || message.status === 'failed';
}

function mergeFetchedMessages(fetchedMessages: Message[], localMessages: Message[]): Message[] {
  if (localMessages.length === 0) return fetchedMessages;

  const matchedLocalIds = new Set<string>();
  const merged = fetchedMessages.map((serverMessage) => {
    const localEcho = localMessages.find((localMessage) => matchesLocalEcho(localMessage, serverMessage));
    if (!localEcho) return serverMessage;
    matchedLocalIds.add(localEcho.id);
    return hydrateLocalEcho(serverMessage, localEcho);
  });
  const seenIds = new Set(merged.map((message) => message.id));

  for (const localMessage of localMessages) {
    if (
      seenIds.has(localMessage.id) ||
      matchedLocalIds.has(localMessage.id) ||
      !shouldKeepLocalMessage(localMessage)
    ) {
      continue;
    }
    merged.push(localMessage);
    seenIds.add(localMessage.id);
  }

  return merged;
}

function mapApiMessagesToMessages(apiMessages: ApiMessage[]): Message[] {
  return apiMessages.map((apiMsg, index) => {
    let type = MessageType.CLIENT;
    if (apiMsg.role === 'assistant') type = MessageType.AI;
    if (apiMsg.role === 'manager') {
      type = apiMsg.is_note ?? apiMsg.type === 'internal_note' ? MessageType.NOTE : MessageType.MANAGER;
    }
    if (apiMsg.role === 'system') type = MessageType.SYSTEM;
    return {
      id: apiMsg.message_id ?? apiMsg.id ?? `msg-${index}`,
      type,
      content: apiMsg.content,
      transcription: apiMsg.transcription ?? undefined,
      createdAt: apiMsg.created_at,
      timestamp: apiMsg.created_at ? formatMessageClock(apiMsg.created_at) : '',
      read: true,
      senderName:
        apiMsg.sender_name ??
        (apiMsg.author ? `${apiMsg.author.first_name || ''} ${apiMsg.author.last_name || ''}`.trim() : undefined),
      status: apiMsg.status,
      metadata: apiMsg.metadata,
      artifact_ids: apiMsg.artifact_ids,
    };
  });
}

type MessageListCursor = { threadId: string; nextOffset: number; total: number };

function isHistorySyncPending(thread: ChatSession | undefined): boolean {
  return thread != null && thread.connector_transport_type != null && thread.historySynced !== true;
}

const SYNC_COOLDOWN_MS = 10_000;

export function useMessages(companyId: number | null) {
  const { chatState, chatDispatch, updateThread, setSelectedChatId, clearMessages } = useChatContext();
  const lastThreadRef = useRef<string | null>(null);
  const activeMessagesRef = useRef<Message[]>(chatState.activeMessages);
  const messageCursorRef = useRef<MessageListCursor | null>(null);
  const loadOlderLockRef = useRef(false);
  const syncCooldownRef = useRef(0);
  const [hasMoreOlderMessages, setHasMoreOlderMessages] = useState(false);

  useEffect(() => {
    syncCooldownRef.current = 0;
  }, [chatState.selectedChatId]);

  useEffect(() => {
    if (lastThreadRef.current && lastThreadRef.current !== chatState.selectedChatId && companyId) {
      threadsService.cancelMessages(companyId, lastThreadRef.current);
    }
    lastThreadRef.current = chatState.selectedChatId;
  }, [chatState.selectedChatId, companyId]);

  useEffect(() => {
    activeMessagesRef.current = chatState.activeMessages;
  }, [chatState.activeMessages]);

  const fetchMessages = useCallback(
    async (threadId: string, silent: boolean = false) => {
      if (!threadId || !companyId) return;

      try {
        if (!silent) {
          chatDispatch({ type: 'SET_MESSAGES_LOADING', payload: true });
          clearMessages();
        }

        const { items: apiMessages, total } = await threadsService.getMessages(companyId, threadId, {
          limit: THREAD_MESSAGES_PAGE_SIZE,
          offset: 0,
        });

        messageCursorRef.current = {
          threadId,
          nextOffset: apiMessages.length,
          total,
        };
        setHasMoreOlderMessages(apiMessages.length < total);

        const mappedMsgs = mapApiMessagesToMessages(apiMessages);

        const localMessages =
          silent && lastThreadRef.current === threadId ? activeMessagesRef.current : [];
        const nextMessages = mergeFetchedMessages(mappedMsgs, localMessages);
        chatDispatch({ type: 'SET_ACTIVE_MESSAGES', payload: nextMessages });

        if (nextMessages.length > 0) {
          const last = nextMessages[nextMessages.length - 1];
          updateThread(threadId, {
            lastMessage: getMessagePreview(last),
            lastMessageTime: last.timestamp,
          });
        }
      } catch (error) {
        if ((error as Error).name !== 'CanceledError') {
          if (error instanceof NotFoundException) {
            setSelectedChatId('');
            clearMessages();
          }
        }
      } finally {
        if (!silent) chatDispatch({ type: 'SET_MESSAGES_LOADING', payload: false });
      }
    },
    [companyId, chatDispatch, clearMessages, updateThread, setSelectedChatId],
  );

  const loadOlderMessages = useCallback(async () => {
    const threadId = chatState.selectedChatId;
    if (!threadId || !companyId) return;
    if (loadOlderLockRef.current || chatState.isLoadingOlderMessages) return;

    const cursor = messageCursorRef.current;
    if (!cursor || cursor.threadId !== threadId) return;

    const dbHasMore = cursor.nextOffset < cursor.total;
    const thread = chatState.threads.find((t) => t.id === threadId);
    const syncPending = isHistorySyncPending(thread);

    if (dbHasMore) {
      loadOlderLockRef.current = true;
      chatDispatch({ type: 'SET_LOADING_OLDER_MESSAGES', payload: true });
      try {
        const { items: apiMessages, total } = await threadsService.getMessages(companyId, threadId, {
          limit: THREAD_MESSAGES_PAGE_SIZE,
          offset: cursor.nextOffset,
        });
        cursor.total = total;
        cursor.nextOffset += apiMessages.length;
        messageCursorRef.current = cursor;
        setHasMoreOlderMessages(cursor.nextOffset < cursor.total || syncPending);
        if (apiMessages.length > 0) {
          chatDispatch({ type: 'PREPEND_ACTIVE_MESSAGES', payload: mapApiMessagesToMessages(apiMessages) });
        }
      } catch {
        /* keep cursor; user can retry */
      } finally {
        loadOlderLockRef.current = false;
        chatDispatch({ type: 'SET_LOADING_OLDER_MESSAGES', payload: false });
      }
      return;
    }

    if (!syncPending) return;

    const now = Date.now();
    if (now - syncCooldownRef.current < SYNC_COOLDOWN_MS) return;
    syncCooldownRef.current = now;

    loadOlderLockRef.current = true;
    chatDispatch({ type: 'SET_LOADING_OLDER_MESSAGES', payload: true });
    try {
      try {
        await threadsService.syncHistory(companyId, threadId, {
          messageLimit: THREAD_MESSAGES_PAGE_SIZE,
          offset: cursor.total,
        });
      } catch {
        /* 409 or transport error */
      }

      await new Promise((r) => setTimeout(r, 3000));

      const { items: apiMessages, total } = await threadsService.getMessages(companyId, threadId, {
        limit: THREAD_MESSAGES_PAGE_SIZE,
        offset: cursor.nextOffset,
      });

      cursor.total = total;
      cursor.nextOffset += apiMessages.length;
      messageCursorRef.current = cursor;
      setHasMoreOlderMessages(cursor.nextOffset < cursor.total);

      if (apiMessages.length > 0) {
        chatDispatch({ type: 'PREPEND_ACTIVE_MESSAGES', payload: mapApiMessagesToMessages(apiMessages) });
      }
    } catch {
      /* keep cursor; user can retry */
    } finally {
      loadOlderLockRef.current = false;
      chatDispatch({ type: 'SET_LOADING_OLDER_MESSAGES', payload: false });
    }
  }, [
    companyId,
    chatState.selectedChatId,
    chatState.isLoadingOlderMessages,
    chatState.threads,
    chatDispatch,
  ]);

  return { fetchMessages, loadOlderMessages, hasMoreOlderMessages };
}
