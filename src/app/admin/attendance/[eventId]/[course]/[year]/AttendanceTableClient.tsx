'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { LogIn, LogOut, Trash2 } from 'lucide-react'
import { invalidateAttendanceAction } from '@/app/actions/attendance-actions'
import { useRouter } from 'next/navigation'

type Row = {
  idx: number
  id: string
  studentNumber: string
  fullName: string
  program: string
  yearLevel: number
  status: 'PRESENT' | 'ABSENT'
  sessionId: string | null
  timeIn: Date | null
  timeOut: Date | null
  isLateTimeIn: boolean
}

const YEAR_LABELS: Record<number, string> = {
  1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year',
}

function fmt(date: Date | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleTimeString('en-PH', {
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
    timeZone: 'Asia/Manila',
  })
}

export default function AttendanceTableClient({
  rows: initialRows,
  eventId,
  courseSlug,
  yearSlug,
}: {
  rows: Row[]
  eventId: string
  courseSlug: string
  yearSlug: string
}) {
  const [rows, setRows] = useState(initialRows)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleInvalidate(row: Row) {
    if (!row.sessionId) return
    if (!confirm(`Remove attendance record for ${row.fullName}? This will mark them as Absent.`)) return
    startTransition(async () => {
      const result = await invalidateAttendanceAction(row.sessionId!)
      if (result.success) {
        setRows((prev) => prev.map((r) =>
          r.id === row.id
            ? { ...r, status: 'ABSENT', sessionId: null, timeIn: null, timeOut: null, isLateTimeIn: false }
            : r
        ))
      }
    })
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] p-12 text-center text-sm text-[var(--text-muted)]">
        No attendance records for this group.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] overflow-hidden shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--surface-alt)] border-b border-[var(--brand-100)]">
          <tr className="text-xs uppercase text-[var(--text-muted)] font-semibold tracking-wider">
            <th className="px-4 py-3 w-8">#</th>
            <th className="px-4 py-3">Student ID</th>
            <th className="px-4 py-3">Full Name</th>
            <th className="px-4 py-3">Course</th>
            <th className="px-4 py-3">Year</th>
            <th className="px-4 py-3 text-center">Status</th>
            <th className="px-4 py-3">
              <span className="flex items-center gap-1 text-green-600"><LogIn className="w-3 h-3" /> Time In</span>
            </th>
            <th className="px-4 py-3">
              <span className="flex items-center gap-1 text-blue-600"><LogOut className="w-3 h-3" /> Time Out</span>
            </th>
            <th className="px-4 py-3 w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--brand-50)]">
          {rows.map((r) => {
            const isPresent = r.status === 'PRESENT'
            return (
              <tr key={r.id} className={`transition-colors ${
                isPresent ? 'bg-green-50/40 hover:bg-green-50' : 'bg-red-50/30 hover:bg-red-50/60'
              }`}>
                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{r.idx + 1}</td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{r.studentNumber}</td>
                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{r.fullName}</td>
                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{r.program}</td>
                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                  {YEAR_LABELS[r.yearLevel] ?? `Year ${r.yearLevel}`}
                </td>
                <td className="px-4 py-3 text-center">
                  {isPresent ? (
                    r.isLateTimeIn ? (
                      <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
                        Late
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-300">
                        ✓ Present
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-600 border border-red-300">
                      ✗ Absent
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs font-mono text-green-700">{fmt(r.timeIn)}</td>
                <td className="px-4 py-3 text-xs font-mono text-blue-700">{fmt(r.timeOut)}</td>
                <td className="px-4 py-3">
                  {isPresent && r.sessionId && (
                    <button
                      onClick={() => handleInvalidate(r)}
                      disabled={isPending}
                      title="Invalidate attendance"
                      className="inline-flex items-center justify-center w-7 h-7 text-red-500 border border-red-200 bg-white hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
