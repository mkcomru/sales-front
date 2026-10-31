import React from 'react';
import {
  User,
  ArrowRight,
  Clock,
  Settings,
  Filter,
  Package,
  BarChart2,
  Search,
} from 'lucide-react';
import { useChatContext } from '../contexts/ChatContext';

interface SearchDropdownProps {
  query: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: 'client' | 'deal' | 'nav', id: string) => void;
}

export const SearchDropdown: React.FC<SearchDropdownProps> = ({ query, isOpen, onClose, onSelect }) => {
  const { chatState } = useChatContext();
  if (!isOpen) return null;

  const normalizedQuery = query.toLowerCase().trim();

  const navItems = [
    { id: 'settings', label: 'Перейти в Настройки', icon: <Settings size={14} />, keywords: ['настройки', 'settings'] },
    { id: 'funnel', label: 'Открыть Воронку', icon: <Filter size={14} />, keywords: ['воронка', 'funnel', 'сделки'] },
    { id: 'products', label: 'Каталог Продуктов', icon: <Package size={14} />, keywords: ['продукты', 'products', 'цены'] },
    { id: 'analytics', label: 'Аналитика', icon: <BarChart2 size={14} />, keywords: ['аналитика', 'analytics', 'отчет'] },
  ];

  const filteredClients = chatState.threads
    .filter(
      (c) =>
        c.customerName.toLowerCase().includes(normalizedQuery) || c.details.phone.includes(normalizedQuery),
    )
    .slice(0, 3);

  const filteredNav = navItems.filter(
    (n) =>
      n.label.toLowerCase().includes(normalizedQuery) ||
      n.keywords.some((k) => k.includes(normalizedQuery)),
  );

  const hasResults = filteredClients.length > 0 || filteredNav.length > 0;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
        {!normalizedQuery && (
          <div className="py-2">
            <SectionHeader label="Недавние запросы" icon={<Clock size={12} />} />
            <ResultItem
              icon={<Search size={14} className="text-gray-400" />}
              title="Алина В."
              subtitle="Клиент • Вчера, 14:30"
              onClick={() => onSelect('client', '1')}
            />
            <ResultItem
              icon={<Search size={14} className="text-gray-400" />}
              title="Воронка продаж"
              subtitle="Навигация"
              onClick={() => onSelect('nav', 'funnel')}
            />
          </div>
        )}

        {normalizedQuery && (
          <>
            {!hasResults && (
              <div className="p-8 text-center text-gray-400 text-[13px]">Ничего не найдено</div>
            )}

            {filteredNav.length > 0 && (
              <div className="py-2 border-b border-gray-50">
                <SectionHeader label="Навигация" icon={<ArrowRight size={12} />} />
                {filteredNav.map((item) => (
                  <ResultItem
                    key={item.id}
                    icon={item.icon}
                    title={item.label}
                    onClick={() => onSelect('nav', item.id)}
                  />
                ))}
              </div>
            )}

            {filteredClients.length > 0 && (
              <div className="py-2 border-b border-gray-50">
                <SectionHeader label="Клиенты" icon={<User size={12} />} />
                {filteredClients.map((client) => (
                  <ResultItem
                    key={client.id}
                    icon={<img src={client.avatarUrl} className="w-full h-full object-cover" alt="" />}
                    isAvatar
                    title={client.customerName}
                    subtitle={client.details.phone}
                    onClick={() => onSelect('client', client.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

const SectionHeader: React.FC<{ label: string; icon: React.ReactNode }> = ({ label, icon }) => (
  <div className="px-4 py-2 flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wide bg-gray-50/50">
    {icon} {label}
  </div>
);

const ResultItem: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClick: () => void;
  isAvatar?: boolean;
}> = ({ icon, title, subtitle, onClick, isAvatar }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left group"
  >
    <div
      className={`
      flex-shrink-0 flex items-center justify-center text-gray-500
      ${isAvatar ? 'w-8 h-8 rounded-full overflow-hidden' : 'w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-white border border-gray-100 group-hover:border-gray-200 transition-colors'}
    `}
    >
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[13px] font-medium text-gray-900 truncate flex items-center gap-2">
        {title}
        <ArrowRight
          size={12}
          className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-gray-400"
        />
      </div>
      {subtitle && <div className="text-[12px] text-gray-500 truncate">{subtitle}</div>}
    </div>
  </button>
);
