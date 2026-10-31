import { Message, MessageType } from '../../types';

export type TranscriptBubbleVariant = 'desktop' | 'mobile';

export interface BubbleStyleInfo {
  isClient: boolean;
  isAi: boolean;
  isNote: boolean;
  isFailed: boolean;
  isManager: boolean;
  bubbleClass: string;
}

export function getBubbleStyleInfo(msg: Message, variant: TranscriptBubbleVariant): BubbleStyleInfo {
  const isClient = msg.type === MessageType.CLIENT;
  const isAi = msg.type === MessageType.AI;
  const isNote = msg.type === MessageType.NOTE;
  const isFailed = msg.status === 'failed';
  const isManager = msg.type === MessageType.MANAGER;

  if (variant === 'mobile') {
    const cls = isClient
      ? 'bg-white border border-gray-200 text-gray-900 rounded-[18px] rounded-bl-[4px]'
      : isAi
        ? 'bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-[18px] rounded-br-[4px]'
        : isNote
          ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-[18px] rounded-br-[4px]'
          : isFailed
            ? 'bg-red-50 border border-red-200 text-red-900 rounded-[18px] rounded-br-[4px]'
            : 'bg-gray-900 text-white rounded-[18px] rounded-br-[4px]';
    return { isClient, isAi, isNote, isFailed, isManager, bubbleClass: cls };
  }

  const bubbleClass = isClient
    ? 'bg-white border border-gray-200 text-gray-900 rounded-2xl rounded-bl-sm'
    : isAi
      ? 'bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-2xl rounded-br-sm'
      : isNote
        ? 'bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-2xl rounded-br-sm'
        : isFailed
          ? 'bg-red-50 border border-red-200 text-red-900 rounded-2xl rounded-br-sm'
          : 'bg-gray-900 text-white rounded-2xl rounded-br-sm';
  return { isClient, isAi, isNote, isFailed, isManager, bubbleClass };
}
