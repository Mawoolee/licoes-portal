import { AuthProvider } from '../components/providers/AuthProvider'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--bg-cream)] text-[var(--text-primary)] transition-colors">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}