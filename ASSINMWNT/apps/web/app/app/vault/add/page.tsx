import type { Metadata } from 'next';
import AddCredentialPage from '../../../../components/app/AddCredentialPage';

export const metadata: Metadata = { title: 'Add Credential | Omnimise' };
export default function AddCredential() { return <AddCredentialPage />; }
