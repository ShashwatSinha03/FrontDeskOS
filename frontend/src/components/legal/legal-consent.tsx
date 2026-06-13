'use client';

import Link from 'next/link';

interface LegalConsentProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}

export function LegalConsent({ checked, onChange, id = 'legal-consent' }: LegalConsentProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-2 cursor-pointer"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary"
      />
      <span className="text-xs text-muted-foreground leading-relaxed">
        I agree to the{' '}
        <Link href="/terms" className="underline hover:text-foreground transition-colors">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline hover:text-foreground transition-colors">
          Privacy Policy
        </Link>
        .
      </span>
    </label>
  );
}
