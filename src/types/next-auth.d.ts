import { AccountStatus, Role } from '@prisma/client'
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    roles: Role[]
    status: AccountStatus
  }

  interface Session {
    user: {
      id: string
      roles: Role[]
      status: AccountStatus
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    roles: Role[]
    status: AccountStatus
  }
}
