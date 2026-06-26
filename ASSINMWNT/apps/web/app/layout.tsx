import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s | Omnimise',
    default: 'Omnimise — Verified Career Identity for India',
  },
  description:
    'Omnimise lets you aggregate credentials, authenticate them cryptographically, and share verified proofs instantly — replacing 15+ day background checks.',
  keywords: ['career identity', 'background verification', 'DigiLocker', 'credentials', 'India'],
  openGraph: {
    title: 'Omnimise — Verified Career Identity for India',
    description: 'Sovereign encrypted vault for your professional credentials.',
    type: 'website',
    url: 'https://omnimise.com',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
