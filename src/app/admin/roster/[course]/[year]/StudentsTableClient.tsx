'use client'

import { useState } from 'react'
import StudentDetailModal from './StudentDetailModal'

type AttendanceEntry = {
  eventId: string
  eventName: string
  eventDate: string
  status: 'PRESENT' | 'ABSENT'
}

type StudentRow = {
  id: string
  fullName: string
  course: string
  yearLevel: string
  section: string
  isOfficer: boolean
  notes: string
  hasPaidMembership: boolean
  attendance: AttendanceEntry[]
}

const YEAR_LABELS: Record<string, string> = {
  '1': '1st Year',
  '2': '2nd Year',
  '3': '3rd Year',
  '4': '4th Year',
}

export default function StudentsTableClient({ students: initialStudents }: { students: StudentRow[] }) {
  // Keep a mutable local copy so tag/note updates reflect immediately in the table
  const [rows, setRows] = useState<StudentRow[]>(initialStudents)
  const [selected, setSelected] = useState<StudentRow | null>(null)

  function handleUpdate(updated: StudentRow) {
    // Update both the table row and the open modal
    setRows((prev) => prev.map((s) => s.id === updated.id ? updated : s))
    setSelected(updated)
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] p-12 text-center text-sm text-[var(--text-muted)]">
        No students matched your search.
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface-alt)] border-b border-[var(--brand-100)]">
            <tr className="text-xs uppercase text-[var(--text-muted)] font-semibold tracking-wider">
              <th className="px-4 py-3 w-10">#</th>
              <th className="px-4 py-3">Student ID</th>
              <th className="px-4 py-3">Full Name</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Year</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--brand-50)]">
            {rows.map((s, idx) => (
              <tr
                key={s.id}
                className="hover:bg-[var(--brand-50)] transition-colors cursor-pointer"
                onClick={() => setSelected(s)}
              >
                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{idx + 1}</td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{s.id}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[var(--brand-500)] hover:underline">
                      {s.fullName}
                    </span>
                    {s.isOfficer && (
                      <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-300 whitespace-nowrap">
                        LICOES Officer
                      </span>
                    )}
                    {s.notes && (
                      <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-300 whitespace-nowrap">
                        {s.notes}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{s.course}</td>
                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                  {YEAR_LABELS[s.yearLevel] ?? `Year ${s.yearLevel}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <StudentDetailModal
          student={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      )}
    </>
  )
}
