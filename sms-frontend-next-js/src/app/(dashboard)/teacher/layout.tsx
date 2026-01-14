/**
 * Teacher Dashboard Layout
 * With robust session validation and React 19 optimizations
 */
'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  Award, 
  FileText,
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
import type { UserRole } from '@/types';

const teacherNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/teacher',
    icon: LayoutDashboard,
  },
  {
    title: 'Marks Entry',
    href: '/teacher/marks',
    icon: BookOpen,
  },
  {
    title: 'Co-curricular',
    href: '/teacher/cocurricular',
    icon: Award,
  },
  {
    title: 'Marksheet',
    href: '/teacher/marksheet',
    icon: FileText,
  },
  {
    title: 'Settings',
    href: '/teacher/settings',
    icon: Settings,
  },
];

function TeacherLayoutSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
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

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
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
        router.push('/login/teacher');
        return;
      }

      const { valid, user: validatedUser } = await validateSession();

      if (!valid) {
        clearTokens();
        router.push('/login/teacher');
        return;
      }

      // Check if user has teacher or admin access
      const hasAccess = validatedUser?.role === 'teacher' || validatedUser?.role === 'admin';
      if (!hasAccess) {
        setSessionError('You do not have teacher access.');
        if (validatedUser?.role === 'student') {
          router.push('/student');
        } else {
          router.push('/login/teacher');
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
    if (!isAuthenticated) {
      router.push('/login/teacher');
      return;
    }

    // Check if user has teacher or admin access
    const userRole = user?.role as UserRole | undefined;
    const hasAccess = userRole === 'teacher' || userRole === 'admin';
    if (!hasAccess) {
      if (userRole === 'student') {
        router.push('/student');
      } else {
        router.push('/login/teacher');
      }
      return;
    }

    startTransition(() => {
      validateUserSession();
    });
  }, [isAuthenticated, user, router, validateUserSession]);

  useEffect(() => {
    if (!isAuthorized) return;

    const interval = setInterval(async () => {
      const health = await checkHealth();
      setApiHealthy(health.api);

      if (!health.auth && health.api) {
        const { valid } = await validateSession();
        if (!valid) {
          clearTokens();
          logout();
          router.push('/login/teacher');
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isAuthorized, router, logout]);

  const handleRetry = () => {
    startTransition(() => {
      validateUserSession();
    });
  };

  if (isValidating || isPending) {
    return <TeacherLayoutSkeleton />;
  }

  if (sessionError) {
    return <SessionError message={sessionError} onRetry={handleRetry} isRetrying={isPending} />;
  }

  if (!isAuthorized) {
    return <TeacherLayoutSkeleton />;
  }

  return (
    <>
      {!isOnline && <OfflineBanner />}
      <DashboardShell 
        navItems={teacherNavItems} 
        role="teacher"
      >
        {!apiHealthy && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700 text-sm">
            <AlertCircle className="h-4 w-4 flex shrink-0" />
            <span>Server connection is unstable. Some features may not work properly.</span>
          </div>
        )}
        {children}
      </DashboardShell>
    </>
  );
}
