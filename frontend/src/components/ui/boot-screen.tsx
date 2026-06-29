'use client';

import { useEffect, useState } from 'react';
import { Loader } from './loader';

export function BootScreen({ isMarketing }: { isMarketing: boolean }) {
  const [phase, setPhase] = useState<'boot' | 'fade' | 'done'>(
    isMarketing ? 'boot' : 'done'
  );

  useEffect(() => {
    if (!isMarketing) return;

    const timer = setTimeout(() => {
      setPhase('fade');
    }, 2000);

    return () => clearTimeout(timer);
  }, [isMarketing]);

  useEffect(() => {
    if (phase !== 'fade') return;
    const timer = setTimeout(() => {
      setPhase('done');
    }, 500);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === 'done') return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black transition-opacity duration-500"
      style={{ opacity: phase === 'fade' ? 0 : 1 }}
    >
      <Loader size={60} color="#2252e7" />
    </div>
  );
}
