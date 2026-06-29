'use client';

import Link from 'next/link';
import React from 'react';

interface ShimmerButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ShimmerButton({
  children,
  href,
  onClick,
  type = 'button',
  className = '',
  disabled = false,
  size = 'md',
}: ShimmerButtonProps) {
  const isExternal =
    href && (href.startsWith('http') || href.startsWith('mailto:'));

  const sizes = {
    sm: 'px-4 py-1.5 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-8 py-3.5 text-lg',
  };

  const base =
    `group/button relative inline-flex items-center justify-center overflow-hidden rounded-md bg-gray-800/30 backdrop-blur-lg ${sizes[size]} font-semibold text-white transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-xl hover:shadow-primary/30 border border-white/20`;

  const content = (
    <>
      <span className="relative z-10 flex items-center gap-1.5 whitespace-nowrap">
        {children}
      </span>
      <div className="pointer-events-none absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-[2s] group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
        <div className="relative h-full w-8 bg-primary/30" />
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className={`${base} ${className}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      type={type}
      disabled={disabled}
      className={`${base} ${className}`}
    >
      {content}
    </button>
  );
}
