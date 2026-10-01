'use server'

import { prisma } from '@/lib/prisma'
import { sendEReceiptEmail } from '@/lib/email'
import { revalidatePath } from 'next/cache'
import { requireOfficerRole } from '@/lib/session'
import { Role } from '@prisma/client'

export interface ApprovePaymentInput {
  paymentClaimId: string
  verificationSource: 'GCASH' | 'BANK' | 'CASH_LOGBOOK'
  verificationNote?: string
}

// 1. Main exported Server Action called from the Client Component
export async function approvePaymentClaim(input: ApprovePaymentInput) {
  // Enforce Authorization: Must be ADMIN or TREASURER
  const officer = await requireOfficerRole([Role.ADMIN, Role.TREASURER])

  return await executeApproval({
    ...input,
    treasurerOfficerId: officer.id
  })
}

// 2. Internal execution logic
async function executeApproval(
  input: ApprovePaymentInput & { treasurerOfficerId: string }
) {
  const { paymentClaimId, treasurerOfficerId, verificationSource, verificationNote } = input

  try {
    // Fetch Payment Claim with related Fee Items & Student details
    const claim = await prisma.paymentClaim.findUnique({
      where: { id: paymentClaimId },
      include: {
        claimItems: { include: { feeItem: true } },
        student: true
      }
    })

    if (!claim) {
      return { success: false, error: 'Payment claim not found.' }
    }

    if (claim.status === 'APPROVED') {
      return { success: false, error: 'Payment claim is already approved.' }
    }

    // Generate sequential Receipt Number (e.g. LICOES-2026-0001)
    const count = await prisma.eReceipt.count()
    const currentYear = new Date().getFullYear()
    const receiptNumber = `LICOES-${currentYear}-${String(count + 1).padStart(4, '0')}`

    const totalAmount = claim.claimItems.reduce(
      (sum, item) => sum + Number(item.amount),
      0
    )

    // Perform Atomic DB Update using $transaction
    const { updatedClaim, eReceipt } = await prisma.$transaction(async (tx) => {
      const updatedClaim = await tx.paymentClaim.update({
        where: { id: paymentClaimId },
        data: {
          status: 'APPROVED',
          verifiedByOfficerId: treasurerOfficerId,
          verificationSource,
          verificationNote,
          verifiedAt: new Date()
        }
      })

      const eReceipt = await tx.eReceipt.create({
        data: {
          receiptNumber,
          paymentClaimId: claim.id,
          issuedById: treasurerOfficerId,
          deliveryStatus: 'QUEUED'
        }
      })

      await tx.auditLog.create({
        data: {
          officerId: treasurerOfficerId,
          action: 'PAYMENT_CLAIM_APPROVED',
          targetRecord: 'PaymentClaim',
          recordId: claim.id,
          previousVal: JSON.stringify({ status: claim.status }),
          newVal: JSON.stringify({ status: 'APPROVED', receiptNumber }),
          timestamp: new Date()
        }
      })

      return { updatedClaim, eReceipt }
    })

    // Send Automated Official E-Receipt Email via Resend
    const feeItemNames = claim.claimItems.map((i) => i.feeItem.name).join(', ')

    try {
      const emailRes = await sendEReceiptEmail({
        toEmail: claim.dwclEmail,
        studentName: claim.submittedFullName,
        receiptNumber,
        amount: totalAmount.toFixed(2),
        feeItemName: feeItemNames,
        paymentMethod: claim.paymentMethod,
        referenceNumber: claim.paymentReference
      })

      if (emailRes.error) {
        await prisma.eReceipt.update({
          where: { id: eReceipt.id },
          data: { deliveryStatus: 'FAILED', deliveryReason: emailRes.error.message }
        })
      } else {
        await prisma.eReceipt.update({
          where: { id: eReceipt.id },
          data: { deliveryStatus: 'SENT' }
        })
      }
    } catch (emailErr) {
      console.error('Failed to deliver email receipt:', emailErr)
      await prisma.eReceipt.update({
        where: { id: eReceipt.id },
        data: { deliveryStatus: 'FAILED', deliveryReason: String(emailErr) }
      })
    }

    revalidatePath('/treasurer/claims')

    return {
      success: true,
      receiptNumber,
      paymentClaimId: updatedClaim.id
    }
  } catch (error) {
    console.error('Treasurer Approval Error:', error)
    return { success: false, error: 'Failed to complete approval action.' }
  }
}

// ── Reject Payment Claim ──────────────────────────────────────────────────────

export async function rejectPaymentClaim(input: {
  paymentClaimId: string
  rejectionReason: string
}) {
  const officer = await requireOfficerRole([Role.ADMIN, Role.TREASURER])
  const { paymentClaimId, rejectionReason } = input

  if (!rejectionReason?.trim()) {
    return { success: false, error: 'A rejection reason is required.' }
  }

  try {
    const claim = await prisma.paymentClaim.findUnique({ where: { id: paymentClaimId } })
    if (!claim) return { success: false, error: 'Payment claim not found.' }
    if (claim.status !== 'PENDING') return { success: false, error: `Claim is already ${claim.status.toLowerCase()}.` }

    await prisma.$transaction([
      prisma.paymentClaim.update({
        where: { id: paymentClaimId },
        data: {
          status: 'REJECTED',
          rejectionReason: rejectionReason.trim(),
          verifiedByOfficerId: officer.id,
          verifiedAt: new Date(),
        },
      }),
      prisma.auditLog.create({
        data: {
          officerId: officer.id,
          action: 'PAYMENT_CLAIM_REJECTED',
          targetRecord: 'PaymentClaim',
          recordId: paymentClaimId,
          previousVal: JSON.stringify({ status: claim.status }),
          newVal: JSON.stringify({ status: 'REJECTED', rejectionReason }),
          timestamp: new Date(),
        },
      }),
    ])

    revalidatePath('/treasurer/claims')
    return { success: true, paymentClaimId }
  } catch (error) {
    console.error('Reject Payment Error:', error)
    return { success: false, error: 'Failed to reject payment claim.' }
  }
}

// ── Fetch Claims (for treasurer dashboard) ────────────────────────────────────

export async function getPaymentClaimsAction(status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
  return prisma.paymentClaim.findMany({
    where: status ? { status } : {},
    include: {
      claimItems: { include: { feeItem: true } },
      collectionPeriod: { select: { name: true } },
      eReceipt: { select: { receiptNumber: true, deliveryStatus: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}
