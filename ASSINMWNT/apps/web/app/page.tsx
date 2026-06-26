import type { Metadata } from 'next';
import LandingPage from '../components/landing/LandingPage';

export const metadata: Metadata = {
  title: 'Omnimise — Verified Career Identity for India',
};

export default function HomePage() {
  return <LandingPage />;
}
