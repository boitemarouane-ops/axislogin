import type { Invoice, Client } from './types'
import type { CompanySettings } from './settings'
import { formatMAD, formatCurrency, formatDateFR, amountToWordsFR, calcInvoiceTotals } from './finance'

function esc(s: unknown): string {
  if (s === null || s === undefined) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function generateInvoiceHTML(
  invoice: Invoice,
  client: Client | null,
  settings: CompanySettings,
): string {
  const md = (invoice.modeData ?? {}) as Record<string, string>
  const totals = calcInvoiceTotals(invoice.lines)

  const NAV = '#003061'
  const OR  = '#fd9f14'
  const WH  = '#ffffff'

  // Mode label
  const MODE_LABELS: Record<string, string> = {
    AIR: 'Aérien', SEA_FCL: 'Maritime FCL',
    SEA_LCL: 'Maritime LCL', ROAD_FTL: 'Routier FTL',
    ROAD_LTL: 'Routier LTL', TRANSIT: 'Transit',
    LOGISTICS: 'Accompagnement Logistique', OTHER: 'Autre',
  }
  const modeLabel = MODE_LABELS[invoice.mode] ?? invoice.mode

  // Transport info rows
  const transportRows: [string, string][] = []
  const add = (label: string, val: string) => { if (val?.trim()) transportRows.push([label, val]) }
  const isGenericMode = invoice.mode === 'TRANSIT' || invoice.mode === 'LOGISTICS' || invoice.mode === 'OTHER'

  add('Mode', modeLabel)
  if (isGenericMode) {
    // Generic modes: only show details textarea, no transport fields
    if (md.details) add('Détails de la prestation', md.details)
  } else {
    // Transport modes: full fields
    if (md.origin || md.destination) add('Origine / Destination', [md.origin, md.destination].filter(Boolean).join(' → '))
    if (md.awbNumber) add('N° LTA / AWB', md.awbNumber)
    if (md.bl)        add('B/L', md.bl)
    if (md.booking)   add('Booking', md.booking)
    if (md.voyageNumber) add('N° Voyage', md.voyageNumber)
    if (md.vessel)    add('Navire', md.vessel)
    if (md.airline)   add('Compagnie Aérienne', md.airline)
    if (md.pol || md.pod) add('POL / POD', [md.pol, md.pod].filter(Boolean).join(' / '))
    if (md.containers)   add('Conteneurs', md.containers)
    if (md.containerType) add('Type Conteneur', md.containerType)
    if (md.trailer)   add('Remorque', md.trailer)
    if (md.truck)     add('Tracteur', md.truck)
    if (md.agentName || md.agentId) add('Agent', md.agentName || md.agentId)
    if (md.commodity) add('Marchandise', md.commodity)
    if (md.grossWeight) add('Poids Brut', md.grossWeight + ' kg')
    if (md.chargeableWeight) add('Chargeable Weight', md.chargeableWeight + ' kg')
    if (md.netWeight) add('Poids Net', md.netWeight + ' kg')
    if (md.packages)  add('Nb. Colis', md.packages)
    if (md.volume)    add('Volume', md.volume + ' m³')
    if (md.etd)       add('ETD', formatDateFR(md.etd))
    if (md.eta)       add('ETA', formatDateFR(md.eta))
    if (invoice.incoterm) add('Incoterme', invoice.incoterm)
    if (invoice.transitTime) add('Transit Time', invoice.transitTime)
    if (invoice.freeTime) add('Free Time', invoice.freeTime)
    add('Contre Documents', invoice.againstDocuments ? 'Oui' : 'Non')
  }

  const transportHtml = transportRows.map(([k, v], i) => `
    <tr style="background:${i % 2 === 0 ? '#f8f9fa' : '#ffffff'}">
      <td style="padding:5px 10px;font-size:11px;color:#4b5563;font-weight:600;white-space:nowrap;border-bottom:1px solid #e5e7eb;">${esc(k)}</td>
      <td style="padding:5px 10px;font-size:11px;color:#111827;border-bottom:1px solid #e5e7eb;">${esc(v)}</td>
    </tr>`).join('')

  const linesHtml = invoice.lines.map((l, i) => `
    <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#ffffff'}">
      <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #e5e7eb;">${esc(l.description)}</td>
      <td style="padding:6px 10px;font-size:11px;text-align:right;border-bottom:1px solid #e5e7eb;font-family:monospace;">${esc(formatCurrency(l.unitPrice, l.currency))}</td>
      <td style="padding:6px 10px;font-size:11px;text-align:center;border-bottom:1px solid #e5e7eb;">${esc(l.quantity)}</td>
      <td style="padding:6px 10px;font-size:11px;text-align:right;border-bottom:1px solid #e5e7eb;font-family:monospace;">${esc(formatCurrency(l.totalForeign, l.currency))}</td>
      <td style="padding:6px 10px;font-size:11px;text-align:right;border-bottom:1px solid #e5e7eb;font-family:monospace;">${l.currency !== 'MAD' ? l.exchangeRate.toFixed(4) : '—'}</td>
      <td style="padding:6px 10px;font-size:11px;text-align:right;font-weight:700;border-bottom:1px solid #e5e7eb;font-family:monospace;">${esc(formatMAD(l.totalMAD_HT))}</td>
      <td style="padding:6px 10px;font-size:11px;text-align:center;border-bottom:1px solid #e5e7eb;">${l.vatCode}%</td>
    </tr>`).join('')

  const vatRows = (Object.entries(totals.vatBreakdown) as [string, number][])
    .filter(([, v]) => v > 0)
    .map(([code, amt]) => `
      <tr>
        <td colspan="5" style="padding:3px 12px;font-size:11px;color:#d1d5db;text-align:right;">T.V.A ${code}%</td>
        <td colspan="2" style="padding:3px 12px;font-size:11px;color:#d1d5db;text-align:right;font-family:monospace;">${esc(formatMAD(amt))}</td>
      </tr>`).join('')

  const clientAddr = client ? [
    client.address1, client.address2, `${client.postalCode} ${client.city}`, client.country,
  ].filter(Boolean).join('<br>') : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Facture ${esc(invoice.invoiceNumber)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{
    font-family:'Montserrat',Arial,sans-serif;
    background:#fff;
    color:#111827;
    width:210mm;
    min-height:297mm;
    margin:0 auto;
    font-size:12px;
  }
  @media print{
    @page{size:A4 portrait;margin:0;}
    body{width:210mm;min-height:297mm;}
    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}
  }
</style>
</head>
<body>

<!-- HEADER -->
<div style="background:${NAV};padding:16px 24px 0;display:flex;align-items:flex-start;justify-content:space-between;">
  <div>
    ${settings.logoData
      ? `<img src="${settings.logoData}" style="height:52px;object-fit:contain;" alt="logo"/>`
      : `<div style="color:${WH};font-size:20px;font-weight:900;letter-spacing:2px;">${esc(settings.companyName)}</div>`
    }
    <div style="color:#a0aec0;font-size:9px;margin-top:4px;">${esc(settings.address)}</div>
    <div style="color:#a0aec0;font-size:9px;">
      Tél: ${esc(settings.phone1)}${settings.phone2 ? ' / ' + esc(settings.phone2) : ''} &nbsp;|&nbsp;
      ${esc(settings.email)} &nbsp;|&nbsp; ${esc(settings.website)}
    </div>
    <div style="color:#a0aec0;font-size:9px;">
      RC: ${esc(settings.rc)} &nbsp;|&nbsp; IF: ${esc(settings.if_)} &nbsp;|&nbsp;
      ICE: ${esc(settings.ice)} &nbsp;|&nbsp; Patente: ${esc(settings.patente)}
    </div>
  </div>
  <div style="display:flex;gap:8px;padding-bottom:12px;">
    ${settings.networkLogos.slice(0, 3).map(nl =>
      `<div style="background:#fff;border-radius:6px;padding:4px 8px;display:flex;align-items:center;justify-content:center;">
        ${nl.imageData
          ? `<img src="${nl.imageData}" style="height:28px;object-fit:contain;" alt="${esc(nl.name)}"/>`
          : `<span style="font-size:9px;font-weight:700;color:${NAV};">${esc(nl.name)}</span>`
        }
      </div>`
    ).join('')}
  </div>
</div>

<!-- ORANGE BAR -->
<div style="background:${OR};height:6px;"></div>

<!-- INVOICE TITLE -->
<div style="background:${NAV};padding:14px 24px;text-align:center;">
  <div style="color:${OR};font-size:22px;font-weight:900;letter-spacing:4px;text-transform:uppercase;">FACTURE</div>
  <div style="color:${WH};font-size:15px;font-weight:700;letter-spacing:2px;margin-top:2px;">${esc(invoice.invoiceNumber)}</div>
</div>

<!-- ORANGE BAR -->
<div style="background:${OR};height:4px;"></div>

<!-- DATES + CLIENT -->
<div style="padding:16px 24px;display:grid;grid-template-columns:1fr 1fr;gap:16px;">

  <!-- Dates -->
  <div style="border:2px solid ${NAV};border-radius:8px;padding:12px 16px;">
    <div style="font-size:10px;font-weight:800;color:${NAV};text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;border-bottom:2px solid ${OR};padding-bottom:4px;">
      Informations Facture
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="font-size:11px;color:#6b7280;padding:3px 0;">Date d&apos;émission</td>
          <td style="font-size:11px;font-weight:700;text-align:right;">${esc(formatDateFR(invoice.invoiceDate))}</td></tr>
      <tr><td style="font-size:11px;color:#6b7280;padding:3px 0;">Échéance</td>
          <td style="font-size:11px;font-weight:700;text-align:right;">${esc(formatDateFR(invoice.dueDate))}</td></tr>
      <tr><td style="font-size:11px;color:#6b7280;padding:3px 0;">Délai paiement</td>
          <td style="font-size:11px;font-weight:700;text-align:right;">${invoice.paymentTerms} jours</td></tr>
      <tr><td style="font-size:11px;color:#6b7280;padding:3px 0;">Réf. Client</td>
          <td style="font-size:11px;font-weight:700;text-align:right;font-family:monospace;">${esc(invoice.clientRef || '—')}</td></tr>
    </table>
  </div>

  <!-- Client -->
  <div style="border:2px solid ${OR};border-radius:8px;padding:12px 16px;">
    <div style="font-size:10px;font-weight:800;color:${NAV};text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;border-bottom:2px solid ${OR};padding-bottom:4px;">
      Facturé à
    </div>
    ${client ? `
      <div style="font-size:13px;font-weight:800;color:${NAV};">${esc(client.companyName)}</div>
      <div style="font-size:10px;color:#4b5563;margin-top:4px;line-height:1.6;">${clientAddr}</div>
      ${client.ice ? `<div style="font-size:10px;color:#4b5563;margin-top:4px;">ICE: ${esc(client.ice)}</div>` : ''}
      ${client.rc  ? `<div style="font-size:10px;color:#4b5563;">RC: ${esc(client.rc)}</div>` : ''}
      ${client.if_ ? `<div style="font-size:10px;color:#4b5563;">IF: ${esc(client.if_)}</div>` : ''}
    ` : '<div style="font-size:11px;color:#9ca3af;">Client non trouvé</div>'}
  </div>
</div>

<!-- TRANSPORT DETAILS -->
${transportRows.length > 0 ? `
<div style="padding:0 24px 16px;">
  <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    <div style="background:${NAV};padding:8px 14px;">
      <span style="color:${OR};font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">${esc(modeLabel)}</span>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <tbody>${transportHtml}</tbody>
    </table>
  </div>
</div>` : ''}

<!-- LINES TABLE -->
<div style="padding:0 24px 16px;">
  <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:${NAV};">
          <th style="padding:8px 10px;font-size:10px;font-weight:700;color:${WH};text-align:left;text-transform:uppercase;">Désignation</th>
          <th style="padding:8px 10px;font-size:10px;font-weight:700;color:${WH};text-align:right;text-transform:uppercase;white-space:nowrap;">P.U.</th>
          <th style="padding:8px 10px;font-size:10px;font-weight:700;color:${WH};text-align:center;text-transform:uppercase;">Qté</th>
          <th style="padding:8px 10px;font-size:10px;font-weight:700;color:${WH};text-align:right;text-transform:uppercase;white-space:nowrap;">Total Devise</th>
          <th style="padding:8px 10px;font-size:10px;font-weight:700;color:${WH};text-align:right;text-transform:uppercase;">Taux</th>
          <th style="padding:8px 10px;font-size:10px;font-weight:700;color:${WH};text-align:right;text-transform:uppercase;white-space:nowrap;">HT MAD</th>
          <th style="padding:8px 10px;font-size:10px;font-weight:700;color:${WH};text-align:center;text-transform:uppercase;">TVA</th>
        </tr>
      </thead>
      <tbody>${linesHtml}</tbody>
      <!-- VAT rows -->
      ${vatRows}
      <!-- Total HT -->
      <tr>
        <td colspan="5" style="padding:6px 12px;font-size:11px;text-align:right;font-weight:600;color:#374151;border-top:2px solid ${OR};">Total HT MAD</td>
        <td colspan="2" style="padding:6px 12px;font-size:11px;text-align:right;font-weight:700;font-family:monospace;border-top:2px solid ${OR};">${esc(formatMAD(totals.totalHT_MAD))}</td>
      </tr>
      ${totals.totalVAT > 0 ? `
      <tr>
        <td colspan="5" style="padding:4px 12px;font-size:11px;text-align:right;font-weight:600;color:#374151;">Total T.V.A</td>
        <td colspan="2" style="padding:4px 12px;font-size:11px;text-align:right;font-weight:700;font-family:monospace;">${esc(formatMAD(totals.totalVAT))}</td>
      </tr>` : ''}
      <!-- TTC -->
      <tr style="background:${NAV};">
        <td colspan="5" style="padding:8px 12px;font-size:13px;text-align:right;font-weight:800;color:${OR};">TOTAL T.T.C</td>
        <td colspan="2" style="padding:8px 12px;font-size:13px;text-align:right;font-weight:800;color:${WH};font-family:monospace;">${esc(formatMAD(totals.totalTTC))}</td>
      </tr>
    </table>
  </div>
</div>

<!-- AMOUNT IN WORDS -->
<div style="padding:0 24px 14px;">
  <div style="border:1px solid ${OR};border-radius:8px;padding:10px 16px;background:#fffbf5;">
    <span style="font-size:10px;font-weight:700;color:${NAV};text-transform:uppercase;">Net à payer T.T.C : </span>
    <span style="font-size:11px;font-weight:600;color:#374151;font-style:italic;">
      ${esc(amountToWordsFR(totals.totalTTC))}
    </span>
  </div>
</div>

<!-- BANK + NOTES -->
<div style="padding:0 24px 14px;display:grid;grid-template-columns:1fr 1fr;gap:16px;">
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;">
    <div style="font-size:10px;font-weight:800;color:${NAV};text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Coordonnées Bancaires</div>
    <div style="font-size:10px;color:#4b5563;line-height:1.8;">
      <div><strong>Banque:</strong> ${esc(settings.bankName)}</div>
      <div><strong>RIB:</strong> <span style="font-family:monospace;">${esc(settings.rib)}</span></div>
      <div><strong>SWIFT:</strong> ${esc(settings.swift)}</div>
      <div><strong>Bénéficiaire:</strong> ${esc(settings.bankLibelle)}</div>
    </div>
  </div>
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;">
    <div style="font-size:10px;font-weight:800;color:${NAV};text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Notes</div>
    <div style="font-size:10px;color:#4b5563;line-height:1.6;">
      ${invoice.notes ? esc(invoice.notes) : 'Paiement à régler dans les délais convenus.'}
    </div>
  </div>
</div>

<!-- FOOTER -->
<div style="background:${NAV};padding:8px 24px;margin-top:auto;">
  <div style="height:3px;background:${OR};margin-bottom:6px;border-radius:2px;"></div>
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <div style="color:#a0aec0;font-size:9px;">
      ${esc(settings.companyName)} &nbsp;|&nbsp; ${esc(settings.address)}
    </div>
    <div style="color:${OR};font-size:9px;font-weight:700;">
      ${esc(settings.email)} &nbsp;|&nbsp; ${esc(settings.website)}
    </div>
  </div>
</div>

</body>
</html>`
}
