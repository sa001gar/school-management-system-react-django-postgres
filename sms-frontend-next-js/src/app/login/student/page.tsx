/**
 * Student Login Page
 */
import { EnhancedLoginForm } from '@/components/auth/enhanced-login-form';

export const metadata = {
  title: 'Student Login - School Management System',
  description: 'Student login portal',
};

export default function StudentLoginPage() {
  return (
    <EnhancedLoginForm
      role="student"
      title="Student Login"
      description="View your results and fee status"
    />
  );
}
