import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Pause, Play, SendHorizontal, Trash2 } from 'lucide-react';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const VoicePreviewBar = React.memo<{
  blobUrl: string;
  onSend: () => void;
  onDiscard: () => void;
  isSending: boolean;
}>(({ blobUrl, onSend, onDiscard, isSending }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.src = blobUrl;
    const onMeta = () => setDuration(el.duration || 0);
    const onTime = () => setPosition(el.currentTime || 0);
    const onEnded = () => { setPlaying(false); setPosition(0); };
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('ended', onEnded);
    };
  }, [blobUrl]);

  const toggle = useCallback(async () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      try { await el.play(); setPlaying(true); } catch { /* ignore */ }
    }
  }, [playing]);

  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    <div className="flex items-center gap-2 px-3 py-2.5">
      <audio ref={audioRef} className="hidden" preload="metadata" />
      <button
        type="button"
        onClick={onDiscard}
        disabled={isSending}
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-50"
        aria-label="Удалить"
      >
        <Trash2 size={18} />
      </button>
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={isSending}
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95 transition-all disabled:opacity-50"
        aria-label={playing ? 'Пауза' : 'Воспроизвести'}
      >
        {playing ? (
          <Pause size={16} fill="currentColor" />
        ) : (
          <Play size={16} fill="currentColor" />
        )}
      </button>
      <div className="flex-1 flex items-center gap-2.5 min-w-0">
        <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-900 rounded-full transition-[width] duration-150 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-[12px] font-medium tabular-nums text-gray-500 flex-shrink-0">
          {formatTime(playing ? position : duration > 0 ? duration : 0)}
        </span>
      </div>
      <button
        type="button"
        onClick={onSend}
        disabled={isSending}
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-gray-900 text-white shadow-sm hover:bg-black active:scale-95 transition-all disabled:opacity-70"
        aria-label="Отправить"
      >
        {isSending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <SendHorizontal size={16} />
        )}
      </button>
    </div>
  );
});
VoicePreviewBar.displayName = 'VoicePreviewBar';
