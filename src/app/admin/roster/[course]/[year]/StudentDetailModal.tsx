'use client'

import { useEffect, useState, useTransition, useRef } from 'react'
import { X, BadgeCheck, Clock, CheckCircle2, XCircle, User, Save, Loader2, MoreHorizontal } from 'lucide-react'
import { updateStudentTagsAction } from '@/app/actions/alphalist-actions'

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
  isOfficer: boolean
  notes: string
  hasPaidMembership: boolean
  attendance: AttendanceEntry[]
}

const YEAR_LABELS: Record<string, string> = {
  '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year',
}

export default function StudentDetailModal({
  student,
  onClose,
  onUpdate,
}: {
  student: StudentDetail
  onClose: () => void
  onUpdate: (updated: StudentDetail) => void
}) {
  const [showTags, setShowTags] = useState(false)
  const [isOfficer, setIsOfficer] = useState(student.isOfficer)
  const [notes, setNotes] = useState(student.notes)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  const tagsRef = useRef<HTMLDivElement>(null)
  const initialisedForId = useRef(student.id)
  // Snapshot values when the tags popup opens — dirty check compares against these
  const snapshot = useRef({ isOfficer: student.isOfficer, notes: student.notes })

  useEffect(() => {
    if (initialisedForId.current === student.id) return
    initialisedForId.current = student.id
    snapshot.current = { isOfficer: student.isOfficer, notes: student.notes }
    setIsOfficer(student.isOfficer)
    setNotes(student.notes)
    setSaved(false)
    setShowTags(false)
  }, [student.id])

  function openTags() {
    snapshot.current = { isOfficer, notes }
    setSaved(false)
    setShowTags(true)
  }

  const isDirty = isOfficer !== snapshot.current.isOfficer || notes !== snapshot.current.notes

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showTags) setShowTags(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, showTags])

  function handleSave() {
    startTransition(async () => {
      const result = await updateStudentTagsAction(student.id, { isOfficer, notes })
      if (result.success) {
        snapshot.current = { isOfficer, notes } // update snapshot so isDirty becomes false
        setSaved(true)
        onUpdate({ ...student, isOfficer, notes })
        setTimeout(() => {
          setSaved(false)
        }, 2500)
      }
    })
  }

  return (
    <>
      {/* Main modal */}
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
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-white leading-tight">{student.fullName}</h2>
                  {isOfficer && (
                    <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 whitespace-nowrap">
                      LICOES Officer
                    </span>
                  )}
                  {notes && (
                    <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 whitespace-nowrap">
                      {notes}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/70 mt-0.5">{student.id}</p>
              </div>
            </div>
            {/* Actions: ⋯ + X */}
            <div className="flex items-center gap-1 shrink-0 mt-0.5">
              <button
                onClick={openTags}
                className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                title="Tags & Notes"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              <InfoItem label="Student ID" value={student.id} mono />
              <InfoItem label="Full Name" value={student.fullName} />
              <InfoItem label="Course" value={student.course} />
              <InfoItem label="Year Level" value={YEAR_LABELS[student.yearLevel] ?? `Year ${student.yearLevel}`} />
            </div>

            {/* Membership Fee */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                Membership Fee
              </p>
              {student.hasPaidMembership ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-600 border border-green-200">
                  <BadgeCheck className="w-3.5 h-3.5" /> Paid
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                  <Clock className="w-3.5 h-3.5" /> Not yet paid
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
                        a.status === 'PRESENT' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {a.status === 'PRESENT'
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                        <span className={`font-medium ${a.status === 'PRESENT' ? 'text-green-700' : 'text-red-700'}`}>
                          {a.eventName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] ${a.status === 'PRESENT' ? 'text-green-500' : 'text-red-400'}`}>
                          {a.eventDate}
                        </span>
                        <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded-full ${
                          a.status === 'PRESENT' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
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

      {/* Tags & Notes popup — rendered on top */}
      {showTags && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowTags(false)}
        >
          <div
            ref={tagsRef}
            className="w-full max-w-sm bg-[var(--surface)] rounded-2xl border border-[var(--brand-100)] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Popup header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--brand-100)]">
              <div>
                <h3 className="font-bold text-[var(--text-primary)]">Tags &amp; Notes</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{student.fullName}</p>
              </div>
              <button
                onClick={() => setShowTags(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Officer toggle */}
              <label className="flex items-center justify-between gap-4 cursor-pointer">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">LICOES Officer</p>
                  <p className="text-xs text-[var(--text-muted)]">Shows a blue badge on the roster</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOfficer((v) => !v)}
                  className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
                    isOfficer ? 'bg-orange-500' : 'bg-slate-300'
                  }`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    isOfficer ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </label>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-muted)]">
                  Note <span className="font-normal opacity-60">(e.g. "Intrams Player - Basketball")</span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a note…"
                  maxLength={80}
                  className="w-full px-3 py-2 text-sm border border-[var(--brand-100)] rounded-lg bg-[var(--surface)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-300)]"
                />
                {notes && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-[var(--text-muted)]">Preview:</span>
                    <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-300">
                      {notes}
                    </span>
                  </div>
                )}
              </div>

              {/* Footer */}
              {saved ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Tags &amp; notes saved successfully!
                </div>
              ) : (
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    onClick={() => setShowTags(false)}
                    className="px-4 py-2 text-xs border border-[var(--brand-100)] rounded-lg hover:bg-[var(--brand-50)] font-medium text-[var(--text-muted)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isPending || !isDirty}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white rounded-lg disabled:opacity-40 transition-colors"
                  >
                    {isPending
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                      : <><Save className="w-3.5 h-3.5" /> Save</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function InfoItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
      <p className={`text-sm font-medium text-[var(--text-primary)] ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}
