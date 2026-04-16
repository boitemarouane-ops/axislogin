/**
 * buildInvoicePDF.ts
 * Pure-JS PDF builder using pdfmake.
 * No React, no canvas, no screenshots — real vector PDF.
 */

import type { Invoice, Client, InvoiceLine } from './types'
import type { CompanySettings } from './settings'
import {
  calcInvoiceTotals,
  formatMAD,
  formatCurrency,
  amountToWordsFR,
  capitalize,
  formatDateFR,
} from './finance'
import { MODE_LABELS } from './types'

const OR  = '#fd9f14'
const NAV = '#003061'
const WHT = '#ffffff'
const GRY = '#f5f5f5'

// pdfmake style helpers
function cell(
  text: string,
  opts: {
    bold?: boolean
    color?: string
    fillColor?: string
    alignment?: 'left' | 'center' | 'right'
    fontSize?: number
    border?: [boolean, boolean, boolean, boolean]
    colSpan?: number
    rowSpan?: number
    margin?: [number, number, number, number]
    italics?: boolean
  } = {}
) {
  return {
    text,
    bold:       opts.bold       ?? false,
    color:      opts.color      ?? '#1a1a1a',
    fillColor:  opts.fillColor  ?? null,
    alignment:  opts.alignment  ?? 'left',
    fontSize:   opts.fontSize   ?? 8,
    border:     opts.border     ?? [true, true, true, true],
    colSpan:    opts.colSpan    ?? 1,
    rowSpan:    opts.rowSpan    ?? 1,
    margin:     opts.margin     ?? [3, 3, 3, 3],
    italics:    opts.italics    ?? false,
  }
}

function headerCell(text: string) {
  return cell(text, {
    bold:       true,
    color:      WHT,
    fillColor:  OR,
    alignment:  'center',
    fontSize:   8,
    border:     [false, false, false, false],
    margin:     [4, 4, 4, 4],
  })
}

function nb() {
  return { text: '', border: [false, false, false, false] }
}

