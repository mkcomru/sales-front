import { useEffect, RefObject } from 'react';

export function useScrollToBottomOnLastMessage(
  messagesEndRef: RefObject<HTMLDivElement | null>,
  lastMessageId: string | undefined,
) {
  useEffect(() => {
    if (lastMessageId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lastMessageId, messagesEndRef]);
}
