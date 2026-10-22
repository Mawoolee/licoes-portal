'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Upload, Users, ChevronRight, UserPlus, X,
  FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Search,
} from 'lucide-react'
import { uploadAlphaListAction } from '@/app/actions/alphalist-actions'
import { addStudentAction } from '@/app/actions/alphalist-actions'

const COURSES = ['BSCE CEM', 'BSCE SE', 'BSEE', 'BSIT', 'BSCS', 'BLIS']

type CourseRow = { course: string; count: number }
type SearchResult = { id: string; fullName: string; course: string; yearLevel: string; yearLabel: string }

export default function RosterClient({
  rows,
  totalStudents,
  query,
  searchResults,
}: {
  rows: CourseRow[]
  totalStudents: number
  query: string
  searchResults: SearchResult[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Upload Excel modal
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Add Student modal
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ id: '', fullName: '', course: '', yearLevel: '1' })
  const [addStatus, setAddStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [addLoading, setAddLoading] = useState(false)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadStatus(null)
    const formData = new FormData()
    formData.append('file', file)
    const result = await uploadAlphaListAction(formData)
    setUploading(false)
    if (result.success) {
      setUploadStatus({ type: 'success', text: result.message })
      router.refresh()
    } else {
      setUploadStatus({ type: 'error', text: result.message })
    }
    e.target.value = ''
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault()
    setAddStatus(null)
    setAddLoading(true)
    const result = await addStudentAction(addForm)
    setAddLoading(false)
    if (result.success) {
      setAddStatus({ type: 'success', text: result.message })
      setAddForm({ id: '', fullName: '', course: '', yearLevel: '1' })
      router.refresh()
    } else {
      setAddStatus({ type: 'error', text: result.message })
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">List of Students</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {totalStudents > 0
              ? `${totalStudents.toLocaleString()} students across ${rows.length} program${rows.length !== 1 ? 's' : ''}`
              : 'No students imported yet. Upload the SOECS Excel file to populate this roster.'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Search bar */}
          <form method="GET" action="/admin/roster" className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Search name or ID…"
                className="pl-8 pr-3 py-2 text-xs border border-[var(--brand-100)] rounded-lg bg-[var(--surface)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-300)] w-48"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 text-xs bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white rounded-lg font-medium transition-colors"
            >
              Search
            </button>
            {query && (
              <Link
                href="/admin/roster"
                className="px-3 py-2 text-xs border border-[var(--brand-100)] rounded-lg hover:bg-[var(--brand-50)] font-medium text-[var(--text-muted)] transition-colors"
              >
                Clear
              </Link>
            )}
          </form>

          <button
            onClick={() => { setShowAdd(true); setAddStatus(null) }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-[var(--brand-300)] text-[var(--brand-600)] hover:bg-[var(--brand-50)] rounded-lg transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" /> Add Student
          </button>
          <button
            onClick={() => { setShowUpload(true); setUploadStatus(null) }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white rounded-lg transition-colors"
          >
            <Upload className="w-3.5 h-3.5" /> Upload Excel
          </button>
        </div>
      </div>

      {/* Search Results */}
      {query && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">
            {searchResults.length === 0
              ? `No results for "${query}"`
              : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${query}"`}
          </p>
          {searchResults.length > 0 && (
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
                  {searchResults.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-[var(--brand-50)] transition-colors">
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{s.id}</td>
                      <td className="px-4 py-3 font-medium text-[var(--brand-500)]">
                        <Link
                          href={`/admin/roster/${encodeURIComponent(s.course)}/${encodeURIComponent(s.yearLevel)}`}
                          className="hover:underline"
                        >
                          {s.fullName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{s.course}</td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{s.yearLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Course cards — only show when not searching */}
      {!query && (rows.length === 0 ? (
        <div className="border-2 border-dashed border-[var(--brand-100)] rounded-2xl p-16 text-center space-y-4">
          <Users className="w-12 h-12 text-[var(--brand-200)] mx-auto" />
          <div>
            <p className="font-semibold text-[var(--text-primary)]">No students found</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">Upload the SOECS Alpha List Excel file to get started.</p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" /> Upload Excel File
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {rows.map(({ course, count }) => {
            const slug = encodeURIComponent(course)
            return (
              <Link
                key={course}
                href={`/admin/roster/${slug}`}
                style={{ backgroundColor: '#fdeee4', borderColor: '#f5ccb0' }}
                className="group relative overflow-hidden rounded-2xl border-2 p-8 flex flex-col items-center justify-center gap-3 min-h-[160px] transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
              >
                <h2 className="text-3xl font-extrabold tracking-tight text-center text-[var(--brand-600)]">{course}</h2>
                <p className="text-sm font-semibold text-[var(--text-muted)]">
                  {count.toLocaleString()} student{count !== 1 ? 's' : ''}
                </p>
                <span className="absolute bottom-3 right-3 flex items-center gap-0.5 text-xs font-medium text-[var(--brand-300)] opacity-0 group-hover:opacity-100 transition-opacity">
                  View <ChevronRight className="w-3 h-3" />
                </span>
              </Link>
            )
          })}
        </div>
      ))}

      {/* ── Upload Excel Modal ──────────────────────────────────────────── */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-[var(--brand-100)] shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-[var(--text-primary)]">Import Student Data</h2>
              <button onClick={() => setShowUpload(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Upload the official SOECS Excel file (.xlsx). All sheets will be imported automatically — BSCE CEM, BSCE SE, BSEE, BLIS, BSCS, BSIT.
            </p>
            <label className={`cursor-pointer flex items-center justify-center gap-3 border-2 border-dashed rounded-xl p-6 transition-colors ${uploading ? 'opacity-50 pointer-events-none border-slate-200' : 'border-[var(--brand-200)] hover:border-[var(--brand-400)] hover:bg-[var(--brand-50)]'}`}>
              {uploading
                ? <><Loader2 className="w-5 h-5 animate-spin text-[var(--brand-500)]" /><span className="text-sm font-medium text-[var(--text-muted)]">Importing...</span></>
                : <><FileSpreadsheet className="w-5 h-5 text-[var(--brand-500)]" /><span className="text-sm font-medium text-[var(--text-primary)]">Click to choose Excel file</span></>
              }
              <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} disabled={uploading} className="hidden" />
            </label>
            {uploadStatus && (
              <div className={`flex items-start gap-2.5 p-3 rounded-lg text-sm font-medium ${uploadStatus.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-[var(--brand-50)] border border-[var(--brand-100)] text-[var(--brand-600)]'}`}>
                {uploadStatus.type === 'success'
                  ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                {uploadStatus.text}
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={() => setShowUpload(false)} className="px-4 py-2 text-sm border border-[var(--brand-100)] rounded-lg hover:bg-[var(--brand-50)] font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Student Modal ───────────────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-[var(--brand-100)] shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-[var(--text-primary)]">Add Student Manually</h2>
              <button onClick={() => setShowAdd(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddStudent} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-[var(--text-primary)]">Student ID *</label>
                <input
                  required
                  value={addForm.id}
                  onChange={(e) => setAddForm((f) => ({ ...f, id: e.target.value }))}
                  placeholder="e.g. 07305868"
                  className="w-full bg-white border border-[var(--brand-100)] focus:border-[var(--brand-400)] rounded-lg p-2.5 outline-none font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-[var(--text-primary)]">Full Name *</label>
                <input
                  required
                  value={addForm.fullName}
                  onChange={(e) => setAddForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="SURNAME, First Name M.I."
                  className="w-full bg-white border border-[var(--brand-100)] focus:border-[var(--brand-400)] rounded-lg p-2.5 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-[var(--text-primary)]">Program *</label>
                  <select
                    required
                    value={addForm.course}
                    onChange={(e) => setAddForm((f) => ({ ...f, course: e.target.value }))}
                    className="w-full bg-white border border-[var(--brand-100)] focus:border-[var(--brand-400)] rounded-lg p-2.5 outline-none"
                  >
                    <option value="">Select</option>
                    {COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-[var(--text-primary)]">Year Level *</label>
                  <select
                    required
                    value={addForm.yearLevel}
                    onChange={(e) => setAddForm((f) => ({ ...f, yearLevel: e.target.value }))}
                    className="w-full bg-white border border-[var(--brand-100)] focus:border-[var(--brand-400)] rounded-lg p-2.5 outline-none"
                  >
                    {[1, 2, 3, 4].map((y) => <option key={y} value={y}>{y}{['st','nd','rd','th'][y-1]} Year</option>)}
                  </select>
                </div>
              </div>
              {addStatus && (
                <div className={`flex items-start gap-2.5 p-3 rounded-lg font-medium ${addStatus.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-[var(--brand-50)] border border-[var(--brand-100)] text-[var(--brand-600)]'}`}>
                  {addStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  {addStatus.text}
                </div>
              )}
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm border border-[var(--brand-100)] rounded-lg hover:bg-[var(--brand-50)] font-medium">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-5 py-2 text-sm font-semibold bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {addLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
