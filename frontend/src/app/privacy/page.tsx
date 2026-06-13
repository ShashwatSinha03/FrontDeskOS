import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';
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
      <h2>Information We Collect</h2>
      <p>
        Nuvora collects information necessary to provide our AI receptionist services:
      </p>
      <ul>
        <li><strong>Account Information</strong>: name, email address, phone number, business name</li>
        <li><strong>Customer Data</strong>: information about your customers that you input into our system (names, contact details, appointment history, conversation logs)</li>
        <li><strong>Usage Data</strong>: interactions with our platform, feature usage, session data</li>
        <li><strong>Communication Data</strong>: messages sent through our chat widget, call transcripts, email correspondence</li>
      </ul>

      <h2>Customer Data</h2>
      <p>
        Customer data you provide to Nuvora is processed on your behalf. You retain full ownership and control over your customer data. Nuvora acts as a data processor for this information.
      </p>

      <h2>Cookies</h2>
      <p>
        We use essential cookies for authentication and session management. We may use analytics cookies to improve our service. You can control cookie preferences through your browser settings.
      </p>

      <h2>Analytics</h2>
      <p>
        We collect anonymous usage statistics to improve our platform. This includes page views, feature interactions, and performance metrics. We use this data in aggregate form only.
      </p>

      <h2>AI Processing</h2>
      <p>
        Messages and inquiries submitted through Nuvora&apos;s AI receptionist are processed by our AI systems to generate responses. These interactions are logged for quality improvement and dispute resolution. AI outputs may be reviewed by our team to improve service quality.
      </p>

      <h2>Third-Party Providers</h2>
      <p>Nuvora may engage third-party service providers to deliver our service:</p>
      <ul>
        <li>Cloud infrastructure providers</li>
        <li>AI model providers</li>
        <li>Analytics services</li>
        <li>Communication platforms</li>
      </ul>
      <p>These providers are bound by data processing agreements that comply with applicable privacy laws.</p>

      <h2>Data Retention</h2>
      <p>
        We retain your data for as long as your account is active or as needed to provide services. Customer conversation logs are retained per your configured retention settings. You may request deletion of your data at any time.
      </p>

      <h2>Your Rights</h2>
      <p>Depending on your jurisdiction, you may have rights to:</p>
      <ul>
        <li>Access your personal data</li>
        <li>Correct inaccurate data</li>
        <li>Delete your data</li>
        <li>Restrict processing</li>
        <li>Data portability</li>
        <li>Withdraw consent</li>
      </ul>
      <p>To exercise these rights, contact us at <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>.</p>

      <h2>Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes will be communicated via email or through our platform.
      </p>

      <h2>Contact</h2>
      <p>
        For privacy-related inquiries:<br />
        <strong>Company:</strong> {config.companyName}<br />
        <strong>Email:</strong> <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a><br />
        {config.address && <><strong>Address:</strong> {config.address}<br /></>}
        <strong>Jurisdiction:</strong> {config.jurisdiction}
      </p>
    </LegalPage>
  );
}
