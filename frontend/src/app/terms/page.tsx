import type { Metadata } from 'next';
import { LegalPage, SectionHeading, SubHeading, Paragraph, List, ListItem } from '@/components/legal/legal-page';
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
      <SectionHeading>1. Account Eligibility</SectionHeading>
      <Paragraph>By creating an account, you represent that:</Paragraph>
      <List>
        <ListItem>You are at least 18 years of age</ListItem>
        <ListItem>You have the legal authority to bind your business to these terms</ListItem>
        <ListItem>You are not located in a jurisdiction where Nuvora&apos;s services are prohibited</ListItem>
        <ListItem>You will provide accurate and complete registration information</ListItem>
      </List>

      <SectionHeading>2. Account Responsibility</SectionHeading>
      <Paragraph>You are responsible for:</Paragraph>
      <List>
        <ListItem>Maintaining the confidentiality of your login credentials</ListItem>
        <ListItem>All activities that occur under your account</ListItem>
        <ListItem>Notifying us immediately of any unauthorized use</ListItem>
        <ListItem>Ensuring your account information remains accurate and current</ListItem>
      </List>

      <SectionHeading>3. Business Responsibility</SectionHeading>
      <Paragraph>As a business using Nuvora, you agree to:</Paragraph>
      <List>
        <ListItem>Review and configure AI responses appropriate for your business</ListItem>
        <ListItem>Monitor AI interactions with your customers</ListItem>
        <ListItem>Ensure compliance with applicable laws in your jurisdiction</ListItem>
        <ListItem>Maintain your own privacy policy that discloses your use of AI receptionist services</ListItem>
        <ListItem>Obtain any necessary consent from your customers for AI processing of their inquiries</ListItem>
      </List>

      <SectionHeading>4. Subscription and Payment</SectionHeading>
      <Paragraph>
        <em className="text-zinc-500">Pricing, billing terms, and payment obligations will be defined in your subscription agreement or order form.</em>
      </Paragraph>

      <SectionHeading>5. Service Availability</SectionHeading>
      <Paragraph>
        Nuvora strives to maintain high availability but does not guarantee uninterrupted service. We reserve the right to perform maintenance, upgrades, or emergency repairs that may temporarily affect availability.
      </Paragraph>
      <Paragraph>Nuvora is not liable for:</Paragraph>
      <List>
        <ListItem>Downtime beyond our reasonable control</ListItem>
        <ListItem>Data loss due to circumstances outside our control</ListItem>
        <ListItem>Damages arising from service unavailability</ListItem>
      </List>

      <SectionHeading>6. AI-Specific Terms</SectionHeading>

      <SubHeading>6.1 AI Output Accuracy</SubHeading>
      <Paragraph>Nuvora&apos;s AI receptionist uses artificial intelligence to generate responses. You acknowledge that:</Paragraph>
      <List>
        <ListItem>AI outputs may be inaccurate or contain errors</ListItem>
        <ListItem>AI outputs may not always be appropriate for your specific business context</ListItem>
        <ListItem>Nuvora does not guarantee the accuracy, completeness, or appropriateness of AI-generated content</ListItem>
        <ListItem>You should review and test AI configurations before deploying them</ListItem>
      </List>

      <SubHeading>6.2 Business Responsibility for AI</SubHeading>
      <Paragraph>You remain solely responsible for:</Paragraph>
      <List>
        <ListItem>Customer interactions handled by the AI</ListItem>
        <ListItem>Reviewing and approving AI response configurations</ListItem>
        <ListItem>Ensuring AI responses comply with applicable laws and regulations</ListItem>
        <ListItem>Handling escalations and complaints arising from AI interactions</ListItem>
      </List>

      <SubHeading>6.3 No Guarantee of Outcomes</SubHeading>
      <Paragraph>Nuvora does not guarantee:</Paragraph>
      <List>
        <ListItem>Specific business outcomes, including lead conversion or customer satisfaction</ListItem>
        <ListItem>That AI responses will match the quality of human representatives</ListItem>
        <ListItem>That the AI will handle all edge cases or unusual customer inquiries appropriately</ListItem>
      </List>

      <SectionHeading>7. Suspension and Termination</SectionHeading>
      <Paragraph>We may suspend or terminate your access if:</Paragraph>
      <List>
        <ListItem>You violate these terms</ListItem>
        <ListItem>Your use poses a security risk to our platform</ListItem>
        <ListItem>You fail to pay applicable fees</ListItem>
        <ListItem>Required by law</ListItem>
      </List>
      <Paragraph>You may terminate your account at any time by contacting us.</Paragraph>

      <SectionHeading>8. Intellectual Property</SectionHeading>
      <List>
        <ListItem>Nuvora retains all rights to our platform, technology, and AI models</ListItem>
        <ListItem>You retain all rights to your business data and customer information</ListItem>
        <ListItem>Nothing in these terms transfers ownership of intellectual property</ListItem>
      </List>

      <SectionHeading>9. Limitation of Liability</SectionHeading>
      <Paragraph>To the maximum extent permitted by law:</Paragraph>
      <List>
        <ListItem>Nuvora is not liable for indirect, incidental, or consequential damages</ListItem>
        <ListItem>Our total liability is limited to the amount you paid us in the 12 months preceding the claim</ListItem>
        <ListItem>We are not liable for damages resulting from AI-generated content or decisions based on AI outputs</ListItem>
      </List>

      <SectionHeading>10. Governing Law</SectionHeading>
      <Paragraph>
        <em className="text-zinc-500">Governing law to be determined based on business registration.</em> These terms are governed by the laws of {config.jurisdiction}.
      </Paragraph>

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
