import { DemoDashboardSidebar } from '@/components/demo/demo-sidebar';

export default function DemoDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-black">
      <DemoDashboardSidebar />
      <main className="flex-1 overflow-auto pb-12">
        <div className="mx-auto max-w-7xl px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
