export function Logo({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center leading-none select-none ${className}`}
      style={{ fontFamily: 'var(--font-bungee-outline)' }}
    >
      N
    </span>
  );
}

export function LogoWithName({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-0 leading-none select-none ${className}`}
    >
      <span style={{ fontFamily: 'var(--font-bungee-outline)' }}>N</span>
      <span style={{ fontFamily: 'var(--font-bungee-hairline)', fontWeight: 600 }}>uvora</span>
    </span>
  );
}
