'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getWindowStatus } from '@/lib/attendance-utils'
export type ScanMode = 'TIME_IN' | 'TIME_OUT'
export type { WindowStatus } from '@/lib/attendance-utils'
export { getWindowStatus }

// ─── Event Management ────────────────────────────────────────────────────────

export async function createEventAction(formData: FormData) {
  const name        = (formData.get('name') as string | null)?.trim()
  const location    = (formData.get('location') as string | null)?.trim()
  const timeInStart  = formData.get('timeInStart') as string | null
  const timeInEnd    = formData.get('timeInEnd') as string | null
  const timeOutStart = formData.get('timeOutStart') as string | null
  const timeOutEnd   = formData.get('timeOutEnd') as string | null

  if (!name || !location || !timeInStart || !timeInEnd || !timeOutStart || !timeOutEnd) {
    return { success: false, message: 'All fields are required.' }
  }

  const tIS = new Date(timeInStart)
  const tIE = new Date(timeInEnd)
  const tOS = new Date(timeOutStart)
  const tOE = new Date(timeOutEnd)

  if ([tIS, tIE, tOS, tOE].some((d) => isNaN(d.getTime()))) {
    return { success: false, message: 'Invalid date/time values.' }
  }
  if (tIE <= tIS) return { success: false, message: 'Time-In end must be after Time-In start.' }
  if (tOS <= tIE) return { success: false, message: 'Time-Out start must be after Time-In end.' }
  if (tOE <= tOS) return { success: false, message: 'Time-Out end must be after Time-Out start.' }

  try {
    const event = await db.event.create({
      data: { name, location, timeInStart: tIS, timeInEnd: tIE, timeOutStart: tOS, timeOutEnd: tOE },
    })
    revalidatePath('/admin/events')
    revalidatePath('/admin')
    return { success: true, eventId: event.id, message: `Event "${name}" created.` }
  } catch (err) {
    console.error('createEventAction:', err)
    return { success: false, message: 'Failed to create event.' }
  }
}

export async function closeEventAction(eventId: string) {
  try {
    await db.event.update({
      where: { id: eventId },
      data: { isClosed: true, closedAt: new Date() },
    })
    revalidatePath('/admin/events')
    revalidatePath('/attendance')
    return { success: true }
  } catch (err) {
    console.error('closeEventAction:', err)
    return { success: false, message: 'Failed to close event.' }
  }
}

export async function getActiveEventsAction() {
  return db.event.findMany({
    where: { isClosed: false },
    orderBy: { timeInStart: 'asc' },
  })
}

export async function getAllEventsAction() {
  return db.event.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { attendanceRecords: true } },
    },
  })
}

// ─── Attendance Scanning ─────────────────────────────────────────────────────

export interface ScanResult {
  success: boolean
  scanMode: ScanMode
  isLate?: boolean
  studentId: string
  studentName: string
  section: string
  timeIn?: string
  timeOut?: string
  message: string
}

