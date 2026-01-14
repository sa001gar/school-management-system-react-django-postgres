/**
 * Server Actions for Authentication
 * Using useActionState hook pattern
 */
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { User, UserRole } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface ActionState {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  data?: unknown;
  user?: User;
  tokens?: { access: string; refresh: string };
  error?: string;
}

interface LoginInput {
  email: string;
  password: string;
  role: UserRole;
}

/**
 * Login action for all roles
 */
export async function loginAction(input: LoginInput): Promise<ActionState> {
  const { email, password, role } = input;

  if (!email || !password) {
    return {
      success: false,
      message: 'Email and password are required',
      error: 'Email and password are required',
    };
  }

  // Determine endpoint based on role
  const endpoint = role === 'student' 
    ? `${API_BASE_URL}/auth/student-login/`
    : `${API_BASE_URL}/auth/login/`;

  const body = role === 'student'
    ? { student_id: email, password }
    : { email, password };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 429) {
        return {
          success: false,
          message: 'Too many failed attempts. Please try again later.',
          error: errorData.message || 'Too many failed attempts. Please try again later.',
        };
      }
      
      return {
        success: false,
        message: errorData.detail || errorData.message || 'Invalid credentials',
        error: errorData.detail || errorData.message || 'Invalid credentials',
      };
    }

    const data = await response.json();
    
    // Create user object
    const user: User = role === 'student'
      ? { id: data.student.id, email: data.student.student_id, role: 'student', name: data.student.name }
      : { id: data.user.id, email: data.user.email, role: data.user.role, name: data.user.name };
    
    // Store tokens in cookies for server-side access
    const cookieStore = await cookies();
    cookieStore.set('access_token', data.access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour
    });
    cookieStore.set('refresh_token', data.refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    cookieStore.set('user_role', user.role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return {
      success: true,
      message: 'Login successful',
      user,
      tokens: { access: data.access, refresh: data.refresh },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred',
      error: error instanceof Error ? error.message : 'An error occurred',
    };
  }
}

/**
 * Student login action
 */
export async function studentLoginAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const studentId = formData.get('student_id') as string;
  const password = formData.get('password') as string;

  if (!studentId || !password) {
    return {
      success: false,
      message: 'Student ID and password are required',
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/student-login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ student_id: studentId, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.detail || errorData.message || 'Invalid credentials',
      };
    }

    const data = await response.json();
    
    const cookieStore = await cookies();
    cookieStore.set('access_token', data.access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60,
    });
    cookieStore.set('refresh_token', data.refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });
    cookieStore.set('user_role', 'student', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return {
      success: true,
      message: 'Login successful',
      data: {
        student: data.student,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred',
    };
  }
}

/**
 * Logout action
 */
export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;

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
      // Ignore logout errors
    }
  }

  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
  cookieStore.delete('user_role');
  
  redirect('/login');
}

/**
 * Get current user from server
 */
export async function getCurrentUser() {
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
      next: { revalidate: 60 }, // Cache for 1 minute
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

/**
 * Refresh token action
 */
export async function refreshTokenAction(): Promise<boolean> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;

  if (!refreshToken) {
    return false;
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
      return false;
    }

    const data = await response.json();
    
    cookieStore.set('access_token', data.access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60,
    });

    if (data.refresh) {
      cookieStore.set('refresh_token', data.refresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return true;
  } catch {
    return false;
  }
}
