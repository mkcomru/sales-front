import React from 'react';
import { useParams } from 'react-router-dom';
import { Analytics } from '../components/Analytics';

export const AnalyticsPage: React.FC = () => {
  const { companyId: companyIdParam } = useParams<{ companyId: string }>();
  const companyId = companyIdParam ? parseInt(companyIdParam, 10) : null;

  if (!companyId) {
    return null;
  }

  return <Analytics companyId={companyId} />;
};
