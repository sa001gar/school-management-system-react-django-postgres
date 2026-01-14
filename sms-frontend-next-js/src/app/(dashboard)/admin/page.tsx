/**
 * Admin Dashboard Home Page
 */
import { AdminOverview } from '@/components/admin/admin-overview';
import { PageHeader } from '@/components/layout/page-header';
import { LayoutDashboard } from 'lucide-react';

export const metadata = {
  title: 'Admin Dashboard - School Management System',
  description: 'Administrator dashboard overview',
};

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Welcome to the admin dashboard"
        icon={LayoutDashboard}
      />
      <AdminOverview />
    </div>
  );
}
