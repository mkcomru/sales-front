import { useEffect, useRef, useCallback, useState } from 'react';
import { API_BASE_URL } from '../config/env';
import { apiClient } from '../services/api/client';
import { API_ENDPOINTS } from '../services/api/endpoints';
import { useChatContext } from '../contexts/ChatContext';
import { Message, MessageType } from '../types';
import type { AssistantMode } from '../types/api';
import { isAiManagedFromAssistantMode } from '../utils/assistantMode';
import { formatMessageClock } from '../utils/chatDate';
import { patchAssigneeFromThreadListPayload } from '../utils/threadListAssignee';
import { parseAiRoutingSkipReason } from '../utils/aiRoutingSkip';
import { logger } from '../utils/logger';

export type WsStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface RealtimeEvent {
  event_id: string;
  topic: string;
  event_type: string;
  thread_id: string;
  payload: Record<string, unknown>;
  emitted_at: string;
}

const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000];
const MAX_RECONNECT_ATTEMPTS = 5;

function buildWsUrl(companyId: number, ticket: string): string {
  const base = API_BASE_URL;
  let wsBase: string;
  if (base) {
    wsBase = base.replace(/^https(?=:)/, 'wss').replace(/^http(?=:)/, 'ws');
  } else {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    wsBase = `${proto}//${window.location.host}`;
  }
  return `${wsBase}/api/v1/ws/companies/${companyId}?ticket=${ticket}`;
}

function dispatchTopicHandlers(
  topicHandlers: Map<string, Set<(event: RealtimeEvent) => void>>,
  event: RealtimeEvent
): void {
  const subs = topicHandlers.get(event.topic);
  if (!subs) {
    return;
  }
  for (const h of subs) {
    try {
      h(event);
    } catch (err) {
      logger.error('ws: topic handler error', err, { topic: event.topic });
    }
  }
}

