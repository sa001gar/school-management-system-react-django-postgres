/**
 * Enhanced Login Form with React 19 Features
 * Uses useActionState, useOptimistic, and smooth transitions
 */
'use client';

import { useActionState, useOptimistic, useEffect, useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, User, Lock, Eye, EyeOff, School, AlertCircle, CheckCircle2, Loader2, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { loginAction, studentLoginAction } from '@/lib/actions/auth';
import { type AuthActionState, initialAuthState } from '@/lib/actions/auth-types';
import { useAuthStore } from '@/stores/auth-store';
import { setTokens, setSession } from '@/lib/auth/session';
import { useConnectionStatus } from '@/lib/auth/hooks';
import type { UserRole } from '@/types';

interface LoginFormProps {
  role: UserRole;
  title: string;
  description?: string;
}

// Form state for optimistic updates
interface FormState {
  email: string;
  password: string;
  isSubmitting: boolean;
}

export function EnhancedLoginForm({ role, title, description }: LoginFormProps) {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const isOnline = useConnectionStatus();
  
  // Form state
  const [formState, setFormState] = useState<FormState>({
    email: '',
    password: '',
    isSubmitting: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // React 19 useActionState
  const action = role === 'student' ? studentLoginAction : loginAction;
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(
    action,
    initialAuthState
  );
  
  // Optimistic UI state
  const [optimisticState, setOptimisticState] = useOptimistic(
    { status: 'idle' as 'idle' | 'loading' | 'success' | 'error' },
    (current, newStatus: 'idle' | 'loading' | 'success' | 'error') => ({
      status: newStatus,
    })
  );
  
  // Transition for smooth navigation
  const [isNavigating, startNavigation] = useTransition();

  // Handle mount state for hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle successful login
  useEffect(() => {
    if (state.success && state.user && state.tokens) {
      // Store tokens in localStorage
      setTokens(state.tokens.access, state.tokens.refresh);
      
      // Store session data
      setSession({
        user: {
          id: state.user.id,
          email: state.user.email,
          role: state.user.role,
          name: state.user.name,
        },
        expiresAt: Date.now() + 60 * 60 * 1000,
        lastValidated: Date.now(),
      });
      
      // Update auth store
      setAuth(state.user, state.tokens);
      
      setOptimisticState('success');
      
      // Navigate with transition
      startNavigation(() => {
        router.push(state.redirectTo || `/${role}`);
        router.refresh();
      });
    }
  }, [state, setAuth, router, role, setOptimisticState]);

  // Form change handlers with optimistic feedback
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, email: e.target.value }));
  }, []);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, password: e.target.value }));
  }, []);

  const getRoleIcon = () => {
    switch (role) {
      case 'admin':
        return <School className="h-8 w-8" />;
      case 'teacher':
      case 'student':
      default:
        return <User className="h-8 w-8" />;
    }
  };

  const getRoleColor = () => {
    switch (role) {
      case 'admin':
        return 'from-purple-500 to-indigo-600';
      case 'teacher':
        return 'from-blue-500 to-cyan-600';
      case 'student':
        return 'from-green-500 to-emerald-600';
      default:
        return 'from-primary-500 to-secondary-500';
    }
  };

  const isSubmitting = isPending || isNavigating || optimisticState.status === 'loading';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <div className="w-full max-w-md">
        {/* Connection Status */}
        {mounted && !isOnline && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg flex items-center gap-2">
            <WifiOff className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">You appear to be offline. Please check your connection.</span>
          </div>
        )}

        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div
            className={`inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br ${getRoleColor()} text-white mb-4 shadow-lg transform transition-transform hover:scale-105`}
          >
            {getRoleIcon()}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && <p className="text-gray-500 mt-2">{description}</p>}
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-0">
          <CardContent className="p-6">
            <form action={formAction} className="space-y-4">
              {/* Hidden role field */}
              <input type="hidden" name="role" value={role} />

              {/* Error Message */}
              {state.error && !isSubmitting && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{state.message}</span>
                </div>
              )}

              {/* Success Message */}
              {state.success && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">Login successful! Redirecting...</span>
                </div>
              )}

              {/* Email/Student ID Field */}
              <div className="space-y-1">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  {role === 'student' ? 'Student ID' : 'Email'}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="email"
                    name={role === 'student' ? 'student_id' : 'email'}
                    type={role === 'student' ? 'text' : 'email'}
                    value={formState.email}
                    onChange={handleEmailChange}
                    placeholder={role === 'student' ? 'Enter your student ID' : 'Enter your email'}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    autoComplete={role === 'student' ? 'username' : 'email'}
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formState.password}
                    onChange={handlePasswordChange}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || (mounted && !isOnline)}
                className={`w-full py-2.5 px-4 rounded-lg font-medium text-white transition-all flex items-center justify-center gap-2 ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : `bg-gradient-to-r ${getRoleColor()} hover:opacity-90 hover:shadow-md`
                } disabled:opacity-50`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>

            {/* Forgot Password Link */}
            <div className="mt-4 text-center">
              <a
                href={`/forgot-password?role=${role}`}
                className="text-sm text-primary-600 hover:text-primary-700 transition-colors"
              >
                Forgot your password?
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Back to Home
          </a>
        </div>

        {/* Connection Indicator */}
        {mounted && (
          <div className="mt-4 flex justify-center">
            <div
              className={`flex items-center gap-1.5 text-xs ${
                isOnline ? 'text-green-600' : 'text-amber-600'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="h-3 w-3" />
                  <span>Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  <span>Offline</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
