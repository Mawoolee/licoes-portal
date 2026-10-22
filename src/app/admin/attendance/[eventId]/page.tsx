import { db } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MapPin, Clock } from 'lucide-react'
import SessionLogClient from './SessionLogClient'

export const dynamic = 'force-dynamic'

function fmtTime(d: Date | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString('en-PH', {
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
    timeZone: 'Asia/Manila',
  })
}

export default async function EventAttendancePage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params

  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      attendanceRecords: {
        include: {
          student: true,
          sessions: { orderBy: { timeIn: 'desc' } },
        },
      },
    },
  })

  if (!event) notFound()

  // Group by course
  const courseMap = new Map<string, number>()
  for (const record of event.attendanceRecords) {
    const course = record.student.program
    courseMap.set(course, (courseMap.get(course) ?? 0) + 1)
  }

  const courses = Array.from(courseMap.entries())
    .map(([course, count]) => ({ course, count }))
    .sort((a, b) => a.course.localeCompare(b.course))

  const totalPresent = event.attendanceRecords.filter((r) => r.status === 'PRESENT').length

  // Build flat session log sorted by most recent timeIn; pre-format times for the client
  const sessionLog = event.attendanceRecords
    .flatMap((record) =>
      record.sessions.map((session) => ({
        sessionId: session.id,
        studentName: record.student.fullName,
        studentNumber: record.student.studentNumber,
        program: record.student.program,
        yearLevel: String(record.student.yearLevel),
        _timeInMs: new Date(session.timeIn).getTime(),
        timeIn: fmtTime(session.timeIn),
        timeOut: fmtTime(session.timeOut),
        isLateTimeIn: session.isLateTimeIn,
      }))
    )
    .sort((a, b) => b._timeInMs - a._timeInMs)
    .map(({ _timeInMs: _t, ...rest }) => rest)

  // Course data for the client component
  const courseCards = courses.map(({ course, count }) => ({
    course,
    count,
    href: `/admin/attendance/${eventId}/${encodeURIComponent(course)}`,
  }))

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] flex-wrap">
        <Link
          href="/admin/attendance/list"
          className="hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Attendance List
        </Link>
        <span>/</span>
        <span className="font-semibold text-[var(--text-primary)]">{event.name}</span>
      </div>

      {/* Event Header */}
      <div className="rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] p-5 space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {event.name}
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <MapPin className="w-3 h-3" /> {event.location}
              </span>
              <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <Clock className="w-3 h-3" />
                {new Date(event.timeInStart ?? event.createdAt).toLocaleDateString('en-PH', {
                  month: 'long', day: 'numeric', year: 'numeric',
                  timeZone: 'Asia/Manila',
                })}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-extrabold text-green-600">{totalPresent.toLocaleString()}</p>
            <p className="text-xs text-[var(--text-muted)]">students present</p>
          </div>
        </div>
      </div>

      {/* Course cards + search + session log */}
      <SessionLogClient sessions={sessionLog} courses={courseCards} eventId={eventId} />
    </div>
  )
}
