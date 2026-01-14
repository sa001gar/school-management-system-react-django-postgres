/**
 * Admin - Students Management Page
 */
import { StudentsManagement } from '@/components/admin/students-management';

export const metadata = {
  title: 'Students Management - Admin Dashboard',
  description: 'Manage student records',
};

export default function StudentsPage() {
  return <StudentsManagement />;
}
