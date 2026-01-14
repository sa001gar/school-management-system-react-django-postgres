import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes and their allowed roles
const protectedRoutes: Record<string, string[]> = {
  '/admin': ['admin'],
  '/teacher': ['admin', 'teacher'],
  '/student': ['student'],
  '/dashboard': ['admin', 'teacher'],
};

// Public routes that don't require authentication
const publicRoutes = ['/login', '/student-login', '/', '/forgot-password'];

// Static asset patterns to skip
const staticPatterns = [
  '/_next',
  '/api',
  '/favicon.ico',
  '/manifest.json',
  '/robots.txt',
];

/**
 * Parse JWT to check expiration
 */
function isTokenExpired(token: string): boolean {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    // Add 60 second buffer
    return Date.now() >= (payload.exp * 1000) - 60000;
  } catch {
    return true;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip static files and API routes
  if (staticPatterns.some(pattern => pathname.startsWith(pattern))) {
    return NextResponse.next();
  }
  
  // Get auth cookies
  const userRole = request.cookies.get('user_role')?.value;
  const accessToken = request.cookies.get('access_token')?.value;
  
  // Check token validity
  const hasValidToken = accessToken && !isTokenExpired(accessToken);
  
  // Check if it's a public route
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
  
  // If user is authenticated and trying to access login pages, redirect to dashboard
  if (hasValidToken && pathname.includes('/login')) {
    if (userRole === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    } else if (userRole === 'teacher') {
      return NextResponse.redirect(new URL('/teacher', request.url));
    } else if (userRole === 'student') {
      return NextResponse.redirect(new URL('/student', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // If it's a public route, allow access
  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // If no valid access token, redirect to login
  if (!hasValidToken) {
    // Clear invalid cookies
    const response = NextResponse.redirect(new URL('/login', request.url));
    
    if (accessToken && isTokenExpired(accessToken)) {
      // Token expired - clear cookies
      response.cookies.delete('access_token');
      response.cookies.delete('refresh_token');
      response.cookies.delete('user_role');
    }
    
    // Preserve the original URL for redirect after login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Check role-based access
  for (const [route, allowedRoles] of Object.entries(protectedRoutes)) {
    if (pathname.startsWith(route)) {
      if (!userRole || !allowedRoles.includes(userRole)) {
        // User doesn't have permission, redirect to appropriate dashboard
        if (userRole === 'admin') {
          return NextResponse.redirect(new URL('/admin', request.url));
        } else if (userRole === 'teacher') {
          return NextResponse.redirect(new URL('/teacher', request.url));
        } else if (userRole === 'student') {
          return NextResponse.redirect(new URL('/student', request.url));
        }
        return NextResponse.redirect(new URL('/login', request.url));
      }
      break;
    }
  }
  
  // Add security headers
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)',
  ],
};
