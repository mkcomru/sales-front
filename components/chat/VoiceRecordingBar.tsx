import React from 'react';
import { Square, Trash2 } from 'lucide-react';

function formatRecordingTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const VoiceRecordingBar = React.memo<{
  elapsed: number;
  onStop: () => void;
  onCancel: () => void;
}>(({ elapsed, onStop, onCancel }) => {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5">
      <button
        type="button"
        onClick={onCancel}
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
        aria-label="Отмена"
      >
        <Trash2 size={18} />
      </button>
      <div className="flex-1 flex items-center gap-2.5 px-4 py-2 bg-red-50/80 rounded-xl">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
        <span className="text-[14px] font-semibold tabular-nums text-gray-900">
          {formatRecordingTime(elapsed)}
        </span>
        <span className="ml-auto text-[12px] font-medium text-gray-500">
          Идет запись
        </span>
      </div>
      <button
        type="button"
        onClick={onStop}
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-gray-900 text-white shadow-sm hover:bg-black active:scale-95 transition-all"
        aria-label="Остановить запись"
      >
        <Square size={14} fill="currentColor" />
      </button>
    </div>
  );
});
VoiceRecordingBar.displayName = 'VoiceRecordingBar';
