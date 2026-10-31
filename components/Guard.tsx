import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { apiClient } from '../services';
import { User } from '../types';
import { isAxiosError } from '../utils/typeGuards';
import { logger } from '../utils/logger';

export const Guard: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      const token = localStorage.getItem('access_token');
      
      // If no token, redirect to login
      if (!token) {
        navigate('/login', { replace: true });
        return;
      }

      // If has token, fetch user data
      try {
        const response = await apiClient.get<User>('/api/v1/users/me');
        const user: User = response.data;

        // Check if user has companies
        if (user.companies && user.companies.length > 0) {
          // User has companies -> redirect to select-company
          navigate('/select-company', { replace: true });
        } else {
          // User has NO companies -> redirect to onboarding
          navigate('/onboarding', { replace: true });
        }
      } catch (error) {
        logger.error('Failed to fetch user data', error);
        // If token is invalid, clear it and redirect to login
        if (isAxiosError(error) && error.response?.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          navigate('/login', { replace: true });
        } else {
          // Other errors - still redirect to login for safety
          navigate('/login', { replace: true });
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndRedirect();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full bg-white items-center justify-center flex-col gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <div className="text-gray-500 text-sm font-medium">Загрузка...</div>
      </div>
    );
  }

  return null;
};


