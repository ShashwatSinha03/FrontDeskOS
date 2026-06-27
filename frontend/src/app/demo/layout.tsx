import { DemoProvider } from '@/lib/demo/stores/demo-provider';
import { DemoBanner } from '@/components/demo/demo-banner';
import { EntryModal } from '@/components/demo/entry-modal';
import { StoryMode } from '@/components/demo/guided-tour/story-mode';

export const dynamic = 'force-dynamic';

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      <EntryModal />
      <StoryMode />
      {children}
      <DemoBanner />
    </DemoProvider>
  );
}
