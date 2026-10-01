'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

// ── Collection Periods ────────────────────────────────────────────────────────

export async function getCollectionPeriodsAction() {
  return db.collectionPeriod.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      feeItems: { orderBy: { createdAt: 'asc' } },
      _count: { select: { paymentClaims: true } },
    },
  })
}

export async function createCollectionPeriodAction(formData: FormData) {
  const name = (formData.get('name') as string | null)?.trim()
  if (!name) return { success: false, message: 'Period name is required.' }

  try {
    const period = await db.collectionPeriod.create({ data: { name, isActive: false } })
    revalidatePath('/admin/collection-periods')
    return { success: true, id: period.id, message: `"${name}" created.` }
  } catch {
    return { success: false, message: 'Failed to create collection period.' }
  }
}

export async function activateCollectionPeriodAction(periodId: string) {
  try {
    // Deactivate all others first, then activate the selected one (atomic)
    await db.$transaction([
      db.collectionPeriod.updateMany({ where: { isActive: true }, data: { isActive: false } }),
      db.collectionPeriod.update({ where: { id: periodId }, data: { isActive: true } }),
    ])
    revalidatePath('/admin/collection-periods')
    revalidatePath('/submit-claim')
    return { success: true }
  } catch {
    return { success: false, message: 'Failed to activate period.' }
  }
}

export async function deactivateCollectionPeriodAction(periodId: string) {
  try {
    await db.collectionPeriod.update({ where: { id: periodId }, data: { isActive: false } })
    revalidatePath('/admin/collection-periods')
    return { success: true }
  } catch {
    return { success: false, message: 'Failed to deactivate period.' }
  }
}

// ── Fee Items ─────────────────────────────────────────────────────────────────

export async function createFeeItemAction(formData: FormData) {
  const collectionPeriodId = formData.get('collectionPeriodId') as string
  const name = (formData.get('name') as string | null)?.trim()
  const amountStr = formData.get('amount') as string
  const requiresShirtSize = formData.get('requiresShirtSize') === 'true'
  const isRequired = formData.get('isRequired') !== 'false'

  if (!collectionPeriodId || !name || !amountStr) {
    return { success: false, message: 'Period, name, and amount are required.' }
  }

  const amount = parseFloat(amountStr)
  if (isNaN(amount) || amount < 0) {
    return { success: false, message: 'Amount must be a non-negative number.' }
  }

  try {
    const item = await db.feeItem.create({
      data: { collectionPeriodId, name, amount, requiresShirtSize, isRequired },
    })
    revalidatePath('/admin/collection-periods')
    return { success: true, id: item.id, message: `"${name}" added.` }
  } catch {
    return { success: false, message: 'Failed to create fee item.' }
  }
}

export async function deleteFeeItemAction(feeItemId: string) {
  try {
    // Only allow deletion if no claims reference this item
    const usageCount = await db.claimItem.count({ where: { feeItemId } })
    if (usageCount > 0) {
      return {
        success: false,
        message: `Cannot delete — ${usageCount} payment claim(s) reference this item.`,
      }
    }
    await db.feeItem.delete({ where: { id: feeItemId } })
    revalidatePath('/admin/collection-periods')
    return { success: true }
  } catch {
    return { success: false, message: 'Failed to delete fee item.' }
  }
}
