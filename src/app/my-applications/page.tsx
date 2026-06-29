import type { Metadata } from 'next';
import { MyApplicationsClient } from '@/components/apply/MyApplicationsClient';

export const metadata: Metadata = {
  title: 'My Applications | Lion Jobs Agency',
  description: 'Track the status of your job applications with Lion Jobs Agency using your email or phone number.',
};

export default function MyApplicationsPage() {
  return <MyApplicationsClient />;
}
