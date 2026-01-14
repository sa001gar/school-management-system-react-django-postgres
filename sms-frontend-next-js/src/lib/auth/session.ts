/**
 * Session Management Utilities
 * Handles token storage, refresh, and session persistence
 */

import { API_BASE_URL } from '../api/client';

// Constants
export const ACCESS_TOKEN_KEY = 'sms_access_token';
export const REFRESH_TOKEN_KEY = 'sms_refresh_token';
export const SESSION_KEY = 'sms_session';
export const TOKEN_REFRESH_MARGIN = 60 * 1000; // Refresh 1 minute before expiry

// Check if we're on the client side
const isClient = typeof window !== 'undefined';

export interface SessionData {
  user: {
    id: string;
    email: string;
    role: 'admin' | 'teacher' | 'student';
    name?: string;
  };
  expiresAt: number;
  lastValidated: number;
}

export interface TokenPayload {
  exp: number;
  user_id: string;
  token_type: string;
}

/**
 * Parse JWT token to get payload
 */
export function parseJWT(token: string): TokenPayload | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Check if token is expired or about to expire
 */
export function isTokenExpired(token: string, marginMs = 0): boolean {
  const payload = parseJWT(token);
  if (!payload) return true;
  return Date.now() >= (payload.exp * 1000) - marginMs;
}

/**
 * Get time until token expires (in ms)
 */
export function getTokenExpiryTime(token: string): number {
  const payload = parseJWT(token);
  if (!payload) return 0;
  return (payload.exp * 1000) - Date.now();
}

// ============================================================================
// Token Storage (Client-side)
// ============================================================================

export function getAccessToken(): string | null {
  if (!isClient) return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (!isClient) return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (!isClient) return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  
  // Also set in cookie for middleware
  document.cookie = `access_token=${accessToken}; path=/; max-age=${60 * 60}; SameSite=Lax`;
  document.cookie = `refresh_token=${refreshToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearTokens(): void {
  if (!isClient) return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  
  // Clear cookies
  document.cookie = 'access_token=; path=/; max-age=0';
  document.cookie = 'refresh_token=; path=/; max-age=0';
  document.cookie = 'user_role=; path=/; max-age=0';
}

// ============================================================================
// Session Storage
// ============================================================================

export function getSession(): SessionData | null {
  if (!isClient) return null;
  try {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return null;
    return JSON.parse(session);
  } catch {
    return null;
  }
}

export function setSession(session: SessionData): void {
  if (!isClient) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  
  // Set role cookie for middleware
  document.cookie = `user_role=${session.user.role}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearSession(): void {
  if (!isClient) return;
  localStorage.removeItem(SESSION_KEY);
}

// ============================================================================
// Token Refresh
// ============================================================================

let refreshPromise: Promise<string | null> | null = null;

/**
 * Refresh access token using refresh token
 * Uses a singleton promise to prevent multiple simultaneous refresh requests
 */
export async function refreshAccessToken(): Promise<string | null> {
  // Return existing promise if refresh is in progress
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  // Check if refresh token is expired
  if (isTokenExpired(refreshToken)) {
    clearTokens();
    return null;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!response.ok) {
        clearTokens();
        return null;
      }

      const data = await response.json();
      setTokens(data.access, data.refresh || refreshToken);
      return data.access;
    } catch {
      clearTokens();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Get valid access token, refreshing if necessary
 */
export async function getValidAccessToken(): Promise<string | null> {
  const accessToken = getAccessToken();
  
  if (!accessToken) {
    return null;
  }

  // If token is expired or about to expire, refresh it
  if (isTokenExpired(accessToken, TOKEN_REFRESH_MARGIN)) {
    return refreshAccessToken();
  }

  return accessToken;
}

// ============================================================================
// Session Validation
// ============================================================================

/**
 * Validate session with backend
 */
export async function validateSession(): Promise<{
  valid: boolean;
  user?: SessionData['user'];
  error?: string;
}> {
  const accessToken = await getValidAccessToken();
  
  if (!accessToken) {
    return { valid: false, error: 'No valid token' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearTokens();
        return { valid: false, error: 'Session expired' };
      }
      return { valid: false, error: 'Validation failed' };
    }

    const data = await response.json();
    const user = {
      id: data.user.id,
      email: data.user.email,
      role: data.user.role,
      name: data.user.name,
    };

    // Update session
    setSession({
      user,
      expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
      lastValidated: Date.now(),
    });

    return { valid: true, user };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
}

// ============================================================================
// Health Check
// ============================================================================

export interface HealthStatus {
  api: boolean;
  auth: boolean;
  latency: number;
  timestamp: number;
}

/**
 * Check API health and connectivity
 */
export async function checkHealth(): Promise<HealthStatus> {
  const startTime = Date.now();
  let apiHealthy = false;
  let authHealthy = false;

  try {
    // Check API connectivity (unauthenticated endpoint)
    const apiResponse = await fetch(`${API_BASE_URL}/sessions/`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    apiHealthy = apiResponse.status !== 502 && apiResponse.status !== 503;
  } catch {
    apiHealthy = false;
  }

  // Check auth if API is healthy
  if (apiHealthy) {
    const accessToken = getAccessToken();
    if (accessToken) {
      authHealthy = !isTokenExpired(accessToken);
    }
  }

  return {
    api: apiHealthy,
    auth: authHealthy,
    latency: Date.now() - startTime,
    timestamp: Date.now(),
  };
}

// ============================================================================
// Auto-refresh setup
// ============================================================================

let refreshTimer: NodeJS.Timeout | null = null;

/**
 * Setup automatic token refresh
 */
export function setupAutoRefresh(onRefreshFailed?: () => void): () => void {
  const scheduleRefresh = () => {
    const accessToken = getAccessToken();
    if (!accessToken) return;

    const expiryTime = getTokenExpiryTime(accessToken);
    const refreshTime = Math.max(expiryTime - TOKEN_REFRESH_MARGIN, 0);

    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }

    if (refreshTime > 0) {
      refreshTimer = setTimeout(async () => {
        const newToken = await refreshAccessToken();
        if (newToken) {
          scheduleRefresh();
        } else {
          onRefreshFailed?.();
        }
      }, refreshTime);
    }
  };

  scheduleRefresh();

  // Cleanup function
  return () => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  };
}

/**
 * Handle visibility change to validate session when tab becomes active
 */
export function setupVisibilityHandler(onSessionInvalid?: () => void): () => void {
  if (!isClient) return () => {};

  const handleVisibilityChange = async () => {
    if (document.visibilityState === 'visible') {
      const session = getSession();
      if (session) {
        // Validate if last validation was more than 5 minutes ago
        if (Date.now() - session.lastValidated > 5 * 60 * 1000) {
          const { valid } = await validateSession();
          if (!valid) {
            onSessionInvalid?.();
          }
        }
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}
