/**
 * Auth Hooks with React 19 Features
 * useOptimistic, useActionState, and useTransition
 */
'use client';

import { useCallback, useEffect, useOptimistic, useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
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
} from './session';
import type { UserRole } from '@/types';

// ============================================================================
// useSession Hook
// ============================================================================

export interface SessionState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isValidating: boolean;
  user: SessionData['user'] | null;
  error: string | null;
}

export function useSession() {
  const [state, setState] = useState<SessionState>({
    isAuthenticated: false,
    isLoading: true,
    isValidating: false,
    user: null,
    error: null,
  });

  const [isPending, startTransition] = useTransition();

  // Initialize session from storage
  useEffect(() => {
    const session = getSession();
    const token = getAccessToken();

    if (session && token) {
      setState({
        isAuthenticated: true,
        isLoading: false,
        isValidating: false,
        user: session.user,
        error: null,
      });

      // Validate session in background
      startTransition(async () => {
        setState((prev) => ({ ...prev, isValidating: true }));
        const { valid, user } = await validateSession();
        setState((prev) => ({
          ...prev,
          isValidating: false,
          isAuthenticated: valid,
          user: valid ? user || prev.user : null,
          error: valid ? null : 'Session expired',
        }));
      });
    } else {
      setState({
        isAuthenticated: false,
        isLoading: false,
        isValidating: false,
        user: null,
        error: null,
      });
    }
  }, []);

  // Setup auto-refresh and visibility handlers
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const cleanupAutoRefresh = setupAutoRefresh(() => {
      setState((prev) => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        error: 'Session expired',
      }));
    });

    const cleanupVisibility = setupVisibilityHandler(() => {
      setState((prev) => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        error: 'Session invalid',
      }));
    });

    return () => {
      cleanupAutoRefresh();
      cleanupVisibility();
    };
  }, [state.isAuthenticated]);

  const refresh = useCallback(() => {
    startTransition(async () => {
      setState((prev) => ({ ...prev, isValidating: true }));
      const { valid, user, error } = await validateSession();
      setState((prev) => ({
        ...prev,
        isValidating: false,
        isAuthenticated: valid,
        user: valid ? user || null : null,
        error: valid ? null : error || null,
      }));
    });
  }, []);

  return {
    ...state,
    isPending: isPending || state.isValidating,
    refresh,
  };
}

// ============================================================================
// useAuth Hook (Enhanced)
// ============================================================================

export interface AuthActions {
  login: (email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  validateRole: (requiredRole: UserRole | UserRole[]) => boolean;
}

export function useAuth(): SessionState & AuthActions & { isPending: boolean } {
  const router = useRouter();
  const store = useAuthStore();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Optimistic state for better UX
  const [optimisticAuth, setOptimisticAuth] = useOptimistic(
    { isAuthenticated: store.isAuthenticated, isLoading: store.isLoading },
    (state, action: 'login' | 'logout') => ({
      isAuthenticated: action === 'login',
      isLoading: true,
    })
  );

  const login = useCallback(
    async (email: string, password: string, role: UserRole) => {
      setError(null);
      
      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        startTransition(async () => {
          setOptimisticAuth('login');
          
          try {
            if (role === 'student') {
              await store.studentLogin(email, password);
            } else {
              await store.login(email, password);
            }

            // Set session data
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

            resolve({ success: true });
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Login failed';
            setError(errorMessage);
            resolve({ success: false, error: errorMessage });
          }
        });
      });
    },
    [store, setOptimisticAuth]
  );

  const logout = useCallback(async () => {
    startTransition(async () => {
      setOptimisticAuth('logout');
      await store.logout();
      clearTokens();
      router.push('/login');
    });
  }, [store, router, setOptimisticAuth]);

  const validateRole = useCallback(
    (requiredRole: UserRole | UserRole[]) => {
      const userRole = store.user?.role || store.student?.student_id ? 'student' : null;
      if (!userRole) return false;

      if (Array.isArray(requiredRole)) {
        return requiredRole.includes(userRole);
      }
      return userRole === requiredRole;
    },
    [store.user, store.student]
  );

  return {
    isAuthenticated: optimisticAuth.isAuthenticated,
    isLoading: optimisticAuth.isLoading,
    isValidating: false,
    user: store.user
      ? {
          id: store.user.id,
          email: store.user.email,
          role: store.user.role,
          name: store.user.name,
        }
      : null,
    error,
    isPending,
    login,
    logout,
    validateRole,
  };
}

// ============================================================================
// useRequireAuth Hook
// ============================================================================

export interface RequireAuthOptions {
  requiredRole?: UserRole | UserRole[];
  redirectTo?: string;
  onUnauthorized?: () => void;
}

export function useRequireAuth(options: RequireAuthOptions = {}) {
  const { requiredRole, redirectTo = '/login', onUnauthorized } = options;
  const router = useRouter();
  const { isAuthenticated, isLoading, user, validateRole } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      onUnauthorized?.();
      router.push(redirectTo);
      return;
    }

    if (requiredRole && !validateRole(requiredRole)) {
      onUnauthorized?.();
      // Redirect to appropriate dashboard based on role
      const userRole = user?.role;
      if (userRole === 'admin') {
        router.push('/admin');
      } else if (userRole === 'teacher') {
        router.push('/teacher');
      } else if (userRole === 'student') {
        router.push('/student');
      } else {
        router.push('/login');
      }
      return;
    }

    setIsAuthorized(true);
    setIsChecking(false);
  }, [isAuthenticated, isLoading, user, requiredRole, redirectTo, router, validateRole, onUnauthorized]);

  return {
    isAuthorized,
    isChecking: isLoading || isChecking,
    user,
  };
}

// ============================================================================
// useHealthCheck Hook
// ============================================================================

export function useHealthCheck(intervalMs = 30000) {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const check = useCallback(async () => {
    setIsChecking(true);
    try {
      const status = await checkHealth();
      setHealth(status);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    check();

    const interval = setInterval(check, intervalMs);
    return () => clearInterval(interval);
  }, [check, intervalMs]);

  return {
    health,
    isChecking,
    check,
    isApiHealthy: health?.api ?? false,
    isAuthHealthy: health?.auth ?? false,
  };
}

// ============================================================================
// useConnectionStatus Hook
// ============================================================================

export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
