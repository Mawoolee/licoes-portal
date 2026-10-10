'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { AlertTriangle, User, Lock, Mail, Eye, EyeOff } from 'lucide-react'

const DWCL_DOMAIN = '@dwc-legazpi.edu'

function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full pl-10 pr-10 py-3 border-b-2 border-[var(--brand-100)] bg-transparent text-sm focus:outline-none focus:border-[var(--brand-500)] transition-colors placeholder:text-[var(--text-muted)]"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}

const GOOGLE_SVG = (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
    <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
)

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.toLowerCase().endsWith(DWCL_DOMAIN)) { setError(`Please use your DWCL school email (e.g. juan.delacruz${DWCL_DOMAIN})`); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    const res = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), email: email.toLowerCase().trim(), password }) })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.message ?? 'An error occurred.'); return }
    setSuccess(true)
    setTimeout(() => router.push('/pending'), 2000)
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--bg-cream)] p-4">
        <div className="w-full max-w-sm text-center space-y-4 rounded-2xl border border-[var(--brand-100)] bg-white p-10 shadow-xl">
          <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto">
            <span className="text-green-500 text-2xl font-bold">?</span>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Account Created!</h2>
          <p className="text-sm text-[var(--text-muted)]">Waiting for admin approval. Redirecting you now...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--bg-cream)] p-4">
      <div className="w-full max-w-3xl flex rounded-2xl overflow-hidden shadow-2xl border border-[var(--brand-100)]">
        <div className="w-72 bg-[var(--brand-500)] px-8 py-12 flex flex-col items-center justify-center text-white text-center space-y-5 shrink-0">
          <Image src="/licoes_logo.png" alt="LICOES Logo" width={100} height={100} className="opacity-90 drop-shadow-lg" />
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold tracking-tight">HELLO!</h2>
            <p className="text-sm text-white/80">New here? Create your account</p>
          </div>
          <p className="text-xs text-white/60 leading-relaxed">
            Use your<br /><span className="font-semibold text-white/80">@dwc-legazpi.edu</span><br />school email
          </p>
        </div>
        <div className="flex-1 bg-white px-10 py-10 flex flex-col justify-center space-y-5">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">Sign Up</h1>
            <p className="text-sm text-[var(--text-muted)]">Create an account using your DWCL school email</p>
          </div>
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-[var(--brand-100)] bg-[var(--brand-50)] p-3 text-sm text-[var(--brand-600)]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required
                className="w-full pl-10 pr-4 py-3 border-b-2 border-[var(--brand-100)] bg-transparent text-sm focus:outline-none focus:border-[var(--brand-500)] transition-colors placeholder:text-[var(--text-muted)]" />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input type="email" placeholder={`Email (${DWCL_DOMAIN})`} value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full pl-10 pr-4 py-3 border-b-2 border-[var(--brand-100)] bg-transparent text-sm focus:outline-none focus:border-[var(--brand-500)] transition-colors placeholder:text-[var(--text-muted)]" />
            </div>
            <PasswordInput value={password} onChange={setPassword} placeholder="Password (min. 8 characters)" />
            <PasswordInput value={confirm} onChange={setConfirm} placeholder="Confirm Password" />
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white font-semibold text-sm transition-colors disabled:opacity-60">
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--brand-100)]" />
            <span className="text-xs text-[var(--text-muted)]">or</span>
            <div className="flex-1 h-px bg-[var(--brand-100)]" />
          </div>
          <button onClick={() => signIn('google', { callbackUrl: '/' })}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-[var(--brand-100)] bg-white px-5 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--brand-50)] transition-colors shadow-sm">
            {GOOGLE_SVG}
            Sign up with Google
          </button>
          <p className="text-sm text-[var(--text-muted)] text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-[var(--brand-500)] font-semibold hover:underline">Login</Link>
          </p>
        </div>
      </div>
    </main>
  )
}