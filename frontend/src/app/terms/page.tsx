import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';
import { getLegalConfig } from '@/lib/legal-config';

export const metadata: Metadata = {
  title: 'Terms of Service | Nuvora',
  description: 'Nuvora Terms of Service — the terms governing your use of our AI receptionist platform.',
  openGraph: {
    title: 'Terms of Service | Nuvora',
    description: 'The terms governing your use of Nuvora\'s AI receptionist platform.',
  },
};

export default function TermsPage() {
  const config = getLegalConfig();

  return (
    <LegalPage
      title="Terms of Service"
      description={`Version 1.0.0 — Effective ${config.effectiveDate}`}
    >
      <h2>1. Account Eligibility</h2>
      <p>By creating an account, you represent that:</p>
      <ul>
        <li>You are at least 18 years of age</li>
        <li>You have the legal authority to bind your business to these terms</li>
        <li>You are not located in a jurisdiction where Nuvora&apos;s services are prohibited</li>
        <li>You will provide accurate and complete registration information</li>
      </ul>

      <h2>2. Account Responsibility</h2>
      <p>You are responsible for:</p>
      <ul>
        <li>Maintaining the confidentiality of your login credentials</li>
        <li>All activities that occur under your account</li>
        <li>Notifying us immediately of any unauthorized use</li>
        <li>Ensuring your account information remains accurate and current</li>
      </ul>

      <h2>3. Business Responsibility</h2>
      <p>As a business using Nuvora, you agree to:</p>
      <ul>
        <li>Review and configure AI responses appropriate for your business</li>
        <li>Monitor AI interactions with your customers</li>
        <li>Ensure compliance with applicable laws in your jurisdiction</li>
        <li>Maintain your own privacy policy that discloses your use of AI receptionist services</li>
        <li>Obtain any necessary consent from your customers for AI processing of their inquiries</li>
      </ul>

      <h2>4. Subscription and Payment</h2>
      <p>
        <em>Pricing, billing terms, and payment obligations will be defined in your subscription agreement or order form.</em>
      </p>

      <h2>5. Service Availability</h2>
      <p>
        Nuvora strives to maintain high availability but does not guarantee uninterrupted service. We reserve the right to perform maintenance, upgrades, or emergency repairs that may temporarily affect availability.
      </p>
      <p>Nuvora is not liable for:</p>
      <ul>
        <li>Downtime beyond our reasonable control</li>
        <li>Data loss due to circumstances outside our control</li>
        <li>Damages arising from service unavailability</li>
      </ul>

      <h2>6. AI-Specific Terms</h2>

      <h3>6.1 AI Output Accuracy</h3>
      <p>Nuvora&apos;s AI receptionist uses artificial intelligence to generate responses. You acknowledge that:</p>
      <ul>
        <li>AI outputs may be inaccurate or contain errors</li>
        <li>AI outputs may not always be appropriate for your specific business context</li>
        <li>Nuvora does not guarantee the accuracy, completeness, or appropriateness of AI-generated content</li>
        <li>You should review and test AI configurations before deploying them</li>
      </ul>

      <h3>6.2 Business Responsibility for AI</h3>
      <p>You remain solely responsible for:</p>
      <ul>
        <li>Customer interactions handled by the AI</li>
        <li>Reviewing and approving AI response configurations</li>
        <li>Ensuring AI responses comply with applicable laws and regulations</li>
        <li>Handling escalations and complaints arising from AI interactions</li>
      </ul>

      <h3>6.3 No Guarantee of Outcomes</h3>
      <p>Nuvora does not guarantee:</p>
      <ul>
        <li>Specific business outcomes, including lead conversion or customer satisfaction</li>
        <li>That AI responses will match the quality of human representatives</li>
        <li>That the AI will handle all edge cases or unusual customer inquiries appropriately</li>
      </ul>

      <h2>7. Suspension and Termination</h2>
      <p>We may suspend or terminate your access if:</p>
      <ul>
        <li>You violate these terms</li>
        <li>Your use poses a security risk to our platform</li>
        <li>You fail to pay applicable fees</li>
        <li>Required by law</li>
      </ul>
      <p>You may terminate your account at any time by contacting us.</p>

      <h2>8. Intellectual Property</h2>
      <ul>
        <li>Nuvora retains all rights to our platform, technology, and AI models</li>
        <li>You retain all rights to your business data and customer information</li>
        <li>Nothing in these terms transfers ownership of intellectual property</li>
      </ul>

      <h2>9. Limitation of Liability</h2>
      <p>To the maximum extent permitted by law:</p>
      <ul>
        <li>Nuvora is not liable for indirect, incidental, or consequential damages</li>
        <li>Our total liability is limited to the amount you paid us in the 12 months preceding the claim</li>
        <li>We are not liable for damages resulting from AI-generated content or decisions based on AI outputs</li>
      </ul>

      <h2>10. Governing Law</h2>
      <p>
        <em>Governing law to be determined based on business registration.</em> These terms are governed by the laws of {config.jurisdiction}.
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
