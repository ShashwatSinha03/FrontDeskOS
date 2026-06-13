import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';
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
      <h2>Prohibited Activities</h2>
      <p>You may not use Nuvora&apos;s services for any of the following:</p>

      <h3>1. Spam and Unsolicited Communications</h3>
      <ul>
        <li>Sending unsolicited marketing messages through our platform</li>
        <li>Using our AI to generate spam content</li>
        <li>Harvesting or scraping contact information for unsolicited outreach</li>
      </ul>

      <h3>2. Fraud and Deception</h3>
      <ul>
        <li>Impersonating individuals or organizations</li>
        <li>Creating fake identities or businesses</li>
        <li>Using our platform to facilitate scams or deceptive practices</li>
        <li>Misrepresenting the nature of AI-generated communications</li>
      </ul>

      <h3>3. Illegal Activities</h3>
      <ul>
        <li>Any activity that violates applicable laws or regulations</li>
        <li>Facilitating illegal transactions</li>
        <li>Storing or transmitting illegal content</li>
        <li>Using our services in jurisdictions where prohibited</li>
      </ul>

      <h3>4. Harassment and Abuse</h3>
      <ul>
        <li>Using our platform to harass, threaten, or intimidate others</li>
        <li>Generating hateful, discriminatory, or violent content</li>
        <li>Targeting protected groups or individuals</li>
      </ul>

      <h3>5. Abuse of AI Systems</h3>
      <ul>
        <li>Attempting to manipulate AI responses to generate harmful content</li>
        <li>Using AI to create misleading or deceptive content</li>
        <li>Prompt injection or attempts to bypass AI safety measures</li>
        <li>Using AI outputs to make automated decisions that may cause harm</li>
      </ul>

      <h3>6. Security Violations</h3>
      <ul>
        <li>Testing security vulnerabilities without authorization</li>
        <li>Attempting to access other accounts or businesses&apos; data</li>
        <li>Interfering with the operation of our platform</li>
        <li>Bypassing rate limits or access controls</li>
      </ul>

      <h3>7. Reverse Engineering</h3>
      <ul>
        <li>Reverse engineering, decompiling, or disassembling our platform</li>
        <li>Copying or reproducing our technology for competitive purposes</li>
        <li>Extracting AI models or algorithms</li>
      </ul>

      <h3>8. Automated Abuse</h3>
      <ul>
        <li>Using bots, scrapers, or automated tools without authorization</li>
        <li>Excessive API calls that degrade service for other users</li>
        <li>Automated account creation</li>
        <li>Bulk data extraction</li>
      </ul>

      <h2>Enforcement</h2>
      <p>Violations of this policy may result in:</p>
      <ul>
        <li>Warning notification</li>
        <li>Temporary suspension of access</li>
        <li>Permanent account termination</li>
        <li>Legal action if warranted</li>
      </ul>
      <p>We reserve the right to investigate any suspected violation and take appropriate action.</p>

      <h2>Reporting Violations</h2>
      <p>
        Report violations to <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>.
      </p>

      <h2>Contact</h2>
      <p>
        <strong>Company:</strong> {config.companyName}<br />
        <strong>Email:</strong> <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a><br />
        {config.address && <><strong>Address:</strong> {config.address}<br /></>}
      </p>
    </LegalPage>
  );
}
