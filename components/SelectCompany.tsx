import React from 'react';
import { Building2, Plus, ArrowRight, Shield } from 'lucide-react';
import { UserCompanyRelation } from '../types';

interface SelectCompanyProps {
  companies: UserCompanyRelation[];
  onSelect: (companyId: number) => void;
  onCreate: () => void;
  onLogout: () => void;
}

export const SelectCompany: React.FC<SelectCompanyProps> = ({ 
  companies, 
  onSelect, 
  onCreate,
  onLogout 
}) => {
  return (
    <div className="page-shell flex-col">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-10">
          <div className="w-12 h-12 bg-gray-900 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-sm mx-auto mb-6">
            S
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Выберите пространство</h1>
          <p className="text-gray-500 max-w-md mx-auto">
            Ваш аккаунт привязан к нескольким компаниям. Выберите ту, с которой хотите работать сейчас.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {companies.map((company) => (
            <div 
              key={company.company_id}
              onClick={() => onSelect(company.company_id)}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group flex flex-col justify-between min-h-[160px]"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                    <Building2 size={20} />
                  </div>
                  {company.role === 'owner' && (
                    <span className="bg-amber-50 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-100 flex items-center gap-1">
                      <Shield size={10} /> OWNER
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
                  {company.company_name}
                </h3>
                <p className="text-sm text-gray-400">ID: {company.company_id}</p>
              </div>
              
              <div className="mt-4 flex items-center text-sm font-medium text-gray-400 group-hover:text-indigo-600 transition-colors gap-1">
                Войти в систему <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
              </div>
            </div>
          ))}

          {/* Create New Card */}
          <button 
            onClick={onCreate}
            className="border-2 border-dashed border-gray-200 rounded-xl p-6 hover:border-gray-400 hover:bg-gray-50 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[160px] text-gray-400 hover:text-gray-600 gap-3"
          >
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <Plus size={24} />
            </div>
            <span className="font-semibold text-sm">Создать новую компанию</span>
          </button>
        </div>

        <div className="mt-12 text-center">
          <button 
            onClick={onLogout}
            className="text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors"
          >
            Выйти из аккаунта
          </button>
        </div>
      </div>
    </div>
  );
};
