'use server'

import { resend, generateReceiptEmail } from '@/lib/resend'

export async function approvePaymentAction(claim: {
  id: string
  studentName: string
  studentEmail: string
  studentId: string
  amount: string
  referenceNo: string
}) {
  try {
    const approvalDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // 1. Generate HTML Receipt
    const emailHtml = generateReceiptEmail({
      studentName: claim.studentName,
      studentId: claim.studentId,
      amount: claim.amount,
      referenceNo: claim.referenceNo,
      date: approvalDate,
    })

    // 2. Send Automated Email via Resend
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'LICOES Portal <onboarding@resend.dev>',
        to: [claim.studentEmail],
        subject: `[LICOES Official Receipt] Membership Fee Verified (${claim.studentId})`,
        html: emailHtml,
      })
    }

    return { success: true, message: `Approved & e-receipt sent to ${claim.studentEmail}` }
  } catch (error) {
    console.error('Server Action Error:', error)
    return { success: false, message: 'Nagka-error sa pag-proseso ng e-receipt.' }
  }
}