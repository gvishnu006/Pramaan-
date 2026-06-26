import type { Metadata } from 'next';
import DashboardPage from '../../../components/app/DashboardPage';

export const metadata: Metadata = { title: 'Dashboard | Omnimise' };

export default function Dashboard() {
  return <DashboardPage />;
}
