/**
 * Auth Provider Component
 * Manages authentication state persistence and automatic token refresh
 */
'use client';

import { createContext, useContext, useEffect, useState, useCallback, useTransition, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import {
  getAccessToken,
  getSession,
  setSession,
  clearTokens,
  validateSession,
  setupAutoRefresh,
  setupVisibilityHandler,
  checkHealth,
  type SessionData,
  type HealthStatus,
} from '@/lib/auth/session';
import type { User, UserRole } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface AuthContextValue {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isValidating: boolean;
  error: string | null;
  health: HealthStatus | null;
  
  // Actions
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  checkSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================================
// Auth Provider
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
  onSessionExpired?: () => void;
}

export function AuthProvider({ children, onSessionExpired }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const store = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isPending, startTransition] = useTransition();

  // Initialize session from storage
  useEffect(() => {
    const initSession = async () => {
      const token = getAccessToken();
      const session = getSession();

      if (!token || !session) {
        setIsLoading(false);
        return;
      }

      // Validate session in background
      setIsValidating(true);
      try {
        const { valid, user } = await validateSession();
        if (valid && user) {
          // Update store
          store.setAuth(
            { id: user.id, email: user.email, role: user.role, name: user.name } as User,
            { access: token, refresh: '' }
          );
        } else {
          // Session invalid, clear everything
          clearTokens();
          onSessionExpired?.();
        }
      } catch {
        // Session validation failed, but don't clear - might be network issue
        setError('Session validation failed');
      } finally {
        setIsLoading(false);
        setIsValidating(false);
      }
    };

    initSession();
  }, []);

  // Setup auto-refresh and visibility handlers
  useEffect(() => {
    if (!store.isAuthenticated) return;

    const handleSessionExpired = () => {
      clearTokens();
      store.logout();
      onSessionExpired?.();
      
      // Only redirect if not already on login page
      if (!pathname.includes('/login')) {
        router.push('/login');
      }
    };

    const cleanupAutoRefresh = setupAutoRefresh(handleSessionExpired);
    const cleanupVisibility = setupVisibilityHandler(handleSessionExpired);

    return () => {
      cleanupAutoRefresh();
      cleanupVisibility();
    };
  }, [store.isAuthenticated, pathname, router, onSessionExpired, store]);

  // Periodic health check
  useEffect(() => {
    const checkHealthStatus = async () => {
      const status = await checkHealth();
      setHealth(status);
    };

    checkHealthStatus();
    const interval = setInterval(checkHealthStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  // Login handler
  const login = useCallback(async (email: string, password: string, role: UserRole): Promise<boolean> => {
    setError(null);
    try {
      if (role === 'student') {
        await store.studentLogin(email, password);
      } else {
        await store.login(email, password);
      }

      // Update session
      const user = store.user;
      if (user) {
        setSession({
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
          },
          expiresAt: Date.now() + 60 * 60 * 1000,
          lastValidated: Date.now(),
        });
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      return false;
    }
  }, [store]);

  // Logout handler
  const logout = useCallback(async () => {
    startTransition(async () => {
      await store.logout();
      clearTokens();
      router.push('/login');
    });
  }, [store, router]);

  // Refresh handler
  const refresh = useCallback(async () => {
    setIsValidating(true);
    try {
      const { valid, user } = await validateSession();
      if (valid && user) {
        store.setAuth(
          { id: user.id, email: user.email, role: user.role, name: user.name } as User,
          { access: getAccessToken() || '', refresh: '' }
        );
      }
    } finally {
      setIsValidating(false);
    }
  }, [store]);

  // Check session validity
  const checkSession = useCallback(async (): Promise<boolean> => {
    const { valid } = await validateSession();
    return valid;
  }, []);

  const value: AuthContextValue = {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: isLoading || isPending,
    isValidating,
    error,
    health,
    login,
    logout,
    refresh,
    checkSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

// ============================================================================
// Protected Route Component
// ============================================================================

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole | UserRole[];
  fallback?: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  fallback,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthContext();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    if (requiredRole) {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      const userRole = user?.role;

      if (!userRole || !roles.includes(userRole)) {
        // Redirect to appropriate dashboard
        if (userRole === 'admin') {
          router.push('/admin');
        } else if (userRole === 'teacher') {
          router.push('/teacher');
        } else if (userRole === 'student') {
          router.push('/student');
        } else {
          router.push(redirectTo);
        }
        return;
      }
    }

    setIsAuthorized(true);
  }, [isAuthenticated, isLoading, user, requiredRole, redirectTo, router]);

  if (isLoading) {
    return fallback || <DefaultLoadingFallback />;
  }

  if (!isAuthorized) {
    return fallback || null;
  }

  return <>{children}</>;
}

// ============================================================================
// Default Loading Fallback
// ============================================================================

function DefaultLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

// ============================================================================
// Session Status Component
// ============================================================================

interface SessionStatusProps {
  showDetails?: boolean;
}

export function SessionStatus({ showDetails = false }: SessionStatusProps) {
  const { isAuthenticated, isValidating, health, user } = useAuthContext();

  if (!showDetails) {
    return (
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            isAuthenticated ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span className="text-xs text-gray-500">
          {isValidating ? 'Validating...' : isAuthenticated ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    );
  }

  return (
    <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-1">
      <div className="flex justify-between">
        <span className="text-gray-500">Status:</span>
        <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
          {isAuthenticated ? 'Authenticated' : 'Not authenticated'}
        </span>
      </div>
      {user && (
        <div className="flex justify-between">
          <span className="text-gray-500">User:</span>
          <span className="text-gray-700">{user.email}</span>
        </div>
      )}
      {health && (
        <>
          <div className="flex justify-between">
            <span className="text-gray-500">API:</span>
            <span className={health.api ? 'text-green-600' : 'text-red-600'}>
              {health.api ? 'Healthy' : 'Unhealthy'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Latency:</span>
            <span className="text-gray-700">{health.latency}ms</span>
          </div>
        </>
      )}
    </div>
  );
}
