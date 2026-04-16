'use client'

import { formatDateFR, amountToWordsFR, calcInvoiceTotals, round2 } from '@/lib/finance'
import { MODE_LABELS, type TransportMode } from '@/lib/types'
import type { Invoice, Client } from '@/lib/types'
import type { CompanySettings } from '@/lib/settings'

/* ─── Brand palette ─────────────────────────────────────────────── */
export const OR  = '#fd9f14'
export const NAV = '#003061'
const OR2        = '#d88101'   // darker orange for table headers & totals
const ORLT       = '#ffe0b3'
const ORXL       = '#fff3e2'
const WHT        = '#ffffff'
const THIN       = `0.5pt solid ${NAV}`
const F          = "'Montserrat','Helvetica Neue',Arial,sans-serif"

/* ─── Lines per page threshold ──────────────────────────────────── */
const LINES_PER_PAGE = 6

/* ─── Generic modes (no transport grid) ─────────────────────────── */
const GENERIC_MODES: TransportMode[] = ['TRANSIT', 'LOGISTICS', 'OTHER']

/* ─── Transport rows by mode ─────────────────────────────────────── */
function getModeRows(mode: TransportMode, d: Record<string, string>) {
  const v = (k: string) => d[k] || ''
  if (mode === 'AIR') return {
    left: [
      ['Origine',     v('origin')],
      ['Destination', v('destination')],
      ['N° LTA',      v('awbNumber')],
      ['Type',        v('type')],
      ['Fournisseur', v('supplier')],
      ['Marchandise', v('commodity')],
      ['Voyage',      v('voyageNumber')],
      ['Agent',       v('agentName') || v('airline')],
    ],
    right: [
      ['Franchise',         v('franchise')],
      ['AWB',               v('awbNumber')],
      ['# OF PACKAGES',     v('packages')],
      ['Poids Brut',        v('grossWeight')      ? v('grossWeight')      + ' kg' : ''],
      ['Chargeable Weight', v('chargeableWeight') ? v('chargeableWeight') + ' kg' : ''],
      ['Volume',            v('volume')           ? v('volume')           + ' m³' : ''],
      ['ETD',               v('etd')],
      ['ETA',               v('eta')],
    ],
  }
  if (mode === 'SEA_FCL' || mode === 'SEA_LCL') return {
    left: [
      ['Origine',     v('origin')],
      ['Destination', v('destination')],
      ['POL',         v('pol')],
      ['POD',         v('pod')],
      ['Fournisseur', v('supplier')],
      ['Marchandise', v('commodity')],
      ['Voyage',      v('voyageNumber')],
      ['Agent',       v('agentName')],
    ],
    right: [
      ['Booking',        v('booking')],
      ['BL',             v('bl')],
      ['Navire',         v('vessel')],
      ['Conteneur(s)',   v('containers')],
      ['Type conteneur', v('containerType')],
      ['Poids Brut',     v('grossWeight') ? v('grossWeight') + ' kg' : ''],
      ['ETD',            v('etd')],
      ['ETA',            v('eta')],
    ],
  }
  if (mode === 'ROAD_FTL' || mode === 'ROAD_LTL') return {
    left: [
      ['Origine',     v('origin')],
      ['Destination', v('destination')],
      ['CMR',         v('cmr')],
      ['Fournisseur', v('supplier')],
      ['Marchandise', v('commodity')],
      ['Voyage',      v('voyageNumber')],
      ['Agent',       v('agentName')],
    ],
    right: [
      ['Poids Brut', v('grossWeight') ? v('grossWeight') + ' kg' : ''],
      ['Volume',     v('volume')      ? v('volume')      + ' m³' : ''],
      ['Camion',     v('truck')],
      ['ETD',        v('etd')],
      ['ETA',        v('eta')],
    ],
  }
  // TRANSIT, LOGISTICS, OTHER — no transport grid
  return null
}

/* ─── Formatters ─────────────────────────────────────────────────── */
const fN = (n: number) =>
  n === 0 ? '' : n.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fMAD = (n: number) =>
  n.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD'

/* ─── Shared sub-components ─────────────────────────────────────── */

