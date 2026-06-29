'use client';

import { useEffect } from 'react';
import { useGuidedTour } from '@/lib/demo/tour/guided-tour-context';
import { TourOverlay } from './tour-overlay';

export function StoryMode() {
  const { controller, status } = useGuidedTour();

  useEffect(() => {
    if (sessionStorage.getItem('tour-perma-skipped') === 'true') return;
    if (status === 'idle') {
      controller.start();
    } else if (status === 'skipped') {
      controller.restart();
    }
  }, [controller, status]);

  return <TourOverlay />;
}
