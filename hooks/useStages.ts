import { useState, useEffect, useCallback } from 'react';
import { stagesService } from '../services';
import type { StageTemplate } from '../types/api';
import { logger } from '../utils/logger';

export function useStages(companyId: number | null) {
  const [stages, setStages] = useState<StageTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStages = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const data = await stagesService.list(companyId);
      setStages(data.sort((a, b) => a.position - b.position));
    } catch (error) {
      logger.error('Failed to fetch stages', error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  return { stages, loading, refetch: fetchStages };
}
