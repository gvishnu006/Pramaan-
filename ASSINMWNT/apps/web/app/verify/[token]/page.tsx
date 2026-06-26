import type { Metadata } from 'next';
import PublicVerifyPage from '../../components/verify/PublicVerifyPage';

export const metadata: Metadata = {
  title: 'Verify Credentials | Omnimise',
  description: 'Public verification page for Omnimise credentials',
};

export default function VerifyPage({ params }: { params: { token: string } }) {
  return <PublicVerifyPage token={params.token} />;
}
