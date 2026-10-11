import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.toLowerCase().trim() ?? null

  const period = await db.collectionPeriod.findFirst({
    where: { isActive: true },
    include: {
      feeItems: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          amount: true,
          requiresShirtSize: true,
          isRequired: true,
        },
      },
    },
  })

  if (!period) {
    return NextResponse.json({ period: null, alreadySubmitted: false })
  }

  // Check if this email already has a non-rejected claim for the active period
  let alreadySubmitted = false
  let existingStatus: string | null = null
  if (email) {
    const existing = await db.paymentClaim.findFirst({
      where: {
        collectionPeriodId: period.id,
        dwclEmail: email,
        status: { not: 'REJECTED' },
      },
      select: { status: true },
    })
    if (existing) {
      alreadySubmitted = true
      existingStatus = existing.status
    }
  }

  return NextResponse.json({
    period: {
      id: period.id,
      name: period.name,
      feeItems: period.feeItems.map((f) => ({
        ...f,
        amount: f.amount.toString(),
      })),
    },
    alreadySubmitted,
    existingStatus,
  })
}
