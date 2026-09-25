import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { barcodeValue, eventId, scanMode, officerId } = body

    if (!barcodeValue || !eventId || !scanMode) {
      return NextResponse.json(
        { error: 'Missing required parameters: barcodeValue, eventId, and scanMode are required.' },
        { status: 400 }
      )
    }

    // 1. Resolve barcode to Student Profile
    const mapping = await prisma.identifierMapping.findUnique({
      where: { barcodeValue, isActive: true },
      include: { student: true }
    })

    if (!mapping) {
      return NextResponse.json(
        { error: 'Unknown or inactive barcode scanned.', isUnknownIdentifier: true },
        { status: 404 }
      )
    }

    const student = mapping.student

    // 2. Verify Event exists and is open
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 })
    }

    if (event.isClosed) {
      return NextResponse.json({ error: 'Event is already closed for attendance scanning.' }, { status: 400 })
    }

    const now = new Date()
    if (now < event.windowStart || now > event.windowEnd) {
      return NextResponse.json({ error: 'Scan attempted outside of official event Attendance Window.' }, { status: 400 })
    }

    // 3. Find or create AttendanceRecord
    let attendanceRecord = await prisma.attendanceRecord.findUnique({
      where: {
        eventId_studentId: { eventId, studentId: student.id }
      }
    })

    if (!attendanceRecord) {
      attendanceRecord = await prisma.attendanceRecord.create({
        data: {
          eventId,
          studentId: student.id,
          status: 'PRESENT'
        }
      })
    }

    // 4. Handle TIME_IN vs TIME_OUT session logic
    const openSession = await prisma.attendanceSession.findFirst({
      where: {
        attendanceRecordId: attendanceRecord.id,
        timeOut: null
      }
    })

    let currentSession
    const operationId = crypto.randomUUID()

    if (scanMode === 'TIME_IN') {
      if (openSession) {
        // Duplicate suppression: return existing open session
        currentSession = openSession
      } else {
        currentSession = await prisma.attendanceSession.create({
          data: {
            attendanceRecordId: attendanceRecord.id,
            timeIn: now,
            scannedBarcode: barcodeValue,
            operationId
          }
        })
      }
    } else if (scanMode === 'TIME_OUT') {
      if (!openSession) {
        return NextResponse.json(
          { error: 'Cannot process Time-Out. Student has no active open Time-In session.' },
          { status: 400 }
        )
      }

      currentSession = await prisma.attendanceSession.update({
        where: { id: openSession.id },
        data: { timeOut: now }
      })
    }

    // 5. Fetch Profile Summary Data (Attendance History & Payment Status)
    const activeCollectionPeriod = await prisma.collectionPeriod.findFirst({
      where: { isActive: true },
      include: { feeItems: true }
    })

    let paymentStatus = 'UNPAID'
    if (activeCollectionPeriod) {
      const claim = await prisma.paymentClaim.findFirst({
        where: {
          studentId: student.id,
          collectionPeriodId: activeCollectionPeriod.id
        },
        orderBy: { createdAt: 'desc' }
      })

      if (claim) {
        paymentStatus = claim.status
      }
    }

    // Fetch student's overall attendance history
    const history = await prisma.attendanceRecord.findMany({
      where: { studentId: student.id },
      include: {
        event: {
          select: { name: true, isClosed: true }
        }
      }
    })

    // 6. Record Audit Log
    await prisma.auditLog.create({
      data: {
        officerId: officerId || null,
        action: `ATTENDANCE_${scanMode}`,
        targetRecord: 'AttendanceSession',
        recordId: currentSession.id,
        newVal: JSON.stringify({ studentId: student.id, scanMode, time: now }),
        timestamp: now
      }
    })

    return NextResponse.json({
      success: true,
      scanMode,
      operationId,
      student: {
        studentNumber: student.studentNumber,
        fullName: student.fullName,
        program: student.program,
        yearLevel: student.yearLevel,
        dwclEmail: student.dwclEmail
      },
      attendance: {
        eventName: event.name,
        session: currentSession,
        history: history.map((h) => ({
          eventName: h.event.name,
          status: h.status,
          isClosed: h.event.isClosed
        }))
      },
      paymentStatus
    })
  } catch (error) {
    console.error('Scan Error:', error)
    return NextResponse.json({ error: 'Internal server error during barcode scan.' }, { status: 500 })
  }
}