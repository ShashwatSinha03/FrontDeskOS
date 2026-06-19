import type { Metadata } from 'next';
import { defaultContent } from '@/lib/marketing-content';
import { PillNav } from '@/components/marketing/pill-nav';
import { HomeHero } from '@/components/marketing/hero';
import { ProblemSection } from '@/components/marketing/problem-section';
import { SolutionSection } from '@/components/marketing/solution-section';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { ProductShowcase } from '@/components/marketing/product-showcase';
import { ProductScreenshots } from '@/components/marketing/product-screenshots';
import { IndustriesSection } from '@/components/marketing/industries-section';
import { DemoSection } from '@/components/marketing/demo-section';
import { FounderSection } from '@/components/marketing/founder-section';
import { FinalCta } from '@/components/marketing/final-cta';
import { MarketingFooter } from '@/components/marketing/marketing-footer';

export const metadata: Metadata = {
  title: 'Nuvora — 24/7 AI Receptionist for Service Businesses',
  description:
    'Nuvora acts as your 24/7 AI receptionist — answering questions, capturing leads, booking appointments, following up automatically, and escalating urgent issues to your team.',
};

const NAV_ITEMS = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Industries', href: '#industries' },
  { label: 'Contact', href: '#cta' },
];

export default function MarketingPage() {
  const { hero, problem, solution, howItWorks, showcase, industries, demo, founder, cta } =
    defaultContent;

  return (
    <>
      <PillNav
        logo=""
        logoAlt="Nuvora"
        items={NAV_ITEMS}
        activeHref="/"
        pillColor="#3b85ff"
        hoveredPillTextColor="#ffffff"
        pillTextColor="#ffffff"
        initialLoadAnimation
        logoElement={
          <span className="pill-logo-text">
            <span
              className="logo-n"
              style={{ fontFamily: 'var(--font-bungee-outline)', fontWeight: 900, fontSize: 20, lineHeight: 1 }}
            >
              N
            </span>
            <span
              className="logo-rest"
              style={{ fontFamily: 'var(--font-bungee-hairline)', fontWeight: 700, fontSize: 14, lineHeight: 1, marginTop: 1 }}
            >
              uvora
            </span>
          </span>
        }
      />
      <HomeHero {...hero} />
      <ProblemSection {...problem} />
      <SolutionSection {...solution} />
      <HowItWorks {...howItWorks} />
      <ProductScreenshots />
      <ProductShowcase {...showcase} />
      <IndustriesSection {...industries} />
      <DemoSection {...demo} />
      <FounderSection {...founder} />
      <FinalCta {...cta} />
      <MarketingFooter />
    </>
  );
}
