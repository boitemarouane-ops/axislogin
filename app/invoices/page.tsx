'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { getInvoices, getClients, deleteInvoice, updateInvoice } from '@/lib/storage'
import { formatMAD, formatDateFR } from '@/lib/finance'
import { MODE_COLORS, MODE_LABELS, type TransportMode, type InvoiceStatus } from '@/lib/types'
import type { Invoice, Client } from '@/lib/types'
import {
  Plus, Search, Trash2, Eye, Pencil, Printer,
  FileText, ChevronDown, CheckCircle2, Clock, AlertCircle, X,
  Calendar, ChevronsUpDown, ArrowUp, ArrowDown, DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const todayStr = new Date().toISOString().split('T')[0]

// ─── Filter tabs definition ─────────────────────────────────────
type FilterMode = TransportMode | ''

const FILTER_TABS: { value: FilterMode; label: string; short: string }[] = [
  { value: '',        label: 'Toutes les factures', short: 'Toutes' },
  { value: 'AIR',     label: 'Aérien',              short: 'Aérien' },
  { value: 'SEA_LCL', label: 'Maritime LCL',        short: 'Mar. LCL' },
  { value: 'SEA_FCL', label: 'Maritime FCL',        short: 'Mar. FCL' },
  { value: 'ROAD_FTL',label: 'Routier FTL',         short: 'Rout. FTL' },
  { value: 'ROAD_LTL',label: 'Routier LTL',         short: 'Rout. LTL' },
]

const STATUS_OPTIONS: { value: InvoiceStatus | ''; label: string }[] = [
  { value: '',           label: 'Tous statuts' },
  { value: 'DRAFT',      label: 'Brouillon' },
  { value: 'ISSUED',     label: 'Émise' },
  { value: 'PAID',       label: 'Payée' },
  { value: 'OVERDUE',    label: 'En retard' },
  { value: 'CANCELLED',  label: 'Annulée' },
]

// ─── Status badge ───────────────────────────────────────────────
function StatusBadge({ status }: { status: InvoiceStatus }) {
  const map: Record<InvoiceStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    DRAFT:     { label: 'Brouillon', cls: 'bg-muted text-muted-foreground border border-border',           icon: <FileText size={10} /> },
    ISSUED:    { label: 'Émise',     cls: 'bg-blue-50 text-blue-700 border border-blue-200',              icon: <Clock size={10} /> },
    PAID:      { label: 'Payée',     cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200',     icon: <CheckCircle2 size={10} /> },
    OVERDUE:   { label: 'En retard', cls: 'bg-red-50 text-red-700 border border-red-200',                 icon: <AlertCircle size={10} /> },
    CANCELLED: { label: 'Annulée',   cls: 'bg-muted text-muted-foreground border border-border line-through', icon: <X size={10} /> },
  }
  const s = map[status]
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium', s.cls)}>
      {s.icon} {s.label}
    </span>
  )
}

