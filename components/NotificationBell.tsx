import React, { useState, useRef } from 'react';
import { Bell, Check, MessageSquare } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNotificationContext } from '../contexts/NotificationContext';
import type { NotificationRecipientResponse } from '../types/api';

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  return `${Math.floor(hours / 24)} дн назад`;
}

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { state, load, markRead, markAllRead } = useNotificationContext();
  const navigate = useNavigate();
  const { companyId } = useParams<{ companyId: string }>();

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!state.isLoaded && companyId) {
      load(Number(companyId));
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  const handleItemClick = (item: NotificationRecipientResponse) => {
    if (!companyId) return;
    if (!item.is_read) {
      markRead(Number(companyId), item.id);
    }
    const threadId = item.notification.payload.thread_id as string | undefined;
    if (threadId) {
      navigate(`/${companyId}/inbox?thread=${threadId}`);
    }
    setIsOpen(false);
  };

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!companyId) return;
    markAllRead(Number(companyId));
  };

  return (
    <div
      className="relative z-30"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className={`relative text-gray-400 hover:text-gray-700 transition-colors p-1.5 rounded-md ${
          isOpen ? 'bg-gray-100 text-gray-900' : 'hover:bg-gray-100'
        }`}
      >
        <Bell size={18} />
        {state.unread_count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full border border-white flex items-center justify-center px-0.5">
            {state.unread_count > 99 ? '99+' : state.unread_count}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-[320px] bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-white">
            <h3 className="text-[13px] font-bold text-gray-900">Уведомления</h3>
            {state.unread_count > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-medium text-gray-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
              >
                <Check size={12} /> Все прочитано
              </button>
            )}
          </div>

          <div className="flex flex-col max-h-[400px] overflow-y-auto">
            {state.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Bell size={24} className="mb-2 opacity-40" />
                <p className="text-[12px]">Нет уведомлений</p>
              </div>
            ) : (
              state.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`flex gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !item.is_read ? 'bg-indigo-50/40' : ''
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0 w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-100">
                    <MessageSquare size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 leading-snug mb-0.5">
                      {item.notification.body}
                    </p>
                    <span className="text-[11px] text-gray-400">
                      {formatRelativeTime(item.notification.created_at)}
                    </span>
                  </div>
                  {!item.is_read && (
                    <div className="flex-shrink-0 mt-1.5 w-2 h-2 bg-indigo-500 rounded-full" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
