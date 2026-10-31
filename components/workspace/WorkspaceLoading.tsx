import React from 'react';
import { Loader2 } from 'lucide-react';

export const WorkspaceLoading: React.FC = () => {
  return (
    <div className="flex h-screen w-full bg-white items-center justify-center flex-col gap-4">
      <Loader2 className="animate-spin text-indigo-600" size={32} />
      <div className="text-gray-500 text-sm font-medium">Загрузка профиля компании...</div>
    </div>
  );
};
