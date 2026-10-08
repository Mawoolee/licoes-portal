import { db } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MapPin, Clock } from 'lucide-react'

const COURSE_COLORS: Record<string, string> = {
  'BSCE CEM': 'bg-[var(--brand-50)] border-[var(--brand-100)] text-[var(--brand-600)]',
  'BSCE SE':  'bg-amber-50 border-amber-100 text-amber-700',
  'BSEE':     'bg-yellow-50 border-yellow-100 text-yellow-700',
  'BSIT':     'bg-indigo-50 border-indigo-100 text-indigo-700',
  'BSCS':     'bg-blue-50 border-blue-100 text-blue-700',
  'BLIS':     'bg-pink-50 border-pink-100 text-pink-700',
}
const DEFAULT_COLOR = 'bg-slate-50 border-slate-100 text-slate-700'

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
        include: { student: true },
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
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
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
            {courses.map(({ course, count }) => {
              const colorClass = COURSE_COLORS[course] ?? DEFAULT_COLOR
              return (
                <Link
                  key={course}
                  href={`/admin/attendance/${eventId}/${encodeURIComponent(course)}`}
                  className={`group rounded-2xl border ${colorClass} p-8 flex flex-col items-center justify-center gap-2 min-h-[130px] hover:scale-[1.02] transition-transform`}
                >
                  <h2 className="text-2xl font-extrabold tracking-tight text-center">
                    {course}
                  </h2>
                  <p className="text-sm font-semibold opacity-70">
                    {count.toLocaleString()} record{count !== 1 ? 's' : ''}
                  </p>
                  <span className="text-xs opacity-30 group-hover:opacity-70 transition-opacity">
                    View →
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
