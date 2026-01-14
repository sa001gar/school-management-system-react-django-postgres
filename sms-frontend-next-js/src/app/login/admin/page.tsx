/**
 * Admin Login Page
 */
import { EnhancedLoginForm } from '@/components/auth/enhanced-login-form';

export const metadata = {
  title: 'Admin Login - School Management System',
  description: 'Administrator login portal',
};

export default function AdminLoginPage() {
  return (
    <EnhancedLoginForm
      role="admin"
      title="Admin Login"
      description="Access the administration dashboard"
    />
  );
}
