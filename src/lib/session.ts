import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AccountStatus, Role } from '@prisma/client'

export async function getCurrentOfficer() {
  const session = await getServerSession(authOptions)
  return session?.user || null
}

export async function requireOfficerRole(allowedRoles: Role[]) {
  const officer = await getCurrentOfficer()

  if (!officer) {
    throw new Error('Unauthorized: Authentication required.')
  }

  // Pending accounts never have role-based access
  if ((officer as any).status !== 'ACTIVE') {
    throw new Error('Forbidden: Account is not yet approved.')
  }

  const hasRole = allowedRoles.some((role) => (officer as any).roles.includes(role))

  if (!hasRole) {
    throw new Error('Forbidden: Insufficient permissions.')
  }

  return officer
}
