export function Logo({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center font-['Bungee_Outline'] leading-none select-none ${className}`}
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
      <span className="font-['Bungee_Outline']">N</span>
      <span className="font-['Bungee_Hairline']">uvora</span>
    </span>
  );
}
