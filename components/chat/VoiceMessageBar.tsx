import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Pause, Play } from 'lucide-react';
import { artifactsService } from '../../services/artifacts';
import { logger } from '../../utils/logger';
import type { VoiceBubbleSurface } from '../../utils/voiceBubbleSurface';

function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function seededHeights(seed: string, n: number): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  let x = Math.abs(h) || 1;
  return Array.from({ length: n }, () => {
    x = (x * 1103515245 + 12345) >>> 0;
    return 3 + (x % 10);
  });
}

const surfaceStyles: Record<
  VoiceBubbleSurface,
  { bar: string; btn: string; icon: string; time: string; track: string }
> = {
  manager: {
    bar: 'bg-white/35',
    btn: 'bg-white text-gray-900 shadow-sm',
    icon: 'text-gray-900',
    time: 'text-white/90',
    track: 'bg-white/15',
  },
  client: {
    bar: 'bg-gray-400/80',
    btn: 'bg-accent text-white shadow-sm',
    icon: 'text-white',
    time: 'text-secondary',
    track: 'bg-gray-200',
  },
  ai: {
    bar: 'bg-indigo-300/90',
    btn: 'bg-indigo-600 text-white shadow-sm',
    icon: 'text-white',
    time: 'text-indigo-900/80',
    track: 'bg-indigo-200/80',
  },
  note: {
    bar: 'bg-amber-400/70',
    btn: 'bg-amber-500 text-white shadow-sm',
    icon: 'text-white',
    time: 'text-amber-900/80',
    track: 'bg-amber-200/70',
  },
  failed: {
    bar: 'bg-red-300/80',
    btn: 'bg-red-600 text-white shadow-sm',
    icon: 'text-white',
    time: 'text-red-900/80',
    track: 'bg-red-200/70',
  },
};

export const VoiceMessageBar = React.memo<{
  companyId: number;
  artifactId: string;
  surface: VoiceBubbleSurface;
}>(({ companyId, artifactId, surface }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const presignedSrcRef = useRef<string | null>(null);
  const [status, setStatus] = useState<'unloaded' | 'loading' | 'paused' | 'playing' | 'error'>('unloaded');
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const bars = useMemo(() => seededHeights(artifactId, 24), [artifactId]);
  const t = surfaceStyles[surface];
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;
  const activeIndex = Math.floor(progress * bars.length);
  const activeBar = surface === 'manager' ? 'bg-white' : 'bg-accent';

  useEffect(() => {
    presignedSrcRef.current = null;
    const el = audioRef.current;
    if (el) el.src = '';
    setDuration(0);
    setPosition(0);
    setStatus('unloaded');
  }, [companyId, artifactId]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onMeta = () => setDuration(el.duration || 0);
    const onTime = () => setPosition(el.currentTime || 0);
    const onEnded = () => {
      setStatus('paused');
      setPosition(0);
    };
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('ended', onEnded);
    };
  }, []);

  const ensureAudioReady = useCallback(async () => {
    const el = audioRef.current;
    if (!el) return false;
    if (presignedSrcRef.current) return true;
    setStatus('loading');
    try {
      const { url: signed } = await artifactsService.getPresignedDownloadUrl(companyId, artifactId);
      presignedSrcRef.current = signed;
      el.src = signed;
      await new Promise<void>((resolve, reject) => {
        const onErr = () => reject(new Error('audio load error'));
        el.addEventListener('loadedmetadata', () => resolve(), { once: true });
        el.addEventListener('error', onErr, { once: true });
      });
      setDuration(el.duration || 0);
      setStatus('paused');
      return true;
    } catch (e) {
      logger.error('Voice message load failed', e instanceof Error ? e : undefined);
      setStatus('error');
      return false;
    }
  }, [companyId, artifactId]);

  const toggle = useCallback(async () => {
    const el = audioRef.current;
    if (status === 'loading' || status === 'error') return;
    if (status === 'playing') {
      el?.pause();
      setStatus('paused');
      return;
    }
    const ok = await ensureAudioReady();
    if (!ok || !el) return;
    try {
      await el.play();
      setStatus('playing');
    } catch (e) {
      logger.error('Voice message play failed', e instanceof Error ? e : undefined);
      setStatus('error');
    }
  }, [status, ensureAudioReady]);

  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-black/10 text-[12px] text-red-500">
        Не удалось воспроизвести
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-[200px] max-w-[min(100%,280px)]">
      <audio ref={audioRef} className="hidden" preload="metadata" />
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={status === 'loading'}
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 ${t.btn}`}
        aria-label={status === 'playing' ? 'Пауза' : 'Воспроизвести'}
      >
        {status === 'loading' ? (
          <Loader2 size={18} className={`animate-spin ${t.icon}`} />
        ) : status === 'playing' ? (
          <Pause size={18} className={t.icon} fill="currentColor" />
        ) : (
          <Play size={18} className={t.icon} fill="currentColor" />
        )}
      </button>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-end justify-between gap-2 h-[18px]">
          <div className="flex-1 flex items-end justify-between gap-px h-[14px] opacity-90">
            {bars.map((h, i) => (
              <span
                key={i}
                className={`w-0.5 rounded-full transition-colors duration-150 ${
                  i <= activeIndex ? activeBar : t.bar
                }`}
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
          <span className={`text-[11px] font-medium tabular-nums flex-shrink-0 ${t.time}`}>
            {formatAudioTime(status === 'playing' ? position : duration > 0 ? duration : position)}
          </span>
        </div>
      </div>
    </div>
  );
});
VoiceMessageBar.displayName = 'VoiceMessageBar';
