import { useEffect, useRef, useState } from 'react';

const DEFAULT_ROOT_MARGIN = '100px';
const DEFAULT_THRESHOLD = 0;

export function useWhenVisible(
  options?: { rootMargin?: string; threshold?: number }
): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      {
        rootMargin: options?.rootMargin ?? DEFAULT_ROOT_MARGIN,
        threshold: options?.threshold ?? DEFAULT_THRESHOLD,
      }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [options?.rootMargin, options?.threshold]);

  return [ref, isVisible];
}
