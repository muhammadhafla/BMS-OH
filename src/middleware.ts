import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = ['/dashboard', '/inventory', '/accounting', '/attendance', '/pos', '/settings'];
const PUBLIC_ROUTES = ['/'];

export function middleware(request: NextRequest) {
  // Temporarily disabled to bypass login
  // const sessionCookie = request.cookies.get('__session');
  // const { pathname } = request.nextUrl;

  // const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  // const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // if (!sessionCookie && isProtectedRoute) {
  //   // Redirect to login page if trying to access a protected route without a session
  //   return NextResponse.redirect(new URL('/', request.url));
  // }
  
  // if (sessionCookie && isPublicRoute) {
  //   // Redirect to dashboard if trying to access a public route with a session
  //    return NextResponse.redirect(new URL('/dashboard', request.url));
  // }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
