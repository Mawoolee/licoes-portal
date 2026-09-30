import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'

export async function getCurrentOfficer() {
  const session = await getServerSession(authOptions)
  return session?.user || null
}

export async function requireOfficerRole(allowedRoles: Role[]) {
  const officer = await getCurrentOfficer()

  if (!officer) {
    throw new Error('Unauthorized: Authentication required.')
  }

  const hasRole = allowedRoles.some((role) => officer.roles.includes(role))

  if (!hasRole) {
    throw new Error('Forbidden: Insufficient permissions.')
  }

  return officer
}