import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nevura — AI Receptionist for Service Businesses',
  description:
    'Nevura acts like a 24/7 AI receptionist that answers questions, captures leads, books appointments, follows up automatically, and escalates urgent issues to your team.',
  openGraph: {
    title: 'Nevura — AI Receptionist for Service Businesses',
    description:
      'Never miss another customer. Nevura handles inquiries, bookings, and follow-ups while your team focuses on delivering great service.',
    siteName: 'Nevura',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nevura — AI Receptionist for Service Businesses',
    description:
      'Never miss another customer. Nevura handles inquiries, bookings, and follow-ups while your team focuses on delivering great service.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
