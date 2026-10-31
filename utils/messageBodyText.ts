import type { Message } from '../types';

export function messageBodyText(msg: Pick<Message, 'content' | 'transcription'>): string {
  const t = msg.transcription?.trim();
  if (t) return t;
  return msg.content ?? '';
}
