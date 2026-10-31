import { useEffect, useState, RefObject } from 'react';

export function useChatInputAreaHeight(inputAreaRef: RefObject<HTMLDivElement | null>): number {
  const [height, setHeight] = useState(72);

  useEffect(() => {
    const el = inputAreaRef.current;
    if (!el) return;
    const updateHeight = () => {
      if (el.isConnected) setHeight(el.getBoundingClientRect().height);
    };
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return height;
}
