/**
 * Auth API Service
 * Handles authentication with Django backend
 */
import api, { setTokens, clearTokens, API_BASE_URL } from './client';
import type { LoginResponse, CurrentUserResponse, Teacher, StudentLoginResponse, Student } from '@/types';

/**
 * Custom error class for authentication errors
 */
export class AuthError extends Error {
  retryAfter?: number;
  attemptsRemaining?: number;
  
  constructor(message: string, options?: { retryAfter?: number; attemptsRemaining?: number }) {
    super(message);
    this.name = 'AuthError';
    this.retryAfter = options?.retryAfter;
    this.attemptsRemaining = options?.attemptsRemaining;
  }
}

export const authApi = {
  /**
   * Login with email and password (Admin/Teacher)
   */
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 429) {
        throw new AuthError(
          errorData.message || 'Too many failed login attempts. Please try again later.',
          { retryAfter: errorData.retry_after }
        );
      }
      
      if (response.status === 401) {
        throw new AuthError(errorData.message || 'Invalid email or password.');
      }
      
      throw new AuthError(
        errorData.detail || 
        errorData.non_field_errors?.[0] || 
        errorData.error ||
        'Invalid login credentials'
      );
    }

    const data: LoginResponse = await response.json();
    setTokens(data.access, data.refresh);
    return data;
  },

  /**
   * Student login with student ID and password
   */
  studentLogin: async (studentId: string, password: string): Promise<StudentLoginResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/student-login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ student_id: studentId, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new AuthError(
        errorData.detail || errorData.message || 'Invalid student credentials'
      );
    }

    const data: StudentLoginResponse = await response.json();
    setTokens(data.access, data.refresh);
    return data;
  },

  /**
   * Logout current user
   */
  logout: async (): Promise<void> => {
    try {
      const refreshToken = typeof window !== 'undefined' 
        ? localStorage.getItem('refresh_token') 
        : null;
      if (refreshToken) {
        await api.post('/auth/logout/', { refresh: refreshToken });
      }
    } catch {
      // Ignore errors during logout
    }
    clearTokens();
  },

  /**
   * Get current user profile
   */
  getCurrentUser: async (): Promise<CurrentUserResponse> => {
    return api.get<CurrentUserResponse>('/auth/me/');
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string): Promise<{ access: string; refresh?: string }> => {
    const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    return response.json();
  },
};

export const teacherApi = {
  getAll: async (): Promise<Teacher[]> => {
    const response = await api.get<{ results?: Teacher[] } | Teacher[]>('/teachers/');
    return Array.isArray(response) ? response : (response.results || []);
  },

  getById: async (id: string): Promise<Teacher> => {
    return api.get<Teacher>(`/teachers/${id}/`);
  },

  create: async (data: { email: string; password: string; name: string }): Promise<Teacher> => {
    return api.post<Teacher>('/teachers/', data);
  },

  update: async (id: string, data: { email?: string; name?: string }): Promise<Teacher> => {
    return api.patch<Teacher>(`/teachers/${id}/`, data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/teachers/${id}/`);
  },

  resetPassword: async (id: string): Promise<{ message: string }> => {
    return api.post<{ message: string }>(`/teachers/${id}/reset-password/`);
  },
};

export default authApi;
