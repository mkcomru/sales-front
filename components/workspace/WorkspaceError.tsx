import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface WorkspaceErrorProps {
  error: string;
  onLogout: () => void;
}

export const WorkspaceError: React.FC<WorkspaceErrorProps> = ({ error, onLogout }) => {
  return (
    <div className="flex h-screen w-full bg-white items-center justify-center flex-col gap-4">
      <div className="bg-red-50 p-4 rounded-full text-red-500 mb-2">
        <AlertTriangle size={32} />
      </div>
      <h2 className="text-xl font-bold text-gray-900">Ошибка доступа</h2>
      <p className="text-gray-600">{error}</p>
      <button
        onClick={onLogout}
        className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors"
      >
        Выйти
      </button>
    </div>
  );
};
