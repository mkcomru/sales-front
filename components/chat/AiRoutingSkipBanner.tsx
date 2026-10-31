import React, { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useChatContext } from '../../contexts/ChatContext';
import type { AiRoutingSkipReason } from '../../utils/aiRoutingSkip';
import { labelForAiRoutingSkip } from '../../utils/aiRoutingSkip';

const AUTO_DISMISS_MS = 14000;

export interface AiRoutingSkipBannerProps {
  threadId: string;
  reason: AiRoutingSkipReason;
  /** 'desktop' = ChatComposer bar, 'mobile' = tighter padding */
  variant?: 'desktop' | 'mobile';
}

export const AiRoutingSkipBanner: React.FC<AiRoutingSkipBannerProps> = ({
  threadId,
  reason,
  variant = 'desktop',
}) => {
  const { chatDispatch } = useChatContext();

  useEffect(() => {
    const t = window.setTimeout(() => {
      chatDispatch({ type: 'CLEAR_AI_ROUTING_SKIP', payload: { threadId } });
    }, AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [threadId, chatDispatch]);

  const pad = variant === 'mobile' ? 'px-3 py-2' : 'px-3 py-2.5';

  return (
    <div
      className={`mb-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 ${pad} text-[12px] font-medium text-amber-950`}
      role="status"
    >
      <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-amber-600" />
      <p className="min-w-0 flex-1 leading-snug">{labelForAiRoutingSkip(reason)}</p>
      <button
        type="button"
        onClick={() => chatDispatch({ type: 'CLEAR_AI_ROUTING_SKIP', payload: { threadId } })}
        className="flex-shrink-0 rounded-lg p-1 text-amber-700 hover:bg-amber-100/80"
        aria-label="Закрыть"
      >
        <X size={14} />
      </button>
    </div>
  );
};
