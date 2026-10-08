import { db } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, GraduationCap } from 'lucide-react'

const YEAR_LABELS: Record<string, string> = {
  '1': '1st Year',
  '2': '2nd Year',
  '3': '3rd Year',
  '4': '4th Year',
}

const YEAR_COLORS = [
  'bg-[var(--brand-50)] border-[var(--brand-100)] text-[var(--brand-600)]',
  'bg-indigo-50 border-indigo-100 text-indigo-700',
  'bg-blue-50 border-blue-100 text-blue-700',
  'bg-cyan-50 border-cyan-100 text-cyan-700',
]

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
        {years.map(({ year, count }, idx) => {
          const colorClass = YEAR_COLORS[parseInt(year) - 1] ?? YEAR_COLORS[idx % YEAR_COLORS.length]
          return (
            <Link
              key={year}
              href={`/admin/attendance/${eventId}/${courseSlug}/${encodeURIComponent(year)}`}
              className={`group rounded-2xl border ${colorClass} p-8 flex flex-col items-center justify-center gap-2 min-h-[140px] hover:scale-[1.02] transition-transform`}
            >
              <GraduationCap className="w-6 h-6 opacity-40 mb-1" />
              <h2 className="text-xl font-extrabold tracking-tight text-center">
                {YEAR_LABELS[year] ?? `Year ${year}`}
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
    </div>
  )
}
