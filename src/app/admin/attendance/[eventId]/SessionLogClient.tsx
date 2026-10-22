'use client'

import { useState } from 'react'
import { Search, LogIn, LogOut } from 'lucide-react'

type SessionEntry = {
  sessionId: string
  studentName: string
  studentNumber: string
  program: string
  yearLevel: string
  timeIn: string   // pre-formatted string from server
  timeOut: string  // pre-formatted string from server
  isLateTimeIn: boolean
}

export default function SessionLogClient({
  sessions,
  totalScans,
}: {
  sessions: SessionEntry[]
  totalScans: number
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
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left: "Select a program" label + search */}
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest">
            Session Log
          </p>
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, ID, or program…"
              className="pl-8 pr-3 py-1.5 text-xs border border-[var(--brand-100)] rounded-lg bg-[var(--surface)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-300)] w-56"
            />
          </div>
        </div>
        <span className="text-xs text-[var(--text-muted)]">
          {query.trim()
            ? `${filtered.length} of ${totalScans} scan${totalScans !== 1 ? 's' : ''}`
            : `${totalScans} scan${totalScans !== 1 ? 's' : ''} — most recent first`}
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
  )
}
