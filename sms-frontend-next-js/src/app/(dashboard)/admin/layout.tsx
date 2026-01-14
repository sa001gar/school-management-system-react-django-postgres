/**
 * Admin Dashboard Layout
 * With robust session validation and React 19 optimizations
 */
'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  GraduationCap, 
  BookOpen,
  DollarSign,
  Settings,
  Calendar,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useAuthStore } from '@/stores/auth-store';
import { validateSession, checkHealth, getSession, clearTokens } from '@/lib/auth/session';
import { useConnectionStatus } from '@/lib/auth/hooks';
import type { NavItem } from '@/components/layout/sidebar';

const adminNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Students',
    href: '/admin/students',
    icon: Users,
  },
  {
    title: 'Teachers',
    href: '/admin/teachers',
    icon: UserCheck,
  },
  {
    title: 'Classes',
    href: '/admin/classes',
    icon: GraduationCap,
  },
  {
    title: 'Subjects',
    href: '/admin/subjects',
    icon: BookOpen,
  },
  {
    title: 'Sessions',
    href: '/admin/sessions',
    icon: Calendar,
  },
  {
    title: 'Fee Management',
    href: '/admin/fees',
    icon: DollarSign,
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
];

// Loading skeleton component
function AdminLayoutSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-500 text-sm">Verifying session...</p>
      </div>
    </div>
  );
}

// Session error component
function SessionError({ 
  message, 
  onRetry, 
  isRetrying 
}: { 
  message: string; 
  onRetry: () => void; 
  isRetrying: boolean;
}) {
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
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    </div>
  );
}

// Offline banner component
function OfflineBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm">
      <WifiOff className="h-4 w-4" />
      <span>You're offline. Some features may not work.</span>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const isOnline = useConnectionStatus();
  
  // Component state
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [apiHealthy, setApiHealthy] = useState(true);
  
  // React 19 transition for smooth state updates
  const [isPending, startTransition] = useTransition();

  // Session validation function
  const validateUserSession = useCallback(async () => {
    setIsValidating(true);
    setSessionError(null);

    try {
      // First check API health
      const health = await checkHealth();
      setApiHealthy(health.api);

      if (!health.api) {
        setSessionError('Cannot connect to server. Please check your connection.');
        setIsValidating(false);
        return;
      }

      // Check local session first
      const session = getSession();
      if (!session) {
        router.push('/login/admin');
        return;
      }

      // Validate with backend
      const { valid, user: validatedUser, error } = await validateSession();

      if (!valid) {
        clearTokens();
        router.push('/login/admin');
        return;
      }

      // Check role
      if (validatedUser?.role !== 'admin') {
        setSessionError('You do not have admin access.');
        // Redirect to appropriate dashboard
        if (validatedUser?.role === 'teacher') {
          router.push('/teacher');
        } else if (validatedUser?.role === 'student') {
          router.push('/student');
        } else {
          router.push('/login/admin');
        }
        return;
      }

      setIsAuthorized(true);
    } catch (error) {
      setSessionError('Session validation failed. Please try again.');
    } finally {
      setIsValidating(false);
    }
  }, [router]);

  // Initial validation
  useEffect(() => {
    // Quick check of local state first
    if (!isAuthenticated) {
      router.push('/login/admin');
      return;
    }

    if (user?.role !== 'admin') {
      // Redirect based on role
      if (user?.role === 'teacher') {
        router.push('/teacher');
      } else if (user?.role === 'student') {
        router.push('/student');
      } else {
        router.push('/login/admin');
      }
      return;
    }

    // Validate session with backend
    startTransition(() => {
      validateUserSession();
    });
  }, [isAuthenticated, user, router, validateUserSession]);

  // Periodic health check
  useEffect(() => {
    if (!isAuthorized) return;

    const interval = setInterval(async () => {
      const health = await checkHealth();
      setApiHealthy(health.api);

      // If auth is unhealthy, revalidate session
      if (!health.auth && health.api) {
        const { valid } = await validateSession();
        if (!valid) {
          clearTokens();
          logout();
          router.push('/login/admin');
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isAuthorized, router, logout]);

  // Handle retry
  const handleRetry = () => {
    startTransition(() => {
      validateUserSession();
    });
  };

  // Show loading state
  if (isValidating || isPending) {
    return <AdminLayoutSkeleton />;
  }

  // Show error state
  if (sessionError) {
    return (
      <SessionError 
        message={sessionError} 
        onRetry={handleRetry}
        isRetrying={isPending}
      />
    );
  }

  // Not authorized yet
  if (!isAuthorized) {
    return <AdminLayoutSkeleton />;
  }

  return (
    <>
      {!isOnline && <OfflineBanner />}
      <DashboardShell 
        navItems={adminNavItems} 
        role="admin"
      >
        {/* API Health indicator - only show when unhealthy */}
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
