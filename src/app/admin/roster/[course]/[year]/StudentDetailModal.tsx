'use client'

import { useEffect } from 'react'
import { X, BadgeCheck, Clock, CheckCircle2, XCircle, User } from 'lucide-react'

type AttendanceEntry = {
  eventId: string
  eventName: string
  eventDate: string
  status: 'PRESENT' | 'ABSENT'
}

type StudentDetail = {
  id: string
  fullName: string
  course: string
  yearLevel: string
  section: string
  hasPaidMembership: boolean
  attendance: AttendanceEntry[]
}

const YEAR_LABELS: Record<string, string> = {
  '1': '1st Year',
  '2': '2nd Year',
  '3': '3rd Year',
  '4': '4th Year',
}

export default function StudentDetailModal({
  student,
  onClose,
}: {
  student: StudentDetail
  onClose: () => void
}) {
  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[var(--surface)] rounded-2xl border border-[var(--brand-100)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[var(--brand-500)] px-5 py-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white leading-tight">{student.fullName}</h2>
              <p className="text-xs text-white/70 mt-0.5">{student.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors shrink-0 mt-0.5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <InfoItem label="Student ID" value={student.id} mono />
            <InfoItem label="Full Name" value={student.fullName} />
            <InfoItem label="Course" value={student.course} />
            <InfoItem
              label="Year Level"
              value={YEAR_LABELS[student.yearLevel] ?? `Year ${student.yearLevel}`}
            />
          </div>

          {/* Membership Fee */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
              Membership Fee
            </p>
            {student.hasPaidMembership ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-600 border border-green-200">
                <BadgeCheck className="w-3.5 h-3.5" />
                Paid
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                <Clock className="w-3.5 h-3.5" />
                Not yet paid
              </span>
            )}
          </div>

          {/* Event Attendance */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
              Event Attendance ({student.attendance.length})
            </p>
            {student.attendance.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] italic">No events attended yet.</p>
            ) : (
              <div className="space-y-2">
                {student.attendance.map((a) => (
                  <div
                    key={a.eventId}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs ${
                      a.status === 'PRESENT'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {a.status === 'PRESENT' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      )}
                      <span
                        className={`font-medium ${
                          a.status === 'PRESENT' ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {a.eventName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] ${
                          a.status === 'PRESENT' ? 'text-green-500' : 'text-red-400'
                        }`}
                      >
                        {a.eventDate}
                      </span>
                      <span
                        className={`font-bold text-[10px] px-1.5 py-0.5 rounded-full ${
                          a.status === 'PRESENT'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {a.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoItem({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
        {label}
      </p>
      <p
        className={`text-sm font-medium text-[var(--text-primary)] ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </p>
    </div>
  )
}
