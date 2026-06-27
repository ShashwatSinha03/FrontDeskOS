import { ApexHero } from '@/components/demo/apex-dental/hero';
import { ApexServices } from '@/components/demo/apex-dental/services';
import { FloatingChat } from '@/components/demo/apex-dental/floating-chat';
import { CTAFooter } from '@/components/demo/cta-footer';

export default function ApexDentalPage() {
  return (
    <div className="min-h-screen bg-black">
      <ApexHero />
      <ApexServices />
      <FloatingChat />
      <CTAFooter />
    </div>
  );
}
