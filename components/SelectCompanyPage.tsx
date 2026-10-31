import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { apiClient } from '../services';
import { User, UserCompanyRelation } from '../types';
import { SelectCompany } from './SelectCompany';
import { isAxiosError } from '../utils/typeGuards';
import { logger } from '../utils/logger';

export const SelectCompanyPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [companies, setCompanies] = useState<UserCompanyRelation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const forceShow = searchParams.get('show') === 'true';

  useEffect(() => {
    const fetchUserData = async () => {
      // Try multiple times in case company was just created and backend hasn't updated yet
      let attempts = 0;
      const maxAttempts = 3;
      let success = false;

      while (attempts < maxAttempts && !success) {
        try {
          logger.debug('SelectCompanyPage: Fetching user data', {
            attempt: attempts + 1,
            maxAttempts,
          });
          const response = await apiClient.get<User>('/api/v1/users/me');
          logger.debug('SelectCompanyPage: Full API response', { response });
          logger.debug('SelectCompanyPage: Response data', { data: response.data });

          const user: User = response.data;
          logger.debug('SelectCompanyPage: Parsed user', { user });
          logger.debug('SelectCompanyPage: User companies', { companies: user.companies });
          logger.debug('SelectCompanyPage: Companies count', {
            count: user.companies?.length || 0,
          });

          const companiesList = user.companies || [];
          logger.debug('SelectCompanyPage: Companies list', { companiesList });
          logger.debug('SelectCompanyPage: Companies list length', {
            length: companiesList.length,
          });
          setCompanies(companiesList);
          
          // If user has no companies, redirect to onboarding
          if (companiesList.length === 0) {
            logger.warn('SelectCompanyPage: No companies found, redirecting to onboarding');
            navigate('/onboarding', { replace: true });
            return;
          }
          
          // If user has only one company, auto-select it (unless forceShow is true)
          if (companiesList.length === 1 && !forceShow) {
            logger.debug('SelectCompanyPage: Single company found, auto-selecting', {
              companyId: companiesList[0].company_id,
            });
            navigate(`/${companiesList[0].company_id}/inbox`, { replace: true });
            return;
          }
          
          // Success - we have multiple companies, show selection
          logger.debug('SelectCompanyPage: Successfully loaded companies', { companiesList });
          success = true;
        } catch (err) {
          logger.error(`SelectCompanyPage: Attempt ${attempts + 1} failed`, err);
          
          if (isAxiosError(err) && err.response?.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            navigate('/login', { replace: true });
            return;
          }
          
          attempts++;
          if (attempts < maxAttempts) {
            // Wait before next attempt (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          } else {
            // Last attempt failed
            setError('Не удалось загрузить данные пользователя.');
          }
        }
      }
      
      setIsLoading(false);
    };

    fetchUserData();
  }, [navigate]);

  const handleSelect = (companyId: number) => {
    navigate(`/${companyId}/inbox`);
  };

  const handleCreate = () => {
    navigate('/onboarding');
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full bg-white items-center justify-center flex-col gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <div className="text-gray-500 text-sm font-medium">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full bg-white items-center justify-center flex-col gap-4">
        <div className="text-red-500 text-sm font-medium">{error}</div>
        <button onClick={handleLogout} className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors">
          Выйти
        </button>
      </div>
    );
  }

  return (
    <SelectCompany 
      companies={companies} 
      onSelect={handleSelect} 
      onCreate={handleCreate}
      onLogout={handleLogout}
    />
  );
};

