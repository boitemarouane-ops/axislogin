'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, Users, Building2,
  ChevronDown, ChevronRight, Menu, X, Settings, LogOut,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { getSettings, type CompanySettings } from '@/lib/settings'

const navigation = [
  { href: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  {
    label: 'Factures',
    icon: FileText,
    children: [
      { href: '/invoices', label: 'Toutes les factures' },
      { href: '/invoices/new', label: 'Nouvelle facture' },
      { href: '/invoices?mode=AIR',      label: 'Aérien',         color: 'text-blue-400' },
      { href: '/invoices?mode=SEA_FCL',  label: 'Maritime FCL',   color: 'text-blue-200' },
      { href: '/invoices?mode=SEA_LCL',  label: 'Maritime LCL',   color: 'text-sky-300' },
      { href: '/invoices?mode=ROAD_FTL', label: 'Routier FTL',    color: 'text-orange-400' },
      { href: '/invoices?mode=ROAD_LTL', label: 'Routier LTL',    color: 'text-amber-300' },
    ],
  },
  { href: '/clients', label: 'Clients',               icon: Users },
  { href: '/agents',  label: 'Agents & Fournisseurs', icon: Building2 },
]

type NavChild = { href: string; label: string; icon?: React.ComponentType<{ size?: number }>; color?: string }
type NavGroup = { label: string; icon: React.ComponentType<{ size?: number }>; children: NavChild[] }
type NavLink  = { href: string; label: string; icon: React.ComponentType<{ size?: number }> }
type NavItem  = NavGroup | NavLink

function isGroup(item: NavItem): item is NavGroup {
  return 'children' in item
}

function NavItemComp({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(true)

  if (isGroup(item)) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          <item.icon size={16} className="shrink-0" />
          <span className="flex-1 text-left font-medium">{item.label}</span>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {open && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-2">
            {item.children.map(child => {
              // Simple exact match only — no startsWith to avoid /invoices matching /invoices/new
              const active = pathname === child.href.split('?')[0] && !child.href.includes('?')
                ? pathname === child.href
                : false
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                    active
                      ? 'bg-sidebar-accent text-sidebar-foreground font-semibold'
                      : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                    child.color ?? ''
                  )}
                >
                  {child.icon && <child.icon size={14} />}
                  {child.label}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
        active
          ? 'bg-sidebar-accent text-sidebar-foreground font-semibold'
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
      )}
    >
      <item.icon size={16} className="shrink-0" />
      <span>{item.label}</span>
    </Link>
  )
}

export default function AppSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [settings, setSettings] = useState<CompanySettings | null>(null)

  useEffect(() => {
    setSettings(getSettings())
    // Refresh if settings change (e.g., user saves settings in another tab)
    const onStorage = () => setSettings(getSettings())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  function handleLogout() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
      // Clear session marker and redirect to login
      localStorage.removeItem('axis_session')
      window.location.href = '/'
    }
  }

  const content = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        {settings?.logoData ? (
          <img
            src={settings.logoData}
            alt="Logo entreprise"
            className="h-9 w-auto object-contain brightness-0 invert opacity-90"
          />
        ) : (
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/api-attachments/HZYD486U5b2ZhhRyRAfUP-dQ53vPlmd73qMWevXO8Hl0ekVZngYX.png"
            alt="Axis Shipping Line"
            className="h-9 w-auto brightness-0 invert opacity-90"
          />
        )}
        <p className="text-sidebar-foreground/40 text-[10px] mt-1 tracking-widest">FACTURATION</p>
      </div>

      {/* Member of */}
      {settings && settings.networkLogos.length > 0 && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <p className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest mb-2">Member of</p>
          <div className="flex flex-wrap gap-2 items-center">
            {settings.networkLogos.map(n => (
              <img
                key={n.id}
                src={n.imageData}
                alt={n.name}
                title={n.name}
                className="h-4 w-auto object-contain brightness-0 invert opacity-60"
              />
            ))}
          </div>
        </div>
      )}
      {(!settings || settings.networkLogos.length === 0) && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <p className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest mb-1.5">Member of</p>
          <div className="flex flex-wrap gap-1">
            {['JC Trans', 'AllForward', 'WCA', 'DF Alliance'].map(n => (
              <span key={n} className="text-[10px] bg-sidebar-accent text-sidebar-foreground/60 px-1.5 py-0.5 rounded">
                {n}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {(navigation as NavItem[]).map((item, i) => (
          <NavItemComp key={i} item={item} />
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-3 border-t border-sidebar-border space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          <Settings size={16} className="shrink-0" />
          <span>Paramètres entreprise</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut size={16} className="shrink-0" />
          <span>Se déconnecter</span>
        </button>
        <p className="text-sidebar-foreground/20 text-[10px] px-3 pt-1">v1.0 — {new Date().getFullYear()}</p>
      </div>
    </div>
  )

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-primary text-white p-2 rounded-md shadow-lg"
        aria-label="Ouvrir menu"
      >
        <Menu size={18} />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transition-transform duration-200 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="absolute top-3 right-3">
          <button onClick={() => setMobileOpen(false)} className="text-sidebar-foreground/50 hover:text-sidebar-foreground">
            <X size={18} />
          </button>
        </div>
        {content}
      </aside>

      <aside className="hidden lg:flex lg:flex-col w-64 bg-sidebar shrink-0 h-screen sticky top-0">
        {content}
      </aside>
    </>
  )
}
