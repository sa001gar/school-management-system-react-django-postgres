/**
 * Admin - Teachers Management Page
 */
import { TeachersManagement } from '@/components/admin/teachers-management';

export const metadata = {
  title: 'Teachers Management - Admin Dashboard',
  description: 'Manage teacher accounts',
};

export default function TeachersPage() {
  return <TeachersManagement />;
}
