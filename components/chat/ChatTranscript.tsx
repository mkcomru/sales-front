import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Message } from '../../types';
import { groupMessages } from './messageGrouping';
import { MessageBubbleGroup } from './MessageBubbleGroup';
import { SystemMessageGroup } from './SystemMessageGroup';
import { AiTypingBubble } from './AiTypingBubble';
import type { TranscriptBubbleVariant } from './messageBubbleStyles';
import { formatMessageDayLabel, messageDayKey } from '../../utils/chatDate';

export interface ChatTranscriptProps {
  isAiManaged: boolean;
  chatMessages: Message[];
  companyId?: number;
  newMessageIds: Set<string>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  inputAreaHeight: number;
  rubberOffset: number;
  rubberSnapping: boolean;
  showAssistantTyping?: boolean;
  variant?: TranscriptBubbleVariant;
  onRequestLoadOlder?: () => void;
  isLoadingOlderMessages?: boolean;
  hasMoreOlderMessages?: boolean;
}

export const ChatTranscript: React.FC<ChatTranscriptProps> = ({
  isAiManaged,
  chatMessages,
  companyId,
  newMessageIds,
  scrollContainerRef,
  messagesEndRef,
  inputAreaHeight,
  rubberOffset,
  rubberSnapping,
  showAssistantTyping = false,
  variant = 'desktop',
  onRequestLoadOlder,
  isLoadingOlderMessages = false,
  hasMoreOlderMessages = false,
}) => {
  const prevIsAiManagedRef = useRef(isAiManaged);
  const pendingScrollRestoreRef = useRef<{ height: number; top: number } | null>(null);
  const wasLoadingOlderRef = useRef(false);
  const loadOlderSentinelRef = useRef<HTMLDivElement>(null);
  const loadingOlderRef = useRef(isLoadingOlderMessages);
  loadingOlderRef.current = isLoadingOlderMessages;

  useLayoutEffect(() => {
    const root = scrollContainerRef.current;
    const target = loadOlderSentinelRef.current;
    if (!root || !target || !onRequestLoadOlder) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loadingOlderRef.current) return;
        pendingScrollRestoreRef.current = { height: root.scrollHeight, top: root.scrollTop };
        onRequestLoadOlder();
      },
      { root, rootMargin: '120px', threshold: 0 },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [onRequestLoadOlder, chatMessages.length, scrollContainerRef]);

  useLayoutEffect(() => {
    if (wasLoadingOlderRef.current && !isLoadingOlderMessages && pendingScrollRestoreRef.current) {
      const sc = scrollContainerRef.current;
      const snap = pendingScrollRestoreRef.current;
      if (sc) {
        const h = sc.scrollHeight;
        sc.scrollTop = h - snap.height + snap.top;
      }
      pendingScrollRestoreRef.current = null;
    }
    wasLoadingOlderRef.current = isLoadingOlderMessages;
  }, [isLoadingOlderMessages, chatMessages.length, scrollContainerRef]);

  useEffect(() => {
    const wasAiManaged = prevIsAiManagedRef.current;
    prevIsAiManagedRef.current = isAiManaged;
    if (wasAiManaged === isAiManaged) return;
    const sc = scrollContainerRef.current;
    if (!sc) return;
    const atBottom = sc.scrollHeight - sc.clientHeight - sc.scrollTop < 20;
    if (atBottom) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [isAiManaged, scrollContainerRef, messagesEndRef]);

  useEffect(() => {
    if (!showAssistantTyping) return;
    const sc = scrollContainerRef.current;
    if (!sc) return;
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, [showAssistantTyping, scrollContainerRef, messagesEndRef]);

  const rows = groupMessages(chatMessages);
  let lastDayKey = '';

  return (
    <div
      ref={scrollContainerRef}
      className={`flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden transition-[padding] duration-300 ${
        variant === 'mobile' ? 'px-3 py-4' : 'px-8 py-6'
      }`}
      style={{ paddingBottom: variant === 'mobile' ? 12 : inputAreaHeight + 24 }}
    >
      <div
        className={`mx-auto flex flex-col ${variant === 'mobile' ? 'max-w-none gap-4' : 'max-w-4xl gap-6'}`}
        style={{
          transform: `translateY(${rubberOffset}px)`,
          transition: rubberSnapping ? 'transform 0.22s cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
        }}
      >
        {chatMessages.length > 0 && (
          <div ref={loadOlderSentinelRef} className="h-1 w-full shrink-0" aria-hidden />
        )}
        {(isLoadingOlderMessages || (hasMoreOlderMessages && chatMessages.length > 0)) && (
          <div className="flex min-h-[36px] items-center justify-center gap-2 py-1 text-[11px] text-gray-500">
            {isLoadingOlderMessages ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-indigo-500" aria-hidden />
                <span>Загружаем историю…</span>
              </>
            ) : (
              <span className="text-gray-400">Прокрутите вверх для более старых сообщений</span>
            )}
          </div>
        )}
        {rows.map((row) => {
          const key = row.messages.map((m) => m.clientId ?? m.id).join('-');
          const firstMessage = row.messages[0];
          const currentDayKey = messageDayKey(firstMessage?.createdAt);
          const showDaySeparator = currentDayKey !== lastDayKey;
          if (showDaySeparator) {
            lastDayKey = currentDayKey;
          }

          return row.type === 'systemGroup' ? (
            <div key={key}>
              {showDaySeparator && (
                <div className="flex justify-center py-1">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-gray-500 shadow-sm ring-1 ring-black/5">
                    {formatMessageDayLabel(firstMessage?.createdAt)}
                  </span>
                </div>
              )}
              <SystemMessageGroup
                messages={row.messages}
                newMessageIds={newMessageIds}
                variant={variant}
              />
            </div>
          ) : (
            <div key={key}>
              {showDaySeparator && (
                <div className="flex justify-center py-1">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-gray-500 shadow-sm ring-1 ring-black/5">
                    {formatMessageDayLabel(firstMessage?.createdAt)}
                  </span>
                </div>
              )}
              <MessageBubbleGroup
                messages={row.messages}
                newMessageIds={newMessageIds}
                companyId={companyId}
                variant={variant}
              />
            </div>
          );
        })}

        {showAssistantTyping && (
          <div key="ai-typing">
            <AiTypingBubble />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
