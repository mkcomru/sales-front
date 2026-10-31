import { useState, useCallback } from 'react';
import { tasksService } from '../services';
import type { TaskResponse } from '../types/api';
import { logger } from '../utils/logger';

export function useTasks(companyId: number | null, orderId: number | null) {
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!companyId || !orderId) return;
    try {
      setLoading(true);
      const data = await tasksService.listForOrder(companyId, orderId);
      setTasks(data);
    } catch (error) {
      logger.error('Failed to fetch tasks', error);
    } finally {
      setLoading(false);
    }
  }, [companyId, orderId]);

  return { tasks, loading, refetch: fetchTasks };
}
