import { useState, useEffect, useCallback, useRef } from 'react';
import { ordersService } from '../services';
import type { OrderResponse } from '../types/api';
import { logger } from '../utils/logger';

export function useOrders(companyId: number | null) {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(false);

  const fetchOrders = useCallback(async () => {
    if (!companyId) return;
    const showLoader = !hasFetched.current;
    try {
      if (showLoader) setLoading(true);
      const data = await ordersService.list(companyId);
      setOrders(data);
      hasFetched.current = true;
    } catch (error) {
      logger.error('Failed to fetch orders', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    hasFetched.current = false;
    fetchOrders();
  }, [fetchOrders]);

  return { orders, loading, refetch: fetchOrders };
}
