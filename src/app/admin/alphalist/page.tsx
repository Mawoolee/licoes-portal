'use client'

import { useState, useTransition } from 'react'
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import { uploadAlphaListAction, getStudentsAction } from '@/app/actions/alphalist-actions'

type Student = {
  id: string
  fullName: string
  course: string
  yearLevel: string
  section: string
  academicYear: string
  semester: string
}

type LoadResult = {
  students: Student[]
  total: number
  page: number
  pageSize: number
}

const PAGE_SIZE = 50

export default function AlphaListUploadPage() {
  const [uploading, setUploading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [importedCount, setImportedCount] = useState<number | null>(null)

  // Table state
  const [tableData, setTableData] = useState<LoadResult | null>(null)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isPending, startTransition] = useTransition()

  async function loadStudents(page: number, query: string) {
    startTransition(async () => {
      const result = await getStudentsAction(page, PAGE_SIZE, query)
      if (result.success) {
        setTableData(result as LoadResult)
      }
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setStatusMessage(null)

    const formData = new FormData()
    formData.append('file', file)

    const result = await uploadAlphaListAction(formData)

    setUploading(false)

    if (result.success) {
      setStatusMessage({ type: 'success', text: result.message })
      setImportedCount(result.count ?? 0)
      // Auto-load first page of the newly imported students
      setSearch('')
      setCurrentPage(1)
      loadStudents(1, '')
    } else {
      setStatusMessage({ type: 'error', text: result.message })
    }

    // Reset the file input so the same file can be re-uploaded if needed
    e.target.value = ''
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCurrentPage(1)
    loadStudents(1, search)
  }

  function handlePage(next: number) {
    setCurrentPage(next)
    loadStudents(next, search)
  }

  const totalPages = tableData ? Math.ceil(tableData.total / PAGE_SIZE) : 0

  // Course color badges
  const courseColors: Record<string, string> = {
    'BSCE CEM': 'bg-orange-100 text-orange-700',
    'BSCE SE': 'bg-amber-100 text-amber-700',
    BSEE: 'bg-yellow-100 text-yellow-700',
    BSCS: 'bg-blue-100 text-blue-700',
    BSIT: 'bg-indigo-100 text-indigo-700',
    BLIS: 'bg-pink-100 text-pink-700',
  }

  function badgeClass(course: string) {
    return courseColors[course] ?? 'bg-slate-100 text-slate-600'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import Student Data</h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload the official SOECS Excel file every semester.
          The system will import all sheets automatically.
        </p>
      </div>

      {/* Upload Card */}
      <div className="bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-6">
          {/* Icon + info */}
          <div className="flex-1 space-y-1">
            <p className="font-semibold text-sm">Import from Excel (.xlsx)</p>
            <p className="text-xs text-slate-500">
              Supports the standard SOECS format. All sheets are read
              automatically — BSCE CEM, BSCE SE, BSEE, BLIS, BSCS, BSIT.
            </p>
            {importedCount !== null && (
              <div className="flex items-center gap-2 mt-2">
                <Users className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-semibold text-violet-700">
                  {importedCount.toLocaleString()} students synced
                </span>
              </div>
            )}
          </div>

          {/* Upload button */}
          <label className="cursor-pointer shrink-0">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                uploading
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-violet-600 hover:bg-violet-700 text-white'
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Importing...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" /> Choose File
                </>
              )}
            </div>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div
            className={`mt-4 p-3 rounded-lg flex items-center gap-2.5 text-sm font-medium ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {statusMessage.text}
          </div>
        )}
      </div>

      {/* Student Records Table */}
      <div className="bg-white dark:bg-slate-900 border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-sm">
              Student Records
              {tableData && (
                <span className="ml-2 text-slate-400 font-normal">
                  ({tableData.total.toLocaleString()} total)
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search form */}
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, ID, course..."
                  className="pl-8 pr-3 py-1.5 text-xs border rounded-lg bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-400 w-52"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium"
              >
                Search
              </button>
            </form>

            {/* Load / Refresh button when table is empty */}
            {!tableData && (
              <button
                onClick={() => loadStudents(1, '')}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg hover:bg-slate-50 font-medium disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
                Load Records
              </button>
            )}
          </div>
        </div>

        {/* Table body */}
        {!tableData ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No records loaded yet.</p>
            <p className="text-xs mt-1 text-slate-400">
              Upload an Alpha List file or click <strong>Load Records</strong> to view existing data.
            </p>
          </div>
        ) : tableData.students.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <Search className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No students matched your search.</p>
          </div>
        ) : (
          <>
            <div className={isPending ? 'opacity-50 pointer-events-none' : ''}>
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b text-xs uppercase text-slate-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Student ID</th>
                    <th className="px-4 py-3">Full Name</th>
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3">Yr</th>
                    <th className="px-4 py-3">Academic Year</th>
                    <th className="px-4 py-3">Semester</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800">
                  {tableData.students.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{s.id}</td>
                      <td className="px-4 py-2.5 font-medium text-sm">{s.fullName}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded ${badgeClass(s.course)}`}
                        >
                          {s.course}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-center font-semibold">{s.yearLevel}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{s.academicYear}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{s.semester}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t flex items-center justify-between text-xs text-slate-500">
                <span>
                  Page {currentPage} of {totalPages} &nbsp;·&nbsp;{' '}
                  {tableData.total.toLocaleString()} students
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePage(currentPage - 1)}
                    disabled={currentPage === 1 || isPending}
                    className="p-1.5 rounded border hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handlePage(currentPage + 1)}
                    disabled={currentPage === totalPages || isPending}
                    className="p-1.5 rounded border hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
