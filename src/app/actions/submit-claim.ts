'use server'

export async function submitClaimAction(formData: FormData) {
  try {
    const studentId = formData.get('studentId') as string
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const paymentMethod = formData.get('paymentMethod') as string // 'ONLINE' | 'CASH'
    const referenceNo = formData.get('referenceNo') as string
    const amount = formData.get('amount') as string
    const receiptFile = formData.get('receiptFile') as File | null

    if (!studentId || !name || !email || !referenceNo || !paymentMethod) {
      return { success: false, message: 'Paki-kumpleto ang lahat ng kailangang detalye.' }
    }

    // Strict validation: kailangang may in-upload na file
    if (!receiptFile || receiptFile.size === 0) {
      return { 
        success: false, 
        message: 'REQUIRED: Paki-upload ang larawan/screenshot ng resibo bago i-submit.' 
      }
    }

    console.log('New Payment Claim Received:', {
      studentId,
      name,
      email,
      paymentMethod,
      referenceNo,
      amount,
      fileName: receiptFile.name,
      fileSize: `${(receiptFile.size / 1024).toFixed(1)} KB`,
    })

    return {
      success: true,
      message: 'Matagumpay na naipasa ang iyong payment claim!',
    }
  } catch (error) {
    console.error('Submit claim error:', error)
    return { success: false, message: 'Nagka-error sa pagpasa ng claim. Subukan ulit.' }
  }
}