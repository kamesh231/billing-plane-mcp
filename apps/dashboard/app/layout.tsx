import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import { Nav } from '@/components/Nav'

export const metadata: Metadata = {
  title: 'BillingPlane',
  description: 'MCP distribution for Lovable – subscription billing',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <div className="container">
            <Nav />
            {children}
          </div>
        </body>
      </html>
    </ClerkProvider>
  )
}
