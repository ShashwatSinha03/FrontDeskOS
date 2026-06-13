import type { Metadata } from 'next';
import { defaultContent } from '@/lib/marketing-content';
import { MarketingHeader } from '@/components/marketing/marketing-header';
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
  title: 'Nevura — 24/7 AI Receptionist for Service Businesses',
  description:
    'Nevura acts as your 24/7 AI receptionist — answering questions, capturing leads, booking appointments, following up automatically, and escalating urgent issues to your team.',
};

export default function MarketingPage() {
  const { hero, problem, solution, howItWorks, showcase, industries, demo, founder, cta } =
    defaultContent;

  return (
    <>
      <MarketingHeader />
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
