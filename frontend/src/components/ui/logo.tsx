export function Logo({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center font-[var(--font-bungee-outline)] leading-none select-none ${className}`}
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
      <span className="font-[var(--font-bungee-outline)]">N</span>
      <span className="font-[var(--font-bungee-hairline)]">uvora</span>
    </span>
  );
}
