import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (credentials?.email && credentials?.password) {
          return {
            id: '1',
            name: 'LICOES Officer',
            email: credentials.email,
            roles: ['ADMIN', 'TREASURER'],
          }
        }
        return null
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.roles = (user as any).roles || []
      }
      return token
    },
    async session({ session, token }) {
      if (session && session.user) {
        (session.user as any).roles = token.roles || []
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET || 'licoes-secret-key-2026',
}