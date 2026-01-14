/**
 * Student Dashboard Home Page
 */
import { StudentOverview } from '@/components/student/student-overview';

export const metadata = {
  title: 'Student Dashboard - School Management System',
  description: 'Student dashboard overview',
};

export default function StudentDashboardPage() {
  return <StudentOverview />;
}
