import { useEffect, useRef, useState, RefObject } from 'react';

export function useChatRubberOverscroll(scrollContainerRef: RefObject<HTMLDivElement | null>) {
  const [rubberOffset, setRubberOffset] = useState(0);
  const [rubberSnapping, setRubberSnapping] = useState(false);
  const rubberOffsetRef = useRef(0);
  const rubberTouchStartY = useRef(0);
  const rubberTouchActive = useRef(false);
  const rubberWheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const MAX_PULL = 42;

    const rubberBand = (x: number) => {
      const d = el.clientHeight;
      const c = 0.55;
      return Math.min((x * d * c) / (d + c * x), MAX_PULL);
    };

    const applyOffset = (raw: number) => {
      const clamped = -rubberBand(Math.max(0, raw));
      rubberOffsetRef.current = clamped;
      setRubberSnapping(false);
      setRubberOffset(clamped);
    };

    const springBack = () => {
      rubberOffsetRef.current = 0;
      setRubberSnapping(true);
      setRubberOffset(0);
    };

    const WHEEL_THRESHOLD = 4;
    let wheelAccum = 0;

    const onWheel = (e: WheelEvent) => {
      const atBottom = el.scrollHeight - el.clientHeight - el.scrollTop < 2;

      if (atBottom && e.deltaY > WHEEL_THRESHOLD) {
        e.preventDefault();
        if (rubberWheelTimer.current) clearTimeout(rubberWheelTimer.current);
        wheelAccum += e.deltaY;
        applyOffset(wheelAccum);
      } else if (wheelAccum > 0) {
        wheelAccum = 0;
        if (rubberWheelTimer.current) clearTimeout(rubberWheelTimer.current);
        springBack();
      }
    };

    let touchAccum = 0;

    const onTouchStart = (e: TouchEvent) => {
      rubberTouchStartY.current = e.touches[0].clientY;
      rubberTouchActive.current = false;
      touchAccum = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      const deltaY = rubberTouchStartY.current - e.touches[0].clientY;
      const atBottom = el.scrollHeight - el.clientHeight - el.scrollTop < 2;
      if (atBottom && deltaY > 0) {
        e.preventDefault();
        rubberTouchActive.current = true;
        touchAccum = deltaY;
        applyOffset(touchAccum);
      } else if (!rubberTouchActive.current) {
        springBack();
      }
    };

    const onTouchEnd = () => {
      if (rubberTouchActive.current) {
        rubberTouchActive.current = false;
        touchAccum = 0;
        springBack();
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      if (rubberWheelTimer.current) clearTimeout(rubberWheelTimer.current);
    };
  }, [scrollContainerRef]);

  return { rubberOffset, rubberSnapping };
}
