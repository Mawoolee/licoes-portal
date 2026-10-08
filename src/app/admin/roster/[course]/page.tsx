import { db } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, GraduationCap } from 'lucide-react'

const YEAR_LABELS: Record<string, string> = { '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year' }
const YEAR_COLORS = [
  'bg-indigo-950/40 border-indigo-500/30 text-indigo-300',
  'bg-violet-950/40 border-violet-500/30 text-violet-300',
  'bg-blue-950/40   border-blue-500/30   text-blue-300',
  'bg-cyan-950/40   border-cyan-500/30   text-cyan-300',
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
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/admin/roster" className="hover:text-slate-300 flex items-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> List of Students
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-200">{course}</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{course}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {total.toLocaleString()} student{total !== 1 ? 's' : ''} · Select a year level
        </p>
      </div>

      {/* Year cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {rows.map(({ yearLevel, _count }, idx) => {
          const colorClass = YEAR_COLORS[parseInt(yearLevel) - 1] ?? YEAR_COLORS[idx % YEAR_COLORS.length]
          const yearSlug = encodeURIComponent(yearLevel)
          const label = YEAR_LABELS[yearLevel] ?? `Year ${yearLevel}`

          return (
            <Link
              key={yearLevel}
              href={`/admin/roster/${courseSlug}/${yearSlug}`}
              className={`group relative overflow-hidden rounded-2xl border ${colorClass} p-8 flex flex-col items-center justify-center gap-2 min-h-[160px] hover:scale-[1.02] transition-transform`}
            >
              <GraduationCap className="w-7 h-7 opacity-40 mb-1" />
              <h2 className="text-2xl font-extrabold tracking-tight text-center">{label}</h2>
              <p className="text-sm font-semibold opacity-70">
                {_count.id.toLocaleString()} student{_count.id !== 1 ? 's' : ''}
              </p>
              <span className="absolute bottom-3 right-4 text-xs text-white/20 group-hover:text-white/50 transition-colors">
                View →
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
