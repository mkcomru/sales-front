import React from 'react';
import { Unplug } from 'lucide-react';

export interface TransportUnavailableBannerProps {
  variant?: 'desktop' | 'mobile';
}

export const TransportUnavailableBanner = React.memo<TransportUnavailableBannerProps>(({ variant = 'desktop' }) => {
  const box =
    variant === 'mobile'
      ? 'mb-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] font-medium text-amber-950'
      : 'mb-2 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2.5 text-[13px] font-medium text-amber-950';

  return (
    <div className={`flex items-start gap-2 ${box}`}>
      <Unplug className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" strokeWidth={2.2} />
      <p className="min-w-0 leading-snug">
        Канал с мессенджером недоступен (коннектор удалён или не настроен). Отправка сообщений клиенту отключена;
        доступны только внутренние заметки.
      </p>
    </div>
  );
});

TransportUnavailableBanner.displayName = 'TransportUnavailableBanner';
