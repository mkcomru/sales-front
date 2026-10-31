import React from 'react';
import { useParams } from 'react-router-dom';
import { ProductCatalog } from '../components/ProductCatalog';

export const ProductsPage: React.FC = () => {
    const { companyId: companyIdParam } = useParams<{ companyId: string }>();
    const companyId = companyIdParam ? parseInt(companyIdParam, 10) : null;

    if (!companyId) return null;

    return <ProductCatalog companyId={companyId} />;
};
