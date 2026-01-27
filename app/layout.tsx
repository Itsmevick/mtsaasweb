import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { WorkspaceProvider } from '@/contexts/workspace-context'
import { validateEnv } from '@/lib/env'

// Validate environment variables at startup (server-side only)
validateEnv()

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Multi-Tenant SaaS',
  description: 'Production-grade Multi-Tenant SaaS Starter',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </body>
    </html>
  )
}
