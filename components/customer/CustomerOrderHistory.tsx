import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { ordersService } from '../../services';
import type { OrderResponse } from '../../types/api';
import { logger } from '../../utils/logger';

interface CustomerOrderHistoryProps {
  companyId: number;
  customerId: number;
  currentOrderId?: number;
  onOpenOrder?: (orderId: number) => void;
}

export const CustomerOrderHistory: React.FC<CustomerOrderHistoryProps> = ({
  companyId,
  customerId,
  currentOrderId,
  onOpenOrder,
}) => {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ordersService.getCustomerOrders(companyId, customerId);
      setOrders(data);
    } catch (error) {
      logger.error('Failed to fetch customer orders', error);
    } finally {
      setLoading(false);
    }
  }, [companyId, customerId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">История заказов</h4>
      {loading && <Loader2 size={16} className="animate-spin text-gray-400" />}
      {!loading && orders.length === 0 && (
        <div className="text-[13px] text-gray-400 italic py-1">Нет заказов</div>
      )}
      {orders.map((order) => {
        const isCurrent = currentOrderId != null && order.id === currentOrderId;
        const isClickable = Boolean(onOpenOrder);
        return (
          <div
            key={order.id}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onClick={isClickable ? () => onOpenOrder!(order.id) : undefined}
            onKeyDown={
              isClickable
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenOrder!(order.id);
                    }
                  }
                : undefined
            }
            className={`flex items-center justify-between p-2 rounded-lg border text-[12px] ${
              isCurrent
                ? 'bg-sky-50/80 border-sky-200 ring-1 ring-sky-100'
                : 'bg-gray-50 border-gray-100'
            } ${isClickable ? 'cursor-pointer transition-colors' : ''} ${
              isClickable && isCurrent ? 'hover:bg-sky-100' : isClickable ? 'hover:bg-gray-100 hover:border-gray-200' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText size={12} className="text-gray-400" />
              <span className="font-medium text-gray-700">#{order.order_number}</span>
              {order.stage && (
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    backgroundColor: order.stage.color ? `${order.stage.color}15` : '#f3f4f6',
                    color: order.stage.color || '#6b7280',
                  }}
                >
                  {order.stage.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-400">
              {isCurrent && (
                <span className="text-sky-600 font-medium text-[10px]">Текущий</span>
              )}
              {order.result && (
                <span className={order.result === 'won' ? 'text-green-600' : 'text-red-600'}>
                  {order.result === 'won' ? 'Выиграно' : 'Проиграно'}
                </span>
              )}
              <span>{new Date(order.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
