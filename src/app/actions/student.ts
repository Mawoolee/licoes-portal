'server action'
'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

interface SubmitClaimInput {
  studentNumber: string
  fullName: string
  dwclEmail: string
  program: string
  yearLevel: number
  shirtSize?: string
  paymentMethod: string
  paymentReference: string
  paymentDate: string
  proofOfPaymentUrl: string
  feeItemIds: string[]
  privacyConsent: boolean
}

export async function submitPaymentClaim(input: SubmitClaimInput) {
  try {
    if (!input.privacyConsent) {
      return { success: false, error: 'Privacy Consent is required under RA 10173.' }
    }

    const activePeriod = await db.collectionPeriod.findFirst({
      where: { isActive: true }
    })

    if (!activePeriod) {
      return { success: false, error: 'No active collection period open for submissions.' }
    }

    const normalizedReference = input.paymentReference.toLowerCase().replace(/[^a-z0-9]/g, '')

    const studentProfile = await db.studentProfile.findUnique({
      where: { studentNumber: input.studentNumber }
    })

    const feeItems = await db.feeItem.findMany({
      where: { id: { in: input.feeItemIds } }
    })

    const claim = await db.paymentClaim.create({
      data: {
        collectionPeriodId: activePeriod.id,
        studentId: studentProfile ? studentProfile.id : null,
        submittedStudentNo: input.studentNumber,
        submittedFullName: input.fullName,
        dwclEmail: input.dwclEmail,
        program: input.program,
        yearLevel: Number(input.yearLevel),
        shirtSize: input.shirtSize,
        paymentMethod: input.paymentMethod,
        paymentReference: input.paymentReference,
        normalizedReference,
        paymentDate: new Date(input.paymentDate),
        proofOfPaymentUrl: input.proofOfPaymentUrl,
        privacyConsent: true,
        status: 'PENDING',
        claimItems: {
          create: feeItems.map((item) => ({
            feeItemId: item.id,
            amount: item.amount
          }))
        }
      }
    })

    return { success: true, claimId: claim.id }
  } catch (error) {
    console.error('Submission Error:', error)
    return { success: false, error: 'Failed to record payment claim. Please try again.' }
  }
}