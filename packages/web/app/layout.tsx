import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/react'
import { cn } from '@/lib/utils'
import './globals.css'

export const metadata: Metadata = {
  title: 'getstack.com — Universal installer for AI-native devs',
  description:
    'One command installs any tool. One profile shows how you work. npm for AI-native dev workflows.',
  metadataBase: new URL('https://getstack.com'),
  openGraph: {
    title: 'getstack.com — Universal installer for AI-native devs',
    description:
      "Install any MCP server, CLI, or SDK in one command. Copy any developer's setup instantly.",
    siteName: 'getstack.com',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'getstack.com — Universal installer for AI-native devs',
    description:
      "Install any MCP server, CLI, or SDK in one command. Copy any developer's setup instantly.",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="en" className={cn(GeistSans.variable, GeistMono.variable)}>
      <body className="min-h-screen font-sans">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
