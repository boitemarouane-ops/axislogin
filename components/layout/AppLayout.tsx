'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type React from 'react'
import AppSidebar from './AppSidebar'
import UserDropdown from './UserDropdown'
import DemoSeed from '@/components/DemoSeed'
import { getCurrentSession } from '@/lib/users'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const session = getCurrentSession()
    if (!session) {
      router.replace('/connexion')
    } else {
      setChecked(true)
    }
  }, [router])

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background" style={{ overflow: 'hidden' }}>
      <DemoSeed />
      <AppSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top header bar */}
        <header className="shrink-0 h-14 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-end px-6 gap-4">
          <UserDropdown />
        </header>
        {/* Main content */}
        <main className="flex-1 overflow-y-auto overflow-x-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
