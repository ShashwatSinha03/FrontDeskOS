import type { Metadata } from 'next';
import { LegalPage, SectionHeading, SubHeading, Paragraph, List, ListItem } from '@/components/legal/legal-page';
import { getLegalConfig } from '@/lib/legal-config';

export const metadata: Metadata = {
  title: 'Acceptable Use Policy | Nuvora',
  description: 'Nuvora Acceptable Use Policy — guidelines for using our AI receptionist platform responsibly.',
  openGraph: {
    title: 'Acceptable Use Policy | Nuvora',
    description: 'Guidelines for using Nuvora\'s AI receptionist platform responsibly.',
  },
};

export default function AcceptableUsePage() {
  const config = getLegalConfig();

  return (
    <LegalPage
      title="Acceptable Use Policy"
      description={`Version 1.0.0 — Effective ${config.effectiveDate}`}
    >
      <Paragraph>
        You may not use Nuvora&apos;s services for any of the following:
      </Paragraph>

      <SectionHeading>1. Spam and Unsolicited Communications</SectionHeading>
      <List>
        <ListItem>Sending unsolicited marketing messages through our platform</ListItem>
        <ListItem>Using our AI to generate spam content</ListItem>
        <ListItem>Harvesting or scraping contact information for unsolicited outreach</ListItem>
      </List>

      <SectionHeading>2. Fraud and Deception</SectionHeading>
      <List>
        <ListItem>Impersonating individuals or organizations</ListItem>
        <ListItem>Creating fake identities or businesses</ListItem>
        <ListItem>Using our platform to facilitate scams or deceptive practices</ListItem>
        <ListItem>Misrepresenting the nature of AI-generated communications</ListItem>
      </List>

      <SectionHeading>3. Illegal Activities</SectionHeading>
      <List>
        <ListItem>Any activity that violates applicable laws or regulations</ListItem>
        <ListItem>Facilitating illegal transactions</ListItem>
        <ListItem>Storing or transmitting illegal content</ListItem>
        <ListItem>Using our services in jurisdictions where prohibited</ListItem>
      </List>

      <SectionHeading>4. Harassment and Abuse</SectionHeading>
      <List>
        <ListItem>Using our platform to harass, threaten, or intimidate others</ListItem>
        <ListItem>Generating hateful, discriminatory, or violent content</ListItem>
        <ListItem>Targeting protected groups or individuals</ListItem>
      </List>

      <SectionHeading>5. Abuse of AI Systems</SectionHeading>
      <List>
        <ListItem>Attempting to manipulate AI responses to generate harmful content</ListItem>
        <ListItem>Using AI to create misleading or deceptive content</ListItem>
        <ListItem>Prompt injection or attempts to bypass AI safety measures</ListItem>
        <ListItem>Using AI outputs to make automated decisions that may cause harm</ListItem>
      </List>

      <SectionHeading>6. Security Violations</SectionHeading>
      <List>
        <ListItem>Testing security vulnerabilities without authorization</ListItem>
        <ListItem>Attempting to access other accounts or businesses&apos; data</ListItem>
        <ListItem>Interfering with the operation of our platform</ListItem>
        <ListItem>Bypassing rate limits or access controls</ListItem>
      </List>

      <SectionHeading>7. Reverse Engineering</SectionHeading>
      <List>
        <ListItem>Reverse engineering, decompiling, or disassembling our platform</ListItem>
        <ListItem>Copying or reproducing our technology for competitive purposes</ListItem>
        <ListItem>Extracting AI models or algorithms</ListItem>
      </List>

      <SectionHeading>8. Automated Abuse</SectionHeading>
      <List>
        <ListItem>Using bots, scrapers, or automated tools without authorization</ListItem>
        <ListItem>Excessive API calls that degrade service for other users</ListItem>
        <ListItem>Automated account creation</ListItem>
        <ListItem>Bulk data extraction</ListItem>
      </List>

      <SectionHeading>Enforcement</SectionHeading>
      <Paragraph>Violations of this policy may result in:</Paragraph>
      <List>
        <ListItem>Warning notification</ListItem>
        <ListItem>Temporary suspension of access</ListItem>
        <ListItem>Permanent account termination</ListItem>
        <ListItem>Legal action if warranted</ListItem>
      </List>
      <Paragraph>
        We reserve the right to investigate any suspected violation and take appropriate action.
      </Paragraph>

      <SectionHeading>Reporting Violations</SectionHeading>
      <Paragraph>
        Report violations to <a href={`mailto:${config.contactEmail}`} className="text-zinc-300 underline hover:text-white transition-colors">{config.contactEmail}</a>.
      </Paragraph>

      <Paragraph>ps. we dont vibecode w/o a brain.</Paragraph>

      <SectionHeading>Contact</SectionHeading>
      <Paragraph>
        <strong className="text-zinc-300">Company:</strong><span className="text-zinc-500"> {config.companyName}</span><br />
        <strong className="text-zinc-300">Email:</strong>{' '}
        <a href={`mailto:${config.contactEmail}`} className="text-zinc-300 underline hover:text-white transition-colors">{config.contactEmail}</a><br />
        {config.address && <><strong className="text-zinc-300">Address:</strong><span className="text-zinc-500"> {config.address}</span><br /></>}
      </Paragraph>
    </LegalPage>
  );
}
