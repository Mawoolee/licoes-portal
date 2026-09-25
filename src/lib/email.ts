import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendEReceiptParams {
  toEmail: string
  studentName: string
  receiptNumber: string
  amount: string
  feeItemName: string
  paymentMethod: string
  referenceNumber: string
}

export async function sendEReceiptEmail(params: SendEReceiptParams) {
  const { toEmail, studentName, receiptNumber, amount, feeItemName, paymentMethod, referenceNumber } = params

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 16px; border-radius: 6px 6px 0 0; text-align: center;">
        <h2 style="margin: 0; font-size: 20px;">LICOES OFFICIAL E-RECEIPT</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">League of Integrated Computer and Engineering Students</p>
      </div>
      
      <div style="padding: 20px 0;">
        <p>Dear <strong>${studentName}</strong>,</p>
        <p>Your membership payment has been verified and approved by the LICOES Treasurer. Below are your official receipt details:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #64748b;">Receipt Number:</td>
            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold;">${receiptNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #64748b;">Fee Item:</td>
            <td style="padding: 8px; border-bottom: 1px solid #edf2f7;">${feeItemName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #64748b;">Amount Paid:</td>
            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold; color: #16a34a;">PHP ${amount}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #64748b;">Payment Channel:</td>
            <td style="padding: 8px; border-bottom: 1px solid #edf2f7;">${paymentMethod}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #64748b;">Reference No.:</td>
            <td style="padding: 8px; border-bottom: 1px solid #edf2f7;">${referenceNumber}</td>
          </tr>
        </table>
      </div>

      <div style="font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px;">
        Divine Word College of Legazpi - School of Engineering and Computer Studies<br/>
        This is an automated official e-receipt. Please keep this email for your records.
      </div>
    </div>
  `

  return await resend.emails.send({
    from: 'LICOES Treasurer <no-reply@licoes-dwcl.org>',
    to: [toEmail],
    subject: `[OFFICIAL RECEIPT] ${receiptNumber} - LICOES Membership Fee`,
    html: htmlContent
  })
}