// ─── Status dropdown ────────────────────────────────────────────
function StatusDropdown({ status, onChange }: {
  status: InvoiceStatus
  onChange: (s: InvoiceStatus) => void
}) {
  const [open, setOpen] = useState(false)
  const map: Record<InvoiceStatus, string> = {
    DRAFT: 'Brouillon', ISSUED: 'Émise', PAID: 'Payée',
    OVERDUE: 'En retard', CANCELLED: 'Annulée',
  }
  return (
    <div className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="inline-flex items-center gap-1"
      >
        <StatusBadge status={status} />
        <ChevronDown size={10} className="text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg py-1 min-w-32">
            {(Object.entries(map) as [InvoiceStatus, string][]).map(([s, label]) => (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false) }}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors',
                  s === status && 'font-semibold'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main content (uses useSearchParams) ───────────────────────
function InvoicesContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()

  // Active mode tab driven by ?mode= query param
  const urlMode       = (searchParams.get('mode') ?? '') as FilterMode
  const activeTab: FilterMode = FILTER_TABS.some(t => t.value === urlMode) ? urlMode : ''

  const [invoices,     setInvoices]     = useState<Invoice[]>([])
  const [clients,      setClients]      = useState<Client[]>([])
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('')
  const [dateFrom,     setDateFrom]     = useState('')
  const [dateTo,       setDateTo]       = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [sortKey,      setSortKey]      = useState<'date' | 'client' | 'total' | 'due'>('date')
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    setInvoices(getInvoices())
    setClients(getClients())
  }, [])

  // Reset search when tab changes
  useEffect(() => {
    setSearch('')
    setStatusFilter('')
  }, [activeTab])

  const refresh = () => setInvoices(getInvoices())

  const getClientName = (id: string) =>
    clients.find(c => c.id === id)?.companyName ?? 'Client inconnu'

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    const fromD = dateFrom ? new Date(dateFrom) : null
    const toD   = dateTo   ? new Date(dateTo + 'T23:59:59') : null

    return invoices
      .filter(inv => {
        if (activeTab && inv.mode !== activeTab) return false
        if (statusFilter && inv.status !== statusFilter) return false
        const d = new Date(inv.invoiceDate)
        if (fromD && d < fromD) return false
        if (toD   && d > toD)   return false
        if (search) {
          const q = search.toLowerCase()
          if (
            !inv.invoiceNumber.toLowerCase().includes(q) &&
            !getClientName(inv.clientId).toLowerCase().includes(q) &&
            !(inv.clientRef || '').toLowerCase().includes(q)
          ) return false
        }
        return true
      })
      .sort((a, b) => {
        let diff = 0
        if (sortKey === 'date')   diff = new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime()
        if (sortKey === 'client') diff = getClientName(a.clientId).localeCompare(getClientName(b.clientId))
        if (sortKey === 'total')  diff = a.totalTTC - b.totalTTC
        if (sortKey === 'due')    diff = new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime()
        return sortDir === 'asc' ? diff : -diff
      })
  }, [invoices, activeTab, statusFilter, search, dateFrom, dateTo, sortKey, sortDir, clients])

  // KPIs from filtered
  const kpiTotal    = filtered.reduce((s, i) => s + i.totalTTC, 0)
  const kpiPaid     = filtered.filter(i => i.status === 'PAID').reduce((s, i) => s + i.totalTTC, 0)
  const kpiOverdue  = filtered.filter(i => i.status === 'OVERDUE' || (i.status === 'ISSUED' && i.dueDate && new Date(i.dueDate) < new Date())).length
  const kpiPending  = filtered.filter(i => i.status === 'ISSUED').reduce((s, i) => s + i.totalTTC, 0)

  const hasDateFilter = dateFrom || dateTo

  function handleDelete(id: string) {
    if (!confirm('Supprimer cette facture définitivement ?')) return
    deleteInvoice(id)
    refresh()
  }

  function handleStatusChange(id: string, status: InvoiceStatus) {
    updateInvoice(id, { status })
    refresh()
  }

  function handlePrint(inv: Invoice) {
    // Navigate to the detail page with ?print=1 so the live InvoiceDoc
    // (exact same design as on screen) is used for printing
    router.push(`/invoices/${inv.id}?print=1`)
  }

  // Build the href for "Nouvelle facture" — prefills the mode if a tab is active
  const newInvoiceHref = activeTab ? `/invoices/new?mode=${activeTab}` : '/invoices/new'

  // Tab stats
  const countByMode = (mode: FilterMode) =>
    mode ? invoices.filter(i => i.mode === mode).length : invoices.length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 pb-10">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Factures</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {invoices.length} facture{invoices.length !== 1 ? 's' : ''} au total
          </p>
        </div>
        <Link
          href={newInvoiceHref}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Nouvelle facture
          {activeTab && (
            <span className={cn('text-xs px-1.5 py-0.5 rounded font-bold', MODE_COLORS[activeTab as TransportMode].bg, 'text-white ml-1')}>
              {MODE_LABELS[activeTab as TransportMode].split(' ').slice(-1)[0]}
            </span>
          )}
        </Link>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border overflow-x-auto">
        {FILTER_TABS.map(tab => {
          const count = countByMode(tab.value)
          const isActive = activeTab === tab.value
          const modeColor = tab.value ? MODE_COLORS[tab.value as TransportMode] : null
          return (
            <button
              key={tab.value}
              onClick={() => router.push(tab.value ? `/invoices?mode=${tab.value}` : '/invoices')}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0',
                isActive
                  ? 'bg-card shadow-sm text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/60'
              )}
            >
              {modeColor && isActive && (
                <span className={cn('w-2 h-2 rounded-full', modeColor.bg)} />
              )}
              <span>{tab.short}</span>
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full font-mono font-bold',
                isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Mini KPI bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <DollarSign size={13} className="text-primary" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Total TTC</p>
            <p className="text-sm font-bold font-mono">{formatMAD(kpiTotal)}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <CheckCircle2 size={13} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Encaissé</p>
            <p className="text-sm font-bold font-mono text-emerald-600">{formatMAD(kpiPaid)}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <Clock size={13} className="text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">En attente</p>
            <p className="text-sm font-bold font-mono text-amber-600">{formatMAD(kpiPending)}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertCircle size={13} className="text-red-600" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">En retard</p>
            <p className="text-sm font-bold text-red-600">{kpiOverdue} fact.</p>
          </div>
        </div>
      </div>

      {/* ── Search + Status + Date filter bar ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher N° facture, client, réf..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-border rounded-lg text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as InvoiceStatus | '')}
          className="px-3 py-2 border border-border rounded-lg text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Date range picker */}
        <div className="relative">
          <button
            onClick={() => setShowDatePicker(o => !o)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors',
              hasDateFilter ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            <Calendar size={13} />
            {hasDateFilter
              ? `${dateFrom ? formatDateFR(dateFrom) : '...'} → ${dateTo ? formatDateFR(dateTo) : '...'}`
              : 'Plage de dates'
            }
            <ChevronDown size={11} className={cn('transition-transform', showDatePicker && 'rotate-180')} />
          </button>
          {showDatePicker && (
            <div className="absolute top-full left-0 mt-2 z-30 bg-card border border-border rounded-xl shadow-xl p-4 w-64">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Plage de dates</p>
              <div className="space-y-2 mb-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Du</label>
                  <input type="date" value={dateFrom} max={dateTo || todayStr}
                    onChange={e => setDateFrom(e.target.value)}
                    className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Au</label>
                  <input type="date" value={dateTo} min={dateFrom} max={todayStr}
                    onChange={e => setDateTo(e.target.value)}
                    className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowDatePicker(false)}
                  className="flex-1 bg-primary text-primary-foreground rounded-lg py-1.5 text-xs font-semibold hover:bg-primary/90">
                  Appliquer
                </button>
                <button onClick={() => { setDateFrom(''); setDateTo(''); setShowDatePicker(false) }}
                  className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted text-muted-foreground">
                  Effacer
                </button>
              </div>
            </div>
          )}
        </div>

        {(search || statusFilter || hasDateFilter) && (
          <button
            onClick={() => { setSearch(''); setStatusFilter(''); setDateFrom(''); setDateTo('') }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <X size={14} /> Tout effacer
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <FileText size={44} className="mx-auto mb-4 opacity-15" />
            <p className="text-base font-medium">
              {search || statusFilter
                ? 'Aucune facture ne correspond à votre recherche'
                : activeTab
                  ? `Aucune facture ${FILTER_TABS.find(t => t.value === activeTab)?.label ?? ''}`
                  : 'Aucune facture pour le moment'}
            </p>
            <p className="text-sm mt-1">
              <Link href={newInvoiceHref} className="text-primary font-semibold hover:underline">
                Créer une nouvelle facture
              </Link>
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-4 py-3">
                  <SortHeader label="N° Facture" field="date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="text-left px-4 py-3">
                  <SortHeader label="Date" field="date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="text-left px-4 py-3">
                  <SortHeader label="Client" field="client" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-foreground/60 text-xs uppercase tracking-wide">Mode</th>
                <th className="text-left px-4 py-3">
                  <SortHeader label="Échéance" field="due" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="text-right px-4 py-3">
                  <SortHeader label="Total TTC" field="total" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-foreground/60 text-xs uppercase tracking-wide">Statut</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground/60 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(inv => {
                const mc       = MODE_COLORS[inv.mode]
                const isOverdue = inv.status === 'ISSUED' && inv.dueDate && new Date(inv.dueDate) < new Date()
                return (
                  <tr
                    key={inv.id}
                    className="hover:bg-muted/20 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-mono text-xs font-bold text-primary hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {formatDateFR(inv.invoiceDate)}
                    </td>
                    <td className="px-4 py-3 font-medium text-sm max-w-[180px] truncate">
                      {getClientName(inv.clientId)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-bold text-white', mc.bg)}>
                        {MODE_LABELS[inv.mode]}
                      </span>
                    </td>
                    <td className={cn(
                      'px-4 py-3 text-xs',
                      isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'
                    )}>
                      {formatDateFR(inv.dueDate)}
                      {isOverdue && <span className="ml-1 text-destructive">(!)</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold font-mono text-sm">
                      {formatMAD(inv.totalTTC)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusDropdown
                        status={inv.status}
                        onChange={s => handleStatusChange(inv.id, s)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                          title="Voir"
                        >
                          <Eye size={14} />
                        </Link>
                        <Link
                          href={`/invoices/${inv.id}/edit`}
                          className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Modifier"
                        >
                          <Pencil size={14} />
                        </Link>
                        <button
                          onClick={() => handlePrint(inv)}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                          title="Imprimer / PDF"
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {/* Footer totals */}
            <tfoot className="border-t-2 border-border bg-muted/30">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {filtered.length} facture{filtered.length !== 1 ? 's' : ''}
                  {activeTab ? ` — ${FILTER_TABS.find(t => t.value === activeTab)?.label}` : ''}
                </td>
                <td className="px-4 py-3 text-right font-bold text-foreground font-mono">
                  {formatMAD(filtered.reduce((s, i) => s + i.totalTTC, 0))}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── SortHeader ─────────────────────────────────────────────────
function SortHeader({ label, field, sortKey, sortDir, onSort }: {
  label: string
  field: 'date' | 'client' | 'total' | 'due'
  sortKey: string
  sortDir: 'asc' | 'desc'
  onSort: (f: 'date' | 'client' | 'total' | 'due') => void
}) {
  const active = sortKey === field
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 font-semibold text-xs uppercase tracking-wide transition-colors hover:text-foreground text-foreground/60 group"
    >
      {label}
      <span className={cn('transition-opacity', active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40')}>
        {active
          ? sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
          : <ChevronsUpDown size={11} />
        }
      </span>
    </button>
  )
}

// ─── Page export — Suspense required for useSearchParams ────────
export default function InvoicesPage() {
  return (
    <AppLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <InvoicesContent />
      </Suspense>
    </AppLayout>
  )
}
