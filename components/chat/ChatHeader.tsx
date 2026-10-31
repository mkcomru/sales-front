import React from 'react';
import { ArrowLeft, Bot, Info, Package, PanelRightOpen } from 'lucide-react';
import { ChatSession } from '../../types';
import { resolveAiStatusBadge, AI_STATUS_STYLES, AI_STATUS_ICON_COLOR } from '../../utils/aiStatus';

export interface ChatHeaderProps {
  chat: ChatSession;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  onOpenOrder?: (orderId: number) => void;
  variant?: 'desktop' | 'mobile';
  onBack?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  chat,
  isSidebarOpen,
  toggleSidebar,
  onOpenOrder,
  variant = 'desktop',
  onBack,
}) => {
  const badge = resolveAiStatusBadge(chat.assistantMode);

  if (variant === 'mobile') {
    return (
      <div className="relative z-20 shrink-0 border-b border-gray-100 bg-white px-3 pb-3 pt-[max(env(safe-area-inset-top),10px)]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100"
            aria-label="Назад к списку диалогов"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="min-w-0 flex-1">
            <div className="truncate text-[16px] font-semibold text-gray-950">
              {chat.customerName || 'Без имени'}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[12px] text-gray-500">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium ${AI_STATUS_STYLES[badge.variant]}`}
              >
                <Bot size={11} className={AI_STATUS_ICON_COLOR[badge.variant]} />
                {badge.label}
              </span>
              {chat.orderId != null && onOpenOrder && (
                <button
                  type="button"
                  onClick={() => {
                    const id = chat.orderId;
                    if (id == null) return;
                    onOpenOrder(id);
                  }}
                  className="truncate text-indigo-600"
                >
                  Заказ #{chat.order?.order_number ?? chat.orderId}
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={toggleSidebar}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100"
            aria-label="Открыть детали клиента"
          >
            <Info size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
  <div className="sticky top-0 z-20 h-[64px] px-8 flex items-center justify-between flex-shrink-0 bg-white border-b border-gray-100">
    <div className="flex items-center gap-3 min-w-0">
      <h2 className="text-[15px] font-bold text-gray-900 truncate min-w-0">{chat.customerName}</h2>
      <span
        className={`flex-shrink-0 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${AI_STATUS_STYLES[badge.variant]}`}
        title="Режим ассистента"
      >
        <Bot size={12} className={AI_STATUS_ICON_COLOR[badge.variant]} />
        {badge.label}
      </span>
      {chat.orderId != null && onOpenOrder && (
        <button
          type="button"
          onClick={() => {
            const id = chat.orderId;
            if (id == null) return;
            onOpenOrder(id);
          }}
          className="flex items-center gap-1 flex-shrink-0 text-[12px] font-semibold text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-50"
          title="Открыть детали заказа"
        >
          <Package size={14} className="opacity-80" />
          <span>Заказ #{chat.order?.order_number ?? chat.orderId}</span>
        </button>
      )}
    </div>

    <div className="flex items-center gap-4">
      {!isSidebarOpen && (
        <button
          type="button"
          onClick={toggleSidebar}
          className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors hover:bg-gray-100 rounded-md"
          title="Открыть детали"
        >
          <PanelRightOpen size={18} />
        </button>
      )}
    </div>
  </div>
  );
};
