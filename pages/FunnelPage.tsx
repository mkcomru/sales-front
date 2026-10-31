import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SalesFunnel } from '../components/SalesFunnel';

export const FunnelPage: React.FC = () => {
    const { companyId: companyIdParam } = useParams<{ companyId: string }>();
    const companyId = companyIdParam ? parseInt(companyIdParam, 10) : null;
    const navigate = useNavigate();

    const handleNavigate = (
        view: 'inbox' | 'settings' | 'products' | 'funnel',
        options?: { inboxSearch?: Record<string, string> }
    ) => {
        if (view === 'inbox') {
            const entries = options?.inboxSearch;
            const search =
                entries && Object.keys(entries).length > 0
                    ? new URLSearchParams(entries).toString()
                    : '';
            if (search) {
                navigate({ pathname: '../inbox', search });
            } else {
                navigate('../inbox');
            }
            return;
        }
        navigate(`../${view}`);
    };

    if (!companyId) return null;

    return <SalesFunnel companyId={companyId} onNavigate={handleNavigate} />;
};
