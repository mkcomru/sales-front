import React from 'react';
import { Message } from '../../types';
import type { TranscriptBubbleVariant } from './messageBubbleStyles';

export interface SystemMessageGroupProps {
  messages: Message[];
  newMessageIds?: Set<string>;
  variant: TranscriptBubbleVariant;
}

export const SystemMessageGroup = React.memo<SystemMessageGroupProps>(
  ({ messages, newMessageIds, variant }) => {
    const animClass = 'animate-msg-enter';

    if (variant === 'mobile') {
      return (
        <div className="flex justify-center my-1">
          <div className="bg-gray-500/10 px-4 py-1.5 rounded-2xl max-w-[85%]">
            {messages.map((msg, i) => (
              <div
                key={msg.clientId ?? msg.id}
                className={`${i > 0 ? 'border-t border-gray-400/20 pt-1 mt-1' : ''} ${newMessageIds?.has(msg.clientId ?? msg.id) ? animClass : ''}`}
              >
                <p className="text-[12px] text-gray-500 text-center">{msg.content}</p>
                <p className="text-[10px] text-gray-400 text-center">{msg.timestamp}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="flex w-full justify-center my-4 group">
        <div className="flex flex-col bg-gray-100 px-3 py-2 rounded-2xl border border-gray-200/60">
          {messages.map((msg, idx) => {
            const wrapCls = newMessageIds?.has(msg.id) ? animClass : '';
            return (
              <div
                key={msg.clientId ?? msg.id}
                className={`flex flex-col gap-0.5 w-full py-1.5 ${idx > 0 ? 'border-t border-gray-300/70' : ''} ${wrapCls}`}
              >
                <div className="flex items-start gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0 mt-1.5" />
                  <span className="text-[11px] font-medium text-gray-600 whitespace-pre-line flex-1 min-w-0 text-left">
                    {msg.content}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 text-right mr-1">{msg.timestamp || '—'}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

SystemMessageGroup.displayName = 'SystemMessageGroup';
