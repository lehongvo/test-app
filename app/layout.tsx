import { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Web3 Login',
  description: 'Connect your wallet to get started',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