function InvoiceHeader({ settings }: { settings: CompanySettings }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5mm' }}>
      <div style={{ flexShrink: 0 }}>
        {settings.logoData
          ? <img src={settings.logoData} alt={settings.companyName}
              style={{ height: '26mm', width: 'auto', objectFit: 'contain', display: 'block' }} />
          : <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/api-attachments/HZYD486U5b2ZhhRyRAfUP-dQ53vPlmd73qMWevXO8Hl0ekVZngYX.png"
              alt="Axis Shipping Line"
              style={{ height: '26mm', width: 'auto', objectFit: 'contain', display: 'block' }}
              crossOrigin="anonymous"
            />
        }
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5pt', flexWrap: 'nowrap' as const }}>
          <span style={{ fontSize: '7pt', fontWeight: 700, color: OR, fontFamily: F, whiteSpace: 'nowrap' as const, textDecoration: 'underline' }}>
            Member Of
          </span>
          {settings.networkLogos && settings.networkLogos.length > 0
            ? settings.networkLogos.map(n => (
                <img key={n.id} src={n.imageData} alt={n.name}
                  style={{ height: '12pt', width: 'auto', objectFit: 'contain', display: 'inline-block' }} />
              ))
            : <>
                {[
                  { label: 'A', bg: '#e65c00', title: 'AllForward'  },
                  { label: 'W', bg: '#1a5276', title: 'WCA'         },
                  { label: 'J', bg: '#c0392b', title: 'JCTrans'     },
                  { label: 'D', bg: '#2e4057', title: 'DF Alliance' },
                ].map(({ label, bg, title }) => (
                  <div key={title} title={title} style={{
                    width: '18pt', height: '12pt', background: bg, borderRadius: '1.5pt',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontSize: '6pt', fontWeight: 900, color: WHT, fontFamily: F, lineHeight: 1 }}>
                      {label}
                    </span>
                  </div>
                ))}
              </>
          }
        </div>
        <div style={{ width: '100%', marginTop: '4pt', display: 'flex', flexDirection: 'column', gap: '2pt' }}>
          <div style={{ height: '0.75pt', background: OR }} />
          <div style={{ height: '0.75pt', background: OR }} />
          <div style={{ height: '0.75pt', background: OR }} />
        </div>
      </div>
    </div>
  )
}

function InvoiceFooter({ settings }: { settings: CompanySettings }) {
  return (
    <div style={{
      borderTop: `2pt solid ${OR}`,
      paddingTop: '4pt',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '4mm',
    }}>
      <div style={{ flexShrink: 0 }}>
        {settings.footerLogoData
          ? <img src={settings.footerLogoData} alt="Logo"
              style={{ height: '20mm', width: 'auto', display: 'block' }} />
          : <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/api-attachments/FcfrycO2BoSj2ut7aNbyi-75A9xvHAzO6j7FEFvoi7ZttFF21INv.png"
              alt="Axis icon"
              style={{ height: '20mm', width: 'auto', display: 'block' }}
              crossOrigin="anonymous"
            />
        }
      </div>
      <div style={{ textAlign: 'center' as const, fontSize: '6.5pt', color: '#222', lineHeight: '1.75', flex: 1 }}>
        <div style={{ fontWeight: 700 }}>
          {settings.address || '29, Rue Med El Baamrani Res Sara 2, Etg 2, N° 206, Casablanca - Maroc'}
        </div>
        <div style={{ fontWeight: 700 }}>
          R.C : {settings.rc || 'Casa 666085'}&nbsp;&nbsp;-&nbsp;&nbsp;
          I.F : {settings.if_ || '66239820'}&nbsp;&nbsp;-&nbsp;&nbsp;
          ICE : {settings.ice || '003637927000014'}&nbsp;&nbsp;-&nbsp;&nbsp;
          Patente : {settings.patente || '32301566'}
        </div>
        <div style={{ fontWeight: 700 }}>
          Tél : {settings.phone1 || '+212 661-711416'}&nbsp;&nbsp;|&nbsp;&nbsp;
          Bureau Casa : {settings.phone2 || '+212 522-403939'}
        </div>
        <div style={{ fontWeight: 700 }}>
          Email : {settings.email || 'info@axis-shipping.com'}&nbsp;&nbsp;|&nbsp;&nbsp;
          Site web : {settings.website || 'axis-shipping.com'}
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>
        {settings.footerLogoData
          ? <img src={settings.footerLogoData} alt="Logo"
              style={{ height: '20mm', width: 'auto', display: 'block' }} />
          : <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/api-attachments/FcfrycO2BoSj2ut7aNbyi-75A9xvHAzO6j7FEFvoi7ZttFF21INv.png"
              alt="Axis icon"
              style={{ height: '20mm', width: 'auto', display: 'block' }}
              crossOrigin="anonymous"
            />
        }
      </div>
    </div>
  )
}

