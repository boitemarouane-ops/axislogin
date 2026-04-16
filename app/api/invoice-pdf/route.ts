export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import type { Invoice, Client, InvoiceLine } from '@/lib/types'
import type { CompanySettings } from '@/lib/settings'
import {
  calcInvoiceTotals, formatMAD, formatCurrency,
  amountToWordsFR, capitalize, formatDateFR,
} from '@/lib/finance'
import { MODE_LABELS } from '@/lib/types'

const OR  = '#fd9f14'
const NAV = '#003061'
const WHT = '#ffffff'
const GRY = '#f5f5f5'

function buildDocDefinition(invoice: Invoice, client: Client | null, settings: CompanySettings) {
  const md = invoice.modeData as unknown as Record<string, string>
  const lines  = invoice.lines as InvoiceLine[]
  const totals = calcInvoiceTotals(lines)

  const companyName    = settings.companyName || 'AXIS SHIPPING LINE'
  const companyAddress = settings.address     || ''
  const companyCity    = settings.city        || ''
  const companyPhone   = settings.phone       || ''
  const companyEmail   = settings.email       || ''
  const companyIce     = settings.ice         || ''
  const companyIf      = settings.if_         || ''
  const companyRc      = settings.rc          || ''
  const companyPatente = settings.patente     || ''
  const companyIban    = settings.bankRib     || ''
  const companySwift   = settings.bankSwift   || ''
  const companyBank    = settings.bankName    || ''

  const clientName = client?.companyName ?? '—'
  const clientAddr = [client?.address1, client?.address2].filter(Boolean).join(', ')
  const clientCity = [client?.postalCode, client?.city, client?.country].filter(Boolean).join(' ')
  const clientIce  = client?.ice || ''
  const clientIf   = client?.if_ || ''
  const clientRc   = client?.rc  || ''

  const transportRows = [
    ['Origine',     md.origin       || '—', 'Franchise',          md.franchise          || '—'],
    ['Destination', md.destination  || '—', 'AWB',                md.awbNumber || md.bl || '—'],
    ['N° LTA',      md.awbNumber    || '—', '# OF PACKAGES',      md.packages           || '—'],
    ['Type',        md.type         || '—', 'Poids Brut',         md.grossWeight        || '—'],
    ['Fournisseur', md.supplier || md.oceanCarrier || '—', 'Chargeable Weight', md.chargeableWeight || '—'],
    ['Marchandise', md.commodity    || '—', 'Volume',             md.volume             || '—'],
    ['Voyage',      md.voyageNumber || '—', 'ETD',                md.etd                || '—'],
    ['Agent',       md.agentName    || '—', 'ETA',                md.eta                || '—'],
  ]

  const lineHeaders = ['Concept', 'Total Devise', 'Montant HT MAD', 'Qté', 'Total HT MAD', 'TVA%'].map(h => ({
    text: h, bold: true, color: WHT, fillColor: OR,
    alignment: 'center', fontSize: 8,
    border: [false, false, false, false] as [boolean,boolean,boolean,boolean],
    margin: [4, 4, 4, 4] as [number,number,number,number],
  }))

  const lineRows = lines.map((l, i) => [
    { text: l.description,                       fontSize: 8, border: [false,false,false,false] as [boolean,boolean,boolean,boolean], fillColor: i % 2 === 0 ? WHT : GRY, margin: [4,3,4,3] as [number,number,number,number] },
    { text: formatCurrency(l.totalForeign, l.currency), fontSize: 8, alignment: 'right', border: [false,false,false,false] as [boolean,boolean,boolean,boolean], fillColor: i % 2 === 0 ? WHT : GRY, margin: [4,3,4,3] as [number,number,number,number] },
    { text: formatCurrency(l.unitPrice, l.currency),    fontSize: 8, alignment: 'right', border: [false,false,false,false] as [boolean,boolean,boolean,boolean], fillColor: i % 2 === 0 ? WHT : GRY, margin: [4,3,4,3] as [number,number,number,number] },
    { text: String(l.quantity),                  fontSize: 8, alignment: 'center', border: [false,false,false,false] as [boolean,boolean,boolean,boolean], fillColor: i % 2 === 0 ? WHT : GRY, margin: [4,3,4,3] as [number,number,number,number] },
    { text: formatMAD(l.totalMAD_HT),            fontSize: 8, alignment: 'right', border: [false,false,false,false] as [boolean,boolean,boolean,boolean], fillColor: i % 2 === 0 ? WHT : GRY, margin: [4,3,4,3] as [number,number,number,number] },
    { text: l.vatCode + '%',                     fontSize: 8, alignment: 'center', border: [false,false,false,false] as [boolean,boolean,boolean,boolean], fillColor: i % 2 === 0 ? WHT : GRY, margin: [4,3,4,3] as [number,number,number,number] },
  ])

  const exRate = lines.find(l => l.exchangeRate && l.exchangeRate !== 1)?.exchangeRate
    ?? (invoice as Record<string,unknown>).exchangeRateGlobal as number ?? 1

  const amountWords = capitalize(amountToWordsFR(totals.totalTTC))

  const vatRows = Object.entries(totals.vatBreakdown)
    .filter(([, v]) => v > 0)
    .map(([rate, amt]) => [
      { text: `T.V.A (${rate}%) :`, bold: true, fontSize: 8, border: [false,false,false,false] as [boolean,boolean,boolean,boolean], margin: [6,2,4,2] as [number,number,number,number] },
      { text: formatMAD(amt), bold: true, fontSize: 8, alignment: 'right', border: [false,false,false,false] as [boolean,boolean,boolean,boolean], margin: [4,2,6,2] as [number,number,number,number] },
    ])

  return {
    pageSize: 'A4',
    pageMargins: [28, 22, 28, 22],
    defaultStyle: { font: 'Roboto', fontSize: 8 },

    content: [
      // ── HEADER ──────────────────────────────────────────────────
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: companyName, bold: true, fontSize: 15, color: NAV, margin: [0,0,0,2] },
              { text: companyAddress, fontSize: 7, color: '#555' },
              { text: companyCity, fontSize: 7, color: '#555' },
              { text: `Tél: ${companyPhone}   |   ${companyEmail}`, fontSize: 7, color: '#555', margin: [0,2,0,0] },
            ],
          },
          {
            width: 'auto',
            alignment: 'right',
            stack: [
              { text: 'Member Of', bold: true, fontSize: 7, color: OR, decoration: 'underline' },
              {
                columns: ['ALLFORWARD', 'WCA', 'JCTRANS', 'DF ALLIANCE'].map(n => ({
                  text: n, fontSize: 6, bold: true, color: NAV, margin: [3,2,3,2],
                })),
                margin: [0,3,0,0],
              },
            ],
          },
        ],
        margin: [0,0,0,6],
      },

      // ── Orange line ──────────────────────────────────────────────
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 539, y2: 0, lineWidth: 2, lineColor: OR }], margin: [0,0,0,8] },

      // ── FACTURE N° ───────────────────────────────────────────────
      { text: `FACTURE N° : ${invoice.invoiceNumber}`, bold: true, fontSize: 16, color: NAV, alignment: 'center', margin: [0,0,0,10] },

      // ── DATES + CLIENT BOX ───────────────────────────────────────
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: `Date de facturation :   ${formatDateFR(invoice.invoiceDate)}`, bold: true, fontSize: 9, margin: [0,0,0,4] },
              { text: `Date de paiement    :   ${formatDateFR(invoice.dueDate)}`,     bold: true, fontSize: 9, margin: [0,0,0,4] },
              { text: `Type : ${MODE_LABELS[invoice.mode] || invoice.mode}`,           bold: true, fontSize: 9, margin: [0,0,0,4] },
            ],
          },
          { width: '3%', text: '' },
          {
            width: '47%',
            table: {
              widths: ['*'],
              body: [
                [{ text: clientName, bold: true, fontSize: 10, color: NAV, border: [false,false,false,false] as [boolean,boolean,boolean,boolean], margin: [8,5,8,2] as [number,number,number,number] }],
                [{ text: clientAddr, fontSize: 8.5, border: [false,false,false,false] as [boolean,boolean,boolean,boolean], margin: [8,2,8,1] as [number,number,number,number] }],
                [{ text: clientCity, fontSize: 8.5, border: [false,false,false,false] as [boolean,boolean,boolean,boolean], margin: [8,1,8,1] as [number,number,number,number] }],
                ...(clientIce ? [[{ text: `ICE : ${clientIce}`, fontSize: 7.5, color: '#666', border: [false,false,false,false] as [boolean,boolean,boolean,boolean], margin: [8,1,8,1] as [number,number,number,number] }]] : []),
                ...(clientIf  ? [[{ text: `IF : ${clientIf}`,   fontSize: 7.5, color: '#666', border: [false,false,false,false] as [boolean,boolean,boolean,boolean], margin: [8,1,8,1] as [number,number,number,number] }]] : []),
                ...(clientRc  ? [[{ text: `RC : ${clientRc}`,   fontSize: 7.5, color: '#666', border: [false,false,false,false] as [boolean,boolean,boolean,boolean], margin: [8,1,8,5] as [number,number,number,number] }]] : []),
              ],
            },
            layout: {
              hLineWidth: () => 1.5, vLineWidth: () => 1.5,
              hLineColor: () => OR,  vLineColor: () => OR,
            },
          },
        ],
        margin: [0,0,0,10],
      },

      // ── DETAILS TRANSPORT header ─────────────────────────────────
      {
        table: { widths: ['*'], body: [[{ text: 'DÉTAILS', bold: true, fontSize: 9, color: WHT, fillColor: NAV, border: [false,false,false,false] as [boolean,boolean,boolean,boolean], margin: [6,4,6,4] as [number,number,number,number] }]] },
        layout: 'noBorders',
        margin: [0,0,0,0],
      },
      {
        table: {
          widths: ['17%', '33%', '20%', '30%'],
          body: transportRows.map(([ll, lv, rl, rv]) => [
            { text: ll, bold: true, fontSize: 7.5, fillColor: GRY, border: [false,false,false,false] as [boolean,boolean,boolean,boolean], margin: [5,3,3,3] as [number,number,number,number] },
            { text: lv,             fontSize: 7.5,                  border: [false,false,false,false] as [boolean,boolean,boolean,boolean], margin: [3,3,5,3] as [number,number,number,number] },
            { text: rl, bold: true, fontSize: 7.5, fillColor: GRY, border: [false,false,false,false] as [boolean,boolean,boolean,boolean], margin: [5,3,3,3] as [number,number,number,number] },
            { text: rv,             fontSize: 7.5,                  border: [false,false,false,false] as [boolean,boolean,boolean,boolean], margin: [3,3,5,3] as [number,number,number,number] },
          ]),
        },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0 },
        margin: [0,0,0,10],
      },

      // ── LINES TABLE ──────────────────────────────────────────────
      {
        table: {
          widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
          headerRows: 1,
          body: [lineHeaders, ...lineRows],
        },
        layout: {
          hLineWidth: (i: number) => (i === 0 || i === 1) ? 0 : 0.4,
          vLineWidth: () => 0,
          hLineColor: () => '#e0e0e0',
        },
        margin: [0,0,0,10],
      },

      // ── TOTALS ───────────────────────────────────────────────────
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 230,
            table: {
              widths: ['*', 'auto'],
              body: [
                [
                  { text: 'TOTAL H.T :',      bold: true, fontSize: 8.5, border: [false,false,false,false] as [boolean,boolean,boolean,boolean], fillColor: GRY, margin: [6,4,4,4] as [number,number,number,number] },
                  { text: formatMAD(totals.totalHT_MAD), bold: true, fontSize: 8.5, alignment: 'right', border: [false,false,false,false] as [boolean,boolean,boolean,boolean], fillColor: GRY, margin: [4,4,6,4] as [number,number,number,number] },
                ],
                ...vatRows,
                [
                  { text: 'TOTAL TTC :',      bold: true, fontSize: 8.5, border: [false,false,false,false] as [boolean,boolean,boolean,boolean], fillColor: GRY, margin: [6,4,4,4] as [number,number,number,number] },
                  { text: formatMAD(totals.totalTTC), bold: true, fontSize: 8.5, alignment: 'right', border: [false,false,false,false] as [boolean,boolean,boolean,boolean], fillColor: GRY, margin: [4,4,6,4] as [number,number,number,number] },
                ],
                [
                  { text: 'Taux de change :', bold: true, fontSize: 8,   border: [false,false,false,false] as [boolean,boolean,boolean,boolean], margin: [6,3,4,3] as [number,number,number,number] },
                  { text: Number(exRate).toFixed(3), bold: true, fontSize: 8, alignment: 'right', border: [false,false,false,false] as [boolean,boolean,boolean,boolean], margin: [4,3,6,3] as [number,number,number,number] },
                ],
                [
                  { text: 'NET A PAYER TTC :', bold: true, fontSize: 10, color: WHT, border: [false,false,false,false] as [boolean,boolean,boolean,boolean], fillColor: NAV, margin: [6,5,4,5] as [number,number,number,number] },
                  { text: formatMAD(totals.totalTTC), bold: true, fontSize: 10, color: WHT, alignment: 'right', border: [false,false,false,false] as [boolean,boolean,boolean,boolean], fillColor: NAV, margin: [4,5,6,5] as [number,number,number,number] },
                ],
              ],
            },
            layout: { hLineWidth: () => 0, vLineWidth: () => 0 },
          },
        ],
        margin: [0,0,0,10],
      },

      // ── AMOUNT IN WORDS ──────────────────────────────────────────
      {
        table: { widths: ['*'], body: [[{
          stack: [
            { text: 'ARRÊTÉ LA PRÉSENTE FACTURE À LA SOMME DE :', bold: true, fontSize: 7.5, color: '#ccc' },
            { text: amountWords.toUpperCase(), bold: true, fontSize: 9, color: WHT, margin: [0,3,0,0] },
          ],
          fillColor: NAV, border: [false,false,false,false] as [boolean,boolean,boolean,boolean], margin: [10,7,10,7] as [number,number,number,number],
        }]] },
        layout: 'noBorders',
        margin: [0,0,0,10],
      },

      // ── BANK INFO ─────────────────────────────────────────────────
      {
        table: { widths: ['*'], body: [[{ text: 'INFORMATIONS BANCAIRES', bold: true, fontSize: 9, color: WHT, fillColor: NAV, border: [false,false,false,false] as [boolean,boolean,boolean,boolean], margin: [6,4,6,4] as [number,number,number,number] }]] },
        layout: 'noBorders',
        margin: [0,0,0,0],
      },
      {
        table: {
          widths: ['auto','*','auto','*'],
          body: [
            [
              { text: 'Banque :',     bold: true, fontSize: 7.5, fillColor: GRY, border: [false,false,false,false] as [boolean,boolean,boolean,boolean], margin: [5,3,3,3] as [number,number,number,number] },
              { text: companyBank,   fontSize: 7.5,               border: [false,false,false,false] as [boolean,boolean,boolean,boolean], margin: [3,3,5,3] as [number,number,number,number] },
              { text: 'SWIFT :',     bold: true, fontSize: 7.5, fillColor: GRY, border: [false,false,false,false] as [boolean,boolean,boolean,boolean], margin: [5,3,3,3] as [number,number,number,number] },
              { text: companySwift, fontSize: 7.5,               border: [false,false,false,false] as [boolean,boolean,boolean,boolean], margin: [3,3,5,3] as [number,number,number,number] },
            ],
            [
              { text: 'RIB / IBAN :', bold: true, fontSize: 7.5, fillColor: GRY, border: [false,false,false,false] as [boolean,boolean,boolean,boolean], margin: [5,3,3,3] as [number,number,number,number] },
              { text: companyIban, colSpan: 3, fontSize: 7.5, border: [false,false,false,false] as [boolean,boolean,boolean,boolean], margin: [3,3,5,3] as [number,number,number,number] },
              { text: '' }, { text: '' },
            ],
          ],
        },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0 },
        margin: [0,0,0,10],
      },

      // ── FISCAL INFO ───────────────────────────────────────────────
      {
        columns: [
          { text: `ICE : ${companyIce}`,       fontSize: 7, color: '#777' },
          { text: `IF : ${companyIf}`,          fontSize: 7, color: '#777', alignment: 'center' },
          { text: `RC : ${companyRc}`,           fontSize: 7, color: '#777', alignment: 'center' },
          { text: `Patente : ${companyPatente}`, fontSize: 7, color: '#777', alignment: 'right' },
        ],
        margin: [0,0,0,8],
      },

      // ── Footer line ───────────────────────────────────────────────
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 539, y2: 0, lineWidth: 1, lineColor: OR }], margin: [0,0,0,4] },
      { text: `${companyAddress} — ${companyCity} — ${companyPhone} — ${companyEmail}`, fontSize: 6.5, color: '#999', alignment: 'center' },
    ],
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { invoice: Invoice; client: Client | null; settings: CompanySettings }
    if (!body.invoice) return NextResponse.json({ error: 'invoice missing' }, { status: 400 })

    // pdfmake server-side printer — must import from /src/printer, not the browser build
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PdfPrinter = require('pdfmake/src/printer') as new (fonts: unknown) => {
      createPdfKitDocument(docDef: unknown, options?: unknown): NodeJS.EventEmitter & { end(): void }
    }

    // Use built-in Roboto from pdfmake's virtual font store
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const vfsFonts = require('pdfmake/build/vfs_fonts') as { pdfMake: { vfs: Record<string, string> } }
    const vfs      = vfsFonts.pdfMake?.vfs ?? (vfsFonts as unknown as Record<string, string>)

    const fonts = {
      Roboto: {
        normal:      Buffer.from(vfs['Roboto-Regular.ttf'],    'base64'),
        bold:        Buffer.from(vfs['Roboto-Medium.ttf'],     'base64'),
        italics:     Buffer.from(vfs['Roboto-Italic.ttf'],     'base64'),
        bolditalics: Buffer.from(vfs['Roboto-MediumItalic.ttf'], 'base64'),
      },
    }

    const printer = new PdfPrinter(fonts)
    const docDef  = buildDocDefinition(body.invoice, body.client, body.settings)
    const pdfDoc  = printer.createPdfKitDocument(docDef)

    const chunks: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      pdfDoc.on('data',  (c: Buffer) => chunks.push(c))
      pdfDoc.on('end',   resolve)
      pdfDoc.on('error', reject)
      pdfDoc.end()
    })

    const buffer = Buffer.concat(chunks)
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="Facture_${body.invoice.invoiceNumber ?? 'facture'}.pdf"`,
        'Content-Length':      String(buffer.length),
        'Cache-Control':       'no-store',
      },
    })
  } catch (err) {
    console.error('[PDF API]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
