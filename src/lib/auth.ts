import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

const DWCL_DOMAIN = '@dwc-legazpi.edu'
const ADMIN_EMAIL = 'licoes@dwc-legazpi.edu'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const email = credentials.email.toLowerCase().trim()
        if (!email.endsWith(DWCL_DOMAIN)) return null

        const officer = await db.officer.findUnique({ where: { email } })
        if (!officer) return null
        if (officer.status === 'REJECTED') return null

        // Google-only accounts (empty passwordHash) skip the password check.
        // Accounts with a password must match it.
        if (officer.passwordHash) {
          const valid = await bcrypt.compare(credentials.password, officer.passwordHash)
          if (!valid) return null
        }

        return {
          id: officer.id,
          name: officer.name,
          email: officer.email,
          roles: officer.roles,
          status: officer.status,
        } as any
      },
    }),
  ],
  pages: { signIn: '/login', error: '/login' },
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'google') return true
      const email = user.email?.toLowerCase().trim()
      if (!email || !email.endsWith(DWCL_DOMAIN)) return '/login?error=not_dwcl'

      let officer = await db.officer.findUnique({ where: { email } })
      if (!officer) {
        const isAdmin = email === ADMIN_EMAIL
        officer = await db.officer.create({
          data: {
            name: user.name ?? email.split('@')[0],
            email,
            passwordHash: '',
            roles: isAdmin ? ['ADMIN'] : [],
            status: isAdmin ? 'ACTIVE' : 'PENDING',
          },
        })
        await db.auditLog.create({
          data: {
            action: isAdmin ? 'ACCOUNT_ADMIN_CREATED' : 'ACCOUNT_SIGNUP',
            targetRecord: 'Officer',
            recordId: officer.id,
            newVal: JSON.stringify({ email, status: officer.status, method: 'google' }),
          },
        })
      } else if (
        email === ADMIN_EMAIL &&
        (officer.status !== 'ACTIVE' || !officer.roles.includes('ADMIN'))
      ) {
        await db.officer.update({ where: { email }, data: { roles: ['ADMIN'], status: 'ACTIVE' } })
      }

      if (officer.status === 'REJECTED') return '/login?error=rejected'
      return true
    },

    async jwt({ token, user, account }) {
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