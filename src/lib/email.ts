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
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fcbba1; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #cb181d; color: #ffffff; padding: 20px 24px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">LICOES OFFICIAL E-RECEIPT</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: rgba(255,255,255,0.8);">League of Integrated Computer and Engineering Students — DWCL</p>
      </div>
      
      <div style="padding: 24px; background: #fff7f3;">
        <p style="margin: 0 0 8px 0; color: #2b120d;">Dear <strong>${studentName}</strong>,</p>
        <p style="color: #6b4a44; font-size: 13px; margin: 0 0 20px 0;">
          Your membership payment has been verified and approved by the LICOES Treasurer. Below are your official receipt details:
        </p>
        
        <table style="width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #fcbba1;">
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #fee5d9; color: #6b4a44; font-size: 13px; width: 45%;">Receipt Number</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #fee5d9; font-weight: 700; color: #2b120d; font-size: 13px;">${receiptNumber}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #fee5d9; color: #6b4a44; font-size: 13px;">Fee Item(s)</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #fee5d9; color: #2b120d; font-size: 13px;">${feeItemName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #fee5d9; color: #6b4a44; font-size: 13px;">Amount Paid</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #fee5d9; font-weight: 700; color: #16a34a; font-size: 14px;">PHP ${amount}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #fee5d9; color: #6b4a44; font-size: 13px;">Payment Channel</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #fee5d9; color: #2b120d; font-size: 13px;">${paymentMethod}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #6b4a44; font-size: 13px;">Reference No.</td>
            <td style="padding: 10px 14px; font-family: monospace; color: #2b120d; font-size: 13px;">${referenceNumber}</td>
          </tr>
        </table>

        <div style="margin-top: 20px; background: #fee5d9; border-radius: 6px; padding: 12px 14px; font-size: 12px; color: #6b4a44; text-align: center;">
          Please keep this email as your official record of payment.<br/>
          This is a system-generated receipt from <strong>LICOES Portal</strong>.
        </div>
      </div>

      <div style="background: #fff1ea; border-top: 1px solid #fcbba1; padding: 12px 24px; text-align: center; font-size: 11px; color: #6b4a44;">
        Divine Word College of Legazpi — School of Engineering and Computer Studies
      </div>
    </div>
  `

  return await resend.emails.send({
    from: 'LICOES Portal <onboarding@resend.dev>',
    to: [toEmail],
    subject: `[OFFICIAL RECEIPT] ${receiptNumber} - LICOES Membership Fee`,
    html: htmlContent
  })
}