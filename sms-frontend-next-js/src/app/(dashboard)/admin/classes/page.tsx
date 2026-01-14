/**
 * Admin - Classes Management Page
 */
import { ClassesManagement } from '@/components/admin/classes-management';

export const metadata = {
  title: 'Classes Management - Admin Dashboard',
  description: 'Manage school classes',
};

export default function ClassesPage() {
  return <ClassesManagement />;
}
