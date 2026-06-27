import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/lib/auth';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0a',
};
import { Bungee_Outline, Bungee_Hairline } from 'next/font/google';
import './globals.css';

const bungeeOutline = Bungee_Outline({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-bungee-outline',
});

const bungeeHairline = Bungee_Hairline({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-bungee-hairline',
});

export const metadata: Metadata = {
  title: 'Nuvora — AI Receptionist for Service Businesses',
  manifest: '/manifest.json',
  description:
    'Nuvora acts like a 24/7 AI receptionist that answers questions, captures leads, books appointments, follows up automatically, and escalates urgent issues to your team.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/icon-192.png',
  },
  openGraph: {
    title: 'Nuvora — AI Receptionist for Service Businesses',
    description:
      'Never miss another customer. Nuvora handles inquiries, bookings, and follow-ups while your team focuses on delivering great service.',
    siteName: 'Nuvora',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nuvora — AI Receptionist for Service Businesses',
    description:
      'Never miss another customer. Nuvora handles inquiries, bookings, and follow-ups while your team focuses on delivering great service.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${bungeeOutline.variable} ${bungeeHairline.variable}`}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
