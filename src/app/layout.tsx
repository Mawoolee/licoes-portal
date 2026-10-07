import { AuthProvider } from '../components/providers/AuthProvider'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 transition-colors">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}