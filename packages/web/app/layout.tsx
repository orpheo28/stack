import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Stack - Universal installer for AI-native developers',
  description: 'One command installs any tool. One profile shows how you work.',
}

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
