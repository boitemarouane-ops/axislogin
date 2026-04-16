'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import ModeFields from '@/components/invoices/ModeFields'
import {
  getClients, getAgents, getInvoiceById, updateInvoice,
  defaultAirData, defaultSeaFCLData, defaultSeaLCLData,
  defaultRoadFTLData, defaultRoadLTLData, defaultGenericData,
} from '@/lib/storage'
import {
  calcLine, calcInvoiceTotals, addDays, amountToWordsFR,
  formatMAD, formatCurrency,
} from '@/lib/finance'
import {
  MODE_COLORS, MODE_LABELS, INCOTERMS_2020,
  type TransportMode, type Currency, type VatCode,
  type PaymentTerms, type ModeData,
} from '@/lib/types'
import type { Client, Agent, Invoice, InvoiceLine } from '@/lib/types'
import { Save, ArrowLeft, Loader2, AlertCircle, ChevronRight } from 'lucide-react'
import InvoiceLines from '@/components/invoices/InvoiceLines'
import { getSettings } from '@/lib/settings'
import { cn } from '@/lib/utils'

const MODES: TransportMode[] = ['AIR', 'SEA_FCL', 'SEA_LCL', 'ROAD_FTL', 'ROAD_LTL', 'TRANSIT', 'LOGISTICS', 'OTHER']
const VAT_OPTIONS: { value: VatCode; label: string }[] = [{ value: 0, label: '0%' }, { value: 10, label: '10%' }, { value: 20, label: '20%' }]
const CURRENCIES: Currency[] = ['MAD', 'USD', 'EUR']

function getModeDefault(mode: TransportMode): ModeData {
  switch (mode) {
    case 'AIR':      return defaultAirData()
    case 'SEA_FCL':  return defaultSeaFCLData()
    case 'SEA_LCL':  return defaultSeaLCLData()
    case 'ROAD_FTL': return defaultRoadFTLData()
    case 'ROAD_LTL': return defaultRoadLTLData()
    default:         return defaultGenericData()
  }
}

