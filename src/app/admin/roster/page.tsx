import { db } from '@/lib/db'
import Link from 'next/link'
import { Upload, Users } from 'lucide-react'

const COURSE_COLORS: Record<string, { bg: string; border: string; text: string; accent: string }> = {
  'BSCE CEM': { bg: 'bg-orange-950/40', border: 'border-orange-500/30', text: 'text-orange-300', accent: 'text-orange-400' },
  'BSCE SE':  { bg: 'bg-amber-950/40',  border: 'border-amber-500/30',  text: 'text-amber-300',  accent: 'text-amber-400' },
  'BSEE':     { bg: 'bg-yellow-950/40', border: 'border-yellow-500/30', text: 'text-yellow-300', accent: 'text-yellow-400' },
  'BSIT':     { bg: 'bg-indigo-950/40', border: 'border-indigo-500/30', text: 'text-indigo-300', accent: 'text-indigo-400' },
  'BSCS':     { bg: 'bg-blue-950/40',   border: 'border-blue-500/30',   text: 'text-blue-300',   accent: 'text-blue-400' },
  'BLIS':     { bg: 'bg-pink-950/40',   border: 'border-pink-500/30',   text: 'text-pink-300',   accent: 'text-pink-400' },
}

const DEFAULT_COLOR = { bg: 'bg-slate-900', border: 'border-slate-700', text: 'text-slate-300', accent: 'text-slate-400' }

export default async function RosterPage() {
  // Get distinct courses with their student count
  const rows = await db.student.groupBy({
    by: ['course'],
    _count: { id: true },
    orderBy: { course: 'asc' },
  })

  const totalStudents = rows.reduce((s, r) => s + r._count.id, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">List of Students</h1>
          <p className="text-sm text-slate-500 mt-1">
            {totalStudents > 0
              ? `${totalStudents.toLocaleString()} students across ${rows.length} program${rows.length !== 1 ? 's' : ''}`
              : 'No students imported yet. Upload the SOECS Excel file to populate this roster.'}
          </p>
        </div>
        <Link
          href="/admin/alphalist"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg shrink-0"
        >
          <Upload className="w-3.5 h-3.5" /> Upload Excel
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="border-2 border-dashed border-slate-800 rounded-2xl p-16 text-center space-y-4">
          <Users className="w-12 h-12 text-slate-700 mx-auto" />
          <div>
            <p className="font-semibold text-slate-600">No students found</p>
            <p className="text-sm text-slate-500 mt-1">Upload the SOECS Alpha List Excel file to get started.</p>
          </div>
          <Link href="/admin/alphalist" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
            <Upload className="w-4 h-4" /> Upload Excel File
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {rows.map(({ course, _count }) => {
            const color = COURSE_COLORS[course] ?? DEFAULT_COLOR
            const slug = encodeURIComponent(course)
            return (
              <Link
                key={course}
                href={`/admin/roster/${slug}`}
                className={`group relative overflow-hidden rounded-2xl border ${color.bg} ${color.border} p-8 flex flex-col items-center justify-center gap-3 min-h-[160px] hover:scale-[1.02] transition-transform`}
              >
                <h2 className={`text-3xl font-extrabold tracking-tight text-center ${color.text}`}>
                  {course}
                </h2>
                <p className={`text-sm font-semibold ${color.accent}`}>
                  {_count.id.toLocaleString()} student{_count.id !== 1 ? 's' : ''}
                </p>
                {/* hover arrow */}
                <span className="absolute bottom-3 right-4 text-xs text-white/20 group-hover:text-white/50 transition-colors">
                  View →
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
