import type { Metadata } from 'next';
import EmployerDashboardPage from '../../components/employer/EmployerDashboardPage';

export const metadata: Metadata = {
  title: 'Employer Dashboard | Omnimise',
};

export default function EmployerDashboard() {
  return <EmployerDashboardPage />;
}
