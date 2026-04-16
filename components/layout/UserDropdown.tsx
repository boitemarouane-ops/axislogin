'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { User as UserIcon, Settings, LogOut, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCurrentSession, logout, type User } from '@/lib/users'

export default function UserDropdown() {
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setUser(getCurrentSession())
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  function handleLogout() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
      logout()
      window.location.href = '/connexion'
    }
  }

  if (!user) return null

  const initials = `${user.firstName[0] || ''}${user.lastName[0] || ''}`.toUpperCase()

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl transition-all',
          'hover:bg-muted/50 border border-transparent',
          open && 'bg-muted border-border shadow-sm'
        )}
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          {user.avatar ? (
            <img src={user.avatar} alt={`${user.firstName} ${user.lastName}`} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-primary">{initials}</span>
          )}
        </div>
        {/* Name + role */}
        <div className="hidden md:block text-left">
          <p className="text-sm font-semibold text-foreground leading-tight">{user.firstName} {user.lastName}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{user.role}</p>
        </div>
        <ChevronDown size={13} className={cn('text-muted-foreground transition-transform hidden md:block', open && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* User info header */}
          <div className="p-4 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0">
                {user.avatar ? (
                  <img src={user.avatar} alt={`${user.firstName} ${user.lastName}`} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-primary">{initials}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold uppercase rounded-md tracking-wide">
                  {user.role}
                </span>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-2">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
            >
              <UserIcon size={16} className="text-muted-foreground" />
              <div>
                <p className="font-medium">Mon Profile</p>
                <p className="text-[11px] text-muted-foreground">Gérer vos informations personnelles</p>
              </div>
            </Link>

            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
            >
              <Settings size={16} className="text-muted-foreground" />
              <div>
                <p className="font-medium">Paramètres entreprise</p>
                <p className="text-[11px] text-muted-foreground">Configurer votre entreprise</p>
              </div>
            </Link>

            <div className="border-t border-border my-2" />

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut size={16} />
              <span className="font-medium">Se déconnecter</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
