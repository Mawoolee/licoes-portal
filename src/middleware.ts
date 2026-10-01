import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // 1. Redirect sa /login kapag walang token
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const roles = (token.roles as string[]) || []

    // 2. Protektahan ang /treasurer routes (Dapat may TREASURER o ADMIN role)
    if (path.startsWith('/treasurer') && !roles.includes('TREASURER') && !roles.includes('ADMIN')) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    // 3. Protektahan ang /attendance route (Dapat may ATTENDANCE_OFFICER, TREASURER, o ADMIN role)
    if (
      path.startsWith('/attendance') &&
      !roles.includes('ATTENDANCE_OFFICER') &&
      !roles.includes('ADMIN') &&
      !roles.includes('TREASURER')
    ) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    // 4. Protektahan ang /admin routes (ADMIN lamang)
    if (path.startsWith('/admin') && !roles.includes('ADMIN')) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ['/treasurer/:path*', '/attendance/:path*', '/admin/:path*'],
}