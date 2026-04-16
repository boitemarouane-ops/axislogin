'use client'

import { useState, useEffect, useMemo } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import {
  getInvoices, getClients, getAgents,
  getRevenueSummaryByRange, getRevenueByClientRange,
  getMonthlyTrend, getModeRevenueByRange, getOverdueInvoices,
} from '@/lib/storage'
import { formatMAD, formatDateFR } from '@/lib/finance'
import { MODE_COLORS, MODE_LABELS, type TransportMode } from '@/lib/types'
import type { Invoice, Client } from '@/lib/types'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts'
import {
  TrendingUp, FileText, Users, Building2, Plus,
  ArrowUpRight, Clock, CheckCircle2, AlertCircle, DollarSign,
  Calendar, ChevronDown, ArrowRight, Percent, ReceiptText,
  Activity, BadgeDollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Preset periods ──────────────────────────────────────────────
const PRESETS = [
  { label: '1 mois',  months: 1  },
  { label: '3 mois',  months: 3  },
  { label: '6 mois',  months: 6  },
  { label: '1 an',    months: 12 },
]

const MODE_CHART_COLORS: Record<TransportMode, string> = {
  AIR:       '#3b82f6',
  SEA_FCL:   '#1e40af',
  SEA_LCL:   '#60a5fa',
  ROAD_FTL:  '#f97316',
  ROAD_LTL:  '#eab308',
  TRANSIT:   '#8b5cf6',
  LOGISTICS: '#10b981',
  OTHER:     '#6b7280',
}

// ─── Helper: get date range from months offset ───────────────────
function rangeFromMonths(months: number): { from: string; to: string } {
  const to   = new Date()
  const from = new Date(to.getFullYear(), to.getMonth() - months + 1, 1)
  return {
    from: from.toISOString().split('T')[0],
    to:   to.toISOString().split('T')[0],
  }
}

// ─── Today string ────────────────────────────────────────────────
const todayStr = new Date().toISOString().split('T')[0]

// ─── Main component ──────────────────────────────────────────────
export default function DashboardPage() {
  const [invoices,     setInvoices]     = useState<Invoice[]>([])
  const [clients,      setClients]      = useState<Client[]>([])
  const [clientCount,  setClientCount]  = useState(0)
  const [agentCount,   setAgentCount]   = useState(0)

  // Period state: preset OR custom
  const [activePreset, setActivePreset] = useState<number | null>(3)
  const [customFrom,   setCustomFrom]   = useState('')
  const [customTo,     setCustomTo]     = useState(todayStr)
  const [showCustom,   setShowCustom]   = useState(false)
  const [trendMonths,  setTrendMonths]  = useState(6)

  useEffect(() => {
    const invs = getInvoices()
    const cls  = getClients()
    setInvoices(invs)
    setClients(cls)
    setClientCount(cls.length)
    setAgentCount(getAgents().length)
  }, [])

  // Compute effective date range
  const { from, to } = useMemo(() => {
    if (activePreset !== null) return rangeFromMonths(activePreset)
    if (customFrom && customTo)  return { from: customFrom, to: customTo }
    return rangeFromMonths(3)
  }, [activePreset, customFrom, customTo])

  // All derived data
  const summary      = useMemo(() => getRevenueSummaryByRange(from, to),     [from, to, invoices])
  const topClients   = useMemo(() => getRevenueByClientRange(from, to).slice(0, 7), [from, to, invoices])
  const modeRevenue  = useMemo(() => getModeRevenueByRange(from, to),        [from, to, invoices])
  const overdueList  = useMemo(() => getOverdueInvoices().slice(0, 5),       [invoices])
  const trend        = useMemo(() => getMonthlyTrend(trendMonths),           [trendMonths, invoices])

  // Recent invoices
  const recent = useMemo(() =>
    [...invoices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6),
    [invoices]
  )

  const getClientName = (id: string) => clients.find(c => c.id === id)?.companyName || 'Inconnu'

  // Handle preset click
  function selectPreset(months: number) {
    setActivePreset(months)
    setShowCustom(false)
    setCustomFrom('')
  }

  // Handle custom range
  function applyCustom() {
    if (customFrom && customTo) {
      setActivePreset(null)
      setShowCustom(false)
    }
  }

  // Period label for display
  const periodLabel = activePreset !== null
    ? PRESETS.find(p => p.months === activePreset)?.label || ''
    : customFrom && customTo
      ? `${formatDateFR(customFrom)} → ${formatDateFR(customTo)}`
      : ''

  return (
    <AppLayout>
      <div className="px-6 py-5 space-y-6 pb-12">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Tableau de bord</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Vue d&apos;ensemble — AXIS SHIPPING LINE</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/invoices/new"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus size={15} /> Nouvelle facture
            </Link>
          </div>
        </div>

        {/* ── Period selector ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Période :</span>
          {PRESETS.map(p => (
            <button
              key={p.months}
              onClick={() => selectPreset(p.months)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                activePreset === p.months
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'border-border text-foreground hover:bg-muted'
              )}
            >
              {p.label}
            </button>
          ))}

          {/* Custom range toggle */}
          <div className="relative">
            <button
              onClick={() => setShowCustom(o => !o)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                activePreset === null && customFrom
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-foreground hover:bg-muted'
              )}
            >
              <Calendar size={12} />
              {activePreset === null && customFrom ? periodLabel : 'Plage personnalisée'}
              <ChevronDown size={11} className={cn('transition-transform', showCustom && 'rotate-180')} />
            </button>

            {showCustom && (
              <div className="absolute top-full left-0 mt-2 z-30 bg-card border border-border rounded-xl shadow-xl p-4 w-72">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Plage de dates</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Du</label>
                    <input
                      type="date"
                      value={customFrom}
                      max={customTo || todayStr}
                      onChange={e => setCustomFrom(e.target.value)}
                      className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Au</label>
                    <input
                      type="date"
                      value={customTo}
                      min={customFrom}
                      max={todayStr}
                      onChange={e => setCustomTo(e.target.value)}
                      className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <button
                  onClick={applyCustom}
                  disabled={!customFrom || !customTo}
                  className="w-full bg-primary text-primary-foreground rounded-lg py-2 text-xs font-semibold disabled:opacity-40 hover:bg-primary/90 transition-colors"
                >
                  Appliquer
                </button>
              </div>
            )}
          </div>

          {periodLabel && (
            <span className="text-xs text-muted-foreground border border-border rounded-md px-2 py-1">
              {periodLabel}
            </span>
          )}
        </div>

        {/* ── KPI Row 1 ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Chiffre d'affaires TTC"
            value={formatMAD(summary.totalTTC)}
            sub={`${summary.count} facture${summary.count !== 1 ? 's' : ''}`}
            icon={<BadgeDollarSign size={17} />}
            accent="text-primary"
            bg="bg-primary/10"
          />
          <KpiCard
            label="Total HT MAD"
            value={formatMAD(summary.totalHT)}
            sub={`TVA : ${formatMAD(summary.totalVAT)}`}
            icon={<ReceiptText size={17} />}
            accent="text-blue-600"
            bg="bg-blue-50 dark:bg-blue-950/30"
          />
          <KpiCard
            label="Taux de recouvrement"
            value={`${summary.recoveryRate.toFixed(1)} %`}
            sub={`${formatMAD(summary.totalPaidTTC)} encaissé`}
            icon={<Percent size={17} />}
            accent="text-emerald-600"
            bg="bg-emerald-50 dark:bg-emerald-950/30"
          />
          <KpiCard
            label="Facture moyenne"
            value={formatMAD(summary.avgInvoice)}
            sub={`sur ${summary.count} factures`}
            icon={<Activity size={17} />}
            accent="text-orange-500"
            bg="bg-orange-50 dark:bg-orange-950/30"
          />
        </div>

        {/* ── KPI Row 2 ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatusKpi label="Payées"     value={summary.paid}    color="text-emerald-600" bg="bg-emerald-600" icon={<CheckCircle2 size={14}/>} />
          <StatusKpi label="Emises"     value={summary.pending} color="text-blue-600"    bg="bg-blue-500"    icon={<Clock size={14}/>} />
          <StatusKpi label="En retard"  value={summary.overdue} color="text-red-600"     bg="bg-red-500"     icon={<AlertCircle size={14}/>} />
          <StatusKpi label="Brouillons" value={summary.draft}   color="text-amber-600"   bg="bg-amber-500"   icon={<FileText size={14}/>} />
          <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 col-span-2 lg:col-span-1">
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Clients</span>
                <Link href="/clients" className="text-accent hover:text-accent/80"><ArrowUpRight size={13}/></Link>
              </div>
              <p className="text-2xl font-bold">{clientCount}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Agents</span>
                <span className="text-sm font-bold">{agentCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Charts Row ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Trend chart — takes 2 cols */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Evolution du chiffre d&apos;affaires</h2>
                <p className="text-xs text-muted-foreground mt-0.5">CA TTC mensuel en MAD</p>
              </div>
              <div className="flex gap-1.5">
                {[3, 6, 12].map(m => (
                  <button
                    key={m}
                    onClick={() => setTrendMonths(m)}
                    className={cn(
                      'px-2 py-1 text-xs rounded font-medium border transition-all',
                      trendMonths === m ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
                    )}
                  >
                    {m}M
                  </button>
                ))}
              </div>
            </div>
            {trend.some(m => m.totalTTC > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trend} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTTC" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--color-primary)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    formatter={(v: number) => [formatMAD(v), 'CA TTC']}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-card)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalTTC"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fill="url(#colorTTC)"
                    dot={{ r: 3, fill: 'var(--color-primary)' }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>

          {/* Mode breakdown pie */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-1">Répartition par mode</h2>
            <p className="text-xs text-muted-foreground mb-4">{periodLabel}</p>
            {modeRevenue.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={modeRevenue}
                      dataKey="totalTTC"
                      nameKey="mode"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {modeRevenue.map(entry => (
                        <Cell key={entry.mode} fill={MODE_CHART_COLORS[entry.mode as TransportMode] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => formatMAD(v)}
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-card)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {modeRevenue.slice(0, 4).map(entry => {
                    const total = modeRevenue.reduce((s, e) => s + e.totalTTC, 0)
                    const pct   = total > 0 ? (entry.totalTTC / total * 100).toFixed(0) : '0'
                    return (
                      <div key={entry.mode} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: MODE_CHART_COLORS[entry.mode as TransportMode] || '#6b7280' }} />
                        <span className="text-xs text-foreground/70 truncate flex-1">{MODE_LABELS[entry.mode as TransportMode]}</span>
                        <span className="text-xs font-bold text-foreground">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : <EmptyChart height={200} />}
          </div>
        </div>

        {/* ── Bottom Row ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Top clients */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Top clients</h2>
                <p className="text-xs text-muted-foreground">{periodLabel}</p>
              </div>
              <Link href="/clients" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Tous <ArrowRight size={11}/>
              </Link>
            </div>
            {topClients.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Aucune donnée</p>
            ) : (
              <div className="space-y-3">
                {topClients.map((entry, i) => {
                  const max = topClients[0].totalTTC
                  const pct = max > 0 ? (entry.totalTTC / max) * 100 : 0
                  return (
                    <div key={entry.clientId}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono text-muted-foreground w-4 text-right shrink-0">#{i+1}</span>
                          <span className="text-xs font-medium truncate">{entry.clientName}</span>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-xs font-bold text-foreground">{formatMAD(entry.totalTTC)}</p>
                          <p className="text-[10px] text-muted-foreground">{entry.invoiceCount} fct</p>
                        </div>
                      </div>
                      <div className="h-1 bg-muted rounded-full">
                        <div className="h-1 bg-primary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Overdue alerts */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Factures en retard
                  {overdueList.length > 0 && (
                    <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold leading-none">
                      {overdueList.length}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-muted-foreground">A encaisser en urgence</p>
              </div>
              <Link href="/invoices?status=OVERDUE" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Toutes <ArrowRight size={11}/>
              </Link>
            </div>
            {overdueList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <CheckCircle2 size={28} className="text-emerald-500 opacity-60" />
                <p className="text-xs text-muted-foreground">Aucune facture en retard</p>
              </div>
            ) : (
              <div className="space-y-2">
                {overdueList.map(inv => (
                  <Link key={inv.id} href={`/invoices/${inv.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-200 transition-colors group"
                  >
                    <div className="shrink-0">
                      <AlertCircle size={14} className="text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono font-semibold">{inv.invoiceNumber}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{inv.clientName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-foreground">{formatMAD(inv.totalTTC)}</p>
                      <p className="text-[10px] text-red-500 font-semibold">+{inv.daysOverdue}j</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent invoices */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Factures récentes</h2>
              <Link href="/invoices" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Toutes <ArrowRight size={11}/>
              </Link>
            </div>
            {recent.length === 0 ? (
              <div className="text-center py-8">
                <FileText size={28} className="text-muted-foreground mx-auto mb-2 opacity-30" />
                <p className="text-xs text-muted-foreground">Aucune facture</p>
                <Link href="/invoices/new" className="text-xs text-primary hover:underline mt-1 inline-block">
                  Créer la première
                </Link>
              </div>
            ) : (
              <div className="space-y-1.5">
                {recent.map(inv => {
                  const mc = MODE_COLORS[inv.mode]
                  return (
                    <Link key={inv.id} href={`/invoices/${inv.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors"
                    >
                      <div className={cn('w-1.5 h-7 rounded-full shrink-0', mc.bg)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono font-semibold leading-none">{inv.invoiceNumber}</p>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{getClientName(inv.clientId)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold">{formatMAD(inv.totalTTC)}</p>
                        <StatusDot status={inv.status} />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Mode Quick Launch ───────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-3">Nouvelle facture par mode</h2>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {(Object.entries(MODE_COLORS) as [TransportMode, typeof MODE_COLORS[TransportMode]][]).map(([mode, colors]) => (
              <Link
                key={mode}
                href={`/invoices/new?mode=${mode}`}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition-all hover:scale-105 hover:shadow-md',
                  'border-border hover:border-transparent group',
                  'hover:' + colors.bg
                )}
              >
                <span className={cn('text-[10px] font-bold leading-tight group-hover:text-white', 'text-foreground')}>
                  {MODE_LABELS[mode]}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Mode Revenue Bar ────────────────────────────────────── */}
        {modeRevenue.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              CA par mode de transport
              <span className="text-muted-foreground font-normal text-xs ml-2">— {periodLabel}</span>
            </h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={modeRevenue} layout="vertical" margin={{ top: 0, right: 60, left: 100, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="mode" tick={{ fontSize: 10 }}
                  tickFormatter={m => MODE_LABELS[m as TransportMode] || m}
                  width={100} axisLine={false} tickLine={false}
                />
                <Tooltip
                  formatter={(v: number) => [formatMAD(v), 'CA TTC']}
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-card)' }}
                />
                <Bar dataKey="totalTTC" radius={[0, 4, 4, 0]}>
                  {modeRevenue.map(entry => (
                    <Cell key={entry.mode} fill={MODE_CHART_COLORS[entry.mode as TransportMode] || '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>
    </AppLayout>
  )
}

// ─── Sub-components ──────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, accent, bg }: {
  label: string; value: string; sub: string
  icon: React.ReactNode; accent: string; bg: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground leading-tight max-w-[120px]">{label}</p>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', bg, accent)}>
          {icon}
        </div>
      </div>
      <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
    </div>
  )
}

function StatusKpi({ label, value, color, bg, icon }: {
  label: string; value: number; color: string; bg: string; icon: React.ReactNode
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0', bg)}>
        {icon}
      </div>
      <div>
        <p className={cn('text-xl font-bold leading-none', color)}>{value}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: Invoice['status'] }) {
  const map: Record<Invoice['status'], { label: string; cls: string }> = {
    DRAFT:     { label: 'Brouillon', cls: 'text-muted-foreground' },
    ISSUED:    { label: 'Emise',     cls: 'text-blue-500' },
    PAID:      { label: 'Payee',     cls: 'text-emerald-600' },
    OVERDUE:   { label: 'Retard',    cls: 'text-red-500' },
    CANCELLED: { label: 'Annulee',   cls: 'text-muted-foreground line-through' },
  }
  const s = map[status]
  return <span className={cn('text-[10px] font-medium', s.cls)}>{s.label}</span>
}

function EmptyChart({ height = 200 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center text-muted-foreground text-xs" style={{ height }}>
      Aucune donnée sur la période sélectionnée
    </div>
  )
}
