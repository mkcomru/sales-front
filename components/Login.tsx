import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, KeyRound, Mail } from 'lucide-react';
import { authService, apiClient } from '../services';
import { User } from '../types';
import { logger } from '../utils/logger';

interface LoginProps {}

export const Login: React.FC<LoginProps> = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await authService.login({ email, password });

      // Handle Success
      if (response.access_token) {
        localStorage.setItem('access_token', response.access_token);
        if (response.refresh_token) {
          localStorage.setItem('refresh_token', response.refresh_token);
        }
        
        // After successful login, fetch user data and redirect
        try {
          const userResponse = await apiClient.get<User>('/api/v1/users/me');
          const user: User = userResponse.data;

          // Check if user has companies
          if (user.companies && user.companies.length > 0) {
            // User has companies -> redirect to select-company
            navigate('/select-company', { replace: true });
          } else {
            // User has NO companies -> redirect to onboarding
            navigate('/onboarding', { replace: true });
          }
        } catch (userErr) {
          logger.error('Failed to fetch user data after login', userErr);
          // If we can't fetch user data, still redirect to select-company as fallback
          navigate('/select-company', { replace: true });
        }
      } else {
        setError('Ошибка: сервер не вернул токен доступа.');
      }

    } catch (err) {
      logger.error('Login failed', err);
      if (err instanceof Error) {
        if (err.message.includes('401') || err.message.includes('400') || err.message.includes('422')) {
          setError('Неверный email или пароль.');
        } else if (err.message.includes('Network')) {
          setError('Нет ответа от сервера. Проверьте интернет-соединение.');
        } else {
          setError(`Ошибка: ${err.message}`);
        }
      } else {
        setError('Произошла ошибка при отправке запроса.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-shell w-full">
      <div className="w-full max-w-[400px] card overflow-hidden">
        
        {/* Header */}
        <div className="px-8 pt-10 pb-6 text-center">
          <div className="w-12 h-12 bg-gray-900 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-sm mx-auto mb-6">
            S
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Вход в систему</h1>
          <p className="text-sm text-gray-500">
            Введите свои данные для доступа к рабочему пространству AI-CRM.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 pb-10 flex flex-col gap-5">
          
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-3">
              <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-[13px] text-red-600 font-medium">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="form-label text-gray-700 flex items-center gap-1.5">
              Email
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={16} className="text-gray-400 group-focus-within:text-gray-600 transition-colors" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input pl-10 text-[14px]"
                placeholder="name@company.com"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="form-label text-gray-700 flex items-center gap-1.5">
              Пароль
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <KeyRound size={16} className="text-gray-400 group-focus-within:text-gray-600 transition-colors" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input pl-10 text-[14px]"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`btn-primary w-full mt-2 font-semibold py-2.5 ${isLoading ? 'opacity-80 cursor-wait' : ''}`}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
};