export async function buildInvoicePDF(
  invoice: Invoice,
  client:  Client | null,
  settings: CompanySettings,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfMake = ((await import('pdfmake/build/pdfmake')) as any).default

  // Load vfs_fonts and register — handle all export shapes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vfsModule = (await import('pdfmake/build/vfs_fonts')) as any
  const vfs = vfsModule?.default?.pdfMake?.vfs
    ?? vfsModule?.pdfMake?.vfs
    ?? vfsModule?.default?.vfs
    ?? vfsModule?.vfs
    ?? {}

  // pdfmake needs fonts registered before createPdf is called
  pdfMake.vfs = vfs

  // Tell pdfmake which fonts to use — Roboto is bundled in vfs_fonts
  pdfMake.fonts = {
    Roboto: {
      normal:      'Roboto-Regular.ttf',
      bold:        'Roboto-Medium.ttf',
      italics:     'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf',
    },
  }

  const md    = invoice.modeData as Record<string, string>
  const lines = invoice.lines as InvoiceLine[]
  const totals = calcInvoiceTotals(lines)

  // ── Company info ────────────────────────────────────────────────
  const companyName    = settings.companyName    || 'AXIS SHIPPING LINE'
  const companyAddress = settings.address        || ''
  const companyCity    = settings.city           || ''
  const companyPhone   = settings.phone          || ''
  const companyEmail   = settings.email          || ''
  const companyIce     = settings.ice            || ''
  const companyIf      = settings.if_            || ''
  const companyRc      = settings.rc             || ''
  const companyPatente = settings.patente        || ''
  const companyIban    = settings.bankRib        || ''
  const companySwift   = settings.bankSwift      || ''
  const companyBank    = settings.bankName       || ''

  // ── Client info ─────────────────────────────────────────────────
  const clientName = client?.companyName ?? '—'
  const clientAddr = [client?.address1, client?.address2].filter(Boolean).join(', ')
  const clientCity = [client?.postalCode, client?.city, client?.country].filter(Boolean).join(' ')
  const clientIce  = client?.ice  || ''
  const clientIf   = client?.if_  || ''
  const clientRc   = client?.rc   || ''

  // ── Transport fields ────────────────────────────────────────────
  const transportRows = [
    ['Origine',      md.origin      || '—', 'Franchise',         md.franchise     || '—'],
    ['Destination',  md.destination || '—', 'AWB',               md.awbNumber     || md.bl || '—'],
    ['N° LTA',       md.awbNumber   || '—', '# OF PACKAGES',     md.packages      || '—'],
    ['Type',         md.type        || '—', 'Poids Brut',        md.grossWeight   || '—'],
    ['Fournisseur',  md.supplier    || md.oceanCarrier || '—', 'Chargeable Weight', md.chargeableWeight || '—'],
    ['Marchandise',  md.commodity   || '—', 'Volume',            md.volume        || '—'],
    ['Voyage',       md.voyageNumber|| '—', 'ETD',               md.etd           || '—'],
    ['Agent',        md.agentName   || '—', 'ETA',               md.eta           || '—'],
  ]

  // ── Invoice lines table ─────────────────────────────────────────
  const lineHeaders = [
    headerCell('Concept'),
    headerCell('Total Devise'),
    headerCell('Montant HT MAD'),
    headerCell('Qté'),
    headerCell('Total HT MAD'),
    headerCell('TVA%'),
  ]

  const lineRows = lines.map(l => [
    cell(l.description, { fontSize: 8 }),
    cell(formatCurrency(l.totalForeign, l.currency), { alignment: 'right', fontSize: 8 }),
    cell(formatCurrency(l.unitPrice,    l.currency), { alignment: 'right', fontSize: 8 }),
    cell(String(l.quantity),                          { alignment: 'center', fontSize: 8 }),
    cell(formatMAD(l.totalMAD_HT),                   { alignment: 'right', fontSize: 8 }),
    cell(l.vatCode + '%',                             { alignment: 'center', fontSize: 8 }),
  ])

  const vatBreakdown = Object.entries(totals.vatBreakdown)
    .filter(([, v]) => v > 0)
    .map(([rate, amt]) => `TVA ${rate}% : ${formatMAD(amt)}`)
    .join('   ')

  const amountWords = capitalize(amountToWordsFR(totals.totalTTC))

  // ── Determine exchange rate to display ──────────────────────────
  const exRate = lines.find(l => l.exchangeRate && l.exchangeRate !== 1)?.exchangeRate
    ?? invoice.exchangeRateGlobal
    ?? 1

  // ─────────────────────────────────────────────────────────────────
  // pdfmake document definition
  // ─────────────────────────────────────────────────────────────────
  const docDefinition = {
    pageSize:    'A4' as const,
    pageMargins: [25, 20, 25, 20] as [number, number, number, number],
    defaultStyle: { font: 'Roboto', fontSize: 8 },

    content: [

      // ── HEADER ─────────────────────────────────────────────────
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: companyName, bold: true, fontSize: 14, color: NAV, margin: [0, 0, 0, 2] },
              { text: companyAddress, fontSize: 7, color: '#444' },
              { text: `${companyCity}`, fontSize: 7, color: '#444' },
              { text: `Tél: ${companyPhone}  |  ${companyEmail}`, fontSize: 7, color: '#444', margin: [0, 2, 0, 0] },
            ],
          },
          {
            width: 'auto',
            alignment: 'right' as const,
            stack: [
              { text: 'Member Of', bold: true, fontSize: 7, color: OR, decoration: 'underline' },
              {
                columns: ['ALLFORWARD', 'WCA', 'JCTRANS', 'DF ALLIANCE'].map(n => ({
                  text: n,
                  fontSize: 6,
                  bold: true,
                  color: NAV,
                  margin: [2, 1, 2, 1],
                })),
              },
            ],
          },
        ],
        margin: [0, 0, 0, 8],
      },

      // ── Orange separator ───────────────────────────────────────
      { canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 545, y2: 0, lineWidth: 1.5, lineColor: OR }] },
      { text: '', margin: [0, 0, 0, 6] },

      // ── FACTURE N° ─────────────────────────────────────────────
      {
        text: `FACTURE N° : ${invoice.invoiceNumber}`,
        bold:      true,
        fontSize:  16,
        color:     NAV,
        alignment: 'center' as const,
        margin:    [0, 0, 0, 10],
      },

      // ── DATE + CLIENT ──────────────────────────────────────────
      {
        columns: [
          {
            width: '48%',
            stack: [
              {
                table: {
                  widths: ['auto', '*'],
                  body: [
                    [
                      { text: 'Date de facturation :', bold: true, fontSize: 8.5, border: [false,false,false,false], margin: [0,2,8,2] },
                      { text: formatDateFR(invoice.invoiceDate), bold: true, fontSize: 8.5, border: [false,false,false,false], margin: [0,2,0,2] },
                    ],
                    [
                      { text: 'Date de paiement :', bold: true, fontSize: 8.5, border: [false,false,false,false], margin: [0,2,8,2] },
                      { text: formatDateFR(invoice.dueDate), bold: true, fontSize: 8.5, border: [false,false,false,false], margin: [0,2,0,2] },
                    ],
                    [
                      { text: 'Mode :', bold: true, fontSize: 8.5, border: [false,false,false,false], margin: [0,2,8,2] },
                      { text: MODE_LABELS[invoice.mode] || invoice.mode, bold: true, fontSize: 8.5, border: [false,false,false,false], margin: [0,2,0,2] },
                    ],
                  ],
                },
                layout: 'noBorders',
              },
            ],
          },
          { width: '4%', text: '' },
          {
            width: '48%',
            table: {
              widths: ['*'],
              body: [
                [{ text: clientName, bold: true, fontSize: 9, color: NAV, border: [false,false,false,false], margin: [6,4,6,2] }],
                [{ text: clientAddr, fontSize: 8, border: [false,false,false,false], margin: [6,1,6,1] }],
                [{ text: clientCity, fontSize: 8, border: [false,false,false,false], margin: [6,1,6,1] }],
                ...(clientIce  ? [[{ text: `ICE : ${clientIce}`,  fontSize: 7.5, color: '#555', border: [false,false,false,false], margin: [6,1,6,1] }]] : []),
                ...(clientIf   ? [[{ text: `IF : ${clientIf}`,    fontSize: 7.5, color: '#555', border: [false,false,false,false], margin: [6,1,6,1] }]] : []),
                ...(clientRc   ? [[{ text: `RC : ${clientRc}`,    fontSize: 7.5, color: '#555', border: [false,false,false,false], margin: [6,1,6,4] }]] : []),
              ],
            },
            layout: {
              hLineWidth: () => 1.5,
              vLineWidth: () => 1.5,
              hLineColor: () => OR,
              vLineColor: () => OR,
              paddingLeft:   () => 0,
              paddingRight:  () => 0,
              paddingTop:    () => 0,
              paddingBottom: () => 0,
            },
          },
        ],
        margin: [0, 0, 0, 10],
      },

      // ── DÉTAILS TRANSPORT ───────────────────────────────────────
      {
        table: {
          widths: ['*'],
          body: [[{
            text: 'DÉTAILS',
            bold: true,
            fontSize: 9,
            color: WHT,
            fillColor: NAV,
            border: [false, false, false, false],
            margin: [6, 4, 6, 4],
          }]],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 0],
      },
      {
        table: {
          widths: ['16%', '34%', '20%', '30%'],
          body: transportRows.map(([ll, lv, rl, rv]) => [
            { text: ll, bold: true, fontSize: 7.5, fillColor: GRY, border: [false,false,false,false], margin: [4,3,2,3] },
            { text: lv, fontSize: 7.5,              fillColor: WHT, border: [false,false,false,false], margin: [2,3,4,3] },
            { text: rl, bold: true, fontSize: 7.5, fillColor: GRY, border: [false,false,false,false], margin: [4,3,2,3] },
            { text: rv, fontSize: 7.5,              fillColor: WHT, border: [false,false,false,false], margin: [2,3,4,3] },
          ]),
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft:   () => 0,
          paddingRight:  () => 0,
          paddingTop:    () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 8],
      },

      // ── LINES TABLE ─────────────────────────────────────────────
      {
        table: {
          widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
          headerRows: 1,
          body: [lineHeaders, ...lineRows],
        },
        layout: {
          hLineWidth: (i: number) => i === 0 || i === 1 ? 0 : 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#ddd',
          fillColor:  (i: number) => i > 0 && i % 2 === 0 ? GRY : null,
        },
        margin: [0, 0, 0, 8],
      },

      // ── TOTALS ──────────────────────────────────────────────────
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 220,
            table: {
              widths: ['*', 'auto'],
              body: [
                [
                  { text: 'TOTAL MONTANT H.T :', bold: true, fontSize: 8, border: [false,false,false,false], fillColor: GRY, margin: [6,3,4,3] },
                  { text: formatMAD(totals.totalHT_MAD), bold: true, fontSize: 8, border: [false,false,false,false], fillColor: GRY, alignment: 'right' as const, margin: [4,3,6,3] },
                ],
                ...(totals.vatBreakdown[20] > 0 ? [[
                  { text: 'T.V.A (20%) :', bold: true, fontSize: 8, border: [false,false,false,false], margin: [6,2,4,2] },
                  { text: formatMAD(totals.vatBreakdown[20]), bold: true, fontSize: 8, border: [false,false,false,false], alignment: 'right' as const, margin: [4,2,6,2] },
                ]] : []),
                ...(totals.vatBreakdown[10] > 0 ? [[
                  { text: 'T.V.A (10%) :', bold: true, fontSize: 8, border: [false,false,false,false], margin: [6,2,4,2] },
                  { text: formatMAD(totals.vatBreakdown[10]), bold: true, fontSize: 8, border: [false,false,false,false], alignment: 'right' as const, margin: [4,2,6,2] },
                ]] : []),
                [
                  { text: 'TOTAL MONTANT TTC :', bold: true, fontSize: 8, border: [false,false,false,false], fillColor: GRY, margin: [6,3,4,3] },
                  { text: formatMAD(totals.totalTTC), bold: true, fontSize: 8, border: [false,false,false,false], fillColor: GRY, alignment: 'right' as const, margin: [4,3,6,3] },
                ],
                [
                  { text: `Taux de change :`, bold: true, fontSize: 8, border: [false,false,false,false], margin: [6,2,4,2] },
                  { text: exRate.toFixed(3), bold: true, fontSize: 8, border: [false,false,false,false], alignment: 'right' as const, margin: [4,2,6,2] },
                ],
                [
                  { text: 'NET A PAYER T.T.C :', bold: true, fontSize: 9, color: NAV, border: [false,false,false,false], fillColor: OR + '33', margin: [6,4,4,4] },
                  { text: formatMAD(totals.totalTTC), bold: true, fontSize: 9, color: NAV, border: [false,false,false,false], fillColor: OR + '33', alignment: 'right' as const, margin: [4,4,6,4] },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0,
              vLineWidth: () => 0,
            },
          },
        ],
        margin: [0, 0, 0, 8],
      },

      // ── AMOUNT IN WORDS ─────────────────────────────────────────
      {
        table: {
          widths: ['*'],
          body: [[
            {
              stack: [
                { text: 'SOIT UN MONTANT DE', bold: true, fontSize: 8, color: WHT },
                { text: amountWords.toUpperCase(), bold: true, fontSize: 9, color: WHT, margin: [0,3,0,0] },
              ],
              fillColor: NAV,
              border: [false,false,false,false],
              margin: [8,6,8,6],
            },
          ]],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 8],
      },

      // ── BANK INFO ───────────────────────────────────────────────
      {
        table: {
          widths: ['*'],
          body: [[{
            text: 'INFORMATIONS BANCAIRES',
            bold: true, fontSize: 9, color: WHT,
            fillColor: NAV, border: [false,false,false,false],
            margin: [6,4,6,4],
          }]],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 0],
      },
      {
        table: {
          widths: ['auto', '*', 'auto', '*'],
          body: [
            [
              { text: 'Banque :', bold: true, fontSize: 7.5, border: [false,false,false,false], fillColor: GRY, margin: [4,3,2,3] },
              { text: companyBank, fontSize: 7.5, border: [false,false,false,false], margin: [2,3,4,3] },
              { text: 'SWIFT / BIC :', bold: true, fontSize: 7.5, border: [false,false,false,false], fillColor: GRY, margin: [4,3,2,3] },
              { text: companySwift, fontSize: 7.5, border: [false,false,false,false], margin: [2,3,4,3] },
            ],
            [
              { text: 'RIB / IBAN :', bold: true, fontSize: 7.5, border: [false,false,false,false], fillColor: GRY, margin: [4,3,2,3] },
              { text: companyIban, fontSize: 7.5, colSpan: 3, border: [false,false,false,false], margin: [2,3,4,3] },
              nb(), nb(),
            ],
          ],
        },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0 },
        margin: [0, 0, 0, 8],
      },

      // ── COMPANY FISCAL INFO ─────────────────────────────────────
      {
        columns: [
          { text: `ICE : ${companyIce}`, fontSize: 7, color: '#666' },
          { text: `IF : ${companyIf}`,   fontSize: 7, color: '#666', alignment: 'center' as const },
          { text: `RC : ${companyRc}`,   fontSize: 7, color: '#666', alignment: 'center' as const },
          { text: `Patente : ${companyPatente}`, fontSize: 7, color: '#666', alignment: 'right' as const },
        ],
        margin: [0, 0, 0, 6],
      },

      // ── Footer separator ────────────────────────────────────────
      { canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 545, y2: 0, lineWidth: 1, lineColor: OR }] },
      { text: companyAddress + ' — ' + companyCity + ' — ' + companyPhone, fontSize: 6.5, color: '#888', alignment: 'center' as const, margin: [0,3,0,0] },
    ],

    styles: {
      tableHeader: { bold: true, fontSize: 8, color: WHT, fillColor: OR },
    },
  }

  // Verify VFS loaded correctly before generating
  if (!pdfMake.vfs || Object.keys(pdfMake.vfs).length === 0) {
    throw new Error('pdfmake VFS fonts not loaded — cannot generate PDF')
  }

  const filename = `Facture_${invoice.invoiceNumber}.pdf`

  // Use getBlob instead of download() to get a Promise we can await
  await new Promise<void>((resolve, reject) => {
    try {
      pdfMake.createPdf(docDefinition).getBlob((blob: Blob) => {
        const url = URL.createObjectURL(blob)
        const a   = document.createElement('a')
        a.href     = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        resolve()
      })
    } catch (err) {
      reject(err)
    }
  })
}
