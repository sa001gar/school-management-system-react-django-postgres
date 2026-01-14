/**
 * Enhanced Server Actions for Authentication
 * Using React 19 useActionState pattern
 */
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { User, UserRole } from '@/types';
import type { AuthActionState } from './auth-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// ============================================================================
// Cookie Helpers
// ============================================================================

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
};

async function setAuthCookies(
  access: string,
  refresh: string,
  role: UserRole
) {
  const cookieStore = await cookies();
  
  // Set httpOnly cookies for tokens (secure)
  cookieStore.set('access_token', access, {
    ...COOKIE_OPTIONS,
    maxAge: 60 * 60, // 1 hour
  });
  
  cookieStore.set('refresh_token', refresh, {
    ...COOKIE_OPTIONS,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  
  // Non-httpOnly for middleware role checking
  cookieStore.set('user_role', role, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  });
}

async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
  cookieStore.delete('user_role');
}

// ============================================================================
// Login Actions
// ============================================================================

/**
 * Admin/Teacher Login Action
 * For use with useActionState
 */
export async function loginAction(
  prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const role = (formData.get('role') as UserRole) || 'admin';

  // Validation
  if (!email?.trim()) {
    return {
      success: false,
      message: 'Email is required',
      error: 'Email is required',
    };
  }

  if (!password) {
    return {
      success: false,
      message: 'Password is required',
      error: 'Password is required',
    };
  }

  if (!email.includes('@')) {
    return {
      success: false,
      message: 'Please enter a valid email address',
      error: 'Invalid email format',
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = errorData.retry_after || 60;
        return {
          success: false,
          message: `Too many failed attempts. Try again in ${Math.ceil(retryAfter / 60)} minute(s).`,
          error: 'rate_limited',
        };
      }

      // Handle invalid credentials
      if (response.status === 401) {
        const attemptsMsg = errorData.message || '';
        return {
          success: false,
          message: errorData.detail || 'Invalid email or password',
          error: attemptsMsg || 'invalid_credentials',
        };
      }

      return {
        success: false,
        message: errorData.detail || errorData.message || 'Login failed',
        error: 'login_failed',
      };
    }

    const data = await response.json();

    // Validate response structure
    if (!data.access || !data.refresh || !data.user) {
      return {
        success: false,
        message: 'Invalid response from server',
        error: 'invalid_response',
      };
    }

    // Verify role matches
    if (role !== 'student' && data.user.role !== role) {
      return {
        success: false,
        message: `You don't have ${role} access. Your role is: ${data.user.role}`,
        error: 'role_mismatch',
      };
    }

    // Set cookies
    await setAuthCookies(data.access, data.refresh, data.user.role);

    const user: User = {
      id: data.user.id,
      email: data.user.email,
      role: data.user.role,
      name: data.user.name,
    };

    // Determine redirect URL
    const redirectTo =
      data.user.role === 'admin'
        ? '/admin'
        : data.user.role === 'teacher'
        ? '/teacher'
        : '/';

    return {
      success: true,
      message: 'Login successful',
      user,
      tokens: { access: data.access, refresh: data.refresh },
      redirectTo,
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'Network error. Please check your connection.',
      error: 'network_error',
    };
  }
}

/**
 * Student Login Action
 */
export async function studentLoginAction(
  prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const studentId = formData.get('student_id') as string;
  const password = formData.get('password') as string;

  if (!studentId?.trim()) {
    return {
      success: false,
      message: 'Student ID is required',
      error: 'Student ID is required',
    };
  }

  if (!password) {
    return {
      success: false,
      message: 'Password is required',
      error: 'Password is required',
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/student-login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ student_id: studentId.trim(), password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 429) {
        return {
          success: false,
          message: 'Too many failed attempts. Please try again later.',
          error: 'rate_limited',
        };
      }

      return {
        success: false,
        message: errorData.detail || errorData.message || 'Invalid credentials',
        error: 'invalid_credentials',
      };
    }

    const data = await response.json();

    if (!data.access || !data.refresh || !data.student) {
      return {
        success: false,
        message: 'Invalid response from server',
        error: 'invalid_response',
      };
    }

    await setAuthCookies(data.access, data.refresh, 'student');

    const user: User = {
      id: data.student.id,
      email: data.student.student_id,
      role: 'student',
      name: data.student.name,
    };

    return {
      success: true,
      message: 'Login successful',
      user,
      tokens: { access: data.access, refresh: data.refresh },
      redirectTo: '/student',
    };
  } catch (error) {
    console.error('Student login error:', error);
    return {
      success: false,
      message: 'Network error. Please check your connection.',
      error: 'network_error',
    };
  }
}

// ============================================================================
// Logout Action
// ============================================================================

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;

  // Try to invalidate the refresh token on the backend
  if (refreshToken) {
    try {
      await fetch(`${API_BASE_URL}/auth/logout/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });
    } catch {
      // Ignore errors during logout
    }
  }

  await clearAuthCookies();
  redirect('/login');
}

// ============================================================================
// Session Validation
// ============================================================================

/**
 * Validate current session from server
 */
export async function validateSessionAction(): Promise<{
  valid: boolean;
  user?: User;
  error?: string;
}> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;

  if (!accessToken) {
    return { valid: false, error: 'No access token' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Try to refresh token
        const refreshToken = cookieStore.get('refresh_token')?.value;
        if (refreshToken) {
          const refreshResult = await refreshTokenAction();
          if (refreshResult) {
            // Retry with new token
            const retryResponse = await fetch(`${API_BASE_URL}/auth/me/`, {
              headers: {
                Authorization: `Bearer ${refreshResult}`,
              },
              cache: 'no-store',
            });

            if (retryResponse.ok) {
              const data = await retryResponse.json();
              return {
                valid: true,
                user: {
                  id: data.user.id,
                  email: data.user.email,
                  role: data.user.role,
                  name: data.user.name,
                },
              };
            }
          }
        }
        return { valid: false, error: 'Session expired' };
      }
      return { valid: false, error: 'Validation failed' };
    }

    const data = await response.json();
    return {
      valid: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
        name: data.user.name,
      },
    };
  } catch (error) {
    return { valid: false, error: 'Network error' };
  }
}

// ============================================================================
// Token Refresh
// ============================================================================

/**
 * Refresh access token
 */
export async function refreshTokenAction(): Promise<string | null> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      await clearAuthCookies();
      return null;
    }

    const data = await response.json();

    // Update cookies
    const cookieStore2 = await cookies();
    cookieStore2.set('access_token', data.access, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60,
    });

    if (data.refresh) {
      cookieStore2.set('refresh_token', data.refresh, {
        ...COOKIE_OPTIONS,
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return data.access;
  } catch {
    return null;
  }
}

// ============================================================================
// Get Current User (for RSC)
// ============================================================================

/**
 * Get current user from cookies (for React Server Components)
 */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;

  if (!accessToken) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      id: data.user.id,
      email: data.user.email,
      role: data.user.role,
      name: data.user.name,
    };
  } catch {
    return null;
  }
}

// ============================================================================
// Helper: Check API Health
// ============================================================================

export async function checkApiHealth(): Promise<{
  healthy: boolean;
  latency: number;
}> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${API_BASE_URL}/sessions/`, {
      method: 'HEAD',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });

    return {
      healthy: response.status < 500,
      latency: Date.now() - startTime,
    };
  } catch {
    return {
      healthy: false,
      latency: Date.now() - startTime,
    };
  }
}
