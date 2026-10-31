import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Loader2 } from 'lucide-react';
import { tasksService } from '../services';

type OrderTasksTeaserProps = {
  companyId: number;
  orderId: number;
};

/** In order sidebar: one tap opens full task list + filters (source of truth). */
export const OrderTasksTeaser: React.FC<OrderTasksTeaserProps> = ({ companyId, orderId }) => {
  const navigate = useNavigate();
  const [activeCount, setActiveCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await tasksService.listForOrder(companyId, orderId, {
          includeCompleted: false,
        });
        if (!cancelled) setActiveCount(items.length);
      } catch {
        if (!cancelled) setActiveCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, orderId]);

  const href = `/${companyId}/orders/${orderId}/tasks`;

  return (
    <button
      type="button"
      onClick={() => navigate(href)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
    >
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Задачи</div>
        <div className="mt-0.5 text-[13px] font-medium text-gray-900">
          {activeCount === null ? (
            <Loader2 size={14} className="inline animate-spin text-gray-400" />
          ) : (
            <>Активных: {activeCount}</>
          )}
        </div>
      </div>
      <ChevronRight size={18} className="flex-shrink-0 text-gray-400" />
    </button>
  );
};
