import Link from 'next/link';
import { getLegalConfig } from '@/lib/legal-config';
import { LogoWithName } from '@/components/ui/logo';

interface LegalPageProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-12 text-base font-semibold text-white">{children}</h2>;
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-8 text-sm font-semibold text-zinc-300">{children}</h3>;
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm leading-relaxed text-zinc-400">{children}</p>;
}

function List({ children }: { children: React.ReactNode }) {
  return <ul className="mt-2 space-y-1.5">{children}</ul>;
}

function ListItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm leading-relaxed text-zinc-400">
      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
      <span>{children}</span>
    </li>
  );
}

export function LegalPage({ title, description, children }: LegalPageProps) {
  const config = getLegalConfig();

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <LogoWithName className="text-base text-white" />
          </Link>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/privacy" className="text-zinc-500 hover:text-zinc-300 transition-colors">Privacy</Link>
            <Link href="/terms" className="text-zinc-500 hover:text-zinc-300 transition-colors">Terms</Link>
            <Link href="/acceptable-use" className="text-zinc-500 hover:text-zinc-300 transition-colors">AUP</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
          {description && (
            <p className="mt-2 text-sm text-zinc-500">{description}</p>
          )}
        </div>

        <div className="space-y-2">
          {children}
        </div>
      </main>

      <footer className="border-t border-zinc-800">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600">
          <span>&copy; {new Date().getFullYear()} {config.companyName}. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-zinc-300 transition-colors">Terms</Link>
            <Link href="/acceptable-use" className="hover:text-zinc-300 transition-colors">AUP</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export { SectionHeading, SubHeading, Paragraph, List, ListItem };