export async function recordScanAction(
  eventId: string,
  scannedId: string,
  officerId?: string
): Promise<ScanResult> {
  const cleanId  = scannedId.trim()
  const paddedId = cleanId.padStart(8, '0')

  // 1. Validate event
  const event = await db.event.findUnique({ where: { id: eventId } })
  if (!event) {
    return { success: false, scanMode: 'TIME_IN', studentId: cleanId, studentName: 'Unknown', section: 'N/A', message: 'Event not found.' }
  }
  if (event.isClosed) {
    return { success: false, scanMode: 'TIME_IN', studentId: cleanId, studentName: 'Unknown', section: 'N/A', message: 'This event is already closed.' }
  }

  const now = new Date()

  // 2. Determine current window
  const { status: windowStatus, isLate } = getWindowStatus(event, now)

  if (windowStatus === 'UNCONFIGURED') {
    return { success: false, scanMode: 'TIME_IN', studentId: cleanId, studentName: 'Unknown', section: 'N/A', message: 'Event has no attendance windows configured.' }
  }
  if (windowStatus === 'OUTSIDE') {
    return { success: false, scanMode: 'TIME_IN', studentId: cleanId, studentName: 'Unknown', section: 'N/A', message: 'Outside of attendance window. Scanning is not allowed right now.' }
  }

  // 3. Look up student
  const alphaStudent = await db.student.findFirst({
    where: { OR: [{ id: paddedId }, { id: cleanId }] },
  })

  const studentName = alphaStudent?.fullName ?? `ID: ${cleanId}`
  const section     = alphaStudent?.section ?? 'Unregistered'

  // 4. Ensure StudentProfile exists
  let profile = await db.studentProfile.findUnique({ where: { studentNumber: paddedId } })
  if (!profile) {
    profile = await db.studentProfile.create({
      data: {
        studentNumber: paddedId,
        fullName: studentName,
        program: alphaStudent?.course ?? 'Unknown',
        yearLevel: parseInt(alphaStudent?.yearLevel ?? '1') || 1,
        dwclEmail: `${paddedId}@student.dwcl.edu.ph`,
      },
    })
  }

  // 5. Find or create AttendanceRecord
  let record = await db.attendanceRecord.findUnique({
    where: { eventId_studentId: { eventId, studentId: profile.id } },
  })
  if (!record) {
    record = await db.attendanceRecord.create({
      data: { eventId, studentId: profile.id, status: 'PRESENT' },
    })
  }

  const operationId = `${record.id}-${Date.now()}`

  // 6. TIME_IN path
  if (windowStatus === 'TIME_IN') {
    // Check if already timed in
    const existingSession = await db.attendanceSession.findFirst({
      where: { attendanceRecordId: record.id },
      orderBy: { timeIn: 'asc' },
    })

    if (existingSession) {
      return {
        success: false,
        scanMode: 'TIME_IN',
        studentId: cleanId,
        studentName,
        section,
        message: `${studentName} already timed in.`,
      }
    }

    const session = await db.attendanceSession.create({
      data: {
        attendanceRecordId: record.id,
        timeIn: now,
        isLateTimeIn: isLate,
        scannedBarcode: cleanId,
        operationId,
      },
    })

    if (officerId) {
      await db.auditLog.create({
        data: {
          officerId,
          action: isLate ? 'ATTENDANCE_TIME_IN_LATE' : 'ATTENDANCE_TIME_IN',
          targetRecord: 'AttendanceSession',
          recordId: session.id,
          newVal: JSON.stringify({ studentId: cleanId, eventId, time: now, isLate }),
        },
      }).catch(() => {})
    }

    return {
      success: true,
      scanMode: 'TIME_IN',
      isLate,
      studentId: cleanId,
      studentName,
      section,
      timeIn: now.toISOString(),
      message: isLate
        ? `Late Time-In recorded for ${studentName}`
        : `Time-In recorded for ${studentName}`,
    }
  }

  // 7. TIME_OUT path
  // windowStatus === 'TIME_OUT'
  const existingSession = await db.attendanceSession.findFirst({
    where: { attendanceRecordId: record.id },
    orderBy: { timeIn: 'asc' },
  })

  if (existingSession?.timeOut) {
    return {
      success: false,
      scanMode: 'TIME_OUT',
      studentId: cleanId,
      studentName,
      section,
      message: `${studentName} already timed out.`,
    }
  }

  if (!existingSession) {
    // No time-in → create a session with timeIn = timeOut (exception/late)
    const session = await db.attendanceSession.create({
      data: {
        attendanceRecordId: record.id,
        timeIn: now,
        timeOut: now,
        isLateTimeIn: true,
        isLateTimeOut: false,
        scannedBarcode: cleanId,
        operationId,
      },
    })

    if (officerId) {
      await db.auditLog.create({
        data: {
          officerId,
          action: 'ATTENDANCE_TIME_OUT_NO_TIMEIN',
          targetRecord: 'AttendanceSession',
          recordId: session.id,
          newVal: JSON.stringify({ studentId: cleanId, eventId, time: now }),
        },
      }).catch(() => {})
    }

    return {
      success: true,
      scanMode: 'TIME_OUT',
      isLate: true,
      studentId: cleanId,
      studentName,
      section,
      timeIn: undefined,
      timeOut: now.toISOString(),
      message: `Time-Out recorded for ${studentName} (no Time-In on record — marked late)`,
    }
  }

  // Close the open session
  const updated = await db.attendanceSession.update({
    where: { id: existingSession.id },
    data: { timeOut: now },
  })

  if (officerId) {
    await db.auditLog.create({
      data: {
        officerId,
        action: 'ATTENDANCE_TIME_OUT',
        targetRecord: 'AttendanceSession',
        recordId: updated.id,
        newVal: JSON.stringify({ studentId: cleanId, eventId, time: now }),
      },
    }).catch(() => {})
  }

  return {
    success: true,
    scanMode: 'TIME_OUT',
    studentId: cleanId,
    studentName,
    section,
    timeIn: existingSession.timeIn.toISOString(),
    timeOut: now.toISOString(),
    message: `Time-Out recorded for ${studentName}`,
  }
}

export async function getEventAttendanceAction(eventId: string) {
  return db.attendanceRecord.findMany({
    where: { eventId },
    include: {
      student: { select: { studentNumber: true, fullName: true, program: true, yearLevel: true } },
      sessions: { orderBy: { timeIn: 'asc' } },
    },
    orderBy: { createdAt: 'asc' },
  })
}
