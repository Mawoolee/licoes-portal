'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

// ─── Event Management ────────────────────────────────────────────────────────

export async function createEventAction(formData: FormData) {
  const name = (formData.get('name') as string | null)?.trim()
  const location = (formData.get('location') as string | null)?.trim()
  const windowStart = formData.get('windowStart') as string | null
  const windowEnd = formData.get('windowEnd') as string | null

  if (!name || !location || !windowStart || !windowEnd) {
    return { success: false, message: 'All fields are required.' }
  }

  const start = new Date(windowStart)
  const end = new Date(windowEnd)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { success: false, message: 'Invalid date/time values.' }
  }
  if (end <= start) {
    return { success: false, message: 'End time must be after start time.' }
  }

  try {
    const event = await db.event.create({
      data: { name, location, windowStart: start, windowEnd: end },
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
    orderBy: { windowStart: 'asc' },
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
  scanMode: 'TIME_IN' | 'TIME_OUT'
  isDuplicate?: boolean
  studentId: string
  studentName: string
  section: string
  timeIn?: string
  timeOut?: string
  message: string
}

/**
 * Records a scan for a given event.
 * - Looks up the student in the Student (alpha list) table.
 * - Uses scannedBarcode as the student identifier.
 * - Creates a lightweight AttendanceScan record (we store directly against
 *   scannedBarcode + eventId since AttendanceRecord requires a StudentProfile
 *   FK which may not exist for every alpha-list student).
 *
 * Storage strategy: we persist to a new lightweight table-free approach by
 * storing scan data in AttendanceSession tied to a sentinel AttendanceRecord
 * that uses the scannedBarcode as both the operationId seed and the
 * scannedBarcode field. Because the schema's AttendanceRecord.studentId
 * references StudentProfile (not Student), we create a minimal StudentProfile
 * on first scan if one doesn't already exist for this student number.
 */
export async function recordScanAction(
  eventId: string,
  scannedId: string,
  officerId?: string
): Promise<ScanResult> {
  const cleanId = scannedId.trim()
  const paddedId = cleanId.padStart(8, '0')

  // 1. Validate event
  const event = await db.event.findUnique({ where: { id: eventId } })
  if (!event) return { success: false, scanMode: 'TIME_IN', studentId: cleanId, studentName: 'Unknown', section: 'N/A', message: 'Event not found.' }
  if (event.isClosed) return { success: false, scanMode: 'TIME_IN', studentId: cleanId, studentName: 'Unknown', section: 'N/A', message: 'This event is already closed.' }

  const now = new Date()

  // 2. Look up student in alpha list
  const alphaStudent = await db.student.findFirst({
    where: { OR: [{ id: paddedId }, { id: cleanId }] },
  })

  const studentName = alphaStudent?.fullName ?? `ID: ${cleanId}`
  const section = alphaStudent?.section ?? 'Unregistered'

  // 3. Ensure a StudentProfile exists for this student number (required FK)
  let profile = await db.studentProfile.findUnique({
    where: { studentNumber: paddedId },
  })

  if (!profile) {
    // Create a minimal profile so we can link AttendanceRecord
    profile = await db.studentProfile.create({
      data: {
        studentNumber: paddedId,
        fullName: studentName,
        program: alphaStudent?.course ?? 'Unknown',
        yearLevel: parseInt(alphaStudent?.yearLevel ?? '1') || 1,
        dwclEmail: `${paddedId}@student.dwcl.edu.ph`, // placeholder
      },
    })
  }

  // 4. Find or create AttendanceRecord (unique per event + student)
  let record = await db.attendanceRecord.findUnique({
    where: { eventId_studentId: { eventId, studentId: profile.id } },
  })

  if (!record) {
    record = await db.attendanceRecord.create({
      data: { eventId, studentId: profile.id, status: 'PRESENT' },
    })
  }

  // 5. Determine TIME_IN vs TIME_OUT
  const openSession = await db.attendanceSession.findFirst({
    where: { attendanceRecordId: record.id, timeOut: null },
    orderBy: { timeIn: 'desc' },
  })

  const operationId = `${record.id}-${Date.now()}`

  if (!openSession) {
    // TIME_IN — create a new session
    const session = await db.attendanceSession.create({
      data: {
        attendanceRecordId: record.id,
        timeIn: now,
        scannedBarcode: cleanId,
        operationId,
      },
    })

    // Audit log
    if (officerId) {
      await db.auditLog.create({
        data: {
          officerId,
          action: 'ATTENDANCE_TIME_IN',
          targetRecord: 'AttendanceSession',
          recordId: session.id,
          newVal: JSON.stringify({ studentId: cleanId, eventId, time: now }),
          timestamp: now,
        },
      }).catch(() => {}) // non-blocking
    }

    return {
      success: true,
      scanMode: 'TIME_IN',
      studentId: cleanId,
      studentName,
      section,
      timeIn: now.toISOString(),
      message: `Time-In recorded for ${studentName}`,
    }
  } else {
    // TIME_OUT — close the open session
    const updated = await db.attendanceSession.update({
      where: { id: openSession.id },
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
          timestamp: now,
        },
      }).catch(() => {})
    }

    return {
      success: true,
      scanMode: 'TIME_OUT',
      studentId: cleanId,
      studentName,
      section,
      timeIn: openSession.timeIn.toISOString(),
      timeOut: now.toISOString(),
      message: `Time-Out recorded for ${studentName}`,
    }
  }
}

// ─── Event Attendance Report ─────────────────────────────────────────────────

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
