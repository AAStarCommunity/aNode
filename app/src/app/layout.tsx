import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'aPaymaster Demo',
  description: 'ERC-4337 Paymaster Server Demo Application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  )
}
