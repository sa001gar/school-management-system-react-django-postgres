/**
 * Teacher Dashboard Home Page
 */
import { TeacherOverview } from '@/components/teacher/teacher-overview';

export const metadata = {
  title: 'Teacher Dashboard - School Management System',
  description: 'Teacher dashboard overview',
};

export default function TeacherDashboardPage() {
  return <TeacherOverview />;
}
