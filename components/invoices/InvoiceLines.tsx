'use client'

import { Plus, Trash2, RefreshCw, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMAD, formatCurrency, amountToWordsFR, calcLine } from '@/lib/finance'
import type { InvoiceLine, Currency, VatCode } from '@/lib/types'

const VAT_OPTIONS: { value: VatCode; label: string }[] = [
  { value: 0,  label: '0%' },
  { value: 10, label: '10%' },
  { value: 20, label: '20%' },
]
const CURRENCIES: Currency[] = ['MAD', 'USD', 'EUR']

interface Totals {
  totalHT_MAD: number
  totalVAT: number
  totalTTC: number
  vatBreakdown: Record<string, number>
}

interface Props {
  lines: InvoiceLine[]
  globalRate: number
  totals: Totals
  errors: Record<string, string>
  onLinesChange: (lines: InvoiceLine[]) => void
  onRateChange: (rate: number) => void
  newLine: () => InvoiceLine
}

// Shared input/cell styles
const cellBase = 'h-full flex items-center border-r border-border/30 last:border-r-0'
const inputBase = [
  'w-full h-full bg-transparent text-xs font-mono',
  'px-2.5 py-0 focus:outline-none focus:bg-primary/5',
  'placeholder:text-foreground/20 transition-colors',
  'border-0 ring-0',
].join(' ')

/*
  Grid column layout — pure percentages, adapts to any container width.
  No horizontal scroll at any zoom level >= 80%.
  Without forex:  # | Description | Dev | P.U. | Qte | HT MAD | TVA | ×
  With forex:     # | Description | Dev | P.U. | Qte | Taux | Total Dev | HT MAD | TVA | ×
*/
function getGridCols(hasForex: boolean) {
  return hasForex
    ? '28px 1fr 62px 9% 52px 8% 11% 12% 56px 32px'
    : '28px 1fr 62px 10% 52px 13% 56px 32px'
}

