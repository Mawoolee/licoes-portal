import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { db } from '@/lib/db'

const DWCL_DOMAIN = '@dwc-legazpi.edu'
const ADMIN_EMAIL = 'licoes@dwc-legazpi.edu'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60,
  },
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase().trim()

      // Only allow DWCL school accounts
      if (!email || !email.endsWith(DWCL_DOMAIN)) {
        return '/login?error=not_dwcl'
      }

      // Find or auto-create the officer record
      let officer = await db.officer.findUnique({ where: { email } })

      if (!officer) {
        // First time signing in — check if this is the designated admin account
        const isAdmin = email === ADMIN_EMAIL

        officer = await db.officer.create({
          data: {
            name: user.name ?? email.split('@')[0],
            email,
            passwordHash: '', // not used for Google accounts
            roles: isAdmin ? ['ADMIN'] : [],
            status: isAdmin ? 'ACTIVE' : 'PENDING',
          },
        })

        await db.auditLog.create({
          data: {
            action: isAdmin ? 'ACCOUNT_ADMIN_CREATED' : 'ACCOUNT_SIGNUP',
            targetRecord: 'Officer',
            recordId: officer.id,
            newVal: JSON.stringify({
              name: officer.name,
              email,
              status: officer.status,
              roles: officer.roles,
              method: 'google',
            }),
          },
        })
      } else if (email === ADMIN_EMAIL && (officer.status !== 'ACTIVE' || !officer.roles.includes('ADMIN'))) {
        // Ensure the admin account always has ADMIN role and ACTIVE status
        await db.officer.update({
          where: { email },
          data: { roles: ['ADMIN'], status: 'ACTIVE' },
        })
      }

      // Rejected accounts cannot log in
      if (officer.status === 'REJECTED') {
        return '/login?error=rejected'
      }

      return true
    },

    async jwt({ token, user, account }) {
      // On first sign-in, load officer data from DB
      if (account && user?.email) {
        const email = user.email.toLowerCase().trim()
        const officer = await db.officer.findUnique({ where: { email } })
        if (officer) {
          token.id = officer.id
          token.roles = officer.roles
          token.status = officer.status
        }
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).roles = token.roles ?? []
        ;(session.user as any).status = token.status ?? 'PENDING'
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
