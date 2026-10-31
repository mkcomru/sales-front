import React, { useEffect, useRef, useState } from 'react';
import { X, MessageSquare, ArrowRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { playNotificationSound } from '../../utils/notificationSound';

const AUTO_DISMISS_MS = 6000;

export const HandoffNotificationToast: React.FC = () => {
  const { state, clearPendingToast } = useNotificationContext();
  const navigate = useNavigate();
  const { companyId } = useParams<{ companyId: string }>();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);

  const { pendingToast } = state;

  useEffect(() => {
    if (!pendingToast) {
      setVisible(false);
      return;
    }

    setVisible(true);
    playNotificationSound();

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      clearPendingToast();
    }, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pendingToast, clearPendingToast]);

  if (!pendingToast || !visible) return null;

  const { notification } = pendingToast;
  const threadId = notification.payload.thread_id as string | undefined;

  const handleOpen = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    clearPendingToast();
    if (companyId) {
      navigate(
        threadId
          ? `/${companyId}/inbox?thread=${threadId}`
          : `/${companyId}/inbox`
      );
    }
  };

  const handleClose = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    clearPendingToast();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[340px] bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 w-9 h-9 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100">
          <MessageSquare size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-gray-900 leading-snug">{notification.title}</p>
          <p className="text-[12px] text-gray-500 mt-0.5 leading-snug">{notification.body}</p>
          <button
            onClick={handleOpen}
            className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Открыть чат <ArrowRight size={12} />
          </button>
        </div>
        <button
          onClick={handleClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-0.5"
        >
          <X size={14} />
        </button>
      </div>
      {/* progress bar */}
      <div className="h-0.5 bg-indigo-100">
        <div
          className="h-full bg-indigo-500 origin-left"
          style={{ animation: `shrink ${AUTO_DISMISS_MS}ms linear forwards` }}
        />
      </div>
      <style>{`
        @keyframes shrink {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
};
