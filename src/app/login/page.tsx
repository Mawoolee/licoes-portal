'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { AlertTriangle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl: '/treasurer/claims'
    })

    if (res?.error) {
      setError('Maling email o password. Pakisubukan ulit.')
      setLoading(false)
    } else if (res?.url) {
      router.push(res.url)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-white dark:bg-slate-950">
      <div className="max-w-md w-full space-y-6 bg-white dark:bg-slate-900 p-8 rounded-xl border shadow-sm">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">LICOES Officer Login</h1>
          <p className="text-xs text-slate-500">
            Gamitin ang iyong DWCL email at password para makapasok sa officer dashboard.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">DWCL Email</label>
            <Input
              type="email"
              placeholder="officer@dwcl.edu.ph"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white" disabled={loading}>
            {loading ? 'Verifying credentials...' : 'Sign In'}
          </Button>
        </form>
      </div>
    </main>
  )
}