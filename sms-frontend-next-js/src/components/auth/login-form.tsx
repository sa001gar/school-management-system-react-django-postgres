/**
 * Login Form Component
 */
'use client';

import { useState, useActionState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, User, Lock, Eye, EyeOff, School } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loginAction } from '@/lib/actions/auth-actions';
import { useAuthStore } from '@/stores/auth-store';
import type { UserRole } from '@/types';

interface LoginFormProps {
  role: UserRole;
  title: string;
  description?: string;
}

interface FormState {
  error?: string;
  success?: boolean;
}

export function LoginForm({ role, title, description }: LoginFormProps) {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [isPending, startTransition] = useTransition();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    startTransition(async () => {
      try {
        const result = await loginAction({ email, password, role });
        
        if (result.error) {
          setError(result.error);
          return;
        }

        if (result.user && result.tokens) {
          setAuth(result.user, result.tokens);
          
          // Redirect based on role
          switch (role) {
            case 'admin':
              router.push('/admin');
              break;
            case 'teacher':
              router.push('/teacher');
              break;
            case 'student':
              router.push('/student');
              break;
            default:
              router.push('/');
          }
        }
      } catch (err) {
        setError('An unexpected error occurred');
      }
    });
  };

  const getRoleIcon = () => {
    switch (role) {
      case 'admin':
        return <School className="h-8 w-8" />;
      case 'teacher':
        return <User className="h-8 w-8" />;
      case 'student':
        return <User className="h-8 w-8" />;
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br ${getRoleColor()} text-white mb-4`}>
            {getRoleIcon()}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="text-gray-500 mt-2">{description}</p>
          )}
        </div>

        {/* Login Card */}
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                leftIcon={<User className="h-4 w-4" />}
                autoComplete="email"
                required
              />

              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  leftIcon={<Lock className="h-4 w-4" />}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              <Button
                type="submit"
                className="w-full"
                isLoading={isPending}
                leftIcon={<LogIn className="h-4 w-4" />}
              >
                Sign In
              </Button>
            </form>

            {/* Forgot Password Link */}
            <div className="mt-4 text-center">
              <a
                href={`/forgot-password?role=${role}`}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Forgot your password?
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
