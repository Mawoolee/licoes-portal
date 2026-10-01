import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'LICOES Officer Login',
      credentials: {
        email: { label: 'DWCL Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Look up the officer in the database
        const officer = await db.officer.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        })

        if (!officer) return null

        const passwordValid = await bcrypt.compare(
          credentials.password,
          officer.passwordHash
        )
        if (!passwordValid) return null

        return {
          id: officer.id,
          name: officer.name,
          email: officer.email,
          // Cast to satisfy NextAuth's User type — roles stored as Role[] enum in DB
          roles: officer.roles as unknown as string[],
        } as any
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    // 8-hour session — officers re-authenticate each day (Req 1.9)
    maxAge: 8 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.roles = (user as any).roles ?? []
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).roles = token.roles ?? []
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
