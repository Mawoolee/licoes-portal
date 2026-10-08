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

    // PENDING users: only allow access to List of Students (/admin/roster)
    if (status === 'PENDING') {
      if (!path.startsWith('/admin/roster') && !path.startsWith('/pending')) {
        return NextResponse.redirect(new URL('/pending', req.url))
      }
      return NextResponse.next()
    }

    // ACTIVE users — role-based route guards

    // /treasurer (TREASURER or ADMIN)
    if (
      path.startsWith('/treasurer') &&
      !roles.includes('TREASURER') &&
      !roles.includes('ADMIN')
    ) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    // /attendance (ATTENDANCE_OFFICER, TREASURER, or ADMIN)
    if (
      path.startsWith('/attendance') &&
      !roles.includes('ATTENDANCE_OFFICER') &&
      !roles.includes('ADMIN') &&
      !roles.includes('TREASURER')
    ) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    // /admin (ADMIN only) — but /admin/roster is accessible to PENDING too (handled above)
    if (path.startsWith('/admin') && !roles.includes('ADMIN')) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    // /finance (FINANCE_OFFICER or ADMIN)
    if (
      path.startsWith('/finance') &&
      !roles.includes('FINANCE_OFFICER') &&
      !roles.includes('ADMIN')
    ) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    // /reports/attendance (ADMIN or FINANCE_OFFICER)
    if (
      path === '/reports/attendance' &&
      !roles.includes('ADMIN') &&
      !roles.includes('FINANCE_OFFICER')
    ) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    // /reports/payments (ADMIN or TREASURER)
    if (
      path === '/reports/payments' &&
      !roles.includes('ADMIN') &&
      !roles.includes('TREASURER')
    ) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    // /auditor (AUDITOR or ADMIN)
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
    '/treasurer/:path*',
    '/attendance/:path*',
    '/admin/:path*',
    '/finance/:path*',
    '/reports/:path*',
    '/auditor/:path*',
    '/pending',
  ],
}
