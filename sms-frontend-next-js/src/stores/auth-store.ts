/**
 * Auth Store - Zustand
 * Manages authentication state with persistence
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Teacher, Admin, Student, UserRole } from '@/types';
import { authApi } from '@/lib/api';
import { clearTokens, getAccessToken, setTokens } from '@/lib/api/client';

// Session storage key prefix
const STORAGE_KEY = 'sms-auth-storage';

interface AuthState {
  // State
  user: User | null;
  teacher: Teacher | null;
  admin: Admin | null;
  student: Student | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;
  lastValidated: number | null;
  
  // Computed
  role: UserRole | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  studentLogin: (studentId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  setAuth: (user: User, tokens: { access: string; refresh: string }) => void;
  setHydrated: () => void;
  reset: () => void;
}

const initialState = {
  user: null,
  teacher: null,
  admin: null,
  student: null,
  isAuthenticated: false,
  isLoading: true,
  isHydrated: false,
  error: null,
  lastValidated: null,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      ...initialState,
      
      // Computed role
      get role() {
        const { user, student } = get();
        if (student) return 'student';
        return user?.role || null;
      },
      
      // Login action for admin/teacher
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(email, password);
          set({
            user: response.user,
            teacher: response.teacher,
            admin: response.admin,
            student: null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
          });
          throw error;
        }
      },
      
      // Student login action
      studentLogin: async (studentId: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.studentLogin(studentId, password);
          set({
            user: null,
            teacher: null,
            admin: null,
            student: response.student,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
          });
          throw error;
        }
      },
      
      // Logout action
      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Ignore logout errors
        }
        clearTokens();
        set({
          user: null,
          teacher: null,
          admin: null,
          student: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },
      
      // Fetch current user
      fetchCurrentUser: async () => {
        const token = getAccessToken();
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }
        
        set({ isLoading: true });
        try {
          const response = await authApi.getCurrentUser();
          set({
            user: response.user,
            teacher: response.teacher,
            admin: response.admin,
            isAuthenticated: true,
            isLoading: false,
            lastValidated: Date.now(),
          });
        } catch {
          clearTokens();
          set({
            user: null,
            teacher: null,
            admin: null,
            student: null,
            isAuthenticated: false,
            isLoading: false,
            lastValidated: null,
          });
        }
      },
      
      // Clear error
      clearError: () => set({ error: null }),
      
      // Set loading
      setLoading: (loading: boolean) => set({ isLoading: loading }),

      // Set auth from server action
      setAuth: (user: User, tokens: { access: string; refresh: string }) => {
        setTokens(tokens.access, tokens.refresh);
        set({
          user,
          teacher: user.role === 'teacher' ? user as any : null,
          admin: user.role === 'admin' ? user as any : null,
          student: user.role === 'student' ? user as any : null,
          isAuthenticated: true,
          isLoading: false,
          isHydrated: true,
          error: null,
          lastValidated: Date.now(),
        });
      },
      
      // Set hydrated (called when store is rehydrated from storage)
      setHydrated: () => set({ isHydrated: true, isLoading: false }),
      
      // Reset store to initial state
      reset: () => {
        clearTokens();
        set(initialState);
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') {
          return localStorage;
        }
        // Return a no-op storage for SSR
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({
        user: state.user,
        teacher: state.teacher,
        admin: state.admin,
        student: state.student,
        isAuthenticated: state.isAuthenticated,
        lastValidated: state.lastValidated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated();
        }
      },
    }
  )
);

// Selector hooks for convenience
export const useUser = () => useAuthStore((state) => state.user);
export const useTeacher = () => useAuthStore((state) => state.teacher);
export const useAdmin = () => useAuthStore((state) => state.admin);
export const useStudent = () => useAuthStore((state) => state.student);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useIsHydrated = () => useAuthStore((state) => state.isHydrated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useUserRole = () => useAuthStore((state) => {
  if (state.student) return 'student';
  return state.user?.role || null;
});
