import { Message, MessageType } from '../types';

export type VoiceBubbleSurface = 'manager' | 'client' | 'ai' | 'note' | 'failed';

export function voiceBubbleSurface(msg: Message): VoiceBubbleSurface {
  if (msg.status === 'failed') return 'failed';
  if (msg.type === MessageType.NOTE) return 'note';
  if (msg.type === MessageType.AI) return 'ai';
  if (msg.type === MessageType.CLIENT) return 'client';
  return 'manager';
}
