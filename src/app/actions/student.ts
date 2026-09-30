'server action'
'use server'

import { prisma } from '@/lib/prisma'
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

    const activePeriod = await prisma.collectionPeriod.findFirst({
      where: { isActive: true }
    })

    if (!activePeriod) {
      return { success: false, error: 'No active collection period open for submissions.' }
    }

    // Derive Normalized Reference Number (remove spaces, punctuation, lowercase)
    const normalizedReference = input.paymentReference.toLowerCase().replace(/[^a-z0-9]/g, '')

    // Check if canonical student profile exists
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { studentNumber: input.studentNumber }
    })

    // Fetch item details for calculations
    const feeItems = await prisma.feeItem.findMany({
      where: { id: { in: input.feeItemIds } }
    })

    const claim = await prisma.paymentClaim.create({
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