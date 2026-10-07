'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { ConfigItemType, SystemConfig } from '@prisma/client'

// ─── Types ────────────────────────────────────────────────────────────────

export type { ConfigItemType }
export type ConfigItem = SystemConfig

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

// Per-type maximum value lengths (Req 1.3, 2.3, 2.4)
const TYPE_MAX_LENGTH: Record<ConfigItemType, number> = {
  PROGRAM: 20,
  YEAR_LEVEL: 20,
  SHIRT_SIZE: 10,
  PAYMENT_METHOD: 50,
}

// ─── Actions ──────────────────────────────────────────────────────────────

/**
 * Returns all active ConfigItems for the given type.
 * Used by the admin panel and any form dropdown that needs dynamic options.
 */
export async function getConfigItemsAction(type: ConfigItemType): Promise<ConfigItem[]> {
  return db.systemConfig.findMany({
    where: { type, isActive: true },
    orderBy: { createdAt: 'asc' },
  })
}

/**
 * Adds a new ConfigItem of the given type.
 * Validates:
 *   - non-blank value (Req 2.5)
 *   - per-type length limit (Req 1.3, 2.3, 2.4)
 *   - no case-insensitive duplicate among active items of the same type (Req 1.6, 2.6)
 */
export async function addConfigItemAction(
  type: ConfigItemType,
  value: string,
): Promise<ActionResult> {
  const trimmed = value.trim()

  // Blank check (Req 2.5)
  if (trimmed.length === 0) {
    return { success: false, error: 'Value must not be blank.' }
  }

  // Per-type length check (Req 1.3, 2.3, 2.4)
  const maxLen = TYPE_MAX_LENGTH[type]
  if (trimmed.length > maxLen) {
    return {
      success: false,
      error: `Value must be between 1 and ${maxLen} characters for type ${type}.`,
    }
  }

  // Case-insensitive duplicate check among active items (Req 1.6, 2.6)
  const existing = await db.systemConfig.findFirst({
    where: {
      type,
      isActive: true,
      value: { equals: trimmed, mode: 'insensitive' },
    },
  })

  if (existing) {
    return { success: false, error: 'Duplicate entry — this value already exists.' }
  }

  try {
    await db.systemConfig.create({
      data: { type, value: trimmed },
    })
  } catch (err: unknown) {
    // P2002 = unique constraint violation (DB-level safety net)
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      return { success: false, error: 'Duplicate entry — this value already exists.' }
    }
    console.error('addConfigItemAction error:', err)
    return { success: false, error: 'An unexpected error occurred.' }
  }

  revalidatePath('/admin/config')
  return { success: true }
}

/**
 * Flips the isActive flag on a ConfigItem.
 * Req 1.4, 2.7
 */
export async function toggleConfigItemAction(id: string): Promise<ActionResult> {
  try {
    const item = await db.systemConfig.findUnique({ where: { id } })
    if (!item) {
      return { success: false, error: 'Config item not found.' }
    }

    await db.systemConfig.update({
      where: { id },
      data: { isActive: !item.isActive },
    })
  } catch (err) {
    console.error('toggleConfigItemAction error:', err)
    return { success: false, error: 'An unexpected error occurred.' }
  }

  revalidatePath('/admin/config')
  return { success: true }
}

/**
 * Deletes a ConfigItem after verifying it is not referenced anywhere.
 * Checks references in:
 *   - StudentProfile.program
 *   - PaymentClaim.program
 *   - PaymentClaim.paymentMethod
 *   - PaymentClaim.shirtSize
 *   - Student.course
 * Returns { success: false, error: 'record is in use' } if any reference exists.
 * Req 1.5, 1.6
 */
export async function deleteConfigItemAction(id: string): Promise<ActionResult> {
  try {
    const item = await db.systemConfig.findUnique({ where: { id } })
    if (!item) {
      return { success: false, error: 'Config item not found.' }
    }

    const val = item.value

    // Check all five reference locations in parallel
    const [
      studentProfileCount,
      paymentClaimProgramCount,
      paymentClaimMethodCount,
      paymentClaimShirtCount,
      studentCourseCount,
    ] = await Promise.all([
      db.studentProfile.count({ where: { program: val } }),
      db.paymentClaim.count({ where: { program: val } }),
      db.paymentClaim.count({ where: { paymentMethod: val } }),
      db.paymentClaim.count({ where: { shirtSize: val } }),
      db.student.count({ where: { course: val } }),
    ])

    const isInUse =
      studentProfileCount > 0 ||
      paymentClaimProgramCount > 0 ||
      paymentClaimMethodCount > 0 ||
      paymentClaimShirtCount > 0 ||
      studentCourseCount > 0

    if (isInUse) {
      return { success: false, error: 'record is in use' }
    }

    await db.systemConfig.delete({ where: { id } })
  } catch (err) {
    console.error('deleteConfigItemAction error:', err)
    return { success: false, error: 'An unexpected error occurred.' }
  }

  revalidatePath('/admin/config')
  return { success: true }
}
