import type { Metadata } from 'next'
import { Inter, Montserrat } from 'next/font/google'
import './globals.css'
import type React from 'react'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', weight: ['400','500','600','700','800','900'] })

export const metadata: Metadata = {
  title: 'AXIS SHIPPING LINE — Facturation',
  description: 'Système de facturation professionnel pour Freight Forwarder — AXIS SHIPPING LINE Maroc',
  keywords: ['freight forwarder', 'facturation', 'logistique', 'transport international', 'Maroc'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} ${montserrat.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
