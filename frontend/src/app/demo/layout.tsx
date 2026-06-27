import { DemoProvider } from '@/lib/demo/stores/demo-provider';
import { DemoBanner } from '@/components/demo/demo-banner';
import { EntryModal } from '@/components/demo/entry-modal';

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      <EntryModal />
      {children}
      <DemoBanner />
    </DemoProvider>
  );
}
