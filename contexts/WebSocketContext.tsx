import React, { createContext, useContext, MutableRefObject } from 'react';
import type { RealtimeEvent, WsStatus } from '../hooks/useWebSocket';

interface WebSocketContextType {
  subscribeThread: (threadId: string) => void;
  unsubscribeThread: (threadId: string) => void;
  subscribeTopic: (topic: string) => void;
  unsubscribeTopic: (topic: string) => void;
  addTopicHandler: (topic: string, handler: (event: RealtimeEvent) => void) => void;
  removeTopicHandler: (topic: string, handler: (event: RealtimeEvent) => void) => void;
  status: WsStatus;
  fetchThreadsRef: MutableRefObject<((silent?: boolean) => void) | null>;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider = WebSocketContext.Provider;

export function useWebSocketContext(): WebSocketContextType {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocketContext must be used within WebSocketProvider');
  return ctx;
}
