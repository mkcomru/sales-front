import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, User, CreditCard } from 'lucide-react';
import { SearchDropdown } from '../SearchDropdown';
import { NotificationBell } from '../NotificationBell';
import { useIdentityContext } from '../../contexts/IdentityContext';
import { useUIContext } from '../../contexts/UIContext';

export type WorkspaceHeaderQuickSearchProps = {
  searchQuery: string;
  isSearchOpen: boolean;
  onSearchChange: (query: string) => void;
  onSearchFocus: () => void;
  onSearchClose: () => void;
  onSearchSelect: (type: 'client' | 'deal' | 'nav', id: string) => void;
};

interface WorkspaceHeaderProps {
  quickSearch?: WorkspaceHeaderQuickSearchProps;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({ quickSearch }) => {
  const { identityState } = useIdentityContext();
  const { toggleUserModal } = useUIContext();
  const navigate = useNavigate();
  const { companyId } = useParams<{ companyId: string }>();
  const balance = identityState.balance ?? 0;

  const handleBalanceClick = () => {
    if (companyId) {
      navigate(`/${companyId}/billing`);
    }
  };

  const company = identityState.currentUser?.companies?.find(
    (c) => c.company_id === Number(companyId)
  );

  const rightControls = (
    <>
      <NotificationBell />
      <div className="h-4 w-px bg-gray-100" />
      {company && (
        <>
          <div className="flex flex-col items-end">
            <span className="text-[13px] font-bold text-gray-900 leading-tight truncate max-w-[180px]">
              {company.company_name}
            </span>
            <span className="text-[10px] font-medium text-gray-400 tracking-wider">
              ID: {company.company_id}
            </span>
          </div>
          <div className="h-4 w-px bg-gray-100" />
        </>
      )}
      <button
        type="button"
        onClick={handleBalanceClick}
        className="flex items-center gap-2 group cursor-pointer hover:opacity-80 transition-opacity"
        title="Перейти к балансу"
      >
        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition-colors">
          <CreditCard size={14} />
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[12px] font-bold text-gray-900 leading-none">{balance}</span>
          <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Диалогов</span>
        </div>
      </button>

      <div className="h-4 w-px bg-gray-100" />

      <button
        type="button"
        onClick={toggleUserModal}
        className="flex items-center gap-3 group px-1 py-1 rounded-xl hover:bg-gray-50 transition-all"
      >
        <div className="flex flex-col items-end mr-1">
          <span className="text-[12px] font-bold text-gray-900 leading-none">
            {identityState.currentUser?.first_name || 'Менеджер'}
          </span>
          <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">
            {identityState.currentUser?.role || 'Админ'}
          </span>
        </div>
        <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
          <User size={14} />
        </div>
      </button>
    </>
  );

  if (!quickSearch) {
    return (
      <header className="h-[64px] bg-white border-b border-gray-100 flex items-center justify-end px-8 flex-shrink-0 z-20 gap-6">
        {rightControls}
      </header>
    );
  }

  const {
    searchQuery,
    isSearchOpen,
    onSearchChange,
    onSearchFocus,
    onSearchClose,
    onSearchSelect,
  } = quickSearch;

  return (
    <header className="h-[64px] bg-white border-b border-gray-100 flex items-center justify-between px-8 flex-shrink-0 z-20">
      <div className="flex-1" />
      <div className="flex-1 flex justify-center">
        <div className="relative group w-full max-w-[400px]">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-gray-500 transition-colors pointer-events-none"
          />
          <input
            type="search"
            value={searchQuery}
            onFocus={onSearchFocus}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Быстрый поиск по клиентам и сделкам..."
            className="w-full bg-gray-50/50 hover:bg-gray-100/50 border border-gray-100 rounded-xl py-2 pl-10 pr-4 text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all shadow-sm"
          />
          <SearchDropdown
            isOpen={isSearchOpen}
            query={searchQuery}
            onClose={onSearchClose}
            onSelect={onSearchSelect}
          />
        </div>
      </div>
      <div className="flex-1 flex justify-end items-center gap-6">{rightControls}</div>
    </header>
  );
};
