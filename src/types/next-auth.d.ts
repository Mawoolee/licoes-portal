import { Role } from '@prisma/client'
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    roles: Role[]
  }

  interface Session {
    user: {
      id: string
      roles: Role[]
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    roles: Role[]
  }
}