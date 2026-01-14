/**
 * Student - Payments Page
 */
import { StudentPayments } from '@/components/student/student-payments';

export const metadata = {
  title: 'Fee Payments - Student Dashboard',
  description: 'View and pay fees',
};

export default function PaymentsPage() {
  return <StudentPayments />;
}