/* lines table header row */
function LinesTableHeader() {
  return (
    <thead>
      <tr>
        {[
          { h: 'Concept',        w: '33%' },
          { h: 'Total Devise',   w: '14%' },
          { h: 'Montant HT MAD', w: '15%' },
          { h: 'Qte',            w: '6%'  },
          { h: 'Total HT MAD',   w: '16%' },
          { h: 'TVA%',           w: '12%' },
        ].map(({ h, w }) => (
          <th key={h} style={{
            background: OR2, color: WHT, fontWeight: 700, fontSize: '8pt',
            padding: '4pt 4pt', textAlign: 'center' as const, width: w, fontFamily: F,
            border: `0.5pt solid ${NAV}`,
            whiteSpace: 'nowrap' as const,
          }}>{h}</th>
        ))}
      </tr>
    </thead>
  )
}

/* one data row for lines table */
function LineRow({ line, i }: { line: Invoice['lines'][0]; i: number }) {
  const isMAD = !line.currency || line.currency === 'MAD'
  return (
    <tr style={{ background: i % 2 === 0 ? WHT : ORXL }}>
      <td style={{ padding: '3.5pt 5pt', border: THIN, fontSize: '8.5pt' }}>{line.description}</td>
      {/* Total Devise — vide si devise = MAD */}
      <td style={{ padding: '3.5pt 5pt', border: THIN, fontSize: '8.5pt', textAlign: 'right' as const, whiteSpace: 'nowrap' as const }}>
        {!isMAD && line.totalForeign > 0 ? `${fN(line.totalForeign)} ${line.currency}` : ''}
      </td>
      <td style={{ padding: '3.5pt 5pt', border: THIN, fontSize: '8.5pt', textAlign: 'right' as const }}>
        {fN(line.unitPrice)}
      </td>
      <td style={{ padding: '3.5pt 5pt', border: THIN, fontSize: '8.5pt', textAlign: 'center' as const }}>
        {line.quantity}
      </td>
      {/* Montant HT MAD — rempli directement si devise = MAD */}
      <td style={{ padding: '3.5pt 5pt', border: THIN, fontSize: '8.5pt', textAlign: 'right' as const }}>
        {fN(isMAD ? line.totalMAD_HT : line.totalMAD_HT)}
      </td>
      <td style={{ padding: '3.5pt 5pt', border: THIN, fontSize: '8.5pt', textAlign: 'center' as const }}>
        {line.vatCode}%
      </td>
    </tr>
  )
}

/* ─── Page wrapper style ─────────────────────────────────────────── */
const pageStyle = (forPrint: boolean): React.CSSProperties => ({
  fontFamily: F,
  fontSize: forPrint ? '12px' : '9pt',
  color: '#1a1a1a',
  background: WHT,
  display: 'flex',
  flexDirection: 'column',
  width: forPrint ? '100%' : '210mm',
  minWidth: forPrint ? undefined : '210mm',
  minHeight: '297mm',
  margin: '0',
  padding: forPrint ? '8px 44px 13px' : '7pt 44pt 14pt',
  boxSizing: 'border-box' as const,
  boxShadow: forPrint ? 'none' : '0 2px 28px rgba(0,0,0,0.15)',
  flexShrink: 0,
})

