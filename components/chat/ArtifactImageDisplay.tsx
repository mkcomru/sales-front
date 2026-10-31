import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, X } from 'lucide-react';
import { useWhenVisible } from '../../hooks/useWhenVisible';
import { artifactsService } from '../../services/artifacts';
import type { TranscriptBubbleVariant } from './messageBubbleStyles';

export const ArtifactImageDisplay = React.memo<{
  companyId: number;
  artifactId: string;
  variant?: TranscriptBubbleVariant;
  imageCount?: number;
}>(({ companyId, artifactId, variant = 'desktop', imageCount = 1 }) => {
  const [ref, isVisible] = useWhenVisible();
  const [st, setSt] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [url, setUrl] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  const isGrid = imageCount > 1;
  const isMobile = variant === 'mobile';

  const frameClass = useMemo(() => {
    if (isGrid) {
      return isMobile
        ? 'w-full aspect-square rounded-[18px]'
        : 'w-full aspect-square rounded-[20px]';
    }

    return isMobile
      ? 'w-[min(68vw,240px)] max-w-full min-h-[156px] max-h-[280px] rounded-[20px]'
      : 'w-[min(22rem,52vw)] max-w-full min-h-[180px] max-h-[360px] rounded-[22px]';
  }, [isGrid, isMobile]);

  const imageClass = useMemo(() => {
    if (isGrid) return 'h-full w-full object-cover';
    if (!naturalSize) return 'h-full w-full object-cover';
    return naturalSize.height > naturalSize.width * 1.18
      ? 'h-full w-full object-cover object-top'
      : 'h-full w-full object-cover';
  }, [isGrid, naturalSize]);

  useEffect(() => {
    if (!isVisible) return;
    let cancelled = false;
    setSt('loading');
    setUrl(null);
    (async () => {
      try {
        const { url: signed } = await artifactsService.getPresignedDownloadUrl(companyId, artifactId);
        if (cancelled) return;
        setUrl(signed);
        setSt('ready');
      } catch {
        if (!cancelled) setSt('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, artifactId, isVisible]);

  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  if (st === 'error') {
    return <span className="text-[11px] text-red-400">Ошибка загрузки</span>;
  }
  if (st !== 'ready' || !url) {
    return (
      <div
        ref={ref}
        className={`${frameClass} animate-pulse bg-black/10`}
      />
    );
  }

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${frameClass} group relative block overflow-hidden bg-gray-100 shadow-sm ring-1 ring-black/5 transition-transform duration-200 hover:scale-[1.01] active:scale-[0.995]`}
      >
        <img
          src={url}
          alt=""
          className={imageClass}
          loading="lazy"
          onLoad={(event) => {
            const target = event.currentTarget;
            setNaturalSize({
              width: target.naturalWidth,
              height: target.naturalHeight,
            });
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
        <div className="pointer-events-none absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm">
          <Maximize2 size={14} />
        </div>
      </button>

      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/92 px-3 py-[max(env(safe-area-inset-top),16px)]"
          onClick={() => setIsOpen(false)}
        >
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={url}
              alt=""
              className="h-full w-full scale-110 object-cover opacity-20 blur-3xl"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute right-4 top-[max(env(safe-area-inset-top),16px)] z-[1] flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/15"
            aria-label="Закрыть изображение"
          >
            <X size={20} />
          </button>

          <div className="relative z-[1] flex max-h-full max-w-full items-center justify-center" onClick={(event) => event.stopPropagation()}>
            <img
              src={url}
              alt=""
              className="max-h-[86vh] max-w-[94vw] rounded-[24px] object-contain shadow-2xl"
            />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
});
ArtifactImageDisplay.displayName = 'ArtifactImageDisplay';
