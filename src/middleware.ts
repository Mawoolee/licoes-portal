import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const roles = (token.roles as string[]) || []
    const status = token.status as string | undefined

    // PENDING users: only allow dashboard and roster
    if (status === 'PENDING') {
      const allowed =
        path === '/admin' ||
        path.startsWith('/admin/roster') ||
        path.startsWith('/pending')
      if (!allowed) {
        return NextResponse.redirect(new URL('/admin', req.url))
      }
      return NextResponse.next()
    }

    // ACTIVE users — role-based route guards

    if (
      path.startsWith('/treasurer') &&
      !roles.includes('TREASURER') &&
      !roles.includes('ADMIN')
    ) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    if (
      path.startsWith('/attendance') &&
      !roles.includes('ATTENDANCE_OFFICER') &&
      !roles.includes('ADMIN') &&
      !roles.includes('TREASURER')
    ) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    if (path.startsWith('/admin') && !roles.includes('ADMIN')) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    if (
      path.startsWith('/finance') &&
      !roles.includes('FINANCE_OFFICER') &&
      !roles.includes('ADMIN')
    ) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    if (
      path === '/reports/attendance' &&
      !roles.includes('ADMIN') &&
      !roles.includes('FINANCE_OFFICER')
    ) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    if (
      path === '/reports/payments' &&
      !roles.includes('ADMIN') &&
      !roles.includes('TREASURER')
    ) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    if (
      path.startsWith('/auditor') &&
      !roles.includes('AUDITOR') &&
      !roles.includes('ADMIN')
    ) {
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
  matcher: [
    '/admin/:path*',
    '/treasurer/:path*',
    '/attendance/:path*',
    '/finance/:path*',
    '/reports/:path*',
    '/auditor/:path*',
    '/pending',
  ],
}
