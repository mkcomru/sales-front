import { useEffect, useRef } from 'react';
import { Message } from '../types';

function messageKey(message: Message): string {
  return message.clientId ?? message.id;
}

export function useChatNewMessageIds(chatId: string, messages: Message[]): Set<string> {
  const seenIdsRef = useRef<Set<string>>(new Set());
  const lastChatIdRef = useRef(chatId);

  if (lastChatIdRef.current !== chatId) {
    lastChatIdRef.current = chatId;
    seenIdsRef.current = new Set(messages.map((m) => messageKey(m)));
  }

  useEffect(() => {
    messages.forEach((m) => seenIdsRef.current.add(messageKey(m)));
  }, [messages]);

  return new Set(messages.filter((m) => !seenIdsRef.current.has(messageKey(m))).map((m) => messageKey(m)));
}
