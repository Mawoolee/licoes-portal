import { db } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MapPin, Clock, LogIn, LogOut } from 'lucide-react'

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

  // Build flat session log sorted by most recent timeIn
  const sessionLog = event.attendanceRecords
    .flatMap((record) =>
      record.sessions.map((session) => ({
        sessionId: session.id,
        studentName: record.student.fullName,
        studentNumber: record.student.studentNumber,
        program: record.student.program,
        yearLevel: record.student.yearLevel,
        timeIn: session.timeIn,
        timeOut: session.timeOut,
        isLateTimeIn: session.isLateTimeIn,
      }))
    )
    .sort((a, b) => new Date(b.timeIn).getTime() - new Date(a.timeIn).getTime())

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

      {/* Course cards */}
      <div>
        <p className="text-sm font-semibold text-[var(--text-muted)] mb-3">
          Select a program to view attendance
        </p>
        {courses.length === 0 ? (
          <div className="rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] p-12 text-center text-sm text-[var(--text-muted)]">
            No attendance records yet for this event.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {courses.map(({ course, count }) => (
              <Link
                key={course}
                href={`/admin/attendance/${eventId}/${encodeURIComponent(course)}`}
                style={{ backgroundColor: '#fdeee4', borderColor: '#f5ccb0' }}
                className="group relative overflow-hidden rounded-2xl border-2 p-8 flex flex-col items-center justify-center gap-2 min-h-[160px] transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
              >
                <h2 className="text-2xl font-extrabold tracking-tight text-center text-[var(--brand-600)]">
                  {course}
                </h2>
                <p className="text-sm font-semibold text-[var(--text-muted)]">
                  {count.toLocaleString()} record{count !== 1 ? 's' : ''}
                </p>
                <span className="absolute bottom-3 right-3 flex items-center gap-0.5 text-xs font-medium text-[var(--brand-300)] opacity-0 group-hover:opacity-100 transition-opacity">
                  View →
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Session Log */}
      {sessionLog.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest">
              Session Log
            </p>
            <span className="text-xs text-[var(--text-muted)]">
              {sessionLog.length} scan{sessionLog.length !== 1 ? 's' : ''} — most recent first
            </span>
          </div>

          <div className="rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] overflow-hidden shadow-sm">
            <div className="overflow-y-auto max-h-[375px]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--surface-alt)] border-b border-[var(--brand-100)] sticky top-0 z-10">
                <tr className="text-xs uppercase text-[var(--text-muted)] font-semibold tracking-wider">
                  <th className="px-4 py-3 w-8">#</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3">
                    <span className="flex items-center gap-1 text-green-600">
                      <LogIn className="w-3 h-3" /> Time In
                    </span>
                  </th>
                  <th className="px-4 py-3">
                    <span className="flex items-center gap-1 text-blue-600">
                      <LogOut className="w-3 h-3" /> Time Out
                    </span>
                  </th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brand-50)]">
                {sessionLog.map((entry, idx) => (
                  <tr key={entry.sessionId} className="hover:bg-[var(--brand-50)/40] transition-colors">
                    <td className="px-4 py-2.5 text-xs text-[var(--text-muted)]">{idx + 1}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-[var(--text-primary)] text-sm">{entry.studentName}</p>
                      <p className="text-xs text-[var(--text-muted)] font-mono">{entry.studentNumber}</p>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--text-muted)]">
                      {entry.program} · Yr {entry.yearLevel}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono text-green-700">
                      {fmtTime(entry.timeIn)}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono text-blue-700">
                      {fmtTime(entry.timeOut)}
                    </td>
                    <td className="px-4 py-2.5">
                      {entry.isLateTimeIn ? (
                        <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Late
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                          On Time
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
