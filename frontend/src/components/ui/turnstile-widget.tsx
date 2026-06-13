'use client';

import { Turnstile, type TurnstileProps } from '@marsidev/react-turnstile';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

export function TurnstileWidget({ onVerify, onExpire, onError }: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (!siteKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set — Turnstile disabled');
    }
    return null;
  }

  const handleSuccess: TurnstileProps['onSuccess'] = (token) => {
    onVerify(token);
  };

  return (
    <Turnstile
      siteKey={siteKey}
      onSuccess={handleSuccess}
      onExpire={onExpire}
      onError={onError}
      options={{
        theme: 'auto',
        size: 'invisible',
      }}
    />
  );
}