/* ─────────────────────────────────────────────────────────────────── */
export default function InvoiceDoc({
  invoice,
  client,
  settings,
  forPrint = false,
}: {
  invoice: Invoice
  client: Client | null
  settings: CompanySettings
  forPrint?: boolean
}) {
  const modeData    = invoice.modeData as Record<string, string>
  const totals      = calcInvoiceTotals(invoice.lines)
  const rows        = getModeRows(invoice.mode, modeData)
  const isGeneric   = GENERIC_MODES.includes(invoice.mode)
  const maxRows     = rows ? Math.max(rows.left.length, rows.right.length) : 0
  const multiPage   = invoice.lines.length > LINES_PER_PAGE
  const detailsText = (modeData.details as string) || ''

  const vatGroups = ([20, 10, 0] as const).map(code => {
    const ls = invoice.lines.filter(l => l.vatCode === code)
    const ht = round2(ls.reduce((s, l) => s + l.totalMAD_HT, 0))
    const vt = round2(ht * (code / 100))
    return { code, ht, vt }
  })

  const tdLabel = (extra?: React.CSSProperties): React.CSSProperties => ({
    padding: '2pt 5pt', fontSize: '8.5pt', fontWeight: 700,
    whiteSpace: 'nowrap' as const, color: NAV, width: '22%', ...extra,
  })
  const tdColon = (): React.CSSProperties => ({
    padding: '2pt 2pt', fontSize: '8.5pt', textAlign: 'center' as const, width: '3%', color: '#444',
  })
  const tdValue = (extra?: React.CSSProperties): React.CSSProperties => ({
    padding: '2pt 6pt 2pt 2pt', fontSize: '8.5pt', width: '25%', ...extra,
  })

  /* ── TOTALS + BANK BLOCK (shared between single-page and page 2) ── */
  const TotalsAndBank = () => (
    <>
      {/* VAT + TOTALS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm', marginBottom: '3mm' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', alignSelf: 'start' }}>
          <thead>
            <tr>
              {['Montant HT', 'Code TVA', 'TVA %', 'Total TVA'].map(h => (
                <th key={h} style={{
                  background: '#ff9d12', color: '#002f61', fontWeight: 700, fontSize: '7.5pt',
                  padding: '2.5pt 3pt', textAlign: 'center' as const, fontFamily: F,
                  border: `0.5pt solid ${NAV}`, whiteSpace: 'nowrap' as const,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vatGroups.map((g, i) => (
              <tr key={g.code} style={{ background: i % 2 === 0 ? WHT : ORXL }}>
                <td style={{ padding: '2pt 3pt', border: THIN, fontSize: '7.5pt', textAlign: 'right' as const }}>
                  {g.ht > 0 ? fN(g.ht) : ''}
                </td>
                <td style={{ padding: '2pt 3pt', border: THIN, fontSize: '7.5pt', textAlign: 'center' as const }}>
                  {g.code === 0 ? '-' : g.code}
                </td>
                <td style={{ padding: '2pt 3pt', border: THIN, fontSize: '7.5pt', textAlign: 'center' as const }}>
                  {g.code === 0 ? '0%' : `${g.code},00%`}
                </td>
                <td style={{ padding: '2pt 3pt', border: THIN, fontSize: '7.5pt', textAlign: 'right' as const }}>
                  {g.vt > 0 ? fN(g.vt) : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <table style={{ width: '100%', borderCollapse: 'collapse', alignSelf: 'start' }}>
          <tbody>
            {[
              { label: 'TOTAL MONTANT H.T :', val: fMAD(totals.totalHT_MAD), bg: OR2, color: WHT },
              { label: 'T.V.A',               val: fMAD(totals.totalVAT),    bg: OR2, color: WHT },
              { label: 'TOTAL MONTANT TTC :', val: fMAD(totals.totalTTC),    bg: OR2, color: WHT },
              { label: 'Taux de change :',    val: invoice.exchangeRateGlobal > 0 ? invoice.exchangeRateGlobal.toLocaleString('fr-MA', { minimumFractionDigits: 3 }) : '—', bg: ORLT, color: NAV },
              { label: 'NET A PAYER T.T.C :', val: fMAD(totals.totalTTC),    bg: OR2, color: WHT },
            ].map(({ label, val, bg, color }) => (
              <tr key={label}>
                <td style={{ padding: '2.5pt 6pt', border: THIN, fontSize: '8.5pt', fontWeight: 800, background: bg, color, fontFamily: F }}>
                  {label}
                </td>
                <td style={{ padding: '2.5pt 6pt', border: THIN, fontSize: '8.5pt', fontWeight: 700, textAlign: 'right' as const, background: bg === ORLT ? ORLT : WHT, color: bg === ORLT ? NAV : '#1a1a1a', fontFamily: F }}>
                  {val}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DETAILS + AMOUNT IN WORDS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm', marginBottom: '3mm' }}>
        <div style={{ border: THIN }}>
          <div style={{ textAlign: 'center' as const, fontWeight: 800, fontSize: '9pt', textDecoration: 'underline', color: '#002f61', background: '#ff9d12', padding: '3pt', fontFamily: F }}>
            DÉTAILS
          </div>
          <div style={{ padding: '5pt 9pt' }}>
            {([
              ['Incoterme',      invoice.incoterm || ''],
              ['Taux de change', invoice.exchangeRateGlobal > 0 ? String(invoice.exchangeRateGlobal) : ''],
              ['Franchise',      modeData.franchise || ''],
              ['Conditions',     invoice.paymentTerms ? `${invoice.paymentTerms} jours` : ''],
              ['Ref Client',     invoice.clientRef || ''],
            ] as [string, string][]).map(([label, val]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'baseline', marginBottom: '2.5pt' }}>
                <span style={{ fontWeight: 700, fontSize: '8.5pt', minWidth: '88pt', color: NAV }}>{label}</span>
                <span style={{ fontSize: '8.5pt', color: '#555', marginRight: '3pt' }}> :</span>
                <span style={{ fontSize: '8.5pt' }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ border: THIN, display: 'flex', flexDirection: 'column' as const }}>
          <div style={{ textAlign: 'center' as const, fontWeight: 800, fontSize: '9pt', textDecoration: 'underline', color: '#002f61', background: '#ff9d12', padding: '3pt', fontFamily: F }}>
            SOIT UN MONTANT DE
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6pt 10pt', textAlign: 'center' as const, fontSize: '9.5pt', fontWeight: 700, color: '#1a1a1a', textTransform: 'uppercase' as const, lineHeight: '1.6', minHeight: '36pt' }}>
            {totals.totalTTC > 0 ? amountToWordsFR(totals.totalTTC) : ''}
          </div>
        </div>
      </div>

      {/* BANK INFO */}
      <div style={{ border: THIN, background: WHT, borderRadius: '3pt', marginBottom: '3mm', padding: '6pt 12pt' }}>
        {([
          ['BANQUE',            settings.bankName    || 'Attijariwafa Bank'],
          ['RIB',               settings.rib         || '007780000262500000100428'],
          ['BIC / SWIFT',       settings.swift       || 'BCMAMAMC'],
          ['LIBELLÉ DU CHÈQUE', settings.bankLibelle || 'Axis Shipping Line'],
        ] as [string, string][]).map(([label, val]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'baseline', marginBottom: '2.5pt' }}>
            <span style={{ fontWeight: 800, fontSize: '8.5pt', minWidth: '115pt', color: NAV, fontFamily: F }}>{label}</span>
            <span style={{ fontSize: '8.5pt', color: '#555', marginRight: '6pt' }}> :</span>
            <span style={{ fontSize: '8.5pt', fontFamily: (label === 'RIB' || label === 'BIC / SWIFT') ? 'monospace' : F, color: '#1a1a1a' }}>
              {val}
            </span>
          </div>
        ))}
      </div>
    </>
  )

  /* ══════════════════════════════════════════════════════════════════
     SINGLE PAGE (≤ 10 lines)
  ══════════════════════════════════════════════════════════════════ */
  if (!multiPage) {
    const displayLines = invoice.lines.length > 0
      ? invoice.lines
      : Array.from({ length: 7 }, (_, i) => ({ id: String(i), description: '', totalForeign: 0, currency: '', unitPrice: 0, quantity: 0, totalMAD_HT: 0, vatCode: 0 as 0 | 10 | 20 }))

    return (
      <div id="invoice-doc" style={pageStyle(forPrint)}>
        <InvoiceHeader settings={settings} />

        {/* TITLE */}
        <div style={{ textAlign: 'center', margin: '2mm 0 2.5mm' }}>
          <span style={{ fontFamily: F, fontSize: '16pt', fontWeight: 700, color: NAV, letterSpacing: '1pt' }}>
            FACTURE N° : {invoice.invoiceNumber}
          </span>
        </div>

        {/* INFO + CLIENT */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3mm', marginBottom: '2mm' }}>
          <div style={{ paddingTop: '2pt' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '3pt' }}>
              <span style={{ fontWeight: 700, fontSize: '10pt', minWidth: '110pt' }}>Date de facturation</span>
              <span style={{ fontWeight: 700, fontSize: '10pt', minWidth: '10pt', textAlign: 'center' as const }}>:</span>
              <span style={{ fontSize: '10pt', fontWeight: 700 }}>{formatDateFR(invoice.invoiceDate)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '3pt' }}>
              <span style={{ fontWeight: 700, fontSize: '10pt', minWidth: '110pt' }}>Date de paiement</span>
              <span style={{ fontWeight: 700, fontSize: '10pt', minWidth: '10pt', textAlign: 'center' as const }}>:</span>
              <span style={{ fontSize: '10pt', fontWeight: 700 }}>{formatDateFR(invoice.dueDate)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', background: ORLT, padding: '3pt 8pt 3pt 0', marginTop: '1pt' }}>
              <span style={{ fontWeight: 700, fontSize: '10pt', minWidth: '110pt' }}>Mode</span>
              <span style={{ fontWeight: 700, fontSize: '10pt', minWidth: '10pt', textAlign: 'center' as const }}>:</span>
              <span style={{ fontSize: '10pt', fontWeight: 700 }}>{MODE_LABELS[invoice.mode]}</span>
            </div>
          </div>
          <div style={{ border: `1.5pt solid ${OR}`, borderRadius: '4pt', padding: '5pt 10pt' }}>
            <div style={{ fontWeight: 700, fontSize: '9pt', color: NAV }}>{client?.companyName || '—'}</div>
            <div style={{ height: '2pt' }} />
            <div style={{ fontSize: '9pt', lineHeight: '1.4', color: '#333' }}>
              {client?.address1 && <div>{client.address1}</div>}
              {client?.address2 && <div>{client.address2}</div>}
            </div>
            {(client?.postalCode || client?.city || client?.country) && (
              <div style={{ fontSize: '9pt', color: '#333' }}>
                {[client?.postalCode, client?.city, client?.country].filter(Boolean).join(', ')}
              </div>
            )}
            <div style={{ height: '1.5pt' }} />
            <div style={{ fontSize: '9pt', color: '#333', lineHeight: '1.4' }}>
              {client?.contacts?.[0]?.phone && <div>Tél : {client.contacts[0].phone}</div>}
              {client?.contacts?.[0]?.email && <div>Email : {client.contacts[0].email}</div>}
            </div>
            {client?.ice && <div style={{ fontSize: '9pt', color: '#333', marginTop: '1.5pt' }}>ICE : {client.ice}</div>}
          </div>
        </div>

        {/* TRANSPORT TABLE — hidden for generic modes, replaced by details */}
        {isGeneric ? (
          detailsText ? (
            <div style={{ border: THIN, marginBottom: '2mm', padding: '5pt 10pt' }}>
              <span style={{ fontWeight: 700, fontSize: '8.5pt', color: NAV, marginRight: '6pt' }}>Détails de la prestation :</span>
              <span style={{ fontSize: '8.5pt', color: '#444', whiteSpace: 'pre-wrap' }}>{detailsText}</span>
            </div>
          ) : null
        ) : (
          <div style={{ border: THIN, marginBottom: '2mm' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {Array.from({ length: maxRows }).map((_, i) => {
                  const [ll = '', lv = ''] = rows!.left[i]  ?? []
                  const [rl = '', rv = ''] = rows!.right[i] ?? []
                  return (
                    <tr key={i} style={{ background: WHT }}>
                      <td style={tdLabel()}>{ll}</td>
                      <td style={tdColon()}>{ll ? ':' : ''}</td>
                      <td style={tdValue()}>{lv}</td>
                      <td style={tdLabel({ paddingLeft: '8pt' })}>{rl}</td>
                      <td style={tdColon()}>{rl ? ':' : ''}</td>
                      <td style={tdValue()}>{rv}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* LINES TABLE */}
        {(() => {
          // Each real row is ~22pt tall. Filler = missing rows × 22pt.
          // For generic modes, the transport table is absent (~8 rows × 14pt = 112pt lost).
          // Compensate by adding extra filler height so the footer stays at the bottom.
          const ROW_H = 22
          const TRANSPORT_ROW_H = 14
          const TYPICAL_TRANSPORT_ROWS = 8
          const transportCompensation = isGeneric ? TYPICAL_TRANSPORT_ROWS * TRANSPORT_ROW_H : 0
          const missing = LINES_PER_PAGE - invoice.lines.length
          const fillerH = (missing > 0 ? missing * ROW_H : 0) + transportCompensation
          return (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2mm' }}>
              <LinesTableHeader />
              <tbody>
                {invoice.lines.map((line, i) => <LineRow key={line.id} line={line} i={i} />)}
                {/* One filler row that occupies exactly the space of the missing rows */}
                {missing > 0 && (
                  <tr>
                    <td style={{ border: THIN, width: '33%', height: `${fillerH}pt`, padding: 0 }} />
                    <td style={{ border: THIN, width: '14%', padding: 0 }} />
                    <td style={{ border: THIN, width: '15%', padding: 0 }} />
                    <td style={{ border: THIN, width: '6%',  padding: 0 }} />
                    <td style={{ border: THIN, width: '16%', padding: 0 }} />
                    <td style={{ border: THIN, width: '12%', padding: 0 }} />
                  </tr>
                )}
              </tbody>
            </table>
          )
        })()}
        <TotalsAndBank />
        <InvoiceFooter settings={settings} />
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════════════════
     MULTI-PAGE (> 10 lines)
     Page 1: full header → transport → first LINES_PER_PAGE rows → footer
     Page 2: recap client → remaining rows → totals → bank → footer
  ══════════════════════════════════════════════════════════════════ */
  const page1Lines = invoice.lines.slice(0, LINES_PER_PAGE)
  const page2Lines = invoice.lines.slice(LINES_PER_PAGE)

  return (
    <div id="invoice-doc" style={{ fontFamily: F }}>
      {/* ── PAGE 1 ── */}
      <div className="invoice-page-1" style={{ ...pageStyle(forPrint), pageBreakAfter: 'always', breakAfter: 'page' }}>
        <InvoiceHeader settings={settings} />

        {/* TITLE */}
        <div style={{ textAlign: 'center', margin: '2.5mm 0 3.5mm' }}>
          <span style={{ fontFamily: F, fontSize: '16pt', fontWeight: 700, color: NAV, letterSpacing: '1pt' }}>
            FACTURE N° : {invoice.invoiceNumber}
          </span>
        </div>

        {/* INFO + CLIENT */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm', marginBottom: '3mm' }}>
          <div style={{ paddingTop: '2pt' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '3.5pt' }}>
              <span style={{ fontWeight: 700, fontSize: '10pt', minWidth: '110pt' }}>Date de facturation</span>
              <span style={{ fontWeight: 700, fontSize: '10pt', minWidth: '10pt', textAlign: 'center' as const }}>:</span>
              <span style={{ fontSize: '10pt', fontWeight: 700 }}>{formatDateFR(invoice.invoiceDate)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '3.5pt' }}>
              <span style={{ fontWeight: 700, fontSize: '10pt', minWidth: '110pt' }}>Date de paiement</span>
              <span style={{ fontWeight: 700, fontSize: '10pt', minWidth: '10pt', textAlign: 'center' as const }}>:</span>
              <span style={{ fontSize: '10pt', fontWeight: 700 }}>{formatDateFR(invoice.dueDate)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', background: ORLT, padding: '3pt 8pt 3pt 0', marginTop: '1pt' }}>
              <span style={{ fontWeight: 700, fontSize: '10pt', minWidth: '110pt' }}>Mode</span>
              <span style={{ fontWeight: 700, fontSize: '10pt', minWidth: '10pt', textAlign: 'center' as const }}>:</span>
              <span style={{ fontSize: '10pt', fontWeight: 700 }}>{MODE_LABELS[invoice.mode]}</span>
            </div>
          </div>
          <div style={{ border: `1.5pt solid ${OR}`, borderRadius: '4pt', padding: '6pt 10pt' }}>
            <div style={{ fontWeight: 700, fontSize: '9pt', color: NAV }}>{client?.companyName || '—'}</div>
            <div style={{ height: '3pt' }} />
            <div style={{ fontSize: '9pt', lineHeight: '1.5', color: '#333' }}>
              {client?.address1 && <div>{client.address1}</div>}
              {client?.address2 && <div>{client.address2}</div>}
            </div>
            {(client?.postalCode || client?.city || client?.country) && (
              <div style={{ fontSize: '9pt', color: '#333' }}>
                {[client?.postalCode, client?.city, client?.country].filter(Boolean).join(', ')}
              </div>
            )}
            <div style={{ height: '2pt' }} />
            <div style={{ fontSize: '9pt', color: '#333', lineHeight: '1.5' }}>
              {client?.contacts?.[0]?.phone && <div>Tél : {client.contacts[0].phone}</div>}
              {client?.contacts?.[0]?.email && <div>Email : {client.contacts[0].email}</div>}
            </div>
            {client?.ice && <div style={{ fontSize: '9pt', color: '#333', marginTop: '2pt' }}>ICE : {client.ice}</div>}
          </div>
        </div>

        {/* TRANSPORT TABLE — hidden for generic modes */}
        {isGeneric ? (
          detailsText ? (
            <div style={{ border: THIN, marginBottom: '3mm', padding: '5pt 10pt' }}>
              <span style={{ fontWeight: 700, fontSize: '8.5pt', color: NAV, marginRight: '6pt' }}>Détails de la prestation :</span>
              <span style={{ fontSize: '8.5pt', color: '#444', whiteSpace: 'pre-wrap' }}>{detailsText}</span>
            </div>
          ) : null
        ) : (
          <div style={{ border: THIN, marginBottom: '3mm' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {Array.from({ length: maxRows }).map((_, i) => {
                  const [ll = '', lv = ''] = rows!.left[i]  ?? []
                  const [rl = '', rv = ''] = rows!.right[i] ?? []
                  return (
                    <tr key={i} style={{ background: WHT }}>
                      <td style={tdLabel()}>{ll}</td>
                      <td style={tdColon()}>{ll ? ':' : ''}</td>
                      <td style={tdValue()}>{lv}</td>
                      <td style={tdLabel({ paddingLeft: '8pt' })}>{rl}</td>
                      <td style={tdColon()}>{rl ? ':' : ''}</td>
                      <td style={tdValue()}>{rv}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* FIRST 6 LINES — wrapper div gets flex:1 so filler row can use height:100% */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0', marginBottom: '3mm' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', height: '1px' }}>
            <LinesTableHeader />
            <tbody style={{ height: '100%' }}>
              {page1Lines.map((line, i) => <LineRow key={line.id} line={line} i={i} />)}
              <tr style={{ height: '100%' }}>
                <td style={{ border: THIN, width: '33%', padding: 0 }} />
                <td style={{ border: THIN, width: '14%', padding: 0 }} />
                <td style={{ border: THIN, width: '15%', padding: 0 }} />
                <td style={{ border: THIN, width: '6%',  padding: 0 }} />
                <td style={{ border: THIN, width: '16%', padding: 0 }} />
                <td style={{ border: THIN, width: '12%', padding: 0 }} />
              </tr>
            </tbody>
          </table>
        </div>

        {/* PAGE 1 FOOTER NOTE */}
        <div style={{ textAlign: 'right' as const, fontSize: '7.5pt', color: '#666', fontStyle: 'italic', marginBottom: '3mm' }}>
          Suite page 2 / {invoice.invoiceNumber}
        </div>

        <InvoiceFooter settings={settings} />
      </div>

      {/* ── PAGE 2 ── */}
      <div className="invoice-page-2" style={pageStyle(forPrint)}>
        <InvoiceHeader settings={settings} />

        {/* RAPPEL — invoice ref + client */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm', marginBottom: '3mm' }}>
          <div style={{ border: `1pt solid ${NAV}`, borderRadius: '3pt', padding: '5pt 8pt' }}>
            <div style={{ fontWeight: 800, fontSize: '8.5pt', color: NAV, marginBottom: '3pt', fontFamily: F }}>
              SUITE — FACTURE N° : {invoice.invoiceNumber}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 700, fontSize: '8.5pt', minWidth: '80pt', color: NAV }}>Date</span>
              <span style={{ fontSize: '8.5pt', color: '#555', marginRight: '4pt' }}>:</span>
              <span style={{ fontSize: '8.5pt' }}>{formatDateFR(invoice.invoiceDate)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 700, fontSize: '8.5pt', minWidth: '80pt', color: NAV }}>Mode</span>
              <span style={{ fontSize: '8.5pt', color: '#555', marginRight: '4pt' }}>:</span>
              <span style={{ fontSize: '8.5pt' }}>{MODE_LABELS[invoice.mode]}</span>
            </div>
          </div>
          <div style={{ border: `1.5pt solid ${OR}`, borderRadius: '4pt', padding: '5pt 10pt' }}>
            <div style={{ fontWeight: 700, fontSize: '8.5pt', color: NAV }}>{client?.companyName || '—'}</div>
            <div style={{ fontSize: '8.5pt', color: '#333', lineHeight: '1.5', marginTop: '2pt' }}>
              {[client?.address1, client?.address2, [client?.postalCode, client?.city, client?.country].filter(Boolean).join(', ')].filter(Boolean).map((l, i) => <div key={i}>{l}</div>)}
            </div>
          </div>
        </div>

        {/* REMAINING LINES */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3mm' }}>
          <LinesTableHeader />
          <tbody>
            {page2Lines.map((line, i) => <LineRow key={line.id} line={line} i={i + LINES_PER_PAGE} />)}
          </tbody>
        </table>

        <TotalsAndBank />
        <InvoiceFooter settings={settings} />
      </div>
    </div>
  )
}