export function useWebSocket(companyId: number | null) {
  const { chatState, chatDispatch, updateThread } = useChatContext();
  const [status, setStatus] = useState<WsStatus>('disconnected');

  const wsRef = useRef<WebSocket | null>(null);
  const selectedChatIdRef = useRef(chatState.selectedChatId);
  const fetchThreadsRef = useRef<((silent?: boolean) => void) | null>(null);
  const topicSubCountsRef = useRef<Map<string, number>>(new Map());
  const topicHandlersRef = useRef<Map<string, Set<(event: RealtimeEvent) => void>>>(new Map());

  useEffect(() => {
    selectedChatIdRef.current = chatState.selectedChatId;
  }, [chatState.selectedChatId]);

  const sendSubscribeTopic = useCallback((topic: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', topic }));
    }
  }, []);

  const sendUnsubscribeTopic = useCallback((topic: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', topic }));
    }
  }, []);

  const subscribeTopic = useCallback(
    (topic: string) => {
      const m = topicSubCountsRef.current;
      const next = (m.get(topic) ?? 0) + 1;
      m.set(topic, next);
      if (next === 1) {
        logger.debug('ws: subscribeTopic', { topic });
        sendSubscribeTopic(topic);
      }
    },
    [sendSubscribeTopic]
  );

  const unsubscribeTopic = useCallback(
    (topic: string) => {
      const m = topicSubCountsRef.current;
      const prev = m.get(topic) ?? 0;
      if (prev <= 0) {
        return;
      }
      const next = prev - 1;
      if (next <= 0) {
        m.delete(topic);
        logger.debug('ws: unsubscribeTopic', { topic });
        sendUnsubscribeTopic(topic);
      } else {
        m.set(topic, next);
      }
    },
    [sendUnsubscribeTopic]
  );

  const addTopicHandler = useCallback((topic: string, handler: (event: RealtimeEvent) => void) => {
    let set = topicHandlersRef.current.get(topic);
    if (!set) {
      set = new Set();
      topicHandlersRef.current.set(topic, set);
    }
    set.add(handler);
  }, []);

  const removeTopicHandler = useCallback((topic: string, handler: (event: RealtimeEvent) => void) => {
    const set = topicHandlersRef.current.get(topic);
    if (!set) {
      return;
    }
    set.delete(handler);
    if (set.size === 0) {
      topicHandlersRef.current.delete(topic);
    }
  }, []);

  const subscribeThread = useCallback(
    (threadId: string) => {
      subscribeTopic(`thread:${threadId}`);
    },
    [subscribeTopic]
  );

  const unsubscribeThread = useCallback(
    (threadId: string) => {
      unsubscribeTopic(`thread:${threadId}`);
    },
    [unsubscribeTopic]
  );

  const resubscribeAllTopics = useCallback(() => {
    for (const [topic, count] of topicSubCountsRef.current) {
      if (count > 0) {
        sendSubscribeTopic(topic);
      }
    }
  }, [sendSubscribeTopic]);

  useEffect(() => {
    if (!companyId) return;

    let active = true;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const handleEvent = (event: RealtimeEvent) => {
      dispatchTopicHandlers(topicHandlersRef.current, event);

      switch (event.event_type) {
        case 'ack':
          logger.debug('ws: ack', event.payload);
          break;

        case 'message': {
          const p = event.payload;
          if (event.thread_id === selectedChatIdRef.current) {
            const role = p.role as string;
            let msgType = MessageType.CLIENT;
            if (role === 'assistant') msgType = MessageType.AI;
            else if (role === 'manager') msgType = MessageType.MANAGER;
            else if (role === 'system') msgType = MessageType.SYSTEM;

            const tr = p.transcription;
            let transcription: string | null | undefined;
            if (typeof tr === 'string') {
              transcription = tr;
            } else if (tr === null) {
              transcription = null;
            } else {
              transcription = undefined;
            }
            const msg: Message = {
              id: (p.message_id as string) || `ws-${Date.now()}`,
              type: msgType,
              content: (p.content as string) || '',
              ...(transcription !== undefined ? { transcription } : {}),
              createdAt: (p.created_at as string) || undefined,
              timestamp: p.created_at ? formatMessageClock(p.created_at as string) : '',
              read: true,
              status: p.status as Message['status'],
              metadata: p.metadata as Message['metadata'],
              artifact_ids: p.artifact_ids as string[] | undefined,
            };
            chatDispatch({ type: 'ADD_OR_MERGE_THREAD_MESSAGE', payload: msg });
          }
          break;
        }

        case 'note': {
          const p = event.payload;
          if (event.thread_id === selectedChatIdRef.current) {
            const msg: Message = {
              id: (p.note_id as string) || `ws-note-${Date.now()}`,
              type: MessageType.NOTE,
              content: (p.note_content as string) || '',
              createdAt: (p.note_created_at as string) || undefined,
              timestamp: p.note_created_at ? formatMessageClock(p.note_created_at as string) : '',
              read: true,
            };
            chatDispatch({ type: 'ADD_MESSAGE_IF_NEW', payload: msg });
          }
          break;
        }

        case 'typing': {
          const p = event.payload;
          const role = p.role as string;
          const typingActive = p.active === true;
          if (role === 'assistant') {
            chatDispatch({
              type: 'SET_ASSISTANT_TYPING',
              payload: { threadId: event.thread_id, active: typingActive },
            });
          }
          break;
        }

        case 'control': {
          const p = event.payload;
          const mode = p.assistant_mode as AssistantMode;
          updateThread(event.thread_id, {
            assistantMode: mode,
            isAiManaged: isAiManagedFromAssistantMode(mode),
          });
          break;
        }

        case 'thread_updated': {
          const p = event.payload;
          if (p.assistant_mode !== undefined) {
            const mode = p.assistant_mode as AssistantMode;
            updateThread(event.thread_id, {
              assistantMode: mode,
              isAiManaged: isAiManagedFromAssistantMode(mode),
            });
          }
          const updateType = p.update_type as string | undefined;
          if (
            updateType === 'message_transcription' &&
            event.thread_id === selectedChatIdRef.current &&
            typeof p.message_id === 'string' &&
            typeof p.transcription === 'string'
          ) {
            chatDispatch({
              type: 'UPDATE_MESSAGE',
              payload: {
                id: p.message_id,
                updates: { transcription: p.transcription },
              },
            });
          }
          if (updateType === 'ai_routing_skipped') {
            const reason = parseAiRoutingSkipReason(String(p.reason ?? ''));
            if (reason) {
              chatDispatch({
                type: 'SET_AI_ROUTING_SKIP',
                payload: { threadId: event.thread_id, reason },
              });
            }
          }
          if (
            updateType === 'customer_fields' ||
            updateType === 'order_fields' ||
            updateType === 'fields'
          ) {
            const customerFields = (p.customer_fields ?? p.changed_fields ?? {}) as Record<
              string,
              string | number | boolean | null
            >;
            chatDispatch({
              type: 'APPLY_FIELDS_UPDATE',
              payload: {
                threadId: event.thread_id,
                ...(Object.keys(customerFields).length > 0 && { customer_fields: customerFields }),
                order_id: p.order_id as number | undefined,
              },
            });
          }
          break;
        }

        case 'thread_list_update': {
          const p = event.payload;
          const isActiveThread = event.thread_id === selectedChatIdRef.current;
          const assignPatch = patchAssigneeFromThreadListPayload(p as Record<string, unknown>);
          const previewMetadata = {
            ...((p.metadata as Record<string, unknown> | undefined) ?? {}),
            ...(p.last_message_type !== undefined ? { last_message_type: p.last_message_type } : {}),
            ...(p.last_attachment_type !== undefined ? { last_attachment_type: p.last_attachment_type } : {}),
            ...(p.last_message_artifact_ids !== undefined ? { last_message_artifact_ids: p.last_message_artifact_ids } : {}),
            ...(p.attachments !== undefined ? { attachments: p.attachments } : {}),
          };
          chatDispatch({
            type: 'APPLY_THREAD_LIST_UPDATE',
            payload: {
              id: event.thread_id,
              last_message_preview: p.last_message_preview as string | undefined,
              last_message_at: p.last_message_at as string | undefined,
              assistant_mode: p.assistant_mode as AssistantMode | undefined,
              ...(!isActiveThread ? { unread_count_delta: p.unread_count_delta as number | undefined } : {}),
              metadata: previewMetadata,
              ...assignPatch,
            },
          });
          break;
        }

        case 'thread_created':
          fetchThreadsRef.current?.(true);
          break;
      }
    };

    const doConnect = async () => {
      if (!active) return;
      setStatus('connecting');
      try {
        const { data } = await apiClient.post<{ ticket: string }>(
          API_ENDPOINTS.WS.TICKET(companyId)
        );
        if (!active) return;

        const url = buildWsUrl(companyId, data.ticket);
        logger.debug('ws: connecting', { url });
        const ws = new WebSocket(url);

        ws.onopen = () => {
          if (!active) {
            ws.close(1000, 'Stale');
            return;
          }
          wsRef.current = ws;
          setStatus('connected');
          attempt = 0;
          logger.debug('ws: connected', { readyState: ws.readyState });
          resubscribeAllTopics();
        };

        ws.onmessage = (ev: MessageEvent) => {
          try {
            const parsed = JSON.parse(ev.data as string) as RealtimeEvent;
            logger.debug('ws: message received', {
              event_type: parsed.event_type,
              topic: parsed.topic,
              thread_id: parsed.thread_id,
              payload: parsed.payload,
            });
            handleEvent(parsed);
          } catch {
            logger.warn('ws: failed to parse message', { data: ev.data });
          }
        };

        ws.onclose = (ev: CloseEvent) => {
          logger.debug('ws: closed', {
            code: ev.code,
            reason: ev.reason,
            wasClean: ev.wasClean,
          });
          if (!active) return;
          if (wsRef.current === ws) wsRef.current = null;
          setStatus('disconnected');

          if (ev.code === 1008 || ev.code === 1000) return;

          if (attempt >= MAX_RECONNECT_ATTEMPTS) {
            logger.warn('ws: max reconnect attempts reached');
            return;
          }
          const delay = BACKOFF_DELAYS[Math.min(attempt, BACKOFF_DELAYS.length - 1)];
          attempt++;
          logger.debug('ws: reconnecting', { delayMs: delay, attempt });
          timer = setTimeout(doConnect, delay);
        };

        ws.onerror = (ev) => {
          logger.error('ws: error event', ev);
          if (!active) return;
          setStatus('error');
        };
      } catch (err) {
        logger.error('ws: ticket fetch failed', err);
        if (!active) return;
        setStatus('error');
        if (attempt < MAX_RECONNECT_ATTEMPTS) {
          const delay = BACKOFF_DELAYS[Math.min(attempt, BACKOFF_DELAYS.length - 1)];
          attempt++;
          timer = setTimeout(doConnect, delay);
        }
      }
    };

    doConnect();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      if (wsRef.current) {
        wsRef.current.close(1000, 'Cleanup');
        wsRef.current = null;
      }
      setStatus('disconnected');
    };
  }, [companyId, chatDispatch, updateThread, resubscribeAllTopics]);

  return {
    subscribeThread,
    unsubscribeThread,
    subscribeTopic,
    unsubscribeTopic,
    addTopicHandler,
    removeTopicHandler,
    status,
    fetchThreadsRef,
  };
}
