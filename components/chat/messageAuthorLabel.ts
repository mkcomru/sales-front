import { Message, MessageType } from '../../types';
import type { TranscriptBubbleVariant } from './messageBubbleStyles';

export function getAuthorLabel(msg: Message, variant: TranscriptBubbleVariant): string {
  if (msg.type === MessageType.AI) {
    return variant === 'desktop' ? 'AI Assistant' : 'AI';
  }
  if (msg.type === MessageType.MANAGER) return msg.senderName || 'Менеджер';
  if (msg.type === MessageType.NOTE) return 'Заметка';
  return msg.senderName ?? '';
}

export function getAuthorInitials(name: string): string {
  return (
    name
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}
