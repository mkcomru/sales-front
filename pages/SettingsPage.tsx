import React from 'react';
import { useParams } from 'react-router-dom';
import { AgentSettings } from '../components/AgentSettings';

export const SettingsPage: React.FC = () => {
    const { companyId: companyIdParam } = useParams<{ companyId: string }>();
    const companyId = companyIdParam ? parseInt(companyIdParam, 10) : null;

    if (!companyId) return null;

    return <AgentSettings companyId={companyId} />;
};
