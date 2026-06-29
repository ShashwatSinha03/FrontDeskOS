'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface SpotlightProps {
  target: string;
  padding?: number;
  children?: React.ReactNode;
  onPosition?: (rect: DOMRect | null) => void;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function Spotlight({ target, padding = 12, children, onPosition }: SpotlightProps) {
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const rafRef = useRef<number>(0);

  const targetRef = useRef(target);
  const paddingRef = useRef(padding);
  const onPositionRef = useRef(onPosition);
  targetRef.current = target;
  paddingRef.current = padding;
  onPositionRef.current = onPosition;

  const updatePosition = useCallback(() => {
    const el = document.querySelector(`[data-tour="${targetRef.current}"]`);
    if (!el) {
      setRect(null);
      onPositionRef.current?.(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const adjusted: SpotlightRect = {
      top: r.top - paddingRef.current,
      left: r.left - paddingRef.current,
      width: r.width + paddingRef.current * 2,
      height: r.height + paddingRef.current * 2,
    };
    setRect(adjusted);
    onPositionRef.current?.(r);
  }, []);

  const elRef = useRef<Element | null>(null);

  useEffect(() => {
    updatePosition();
    const handleScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updatePosition);
    };
    const handleResize = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updatePosition);
    };
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    const el = document.querySelector(`[data-tour="${target}"]`);
    elRef.current = el;
    if (el) {
      const obs = new ResizeObserver(handleResize);
      obs.observe(el);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
        obs.disconnect();
        cancelAnimationFrame(rafRef.current);
      };
    }
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!rect) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const borderR = 10;

  return (
    <div className="fixed inset-0 z-[80]" style={{ pointerEvents: 'none' }}>
      <svg className="h-full w-full" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
        <defs>
          <mask id={`spotlight-mask-${target}`}>
            <rect width="100%" height="100%" fill="white" />
            <rect x={rect.left} y={rect.top} width={rect.width} height={rect.height} fill="black" rx={borderR} />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask={`url(#spotlight-mask-${target})`} style={{ pointerEvents: 'auto' }} />
      </svg>
      {children && (
        <div
          className="absolute z-[81]"
          style={{
            left: Math.max(16, Math.min(rect.left, vw - 340)),
            top: rect.top + rect.height + 8,
            pointerEvents: 'auto',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
