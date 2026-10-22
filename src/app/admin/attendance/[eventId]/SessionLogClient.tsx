'use client'

import { useState } from 'react'
import { Search, LogIn, LogOut, ChevronRight } from 'lucide-react'

type SessionEntry = {
  sessionId: string
  studentName: string
  studentNumber: string
  program: string
  yearLevel: string
  timeIn: string
  timeOut: string
  isLateTimeIn: boolean
}

type CourseCard = {
  course: string
  count: number
  href: string
}

/**
 * Renders the "Select a program" header row (with search input), the program
 * card grid, and the session log — all in one client component so the search
 * state can sit beside the label and filter the log below.
 *
 * Receiving raw data (not JSX) avoids the React key-prop warning that occurs
 * when pre-built JSX elements are passed across the server→client boundary.
 */
export default function SessionLogClient({
  sessions,
  courses,
  eventId,
}: {
  sessions: SessionEntry[]
  courses: CourseCard[]
  eventId: string
}) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? sessions.filter((s) => {
        const q = query.trim().toLowerCase()
        return (
          s.studentName.toLowerCase().includes(q) ||
          s.studentNumber.toLowerCase().includes(q) ||
          s.program.toLowerCase().includes(q)
        )
      })
    : sessions

  return (
    <div className="space-y-6">
      {/* ── Course cards section ── */}
      <div>
        {/* Header row: label left, search right — search aligns with card grid edge */}
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <p className="text-sm font-semibold text-[var(--text-muted)]">
            Select a program to view attendance
          </p>
          {/* Global search — filters the session log */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, ID, or program…"
              className="pl-9 pr-3 py-2 text-sm border border-[var(--brand-100)] rounded-lg bg-[var(--surface)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-300)] w-72"
            />
          </div>
        </div>

        {/* Program cards */}
        {courses.length === 0 ? (
          <div className="rounded-xl border border-[var(--brand-100)] bg-[var(--surface)] p-12 text-center text-sm text-[var(--text-muted)]">
            No attendance records yet for this event.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {courses.map(({ course, count, href }) => (
              <a
                key={course}
                href={href}
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
                  View <ChevronRight className="w-3 h-3" />
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* ── Session Log ── */}
      {sessions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest">
              Session Log
            </p>
            <span className="text-xs text-[var(--text-muted)]">
              {query.trim()
                ? `${filtered.length} of ${sessions.length} scan${sessions.length !== 1 ? 's' : ''}`
                : `${sessions.length} scan${sessions.length !== 1 ? 's' : ''} — most recent first`}
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
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                        No results for &ldquo;{query}&rdquo;
                      </td>
                    </tr>
                  ) : (
                    filtered.map((entry, idx) => (
                      <tr key={entry.sessionId} className="hover:bg-[var(--brand-50)/40] transition-colors">
                        <td className="px-4 py-2.5 text-xs text-[var(--text-muted)]">{idx + 1}</td>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-[var(--text-primary)] text-sm">{entry.studentName}</p>
                          <p className="text-xs text-[var(--text-muted)] font-mono">{entry.studentNumber}</p>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-[var(--text-muted)]">
                          {entry.program} · Yr {entry.yearLevel}
                        </td>
                        <td className="px-4 py-2.5 text-xs font-mono text-green-700">{entry.timeIn}</td>
                        <td className="px-4 py-2.5 text-xs font-mono text-blue-700">{entry.timeOut}</td>
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
