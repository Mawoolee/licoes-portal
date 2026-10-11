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

// Slightly varied warm tints per year level — all on-brand
const YEAR_COLORS = [
  { bg: 'bg-[#fdeee4]', border: 'border-[#f5ccb0]' },
  { bg: 'bg-[#fdeee4]', border: 'border-[#f5ccb0]' },
  { bg: 'bg-[#fdeee4]', border: 'border-[#f5ccb0]' },
  { bg: 'bg-[#fdeee4]', border: 'border-[#f5ccb0]' },
]

export default async function CourseYearsPage({
  params,
}: {
  params: Promise<{ course: string }>
}) {
  const { course: courseSlug } = await params
  const course = decodeURIComponent(courseSlug)

  const rows = await db.student.groupBy({
    by: ['yearLevel'],
    where: { course },
    _count: { id: true },
    orderBy: { yearLevel: 'asc' },
  })

  if (rows.length === 0) notFound()

  const total = rows.reduce((s, r) => s + r._count.id, 0)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <Link href="/admin/roster" className="hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> List of Students
        </Link>
        <span>/</span>
        <span className="font-semibold text-[var(--text-primary)]">{course}</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{course}</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {total.toLocaleString()} student{total !== 1 ? 's' : ''} · Select a year level
        </p>
      </div>

      {/* Year cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {rows.map(({ yearLevel, _count }, idx) => {
          const yearSlug = encodeURIComponent(yearLevel)
          const label = YEAR_LABELS[yearLevel] ?? `Year ${yearLevel}`

          return (
            <Link
              key={yearLevel}
              href={`/admin/roster/${courseSlug}/${yearSlug}`}
              style={{ backgroundColor: '#fdeee4', borderColor: '#f5ccb0' }}
              className="group relative overflow-hidden rounded-2xl border-2 p-8 flex flex-col items-center justify-center gap-2 min-h-[160px] transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
            >
              <GraduationCap className="w-7 h-7 text-[var(--brand-400)] mb-1 group-hover:text-[var(--brand-500)] transition-colors" />
              <h2 className="text-2xl font-extrabold tracking-tight text-center text-[var(--brand-600)]">
                {label}
              </h2>
              <p className="text-sm font-semibold text-[var(--text-muted)]">
                {_count.id.toLocaleString()} student{_count.id !== 1 ? 's' : ''}
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
