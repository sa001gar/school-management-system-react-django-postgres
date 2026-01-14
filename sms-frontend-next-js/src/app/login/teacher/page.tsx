/**
 * Teacher Login Page
 */
import { EnhancedLoginForm } from '@/components/auth/enhanced-login-form';

export const metadata = {
  title: 'Teacher Login - School Management System',
  description: 'Teacher login portal',
};

export default function TeacherLoginPage() {
  return (
    <EnhancedLoginForm
      role="teacher"
      title="Teacher Login"
      description="Access your teaching dashboard"
    />
  );
}
