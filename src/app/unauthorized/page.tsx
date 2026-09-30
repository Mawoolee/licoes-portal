import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="space-y-4 max-w-sm">
        <h1 className="text-4xl font-extrabold text-red-600">403</h1>
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm text-slate-500">
          Wala kang sapat na permiso para pasukin ang page na ito.
        </p>
        <Link
          href="/login"
          className="inline-block bg-slate-900 text-white text-xs px-4 py-2 rounded-md font-medium"
        >
          Bumalik sa Login
        </Link>
      </div>
    </main>
  )
}