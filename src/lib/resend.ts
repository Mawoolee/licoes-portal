import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key')

export function generateReceiptEmail({
  studentName,
  studentId,
  amount,
  referenceNo,
  date,
}: {
  studentName: string
  studentId: string
  amount: string
  referenceNo: string
  date: string
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
          .card { background: #ffffff; border-radius: 12px; padding: 28px; max-width: 480px; margin: 0 auto; border: 1px solid #e2e8f0; font-size: 14px; color: #334155; }
          .brand { font-weight: 800; font-size: 20px; color: #4f46e5; text-align: center; margin-bottom: 2px; }
          .sub { font-size: 11px; color: #64748b; text-align: center; text-transform: uppercase; tracking: 1px; margin-bottom: 20px; }
          .badge { background: #dcfce7; color: #15803d; font-size: 11px; padding: 4px 12px; border-radius: 9999px; font-weight: 700; display: inline-block; letter-spacing: 0.5px; }
          .details { background: #f8fafc; border: 1px solid #f1f5f9; padding: 16px; border-radius: 8px; margin: 20px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
          .row-label { color: #64748b; }
          .row-val { font-weight: 600; color: #0f172a; }
          .total { border-top: 2px border-dashed #e2e8f0; margin-top: 12px; padding-top: 12px; font-size: 15px; color: #166534; font-weight: 700; }
          .footer { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px; line-height: 1.4; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="brand">LICOES DWCL</div>
          <div class="sub">League of Integrated Computer and Engineering Students</div>
          <div style="text-align: center; margin-bottom: 20px;">
            <span class="badge">OFFICIAL E-RECEIPT VERIFIED</span>
          </div>

          <p>Magandang araw, <strong>${studentName}</strong>!</p>
          <p style="color: #64748b; font-size: 13px;">
            Ang iyong membership fee payment claim ay matagumpay na na-verify at nailagay sa opisyal na talaan ng LICOES.
          </p>

          <div class="details">
            <div class="row"><span class="row-label">Student ID:</span> <span class="row-val">${studentId}</span></div>
            <div class="row"><span class="row-label">GCash Reference:</span> <span class="row-val">${referenceNo}</span></div>
            <div class="row"><span class="row-label">Date Approved:</span> <span class="row-val">${date}</span></div>
            <div class="row total"><span class="row-label">Amount Paid:</span> <span class="row-val">${amount}</span></div>
          </div>

          <div class="footer">
            Maraming salamat sa iyong pakikiisa!<br>
            Ito ay awtomatikong system-generated receipt mula sa <strong>LICOES Portal 2026</strong>.
          </div>
        </div>
      </body>
    </html>
  `
}