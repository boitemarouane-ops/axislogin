'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import InvoiceDoc, { OR, NAV } from '@/components/invoices/InvoiceDoc'
import { getInvoiceById, getClientById, getAgentById, updateInvoice } from '@/lib/storage'
import { getSettings, DEFAULT_SETTINGS, type CompanySettings } from '@/lib/settings'

import { type InvoiceStatus } from '@/lib/types'
import type { Invoice, Client, Agent } from '@/lib/types'
import { ArrowLeft, CheckCircle2, Pencil, FileDown, Printer } from 'lucide-react'

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'BROUILLON', ISSUED: 'ÉMISE', PAID: 'PAYÉE',
  OVERDUE: 'EN RETARD', CANCELLED: 'ANNULÉE',
}
const STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: '#6b7280', ISSUED: '#2563eb', PAID: '#059669',
  OVERDUE: '#dc2626', CANCELLED: '#6b7280',
}

export default function Page() {
  return <Suspense><InvoiceDetailPage /></Suspense>
}

function InvoiceDetailPage() {
  const params        = useParams<{ id: string }>()
  const id            = params?.id ?? ''
  const router        = useRouter()
  const searchParams  = useSearchParams()

  const [invoice,     setInvoice]     = useState<Invoice | null>(null)
  const [client,      setClient]      = useState<Client  | null>(null)
  const [agent,       setAgent]       = useState<Agent   | null>(null)
  const [settings,    setSettings]    = useState<CompanySettings>(DEFAULT_SETTINGS)
  const [loaded,      setLoaded]      = useState(false)
  const [marking,     setMarking]     = useState(false)
  const [pdfLoading,  setPdfLoading]  = useState(false)
  const [printLoading,setPrintLoading]= useState(false)

  useEffect(() => {
    const inv = getInvoiceById(id)
    if (!inv) { router.push('/invoices'); return }
    setInvoice(inv)
    setClient(getClientById(inv.clientId) ?? null)
    const md = inv.modeData as Record<string, string>
    if (md?.agentId) setAgent(getAgentById(md.agentId) ?? null)
    setSettings(getSettings())
    setLoaded(true)

    function onSettings() { setSettings(getSettings()) }
    window.addEventListener('storage', onSettings)
    window.addEventListener('axis:settings-saved', onSettings)
    return () => {
      window.removeEventListener('storage', onSettings)
      window.removeEventListener('axis:settings-saved', onSettings)
    }
  }, [id, router])

  // Auto-trigger print when navigated here with ?print=1
  useEffect(() => {
    if (!loaded) return
    if (searchParams?.get('print') === '1') {
      // Small delay to ensure InvoiceDoc is fully rendered
      setTimeout(() => openPrintIframe(false), 800)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded])

  // Build hydrated invoice (inject agent name into modeData)
  const buildHydrated = useCallback(() => {
    if (!invoice) return null
    const md: Record<string, string> = { ...(invoice.modeData as Record<string, string>) }
    if (agent) md.agentName = agent.companyName
    return { ...invoice, modeData: md }
  }, [invoice, agent])

  // Print by capturing the live rendered InvoiceDoc from the DOM.
  // This guarantees 100% identical output — no separate HTML generator needed.
  function openPrintIframe(forDownload: boolean) {
    const el = document.getElementById('invoice-doc')
    if (!el) return

    // Clone the rendered node so we can tweak it for print without affecting the screen
    const clone = el.cloneNode(true) as HTMLElement
    clone.style.boxShadow = 'none'
    clone.style.margin    = '0'
    clone.style.width     = '100%'
    // Minimal reduction vs screen padding — equivalent of 1% scale
    clone.style.padding   = '8px 44px 13px'

    const printHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 210mm; background: #fff; }
    @media print {
      html, body { width: 210mm; }
      @page { size: A4 portrait; margin: 0; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    }
  </style>
</head>
<body>${clone.outerHTML}</body>
</html>`

    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;height:297mm;border:none;visibility:hidden;'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument!
    doc.open()
    doc.write(printHTML)
    doc.close()

    // Allow font (~600ms) to load then print
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } catch (e) {
        console.error('[print]', e)
      }
      setTimeout(() => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe)
        if (forDownload) setPdfLoading(false)
        else setPrintLoading(false)
      }, 3000)
    }, 600)
  }

  function handlePrint() {
    if (printLoading) return
    setPrintLoading(true)
    openPrintIframe(false)
  }

  function handleDownload() {
    if (pdfLoading) return
    setPdfLoading(true)
    openPrintIframe(true)
  }

  function handleMarkPaid() {
    if (!invoice) return
    setMarking(true)
    const updated = updateInvoice(invoice.id, { status: 'PAID' })
    if (updated) setInvoice(updated)
    setMarking(false)
  }

  if (!loaded) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    )
  }

  if (!invoice) return null

  const hydratedInvoice = buildHydrated()!

  return (
    <AppLayout>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b bg-card sticky top-0 z-20 flex-wrap">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={15} /> Retour
        </button>

        <span className="flex-1" />

        {/* Status badge */}
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999,
          background: STATUS_COLORS[invoice.status] + '20',
          color: STATUS_COLORS[invoice.status],
          border: `1px solid ${STATUS_COLORS[invoice.status]}40`,
        }}>
          {STATUS_LABELS[invoice.status]}
        </span>

        {/* Mark paid */}
        {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
          <button
            onClick={handleMarkPaid}
            disabled={marking}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg text-white transition-colors hover:opacity-90 disabled:opacity-60"
            style={{ background: '#059669' }}
          >
            <CheckCircle2 size={14} /> Marquer Payée
          </button>
        )}

        {/* Edit */}
        <button
          onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg border transition-colors hover:opacity-80"
          style={{ borderColor: NAV, color: NAV }}
        >
          <Pencil size={14} /> Modifier
        </button>

        {/* Print */}
        <button
          onClick={handlePrint}
          disabled={printLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg border transition-colors hover:opacity-80 disabled:opacity-60"
          style={{ borderColor: '#6b7280', color: '#6b7280' }}
        >
          <Printer size={14} />
          {printLoading ? 'Impression...' : 'Imprimer'}
        </button>

        {/* Download PDF */}
        <button
          onClick={handleDownload}
          disabled={pdfLoading}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg text-white transition-colors hover:opacity-90 disabled:opacity-60"
          style={{ background: OR }}
        >
          <FileDown size={14} />
          {pdfLoading ? 'Ouverture...' : 'Télécharger PDF'}
        </button>
      </div>

      {/* Invoice preview */}
      <div style={{
        background: '#e8eaed',
        padding: '12mm 8mm',
        minHeight: 'calc(100vh - 53px)',
        overflowX: 'auto',
        overflowY: 'auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}>
        <InvoiceDoc
          invoice={hydratedInvoice}
          client={client}
          settings={settings}
        />
      </div>
    </AppLayout>
  )
}
