import type { Metadata } from 'next';
import { LegalPage, SectionHeading, Paragraph, List, ListItem } from '@/components/legal/legal-page';
import { getLegalConfig } from '@/lib/legal-config';

export const metadata: Metadata = {
  title: 'Privacy Policy | Nuvora',
  description: 'Nuvora Privacy Policy — how we collect, process, and protect your data.',
  openGraph: {
    title: 'Privacy Policy | Nuvora',
    description: 'How Nuvora collects, processes, and protects your data.',
  },
};

export default function PrivacyPage() {
  const config = getLegalConfig();

  return (
    <LegalPage
      title="Privacy Policy"
      description={`Version 1.0.0 — Effective ${config.effectiveDate}`}
    >
      <SectionHeading>Information We Collect</SectionHeading>
      <Paragraph>
        Nuvora collects information necessary to provide our AI receptionist services:
      </Paragraph>
      <List>
        <ListItem><strong className="text-zinc-300">Account Information</strong><span className="text-zinc-500"> — name, email address, phone number, business name</span></ListItem>
        <ListItem><strong className="text-zinc-300">Customer Data</strong><span className="text-zinc-500"> — information about your customers that you input into our system (names, contact details, appointment history, conversation logs)</span></ListItem>
        <ListItem><strong className="text-zinc-300">Usage Data</strong><span className="text-zinc-500"> — interactions with our platform, feature usage, session data</span></ListItem>
        <ListItem><strong className="text-zinc-300">Communication Data</strong><span className="text-zinc-500"> — messages sent through our chat widget, call transcripts, email correspondence</span></ListItem>
      </List>

      <SectionHeading>Customer Data</SectionHeading>
      <Paragraph>
        Customer data you provide to Nuvora is processed on your behalf. You retain full ownership and control over your customer data. Nuvora acts as a data processor for this information.
      </Paragraph>

      <SectionHeading>Cookies</SectionHeading>
      <Paragraph>
        We use essential cookies for authentication and session management. We may use analytics cookies to improve our service. You can control cookie preferences through your browser settings.
      </Paragraph>

      <SectionHeading>Analytics</SectionHeading>
      <Paragraph>
        We collect anonymous usage statistics to improve our platform. This includes page views, feature interactions, and performance metrics. We use this data in aggregate form only.
      </Paragraph>

      <SectionHeading>AI Processing</SectionHeading>
      <Paragraph>
        Messages and inquiries submitted through Nuvora&apos;s AI receptionist are processed by our AI systems to generate responses. These interactions are logged for quality improvement and dispute resolution. AI outputs may be reviewed by our team to improve service quality.
      </Paragraph>

      <SectionHeading>Third-Party Providers</SectionHeading>
      <Paragraph>Nuvora may engage third-party service providers to deliver our service:</Paragraph>
      <List>
        <ListItem>Cloud infrastructure providers</ListItem>
        <ListItem>AI model providers</ListItem>
        <ListItem>Analytics services</ListItem>
        <ListItem>Communication platforms</ListItem>
      </List>
      <Paragraph>These providers are bound by data processing agreements that comply with applicable privacy laws.</Paragraph>

      <SectionHeading>Data Retention</SectionHeading>
      <Paragraph>
        We retain your data for as long as your account is active or as needed to provide services. Customer conversation logs are retained per your configured retention settings. You may request deletion of your data at any time.
      </Paragraph>

      <SectionHeading>Your Rights</SectionHeading>
      <Paragraph>Depending on your jurisdiction, you may have rights to:</Paragraph>
      <List>
        <ListItem>Access your personal data</ListItem>
        <ListItem>Correct inaccurate data</ListItem>
        <ListItem>Delete your data</ListItem>
        <ListItem>Restrict processing</ListItem>
        <ListItem>Data portability</ListItem>
        <ListItem>Withdraw consent</ListItem>
      </List>
      <Paragraph>
        To exercise these rights, contact us at <a href={`mailto:${config.contactEmail}`} className="text-zinc-300 underline hover:text-white transition-colors">{config.contactEmail}</a>.
      </Paragraph>

      <SectionHeading>Changes to This Policy</SectionHeading>
      <Paragraph>
        We may update this Privacy Policy from time to time. Material changes will be communicated via email or through our platform.
      </Paragraph>

      <Paragraph>ps. we dont vibecode w/o a brain.</Paragraph>

      <SectionHeading>Contact</SectionHeading>
      <Paragraph>
        For privacy-related inquiries:<br />
        <strong className="text-zinc-300">Company:</strong><span className="text-zinc-500"> {config.companyName}</span><br />
        <strong className="text-zinc-300">Email:</strong>{' '}
        <a href={`mailto:${config.contactEmail}`} className="text-zinc-300 underline hover:text-white transition-colors">{config.contactEmail}</a><br />
        {config.address && <><strong className="text-zinc-300">Address:</strong><span className="text-zinc-500"> {config.address}</span><br /></>}
        <strong className="text-zinc-300">Jurisdiction:</strong><span className="text-zinc-500"> {config.jurisdiction}</span>
      </Paragraph>
    </LegalPage>
  );
}
