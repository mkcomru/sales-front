import { useEffect, useCallback, useRef } from 'react';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import type { RealtimeEvent } from './useWebSocket';

export function useRealtimeEvent(topic: string, handler: (event: RealtimeEvent) => void): void {
  const { subscribeTopic, unsubscribeTopic, addTopicHandler, removeTopicHandler } =
    useWebSocketContext();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const wrapped = useCallback((event: RealtimeEvent) => {
    handlerRef.current(event);
  }, []);

  useEffect(() => {
    subscribeTopic(topic);
    addTopicHandler(topic, wrapped);
    return () => {
      removeTopicHandler(topic, wrapped);
      unsubscribeTopic(topic);
    };
  }, [topic, subscribeTopic, unsubscribeTopic, addTopicHandler, removeTopicHandler, wrapped]);
}
