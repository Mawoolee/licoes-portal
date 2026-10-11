import { db } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, GraduationCap, ChevronRight } from 'lucide-react'

const YEAR_LABELS: Record<string, string> = {
  '1': '1st Year',
  '2': '2nd Year',
  '3': '3rd Year',
  '4': '4th Year',
}

export default async function EventCoursePage({
  params,
}: {
  params: Promise<{ eventId: string; course: string }>
}) {
  const { eventId, course: courseSlug } = await params
  const course = decodeURIComponent(courseSlug)

  const event = await db.event.findUnique({ where: { id: eventId } })
  if (!event) notFound()

  // Group attendance records by year level
  const records = await db.attendanceRecord.findMany({
    where: { eventId, student: { program: course } },
    include: { student: true },
  })

  if (records.length === 0) notFound()

  const yearMap = new Map<string, number>()
  for (const r of records) {
    const yr = String(r.student.yearLevel)
    yearMap.set(yr, (yearMap.get(yr) ?? 0) + 1)
  }

  const years = Array.from(yearMap.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => Number(a.year) - Number(b.year))

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
        <Link
          href={`/admin/attendance/${eventId}`}
          className="hover:text-[var(--text-primary)] transition-colors"
        >
          {event.name}
        </Link>
        <span>/</span>
        <span className="font-semibold text-[var(--text-primary)]">{course}</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{course}</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {event.name} · Select a year level
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {years.map(({ year, count }) => {
          return (
            <Link
              key={year}
              href={`/admin/attendance/${eventId}/${courseSlug}/${encodeURIComponent(year)}`}
              style={{ backgroundColor: '#fdeee4', borderColor: '#f5ccb0' }}
              className="group relative overflow-hidden rounded-2xl border-2 p-8 flex flex-col items-center justify-center gap-2 min-h-[160px] transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
            >
              <GraduationCap className="w-7 h-7 text-[var(--brand-400)] mb-1 group-hover:text-[var(--brand-500)] transition-colors" />
              <h2 className="text-2xl font-extrabold tracking-tight text-center text-[var(--brand-600)]">
                {YEAR_LABELS[year] ?? `Year ${year}`}
              </h2>
              <p className="text-sm font-semibold text-[var(--text-muted)]">
                {count.toLocaleString()} record{count !== 1 ? 's' : ''}
              </p>
              <span className="absolute bottom-3 right-3 flex items-center gap-0.5 text-xs font-medium text-[var(--brand-300)] opacity-0 group-hover:opacity-100 transition-opacity">
                View <ChevronRight className="w-3 h-3" />
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