function newLine(): InvoiceLine {
  return {
    id: `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    description: '', currency: 'MAD', unitPrice: 0, quantity: 1,
    totalForeign: 0, exchangeRate: 1, totalMAD_HT: 0, vatCode: 20,
  }
}

function Lbl({ text, required }: { text: string; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-foreground/60 mb-1">
      {text}{required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  )
}

function SectionCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-card border border-border rounded-xl p-5 shadow-sm', className)}>
      <h3 className="text-xs font-bold text-foreground/50 uppercase tracking-widest border-b border-border pb-2 mb-4">{title}</h3>
      {children}
    </div>
  )
}

const inp = 'w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors'

export default function EditInvoicePage() {
  const params  = useParams<{ id: string }>()
  const id      = params?.id ?? ''
  const router  = useRouter()

  const [invoice,      setInvoice]      = useState<Invoice | null>(null)
  const [notFound,     setNotFound]     = useState(false)
  const [clients,      setClients]      = useState<Client[]>([])
  const [agents,       setAgents]       = useState<Agent[]>([])
  const [saving,       setSaving]       = useState(false)
  const [errors,       setErrors]       = useState<Record<string, string>>({})

  const [paymentPresets, setPaymentPresets] = useState<number[]>([30, 60, 90])

  // Form fields — initialized from invoice in useEffect
  const [invoiceDate,  setInvoiceDate]  = useState('')
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>(30)
  const [mode,         setMode]         = useState<TransportMode>('AIR')
  const [clientId,     setClientId]     = useState('')
  const [modeData,     setModeData]     = useState<ModeData>(defaultAirData())
  const [lines,        setLines]        = useState<InvoiceLine[]>([newLine()])
  const [globalRate,   setGlobalRate]   = useState(10)
  const [incoterm,     setIncoterm]     = useState('')
  const [transitTime,  setTransitTime]  = useState('')
  const [freeTime,     setFreeTime]     = useState('')
  const [againstDocs,  setAgainstDocs]  = useState(false)
  const [notes,        setNotes]        = useState('')
  const [status,       setStatus]       = useState<'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'CANCELLED'>('DRAFT')

  useEffect(() => {
    if (!id) return
    const allClients = getClients()
    const allAgents  = getAgents()
    setClients(allClients)
    setAgents(allAgents)
    const s = getSettings()
    if (s.paymentTermPresets?.length) setPaymentPresets(s.paymentTermPresets)

    const inv = getInvoiceById(id)
    if (!inv) { setNotFound(true); return }

    setInvoice(inv)
    setInvoiceDate(inv.invoiceDate)
    setPaymentTerms(inv.paymentTerms)
    setMode(inv.mode)
    setClientId(inv.clientId)
    setModeData(inv.modeData ?? getModeDefault(inv.mode))
    setLines(inv.lines?.length > 0 ? inv.lines : [newLine()])
    setGlobalRate(inv.exchangeRateGlobal || 10)
    setIncoterm(inv.incoterm || '')
    setTransitTime(inv.transitTime || '')
    setFreeTime(inv.freeTime || '')
    setAgainstDocs(inv.againstDocuments || false)
    setNotes(inv.notes || '')
    setStatus(inv.status)
  }, [id])

  function updateLine(idx: number, patch: Partial<InvoiceLine>) {
    setLines(prev => {
      const next = [...prev]
      const merged = { ...next[idx], ...patch }
      if (merged.currency === 'MAD') merged.exchangeRate = 1
      else if (!patch.exchangeRate) merged.exchangeRate = globalRate
      next[idx] = calcLine(merged)
      return next
    })
  }

  function applyGlobalRate(rate: number) {
    setGlobalRate(rate)
    setLines(prev => prev.map(l => l.currency === 'MAD' ? l : calcLine({ ...l, exchangeRate: rate })))
  }

  const totals    = calcInvoiceTotals(lines)
  const dueDate   = addDays(invoiceDate || new Date().toISOString().split('T')[0], paymentTerms)
  const mc        = MODE_COLORS[mode]
  const selClient = clients.find(c => c.id === clientId)

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!clientId) e.clientId = 'Veuillez selectionner un client'
    lines.forEach((l, i) => { if (!l.description.trim()) e[`ln${i}`] = 'Description obligatoire' })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave(newStatus: 'DRAFT' | 'ISSUED') {
    if (saving || !invoice) return
    if (!validate()) { window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    setSaving(true)
    try {
      const updated = updateInvoice(invoice.id, {
        invoiceDate, dueDate, paymentTerms, mode, clientId,
        modeData, lines,
        exchangeRateGlobal: globalRate,
        totalHT_MAD: totals.totalHT_MAD,
        totalVAT:    totals.totalVAT,
        totalTTC:    totals.totalTTC,
        incoterm, transitTime, freeTime,
        againstDocuments: againstDocs,
        notes,
        status: newStatus,
      })
      if (!updated) throw new Error('Facture introuvable')
      router.push(`/invoices/${invoice.id}`)
    } catch (err) {
      setErrors({ _save: `Erreur: ${err instanceof Error ? err.message : String(err)}` })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSaving(false)
    }
  }

  // Not found state
  if (notFound) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <p className="text-lg font-semibold text-foreground">Facture introuvable</p>
          <button onClick={() => router.push('/invoices')}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            Retour aux factures
          </button>
        </div>
      </AppLayout>
    )
  }

  // Loading state — show spinner only while invoice hasn't loaded yet
  if (!invoice) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="animate-spin" size={32} />
            <p className="text-sm">Chargement...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="px-4 py-5 space-y-5 pb-16">

        {/* Error banner */}
        {Object.keys(errors).length > 0 && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl flex items-start gap-3">
            <AlertCircle size={18} className="text-destructive shrink-0 mt-0.5" />
            <ul className="text-xs text-destructive space-y-0.5 list-disc list-inside">
              {Object.values(errors).map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        )}

        {/* Header toolbar */}
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            title="Retour">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground">Modifier la facture</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">N°</span>
              <span className="text-xs font-mono font-bold text-accent">{invoice.invoiceNumber}</span>
              <ChevronRight size={12} className="text-muted-foreground" />
              <span className={cn('text-xs font-bold px-2 py-0.5 rounded', mc.bg, mc.text)}>{MODE_LABELS[mode]}</span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => handleSave('DRAFT')} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Sauvegarder
            </button>
            <button onClick={() => handleSave('ISSUED')} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Emettre
            </button>
          </div>
        </div>

        {/* ROW 1 — Mode + En-tete + Client (3 colonnes) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <SectionCard title="Mode de transport">
            <div className="flex flex-wrap gap-2">
              {MODES.map(m => {
                const c = MODE_COLORS[m]
                return (
                  <button key={m} type="button" onClick={() => { setMode(m); setModeData(getModeDefault(m)) }}
                    className={cn('px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all',
                      mode === m ? cn(c.bg, c.text, c.border, 'shadow-md scale-105') : 'border-border text-foreground bg-background hover:bg-muted'
                    )}>
                    {MODE_LABELS[m]}
                  </button>
                )
              })}
            </div>
          </SectionCard>

          <SectionCard title="En-tete de la facture">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Lbl text="N° Facture" />
                <input readOnly value={invoice.invoiceNumber} className={cn(inp, 'bg-muted/40 font-mono font-bold text-accent cursor-default')} />
              </div>
              <div>
                <Lbl text="Date de facturation" />
                <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className={inp} />
              </div>
              <div>
                <Lbl text="Delai de paiement (jours)" />
                <div className="flex gap-1.5 items-center flex-wrap">
                  {[...paymentPresets].sort((a, b) => a - b).map(t => (
                    <button key={t} type="button" onClick={() => setPaymentTerms(t)}
                      className={cn(
                        'py-1.5 px-2.5 rounded-lg text-xs font-bold border-2 transition-all whitespace-nowrap',
                        paymentTerms === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
                      )}>
                      {t}j
                    </button>
                  ))}
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-20 border border-border rounded-lg px-2 py-1.5 text-xs bg-background font-mono text-center focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="0"
                  />
                  <span className="text-xs text-muted-foreground">jours</span>
                </div>
              </div>
              <div>
                <Lbl text="Echeance (auto)" />
                <input readOnly value={dueDate ? new Date(dueDate + 'T12:00:00').toLocaleDateString('fr-FR') : '—'}
                  className={cn(inp, 'bg-muted/40 text-muted-foreground cursor-default')} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Client *">
            {errors.clientId && (
              <p className="text-destructive text-xs mb-2 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.clientId}
              </p>
            )}
            <select value={clientId} onChange={e => setClientId(e.target.value)}
              className={cn(inp, errors.clientId ? 'border-destructive ring-1 ring-destructive' : '')}>
              <option value="">Selectionner un client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
            {selClient && (
              <div className="mt-2 p-2 bg-muted/30 rounded-lg text-xs space-y-0.5 text-foreground/70">
                {selClient.address1 && <p>{selClient.address1}</p>}
                {selClient.address2 && <p>{selClient.address2}</p>}
                {selClient.city && <p>{selClient.city}{selClient.country ? `, ${selClient.country}` : ''}</p>}
                {selClient.ice && <p className="font-mono">ICE: {selClient.ice}</p>}
              </div>
            )}
          </SectionCard>
        </div>

        {/* ROW 2 — Mode fields + optional Transport & Incoterm side card */}
        {(() => {
          const isGeneric = mode === 'TRANSIT' || mode === 'LOGISTICS' || mode === 'OTHER'
          const sectionTitle = isGeneric ? 'Détails de la prestation' : `Informations — ${MODE_LABELS[mode]}`
          return (
            <div className={cn('grid grid-cols-1 gap-5', !isGeneric && 'lg:grid-cols-3')}>
              <div className={!isGeneric ? 'lg:col-span-2' : ''}>
                <SectionCard title={sectionTitle}>
                  <ModeFields mode={mode} data={modeData} agents={agents} onChange={setModeData} />
                </SectionCard>
              </div>
              {!isGeneric && (
                <div>
                  <SectionCard title="Transport & Incoterm">
                    <div className="space-y-3">
                      <div>
                        <Lbl text="Incoterm" />
                        <select value={incoterm} onChange={e => setIncoterm(e.target.value)} className={inp}>
                          <option value="">— Aucun —</option>
                          {INCOTERMS_2020.map(i => <option key={i} value={i}>{i}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Lbl text="Transit time" />
                          <input type="text" value={transitTime} onChange={e => setTransitTime(e.target.value)} placeholder="21 jours" className={inp} />
                        </div>
                        <div>
                          <Lbl text="Free time" />
                          <input type="text" value={freeTime} onChange={e => setFreeTime(e.target.value)} placeholder="14 jours" className={inp} />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={againstDocs} onChange={e => setAgainstDocs(e.target.checked)} className="rounded border-border" />
                        <span className="text-xs text-foreground/70">Contre documents</span>
                      </label>
                    </div>
                  </SectionCard>
                </div>
              )}
            </div>
          )
        })()}

        {/* ROW 3 — Lines pleine largeur */}
        <InvoiceLines
          lines={lines}
          globalRate={globalRate}
          totals={totals}
          errors={errors}
          onLinesChange={setLines}
          onRateChange={applyGlobalRate}
          newLine={newLine}
        />

        {/* ROW 4 — Notes */}
        <SectionCard title="Notes / Observations">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="Remarques, conditions particulieres..." className={cn(inp, 'resize-none')} />
        </SectionCard>
      </div>
    </AppLayout>
  )
}
