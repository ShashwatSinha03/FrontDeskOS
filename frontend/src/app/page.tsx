import { defaultContent } from '@/lib/marketing-content';
import { HomeHero } from '@/components/marketing/hero';
import { ProblemSection } from '@/components/marketing/problem-section';
import { SolutionSection } from '@/components/marketing/solution-section';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { ProductShowcase } from '@/components/marketing/product-showcase';
import { IndustriesSection } from '@/components/marketing/industries-section';
import { DemoSection } from '@/components/marketing/demo-section';
import { FounderSection } from '@/components/marketing/founder-section';
import { FinalCta } from '@/components/marketing/final-cta';

export default function MarketingPage() {
  const { hero, problem, solution, howItWorks, showcase, industries, demo, founder, cta } =
    defaultContent;

  return (
    <>
      <HomeHero {...hero} />
      <ProblemSection {...problem} />
      <SolutionSection {...solution} />
      <HowItWorks {...howItWorks} />
      <ProductShowcase {...showcase} />
      <IndustriesSection {...industries} />
      <DemoSection {...demo} />
      <FounderSection {...founder} />
      <FinalCta {...cta} />
    </>
  );
}
