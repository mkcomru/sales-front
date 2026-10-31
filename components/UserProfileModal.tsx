
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, LogOut, User, Mail, Shield, Building2 } from 'lucide-react';
import { useIdentityContext } from '../contexts/IdentityContext';

interface UserProfileModalProps {
  onClose: () => void;
  onLogout: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ onClose, onLogout }) => {
  const { identityState } = useIdentityContext();
  const navigate = useNavigate();
  const user = identityState.currentUser;
  
  const handleSwitchCompany = () => {
    onClose();
    navigate('/select-company?show=true');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-[400px] overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-10">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-[16px] font-bold text-gray-900">Профиль пользователя</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-md hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6">

          {/* Avatar Section - Cleaned up as requested */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-2xl bg-gray-900 text-white flex items-center justify-center shadow-lg">
              <User size={32} />
            </div>
            <div className="text-center">
              <h4 className="text-[15px] font-bold text-gray-900 leading-tight">
                {user?.first_name} {user?.last_name}
              </h4>
              <p className="text-[12px] text-gray-400 font-medium uppercase tracking-wider mt-1">
                {user?.role || 'Менеджер'}
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                Имя
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={16} className="text-gray-400 group-focus-within:text-gray-600 transition-colors" />
                </div>
                <input
                  type="text"
                  readOnly
                  value={`${user?.first_name || ''} ${user?.last_name || ''}`}
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg text-[14px] text-gray-900 focus:outline-none transition-all placeholder-gray-400 cursor-default"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={16} className="text-gray-400" />
                </div>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-[14px] text-gray-500 cursor-not-allowed select-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                Роль
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg w-full">
                <Shield size={16} className="text-gray-400" />
                <span className="text-[13px] font-medium text-gray-700">{user?.role || 'User'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer / Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col gap-2">
          <button
            onClick={handleSwitchCompany}
            className="flex items-center justify-center gap-2 text-[13px] font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-4 py-2 rounded-lg transition-all"
          >
            <Building2 size={16} />
            Сменить компанию
          </button>
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-2 text-[13px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg transition-all"
          >
            <LogOut size={16} />
            Выйти из системы
          </button>
        </div>

      </div>
    </div>
  );
};