export default function InvoiceLines({
  lines, globalRate, totals, errors, onLinesChange, onRateChange, newLine,
}: Props) {

  function updateLine(idx: number, patch: Partial<InvoiceLine>) {
    onLinesChange(lines.map((l, i) => {
      if (i !== idx) return l
      const merged = { ...l, ...patch }
      // If currency switches to MAD, force rate = 1
      if (merged.currency === 'MAD') merged.exchangeRate = 1
      // If forex line and rate not explicitly changed, use globalRate
      else if (patch.exchangeRate === undefined) merged.exchangeRate = merged.exchangeRate || globalRate
      // Always recalculate computed fields
      return calcLine(merged)
    }))
  }

  function removeLine(idx: number) {
    if (lines.length <= 1) return
    onLinesChange(lines.filter((_, i) => i !== idx))
  }

  const hasForex = lines.some(l => l.currency !== 'MAD')
  const grid = getGridCols(hasForex)

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">

      {/* ══ HEADER BAR ══ */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-muted/40 border-b border-border">

        {/* Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-5 rounded-full bg-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-foreground/70">
            Lignes de facturation
          </span>
          <span className="ml-1 text-[10px] font-semibold text-foreground/30 bg-muted rounded-full px-2 py-0.5">
            {lines.length} ligne{lines.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Taux de change */}
        <div className="flex items-center gap-2">
          <RefreshCw size={11} className="text-foreground/30" />
          <span className="text-[10px] text-foreground/40 font-medium">1 USD / EUR</span>
          <span className="text-[10px] text-foreground/25">=</span>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 focus-within:border-primary/50 transition-colors">
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={globalRate}
              onChange={e => onRateChange(parseFloat(e.target.value) || 1)}
              className="w-14 bg-transparent text-sm font-mono font-bold text-right focus:outline-none text-foreground"
            />
            <span className="text-[10px] font-bold text-foreground/40 ml-0.5">MAD</span>
          </div>
        </div>

        {/* Live totals */}
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex flex-col items-end">
            <span className="text-foreground/35 uppercase tracking-wide leading-none mb-0.5">HT</span>
            <span className="font-mono font-semibold text-foreground/70">{formatMAD(totals.totalHT_MAD)}</span>
          </div>
          <div className="w-px h-6 bg-border" />
          <div className="flex flex-col items-end">
            <span className="text-foreground/35 uppercase tracking-wide leading-none mb-0.5">TVA</span>
            <span className="font-mono text-foreground/70">{formatMAD(totals.totalVAT)}</span>
          </div>
          <div className="w-px h-6 bg-border" />
          <div className="flex flex-col items-end rounded-xl bg-primary/8 border border-primary/15 px-3 py-1.5">
            <span className="text-primary/60 uppercase tracking-wide leading-none mb-0.5">Net TTC</span>
            <span className="font-mono font-bold text-primary text-sm leading-none">{formatMAD(totals.totalTTC)}</span>
          </div>
        </div>
      </div>

      {/* ══ COLUMN HEADERS ══ */}
      <div
        className="grid text-[9px] font-bold uppercase tracking-widest text-foreground/30 bg-muted/25 border-b border-border select-none"
        style={{ gridTemplateColumns: grid }}
      >
        <div className="px-2 py-2 text-center">#</div>
        <div className="px-3 py-2">Designation</div>
        <div className="px-2 py-2 text-center">Dev.</div>
        <div className="px-2 py-2 text-right">P.U.</div>
        <div className="px-2 py-2 text-center">Qte</div>
        {hasForex && <div className="px-2 py-2 text-right">Taux</div>}
        {hasForex && <div className="px-2 py-2 text-right">Total Dev.</div>}
        <div className="px-2 py-2 text-right">HT MAD</div>
        <div className="px-2 py-2 text-center">TVA</div>
        <div />
      </div>

      {/* ══ LINES ══ */}
      <div className="divide-y divide-border/40">
        {lines.map((line, idx) => {
          const isMad = line.currency === 'MAD'
          const hasErr = !!errors[`ln${idx}`]

          return (
            <div
              key={line.id}
              className={cn(
                'grid group transition-colors duration-100',
                idx % 2 === 0 ? 'bg-background' : 'bg-muted/10',
                'hover:bg-primary/[0.03]',
                hasErr && 'bg-destructive/5'
              )}
              style={{ gridTemplateColumns: grid, minHeight: '42px' }}
            >
              {/* # */}
              <div className={cn(cellBase, 'justify-center')}>
                <span className="text-[10px] font-bold text-foreground/20 select-none">{idx + 1}</span>
              </div>

              {/* Description */}
              <div className={cn(cellBase, 'relative')}>
                <input
                  type="text"
                  placeholder="Description de la prestation..."
                  value={line.description}
                  onChange={e => updateLine(idx, { description: e.target.value })}
                  className={cn(inputBase, 'text-left', hasErr && 'text-destructive placeholder:text-destructive/30')}
                />
                {hasErr && (
                  <div className="absolute bottom-0.5 left-2.5 text-[9px] text-destructive font-semibold">
                    {errors[`ln${idx}`]}
                  </div>
                )}
              </div>

              {/* Devise */}
              <div className={cn(cellBase, 'relative justify-center')}>
                <select
                  value={line.currency}
                  onChange={e => updateLine(idx, { currency: e.target.value as Currency })}
                  className={cn(
                    'absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10',
                  )}
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className={cn(
                  'flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold pointer-events-none',
                  line.currency === 'MAD' ? 'bg-foreground/8 text-foreground/50' :
                  line.currency === 'EUR' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                  'bg-green-500/10 text-green-600 dark:text-green-400'
                )}>
                  {line.currency}
                  <ChevronDown size={9} className="opacity-50" />
                </div>
              </div>

              {/* P.U. */}
              <div className={cellBase}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.unitPrice || ''}
                  placeholder="0.00"
                  onChange={e => updateLine(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                  className={cn(inputBase, 'text-right')}
                />
              </div>

              {/* Qte */}
              <div className={cellBase}>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={line.quantity}
                  onChange={e => updateLine(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  className={cn(inputBase, 'text-center')}
                />
              </div>

              {/* Taux — only when forex */}
              {hasForex && (
                <div className={cellBase}>
                  {isMad ? (
                    <div className={cn(inputBase, 'text-right text-foreground/20 pointer-events-none')}>1</div>
                  ) : (
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      value={line.exchangeRate && line.exchangeRate > 0 ? line.exchangeRate : globalRate}
                      onChange={e => updateLine(idx, { exchangeRate: parseFloat(e.target.value) || globalRate })}
                      className={cn(inputBase, 'text-right text-amber-600 dark:text-amber-400 font-semibold')}
                    />
                  )}
                </div>
              )}

              {/* Total Devise — only when forex */}
              {hasForex && (
                <div className={cn(cellBase, 'px-2.5')}>
                  <span className={cn(
                    'w-full text-right text-xs font-mono',
                    isMad ? 'text-foreground/15' : 'text-foreground/50'
                  )}>
                    {isMad ? '—' : formatCurrency(line.totalForeign, line.currency)}
                  </span>
                </div>
              )}

              {/* HT MAD */}
              <div className={cn(cellBase, 'px-2.5')}>
                <span className="w-full text-right text-xs font-mono font-semibold text-foreground">
                  {formatMAD(line.totalMAD_HT)}
                </span>
              </div>

              {/* TVA */}
              <div className={cn(cellBase, 'relative justify-center')}>
                <select
                  value={line.vatCode}
                  onChange={e => updateLine(idx, { vatCode: parseInt(e.target.value) as VatCode })}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                >
                  {VAT_OPTIONS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
                <div className={cn(
                  'flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold pointer-events-none',
                  line.vatCode === 0 ? 'bg-foreground/8 text-foreground/40' : 'bg-primary/8 text-primary/70'
                )}>
                  {line.vatCode}%
                  <ChevronDown size={9} className="opacity-50" />
                </div>
              </div>

              {/* Delete */}
              <div className={cn(cellBase, 'last:border-r-0 justify-center')}>
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  disabled={lines.length <= 1}
                  className="opacity-0 group-hover:opacity-100 disabled:!opacity-0 p-1 rounded text-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ══ ADD LINE ══ */}
      <button
        type="button"
        onClick={() => onLinesChange([...lines, newLine()])}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-foreground/35 hover:text-primary hover:bg-primary/5 border-t border-border/50 transition-colors"
      >
        <div className="w-5 h-5 rounded-md border-2 border-dashed border-foreground/20 group-hover:border-primary/40 flex items-center justify-center transition-colors">
          <Plus size={10} />
        </div>
        Ajouter une ligne
      </button>

      {/* ══ TOTALS ══ */}
      <div className="border-t-2 border-border bg-muted/20 px-5 py-4">
        <div className="flex items-start justify-between gap-6">

          {/* Left: amount in words */}
          <div className="flex-1 max-w-sm">
            <p className="text-[9px] font-bold uppercase tracking-widest text-foreground/30 mb-1.5">Net a payer</p>
            <p className="text-sm font-semibold text-foreground/60 capitalize leading-relaxed">
              {amountToWordsFR(totals.totalTTC)}
            </p>
          </div>

          {/* Right: totals table */}
          <div className="w-72 space-y-0">
            {/* HT */}
            <div className="flex justify-between items-center py-1.5 border-b border-border/40">
              <span className="text-xs text-foreground/45">Total HT MAD</span>
              <span className="font-mono text-xs font-semibold text-foreground/70">{formatMAD(totals.totalHT_MAD)}</span>
            </div>

            {/* VAT breakdown */}
            {(Object.entries(totals.vatBreakdown) as [string, number][])
              .filter(([, v]) => v > 0)
              .map(([code, amt]) => (
                <div key={code} className="flex justify-between items-center py-1 border-b border-border/40">
                  <span className="text-xs text-foreground/40">T.V.A {code}%</span>
                  <span className="font-mono text-xs text-foreground/55">{formatMAD(amt)}</span>
                </div>
              ))}

            {totals.totalVAT > 0 && (
              <div className="flex justify-between items-center py-1.5 border-b border-border/40">
                <span className="text-xs text-foreground/45">Total T.V.A</span>
                <span className="font-mono text-xs text-foreground/60">{formatMAD(totals.totalVAT)}</span>
              </div>
            )}

            {/* TTC — highlighted */}
            <div className="flex justify-between items-center pt-2.5 mt-1">
              <span className="text-sm font-bold text-foreground">Total T.T.C</span>
              <span className="font-mono font-bold text-xl text-primary">{formatMAD(totals.totalTTC)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
