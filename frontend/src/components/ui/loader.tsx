'use client';

import { Grid } from 'ldrs/react';
import 'ldrs/react/Grid.css';

interface LoaderProps {
  size?: number;
  speed?: number;
  color?: string;
  className?: string;
}

export function Loader({ size = 60, speed = 1.5, color = '#a3a3a3', className }: LoaderProps) {
  return (
    <div className={className} role="status" aria-label="Loading">
      <Grid size={size} speed={speed} color={color} />
    </div>
  );
}
