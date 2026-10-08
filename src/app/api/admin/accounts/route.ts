import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || !(session.user as any).roles?.includes('ADMIN')) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }

  const adminId = (session.user as any).id as string

  try {
    const { officerId, action, roles } = await req.json()

    if (!officerId || !action) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 })
    }

    const officer = await db.officer.findUnique({ where: { id: officerId } })
    if (!officer) {
      return NextResponse.json({ message: 'Officer not found.' }, { status: 404 })
    }

    if (action === 'approve') {
      const assignedRoles: Role[] = Array.isArray(roles) ? roles : []

      await db.officer.update({
        where: { id: officerId },
        data: { status: 'ACTIVE', roles: assignedRoles },
      })

      await db.auditLog.create({
        data: {
          officerId: adminId,
          action: 'ACCOUNT_APPROVED',
          targetRecord: 'Officer',
          recordId: officerId,
          previousVal: JSON.stringify({ status: officer.status, roles: officer.roles }),
          newVal: JSON.stringify({ status: 'ACTIVE', roles: assignedRoles }),
        },
      })

      return NextResponse.json({ message: 'Account approved.' })
    }

    if (action === 'reject') {
      await db.officer.update({
        where: { id: officerId },
        data: { status: 'REJECTED' },
      })

      await db.auditLog.create({
        data: {
          officerId: adminId,
          action: 'ACCOUNT_REJECTED',
          targetRecord: 'Officer',
          recordId: officerId,
          previousVal: JSON.stringify({ status: officer.status }),
          newVal: JSON.stringify({ status: 'REJECTED' }),
        },
      })

      return NextResponse.json({ message: 'Account rejected.' })
    }

    if (action === 'update-roles') {
      const assignedRoles: Role[] = Array.isArray(roles) ? roles : []

      await db.officer.update({
        where: { id: officerId },
        data: { roles: assignedRoles },
      })

      await db.auditLog.create({
        data: {
          officerId: adminId,
          action: 'ACCOUNT_ROLES_UPDATED',
          targetRecord: 'Officer',
          recordId: officerId,
          previousVal: JSON.stringify({ roles: officer.roles }),
          newVal: JSON.stringify({ roles: assignedRoles }),
        },
      })

      return NextResponse.json({ message: 'Roles updated.' })
    }

    return NextResponse.json({ message: 'Unknown action.' }, { status: 400 })
  } catch (err) {
    console.error('[admin/accounts] error:', err)
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 })
  }
}
