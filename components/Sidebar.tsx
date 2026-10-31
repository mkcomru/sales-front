
import React from 'react';
import {
  Inbox,
  Filter,
  Package,
  BarChart2,
  Settings,
  CheckSquare,
  Users
} from 'lucide-react';
interface SidebarProps {
  currentView: 'inbox' | 'settings' | 'products' | 'funnel' | 'analytics' | 'my-tasks' | 'all-tasks';
  onNavigate: (view: 'inbox' | 'settings' | 'products' | 'funnel' | 'analytics' | 'my-tasks' | 'all-tasks') => void;
  onProfileClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, onProfileClick }) => {
  return (
    <div className="w-[64px] bg-sidebar border-r border-gray-100 flex flex-col items-center py-4 flex-shrink-0 z-20">
      {/* Logo Area */}
      <div className="mb-8 cursor-pointer" onClick={() => onNavigate('inbox')}>
        <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center font-bold text-lg shadow-sm">
          S
        </div>
      </div>

      {/* Navigation Icons */}
      <nav className="flex flex-col gap-6 w-full items-center flex-1">
        <NavItem
          icon={<Inbox size={20} />}
          label="Входящие"
          active={currentView === 'inbox'}
          onClick={() => onNavigate('inbox')}
        />
        <NavItem
          icon={<Filter size={20} />}
          label="Воронка"
          active={currentView === 'funnel'}
          onClick={() => onNavigate('funnel')}
        />
        <NavItem
          icon={<BarChart2 size={20} />}
          label="Аналитика"
          active={currentView === 'analytics'}
          onClick={() => onNavigate('analytics')}
        />
        <NavItem
          icon={<Package size={20} />}
          label="Продукты"
          active={currentView === 'products'}
          onClick={() => onNavigate('products')}
        />
        <NavItem
          icon={<CheckSquare size={20} />}
          label="Мои задачи"
          active={currentView === 'my-tasks'}
          onClick={() => onNavigate('my-tasks')}
        />
        <NavItem
          icon={<Users size={20} />}
          label="Задачи"
          active={currentView === 'all-tasks'}
          onClick={() => onNavigate('all-tasks')}
        />
      </nav>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-6 w-full items-center mb-4">
        <NavItem
          icon={<Settings size={20} />}
          label="Настройки"
          active={currentView === 'settings'}
          onClick={() => onNavigate('settings')}
        />
        <div
          onClick={onProfileClick}
          className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 transition-all flex items-center justify-center bg-white text-xs font-bold text-gray-700 hidden"
        >
          {/* <img src="https://picsum.photos/id/433/100/100" alt="User" className="w-full h-full object-cover" /> */}
          ME
        </div>
      </div>
    </div>
  );
};

const NavItem: React.FC<{
  icon: React.ReactNode;
  active?: boolean;
  label: string;
  onClick?: () => void
}> = ({ icon, active, label, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`
      w-10 h-10 flex items-center justify-center rounded-xl cursor-pointer transition-all duration-200 group relative
      ${active ? 'bg-white text-primary shadow-sm ring-1 ring-gray-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}
    `}>
      {icon}
      {/* Tooltip on hover */}
      <div className="absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
        {label}
      </div>
    </div>
  );
};
