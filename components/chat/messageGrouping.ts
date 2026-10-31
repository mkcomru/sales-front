import { Message, MessageType } from '../../types';

export type MessageThreadRow =
  | { type: 'systemGroup'; messages: Message[] }
  | { type: 'bubbleGroup'; messages: Message[] };

function authorKey(m: Message): string {
  return m.type === MessageType.MANAGER || m.type === MessageType.NOTE
    ? `${m.type}:${m.senderName ?? ''}`
    : m.type;
}

export function groupMessages(messages: Message[]): MessageThreadRow[] {
  const rows: MessageThreadRow[] = [];
  let systemBuffer: Message[] = [];
  let bubbleBuffer: Message[] = [];

  const flushBubbles = () => {
    if (bubbleBuffer.length > 0) {
      rows.push({ type: 'bubbleGroup', messages: [...bubbleBuffer] });
      bubbleBuffer = [];
    }
  };

  for (const msg of messages) {
    if (msg.type === MessageType.SYSTEM) {
      flushBubbles();
      systemBuffer.push(msg);
      continue;
    }
    if (systemBuffer.length > 0) {
      rows.push({ type: 'systemGroup', messages: [...systemBuffer] });
      systemBuffer = [];
    }
    const last = bubbleBuffer[bubbleBuffer.length - 1];
    if (bubbleBuffer.length > 0 && authorKey(last) !== authorKey(msg)) {
      flushBubbles();
    }
    bubbleBuffer.push(msg);
  }
  flushBubbles();
  if (systemBuffer.length > 0) {
    rows.push({ type: 'systemGroup', messages: systemBuffer });
  }
  return rows;
}
