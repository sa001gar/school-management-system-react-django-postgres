/**
 * Admin Dashboard Layout
 * With robust session validation and React 19 optimizations
 */
"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  WifiOff,
  School,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuthStore, useIsHydrated } from "@/stores/auth-store";
import {
  validateSession,
  checkHealth,
  getSession,
  clearTokens,
} from "@/lib/auth/session";
import { clearSessionAction } from "@/lib/actions/auth";
import { useConnectionStatus } from "@/lib/auth/hooks";
import type { NavItem, NavGroup } from "@/components/layout/sidebar";

// Grouped navigation items for admin sidebar
const adminNavGroups: NavGroup[] = [
  {
    title: "Overview",
    defaultOpen: true,
    items: [
      {
        title: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "People Management",
    defaultOpen: true,
    items: [
      {
        title: "Students",
        href: "/admin/students",
        icon: Users,
      },
      {
        title: "Teachers",
        href: "/admin/teachers",
        icon: UserCheck,
      },
    ],
  },
  {
    title: "Academics",
    defaultOpen: true,
    items: [
      {
        title: "Classes",
        href: "/admin/classes",
        icon: GraduationCap,
      },
      {
        title: "Subjects",
        href: "/admin/subjects",
        icon: BookOpen,
      },
      {
        title: "Sessions",
        href: "/admin/sessions",
        icon: Calendar,
      },
    ],
  },
  {
    title: "Finance",
    defaultOpen: false,
    items: [
      {
        title: "Fee Management",
        href: "/admin/fees",
        icon: DollarSign,
      },
    ],
  },
  {
    title: "Configuration",
    defaultOpen: false,
    items: [
      {
        title: "Settings",
        href: "/admin/settings",
        icon: Settings,
      },
    ],
  },
];

// Premium loading component
function AdminLayoutSkeleton() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/50">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing ring */}
        <div className="absolute -inset-4 bg-amber-500/10 rounded-full blur-xl animate-pulse" />

        {/* Spinning border */}
        <div className="w-16 h-16 rounded-full border-4 border-amber-100 border-t-amber-600 animate-spin" />

        {/* Center Logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white p-2 rounded-full shadow-sm">
            <School
              className="w-6 h-6 text-amber-600 animate-bounce"
              style={{ animationDuration: "3s" }}
            />
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900">
          School Management System
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-amber-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-amber-600 rounded-full animate-bounce" />
        </div>
        <p className="text-sm text-gray-500 font-medium">
          Verifying secure session...
        </p>
      </div>
    </div>
  );
}

// Check imports to ensure School icon is available
// existing imports: LayoutDashboard, Users, UserCheck, GraduationCap, etc.
// Need to ensure 'School' is imported.

// Session error component
function SessionError({
  message,
  onRetry,
  isRetrying,
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
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Session Error
        </h2>
        <p className="text-gray-500 text-sm mb-4">{message}</p>
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`}
          />
          {isRetrying ? "Retrying..." : "Retry"}
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
  const isHydrated = useIsHydrated();
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

    // Optimize: Check local session first (synchronous)
    const session = getSession();
    if (!session) {
      router.replace("/login/admin");
      return;
    }

    try {
      // Run validation and health check in parallel, but don't block validation on health
      // We prioritize validation result. If validation works, we're good.
      const [validationResult, healthResult] = await Promise.all([
        validateSession(),
        checkHealth(),
      ]);

      setApiHealthy(healthResult.api);
      const { valid, user: validatedUser } = validationResult;

      if (!valid) {
        clearTokens();
        await clearSessionAction();
        router.replace("/login/admin");
        return;
      }

      // Check role
      if (validatedUser?.role !== "admin") {
        setSessionError("You do not have admin access.");
        clearTokens();
        await clearSessionAction();

        // Redirect to appropriate dashboard
        if (validatedUser?.role === "teacher") {
          router.replace("/teacher");
        } else if (validatedUser?.role === "student") {
          router.replace("/student");
        } else {
          router.replace("/login/admin");
        }
        return;
      }

      setIsAuthorized(true);
    } catch (error) {
      setSessionError("Session validation failed. Please try again.");
    } finally {
      setIsValidating(false);
    }
  }, [router]);

  // Initial validation - wait for hydration, then validate
  useEffect(() => {
    // Don't do anything until Zustand store is hydrated
    if (!isHydrated) return;

    // Quick check of local state first
    if (!isAuthenticated) {
      router.push("/login/admin");
      return;
    }

    if (user?.role !== "admin") {
      // Redirect based on role
      if (user?.role === "teacher") {
        router.push("/teacher");
      } else if (user?.role === "student") {
        router.push("/student");
      } else {
        router.push("/login/admin");
      }
      return;
    }

    // Validate session with backend
    startTransition(() => {
      validateUserSession();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, isAuthenticated, user?.role]);

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
          router.push("/login/admin");
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

  // Show loading state while hydrating or validating
  if (!isHydrated || isValidating || isPending) {
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
      <DashboardShell navGroups={adminNavGroups} role="admin">
        {/* API Health indicator - only show when unhealthy */}
        {!apiHealthy && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700 text-sm">
            <AlertCircle className="h-4 w-4 flex shrink-0" />
            <span>
              Server connection is unstable. Some features may not work
              properly.
            </span>
          </div>
        )}
        {children}
      </DashboardShell>
    </>
  );
}
