import React, { useState } from 'react';
import { Loader2, ArrowLeft, Building, FileText } from 'lucide-react';
import { CompanyService } from '../lib/api';
import { isAxiosError, isApiErrorResponse } from '../utils/typeGuards';
import type { AxiosErrorResponse, ValidationErrorDetail } from '../types/errors';
import { logger } from '../utils/logger';

interface OnboardingProps {
  onCreated: () => void;
  onCancel: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onCreated, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      logger.debug('Creating company', { name: name.trim(), description: description.trim() });
      const result = await CompanyService.createCompany(name.trim(), description.trim());
      logger.debug('Company created successfully', { result });
      
      // Check if result has an id (company was created)
      if (result && result.id) {
        logger.debug('Company ID', { id: result.id });
        // Don't set isLoading to false here - let OnboardingPage handle the loading state
        onCreated(); // Callback to parent to reload user data
      } else {
        logger.warn('Company creation response missing ID', { result });
        setError('Компания создана, но ответ сервера неполный. Попробуйте обновить страницу.');
        setIsLoading(false);
      }
    } catch (err) {
      logger.error('Create company failed', err);

      const error = err as AxiosErrorResponse;
      logger.error(
        'Error details',
        err,
        {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        },
      );
      
      // Better error message handling
      let errorMessage = "Не удалось создать компанию. Попробуйте позже.";
      if (error.response?.data && isApiErrorResponse(error.response.data)) {
        const data = error.response.data;
        if (data.detail) {
          // FastAPI validation errors
          if (Array.isArray(data.detail)) {
            errorMessage = data.detail
              .map((d: ValidationErrorDetail) => d.msg || d.message || '')
              .filter(Boolean)
              .join(', ');
          } else if (typeof data.detail === 'string') {
            errorMessage = data.detail;
          }
        } else if (data.message) {
          errorMessage = data.message;
        }
      }
      
      setError(errorMessage);
      setIsLoading(false); // Only set to false on error
    }
  };

  return (
    <div className="page-shell">
      <div className="w-full max-w-[480px] card overflow-hidden">
        
        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <button 
            onClick={onCancel}
            className="flex items-center gap-1 text-gray-400 hover:text-gray-900 transition-colors text-sm mb-6"
          >
            <ArrowLeft size={16} /> Назад
          </button>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Создание компании</h2>
          <p className="text-gray-500 text-sm">
            Задайте базовые настройки для вашего нового рабочего пространства. AI-ассистент будет сконфигурирован автоматически.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 pb-10 flex flex-col gap-5">
          
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
              Название компании <span className="text-red-500">*</span>
            </label>
            <div className="relative group">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building size={16} className="text-gray-400 group-focus-within:text-gray-600 transition-colors" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-gray-200 text-gray-900 text-[14px] rounded-lg pl-10 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-300 transition-all placeholder-gray-400"
                placeholder="Мой Бизнес"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
              Описание (для AI)
            </label>
            <div className="relative group">
               <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                <FileText size={16} className="text-gray-400 group-focus-within:text-gray-600 transition-colors" />
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white border border-gray-200 text-gray-900 text-[14px] rounded-lg pl-10 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-300 transition-all placeholder-gray-400 min-h-[100px] resize-none"
                placeholder="Чем занимается ваша компания? Это поможет настроить контекст для бота."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !name.trim()}
            className={`
              mt-2 w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white font-semibold py-2.5 rounded-lg transition-all shadow-sm
              ${(isLoading || !name.trim()) ? 'opacity-70 cursor-not-allowed' : ''}
            `}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Создать компанию'}
          </button>
        </form>
      </div>
    </div>
  );
};
