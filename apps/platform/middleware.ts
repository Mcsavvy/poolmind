import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// Middleware to protect routes
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Admin routes - require admin role
    if (pathname.startsWith('/admin') && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/auth/unauthorized', req.url));
    }

    // Moderator routes - require moderator or admin role
    if (pathname.startsWith('/moderator') && 
        !['admin', 'moderator'].includes(token?.role as string)) {
      return NextResponse.redirect(new URL('/auth/unauthorized', req.url));
    }

    // Protected API routes
    if (pathname.startsWith('/api/user') && !token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        // Public routes that don't require authentication
        const publicRoutes = [
          '/',
          '/auth/signin',
          '/auth/signup',
          '/auth/error',
          '/api/auth',
          '/api/health'
        ];

        // Check if the route is public or starts with a public path
        const isPublicRoute = publicRoutes.some(route => 
          pathname === route || pathname.startsWith(route)
        );

        // Allow access to public routes without authentication
        if (isPublicRoute) {
          return true;
        }

        // For all other routes, require authentication
        return !!token;
      },
    },
  }
);

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};