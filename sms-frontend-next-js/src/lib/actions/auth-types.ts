/**
 * Auth Action Types
 * Shared types for auth actions (can be imported in both client and server)
 */
import type { User } from '@/types';

export interface AuthActionState {
  success: boolean;
  message: string;
  error?: string;
  errors?: Record<string, string[]>;
  user?: User;
  tokens?: { access: string; refresh: string };
  redirectTo?: string;
}

export const initialAuthState: AuthActionState = {
  success: false,
  message: '',
};
