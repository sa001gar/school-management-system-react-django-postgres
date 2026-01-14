/**
 * Student Dashboard Layout
 * With robust session validation and React 19 optimizations
 */
'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  DollarSign,
  GraduationCap,
  Settings,
  AlertCircle,
  RefreshCw,
  WifiOff
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useAuthStore } from '@/stores/auth-store';
import { validateSession, checkHealth, getSession, clearTokens } from '@/lib/auth/session';
import { useConnectionStatus } from '@/lib/auth/hooks';
import type { NavItem } from '@/components/layout/sidebar';

const studentNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/student',
    icon: LayoutDashboard,
  },
  {
    title: 'My Results',
    href: '/student/results',
    icon: FileText,
  },
  {
    title: 'Marksheet',
    href: '/student/marksheet',
    icon: GraduationCap,
  },
  {
    title: 'Payments',
    href: '/student/payments',
    icon: DollarSign,
  },
  {
    title: 'Settings',
    href: '/student/settings',
    icon: Settings,
  },
];

function StudentLayoutSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-500 text-sm">Verifying session...</p>
      </div>
    </div>
  );
}

function SessionError({ message, onRetry, isRetrying }: { message: string; onRetry: () => void; isRetrying: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-6 w-6 text-red-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Session Error</h2>
        <p className="text-gray-500 text-sm mb-4">{message}</p>
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    </div>
  );
}

function OfflineBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm">
      <WifiOff className="h-4 w-4" />
      <span>You're offline. Some features may not work.</span>
    </div>
  );
}

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, student, isAuthenticated, logout } = useAuthStore();
  const isOnline = useConnectionStatus();
  
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [apiHealthy, setApiHealthy] = useState(true);
  const [isPending, startTransition] = useTransition();

  const validateUserSession = useCallback(async () => {
    setIsValidating(true);
    setSessionError(null);

    try {
      const health = await checkHealth();
      setApiHealthy(health.api);

      if (!health.api) {
        setSessionError('Cannot connect to server. Please check your connection.');
        setIsValidating(false);
        return;
      }

      const session = getSession();
      if (!session) {
        router.push('/login/student');
        return;
      }

      // For students, we check the session role
      if (session.user.role !== 'student') {
        setSessionError('You do not have student access.');
        if (session.user.role === 'admin') {
          router.push('/admin');
        } else if (session.user.role === 'teacher') {
          router.push('/teacher');
        } else {
          router.push('/login/student');
        }
        return;
      }

      setIsAuthorized(true);
    } catch {
      setSessionError('Session validation failed. Please try again.');
    } finally {
      setIsValidating(false);
    }
  }, [router]);

  useEffect(() => {
    // Check if student is authenticated (either via user or student object)
    const isStudentAuth = isAuthenticated && (user?.role === 'student' || student !== null);
    
    if (!isAuthenticated && !student) {
      router.push('/login/student');
      return;
    }

    if (user?.role && user.role !== 'student') {
      if (user.role === 'admin') {
        router.push('/admin');
      } else if (user.role === 'teacher') {
        router.push('/teacher');
      } else {
        router.push('/login/student');
      }
      return;
    }

    startTransition(() => {
      validateUserSession();
    });
  }, [isAuthenticated, user, student, router, validateUserSession]);

  useEffect(() => {
    if (!isAuthorized) return;

    const interval = setInterval(async () => {
      const health = await checkHealth();
      setApiHealthy(health.api);
    }, 60000);

    return () => clearInterval(interval);
  }, [isAuthorized]);

  const handleRetry = () => {
    startTransition(() => {
      validateUserSession();
    });
  };

  if (isValidating || isPending) {
    return <StudentLayoutSkeleton />;
  }

  if (sessionError) {
    return <SessionError message={sessionError} onRetry={handleRetry} isRetrying={isPending} />;
  }

  if (!isAuthorized) {
    return <StudentLayoutSkeleton />;
  }

  return (
    <>
      {!isOnline && <OfflineBanner />}
      <DashboardShell 
        navItems={studentNavItems} 
        role="student"
      >
        {!apiHealthy && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>Server connection is unstable. Some features may not work properly.</span>
          </div>
        )}
        {children}
      </DashboardShell>
    </>
  );
}
