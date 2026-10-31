import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Onboarding } from './Onboarding';
import { api } from '../lib/api';
import { User } from '../types';
import { logger } from '../utils/logger';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCreated = async () => {
    logger.debug('handleCreated called in OnboardingPage');
    setIsProcessing(true);
    try {
      // Wait a moment for backend to process the company creation
      // Then immediately redirect - SelectCompanyPage will handle loading user data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      logger.debug('Redirecting to /select-company');
      navigate('/select-company', { replace: true });
    } catch (error) {
      logger.error('Failed to redirect after company creation', error);
      // Still redirect as fallback
      navigate('/select-company', { replace: true });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    // Check if user has companies, if so go to select-company, otherwise logout
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    // Try to fetch user data
    api.get('/api/v1/users/me')
      .then((response) => {
        const user: User = response.data;
        if (user.companies && user.companies.length > 0) {
          navigate('/select-company', { replace: true });
        } else {
          // No companies, logout
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          navigate('/login', { replace: true });
        }
      })
      .catch(() => {
        // On error, just go to login
        navigate('/login', { replace: true });
      });
  };

  if (isProcessing) {
    return (
      <div className="flex h-screen w-full bg-white items-center justify-center flex-col gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <div className="text-gray-500 text-sm font-medium">Создание компании...</div>
      </div>
    );
  }

  return <Onboarding onCreated={handleCreated} onCancel={handleCancel} />;
};

