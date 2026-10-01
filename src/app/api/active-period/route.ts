import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
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
    return NextResponse.json({ period: null })
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
  })
}
