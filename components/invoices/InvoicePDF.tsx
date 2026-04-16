import {
  Document, Page, View, Text, Image, StyleSheet, Font,
} from '@react-pdf/renderer'
import { formatDateFR, amountToWordsFR, calcInvoiceTotals, round2 } from '@/lib/finance'
import { MODE_LABELS, type TransportMode } from '@/lib/types'
import type { Invoice, Client } from '@/lib/types'
import type { CompanySettings } from '@/lib/settings'

/* ── Brand colours ─────────────────────────────────────────────── */
const OR   = '#fd9f14'
const NAV  = '#003061'
const ORLT = '#ffe0b3'
const ORXL = '#fff3e2'
const WHT  = '#ffffff'
const GRY  = '#333333'

/* ── Formatters ────────────────────────────────────────────────── */
const fN = (n: number) =>
  n === 0 ? '' : n.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fMAD = (n: number) =>
  n.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD'

/* ── Transport rows ────────────────────────────────────────────── */
function getModeRows(mode: TransportMode, d: Record<string, string>) {
  const v = (k: string) => d[k] || ''
  if (mode === 'AIR') return {
    left:  [['Origine', v('origin')], ['Destination', v('destination')], ['N° LTA', v('awbNumber')], ['Type', v('type')], ['Fournisseur', v('supplier')], ['Marchandise', v('commodity')], ['Voyage', v('voyageNumber')], ['Agent', v('agentName') || v('airline')]],
    right: [['Franchise', v('franchise')], ['AWB', v('awbNumber')], ['# OF PACKAGES', v('packages')], ['Poids Brut', v('grossWeight') ? v('grossWeight') + ' kg' : ''], ['Chargeable Weight', v('chargeableWeight') ? v('chargeableWeight') + ' kg' : ''], ['Volume', v('volume') ? v('volume') + ' m³' : ''], ['ETD', v('etd')], ['ETA', v('eta')]],
  }
  if (mode === 'SEA_FCL' || mode === 'SEA_LCL') return {
    left:  [['Origine', v('origin')], ['Destination', v('destination')], ['POL', v('pol')], ['POD', v('pod')], ['Fournisseur', v('supplier')], ['Marchandise', v('commodity')], ['Voyage', v('voyageNumber')], ['Agent', v('agentName')]],
    right: [['Booking', v('booking')], ['BL', v('bl')], ['Navire', v('vessel')], ['Conteneur(s)', v('containers')], ['Type conteneur', v('containerType')], ['Poids Brut', v('grossWeight') ? v('grossWeight') + ' kg' : ''], ['ETD', v('etd')], ['ETA', v('eta')]],
  }
  return {
    left:  [['Origine', v('origin')], ['Destination', v('destination')], ['Fournisseur', v('supplier')], ['Marchandise', v('commodity')], ['Agent', v('agentName')]],
    right: [['Poids Brut', v('grossWeight') ? v('grossWeight') + ' kg' : ''], ['Volume', v('volume') ? v('volume') + ' m³' : ''], ['ETD', v('etd')], ['ETA', v('eta')]],
  }
}

/* ── Styles ─────────────────────────────────────────────────── */
const s = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', fontSize: 8, color: GRY, backgroundColor: WHT, paddingTop: 10, paddingBottom: 10, paddingLeft: 34, paddingRight: 34 },

  /* header */
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  logo:        { height: 58, objectFit: 'contain' },
  memberWrap:  { alignItems: 'flex-end' },
  memberRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: OR, textDecoration: 'underline' },
  netLogo:     { height: 14, objectFit: 'contain' },
  netBox:      { width: 22, height: 14, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  netBoxTxt:   { fontSize: 6, fontFamily: 'Helvetica-Bold', color: WHT },
  lines3:      { marginTop: 4, gap: 2 },
  line1px:     { height: 0.75, backgroundColor: OR },

  /* title */
  title:       { textAlign: 'center', marginTop: 6, marginBottom: 8 },
  titleTxt:    { fontFamily: 'Helvetica-Bold', fontSize: 14, color: NAV, letterSpacing: 0.5 },

  /* info + client */
  infoRow:     { flexDirection: 'row', gap: 14, marginBottom: 8 },
  infoLeft:    { flex: 1 },
  infoRight:   { flex: 1, border: '1.5pt', borderColor: OR, borderRadius: 3, padding: '7pt 10pt' },

  dateRow:     { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 3 },
  dateLabel:   { fontFamily: 'Helvetica-Bold', fontSize: 8, width: 110 },
  dateValue:   { fontFamily: 'Helvetica-Bold', fontSize: 8 },
  modeWrap:    { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: ORLT, paddingRight: 8, paddingTop: 3, paddingBottom: 3, marginTop: 1 },
  modeLabel:   { fontFamily: 'Helvetica-Bold', fontSize: 8, width: 110 },
  modeValue:   { fontFamily: 'Helvetica-Bold', fontSize: 8 },

  clientName:  { fontFamily: 'Helvetica-Bold', fontSize: 8, color: NAV, marginBottom: 3 },
  clientTxt:   { fontSize: 8, lineHeight: 1.5, color: GRY },

  /* transport table */
  transWrap:   { border: '0.5pt', borderColor: NAV, marginBottom: 8 },
  transRow:    { flexDirection: 'row', backgroundColor: WHT },
  tdLabel:     { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: NAV, width: '22%', padding: '2pt 4pt' },
  tdColon:     { fontSize: 7.5, width: '3%', textAlign: 'center', padding: '2pt 1pt', color: '#444' },
  tdValue:     { fontSize: 7.5, width: '25%', padding: '2pt 4pt 2pt 2pt' },

  /* lines table */
  tableWrap:   { marginBottom: 8 },
  thead:       { flexDirection: 'row', backgroundColor: OR },
  th:          { color: WHT, fontFamily: 'Helvetica-Bold', fontSize: 7, padding: '4pt 3pt', textAlign: 'center', border: '0.4pt', borderColor: OR },
  tr:          { flexDirection: 'row' },
  td:          { fontSize: 7.5, padding: '3pt 4pt', border: '0.4pt', borderColor: NAV },

  /* vat + totals */
  vatBlock:    { flexDirection: 'row', gap: 14, marginBottom: 8 },
  vatHead:     { flexDirection: 'row', backgroundColor: OR },
  vatTh:       { color: WHT, fontFamily: 'Helvetica-Bold', fontSize: 7, padding: '3pt 3pt', textAlign: 'center', border: '0.4pt', borderColor: OR },
  vatTr:       { flexDirection: 'row' },
  vatTd:       { fontSize: 7, padding: '2.5pt 3pt', border: '0.4pt', borderColor: NAV },
  totRow:      { flexDirection: 'row' },
  totLabel:    { fontFamily: 'Helvetica-Bold', fontSize: 7.5, padding: '2.5pt 5pt', border: '0.4pt', borderColor: NAV, backgroundColor: OR, color: WHT, flex: 1 },
  totLabelLt:  { fontFamily: 'Helvetica-Bold', fontSize: 7.5, padding: '2.5pt 5pt', border: '0.4pt', borderColor: NAV, backgroundColor: ORLT, color: NAV, flex: 1 },
  totValue:    { fontSize: 7.5, fontFamily: 'Helvetica-Bold', padding: '2.5pt 5pt', border: '0.4pt', borderColor: NAV, textAlign: 'right', width: 90 },
  totValueLt:  { fontSize: 7.5, fontFamily: 'Helvetica-Bold', padding: '2.5pt 5pt', border: '0.4pt', borderColor: NAV, textAlign: 'right', backgroundColor: ORLT, width: 90 },

  /* details + montant */
  detBlock:    { flexDirection: 'row', gap: 14, marginBottom: 8 },
  detBox:      { flex: 1, border: '0.5pt', borderColor: NAV },
  detHead:     { backgroundColor: OR, padding: '3pt 5pt', textAlign: 'center' },
  detHeadTxt:  { fontFamily: 'Helvetica-Bold', fontSize: 8, color: WHT, textDecoration: 'underline' },
  detBody:     { padding: '5pt 8pt' },
  detRow:      { flexDirection: 'row', marginBottom: 2.5 },
  detLabel:    { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: NAV, width: 80 },
  detColon:    { fontSize: 7.5, color: '#555', marginRight: 3 },
  detVal:      { fontSize: 7.5 },
  montantBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: '8pt 10pt' },
  montantTxt:  { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: GRY, textAlign: 'center', textTransform: 'uppercase', lineHeight: 1.5 },

  /* bank */
  bankBox:     { border: '0.5pt', borderColor: NAV, padding: '6pt 10pt', marginBottom: 8, borderRadius: 2 },
  bankRow:     { flexDirection: 'row', marginBottom: 2.5 },
  bankLabel:   { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: NAV, width: 90 },
  bankColon:   { fontSize: 7.5, color: '#555', marginRight: 5 },
  bankVal:     { fontSize: 7.5, color: GRY, fontFamily: 'Helvetica' },

  /* footer */
  footer:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTop: '2pt', borderColor: OR, paddingTop: 5, gap: 10 },
  footLogo:    { height: 50, objectFit: 'contain' },
  footCenter:  { flex: 1, textAlign: 'center' },
  footTxt:     { fontFamily: 'Helvetica-Bold', fontSize: 6, color: '#222', lineHeight: 1.7 },
})

/* ── Default logo URLs ─────────────────────────────────────────── */
const DEFAULT_LOGO        = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/api-attachments/HZYD486U5b2ZhhRyRAfUP-dQ53vPlmd73qMWevXO8Hl0ekVZngYX.png'
const DEFAULT_FOOTER_LOGO = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/api-attachments/FcfrycO2BoSj2ut7aNbyi-75A9xvHAzO6j7FEFvoi7ZttFF21INv.png'

const NET_COLORS = ['#e65c00', '#1a5276', '#c0392b', '#2e4057']
const NET_LABELS = ['A', 'W', 'J', 'D']

/* ── Component ─────────────────────────────────────────────────── */
export default function InvoicePDF({
  invoice,
  client,
  settings,
}: {
  invoice:  Invoice
  client:   Client | null
  settings: CompanySettings
}) {
  const modeData = invoice.modeData as Record<string, string>
  const totals   = calcInvoiceTotals(invoice.lines)
  const rows     = getModeRows(invoice.mode, modeData)
  const maxRows  = Math.max(rows.left.length, rows.right.length)

  const vatGroups = ([20, 10, 0] as const).map(code => {
    const ls = invoice.lines.filter(l => l.vatCode === code)
    const ht = round2(ls.reduce((s, l) => s + l.totalMAD_HT, 0))
    const vt = round2(ht * (code / 100))
    return { code, ht, vt }
  })

  const logoSrc        = settings.logoData        || DEFAULT_LOGO
  const footerLogoSrc  = settings.footerLogoData  || DEFAULT_FOOTER_LOGO

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── HEADER ─────────────────────────────────────────────── */}
        <View style={s.header}>
          <Image src={logoSrc} style={s.logo} />
          <View style={s.memberWrap}>
            <View style={s.memberRow}>
              <Text style={s.memberLabel}>Member Of</Text>
              {settings.networkLogos && settings.networkLogos.length > 0
                ? settings.networkLogos.map(n => (
                    <Image key={n.id} src={n.imageData} style={s.netLogo} />
                  ))
                : NET_COLORS.map((bg, i) => (
                    <View key={i} style={[s.netBox, { backgroundColor: bg }]}>
                      <Text style={s.netBoxTxt}>{NET_LABELS[i]}</Text>
                    </View>
                  ))
              }
            </View>
            <View style={s.lines3}>
              <View style={s.line1px} />
              <View style={s.line1px} />
              <View style={s.line1px} />
            </View>
          </View>
        </View>

        {/* ── TITLE ──────────────────────────────────────────────── */}
        <View style={s.title}>
          <Text style={s.titleTxt}>FACTURE N° : {invoice.invoiceNumber}</Text>
        </View>

        {/* ── INFO + CLIENT ──────────────────────────────────────── */}
        <View style={s.infoRow}>
          {/* Left */}
          <View style={s.infoLeft}>
            <View style={s.dateRow}>
              <Text style={s.dateLabel}>Date de facturation :</Text>
              <Text style={s.dateValue}>{formatDateFR(invoice.invoiceDate)}</Text>
            </View>
            <View style={s.dateRow}>
              <Text style={s.dateLabel}>Date de paiement :</Text>
              <Text style={s.dateValue}>{formatDateFR(invoice.dueDate)}</Text>
            </View>
            <View style={s.modeWrap}>
              <Text style={s.modeLabel}>Mode :</Text>
              <Text style={s.modeValue}>{MODE_LABELS[invoice.mode]}</Text>
            </View>
          </View>

          {/* Right: client */}
          <View style={s.infoRight}>
            <Text style={s.clientName}>{client?.companyName || '—'}</Text>
            {client?.address1 && <Text style={s.clientTxt}>{client.address1}</Text>}
            {client?.address2 && <Text style={s.clientTxt}>{client.address2}</Text>}
            {(client?.postalCode || client?.city || client?.country) && (
              <Text style={s.clientTxt}>
                {[client?.postalCode, client?.city, client?.country].filter(Boolean).join(', ')}
              </Text>
            )}
            {client?.contacts?.[0]?.phone && <Text style={s.clientTxt}>Tél : {client.contacts[0].phone}</Text>}
            {client?.contacts?.[0]?.email && <Text style={s.clientTxt}>Email : {client.contacts[0].email}</Text>}
            {client?.ice && <Text style={s.clientTxt}>ICE : {client.ice}</Text>}
          </View>
        </View>

        {/* ── TRANSPORT TABLE ────────────────────────────────────── */}
        <View style={s.transWrap}>
          {Array.from({ length: maxRows }).map((_, i) => {
            const [ll = '', lv = ''] = rows.left[i]  ?? []
            const [rl = '', rv = ''] = rows.right[i] ?? []
            return (
              <View key={i} style={s.transRow}>
                <Text style={s.tdLabel}>{ll}</Text>
                <Text style={s.tdColon}>{ll ? ':' : ''}</Text>
                <Text style={s.tdValue}>{lv}</Text>
                <Text style={s.tdLabel}>{rl}</Text>
                <Text style={s.tdColon}>{rl ? ':' : ''}</Text>
                <Text style={s.tdValue}>{rv}</Text>
              </View>
            )
          })}
        </View>

        {/* ── LINES TABLE ────────────────────────────────────────── */}
        <View style={s.tableWrap}>
          {/* Header */}
          <View style={s.thead}>
            {[
              { h: 'Concept',        w: '33%' },
              { h: 'Total Devise',   w: '14%' },
              { h: 'Montant HT MAD', w: '15%' },
              { h: 'Qte',            w: '6%'  },
              { h: 'Total HT MAD',   w: '16%' },
              { h: 'TVA%',           w: '12%' },
            ].map(({ h, w }) => (
              <Text key={h} style={[s.th, { width: w }]}>{h}</Text>
            ))}
          </View>
          {/* Rows */}
          {invoice.lines.length > 0
            ? invoice.lines.map((line, i) => (
                <View key={line.id} style={[s.tr, { backgroundColor: i % 2 === 0 ? WHT : ORXL }]}>
                  <Text style={[s.td, { width: '33%' }]}>{line.description}</Text>
                  <Text style={[s.td, { width: '14%', textAlign: 'right' }]}>
                    {line.totalForeign > 0 ? `${fN(line.totalForeign)} ${line.currency}` : ''}
                  </Text>
                  <Text style={[s.td, { width: '15%', textAlign: 'right' }]}>{fN(line.unitPrice)}</Text>
                  <Text style={[s.td, { width: '6%',  textAlign: 'center' }]}>{line.quantity}</Text>
                  <Text style={[s.td, { width: '16%', textAlign: 'right' }]}>{fN(line.totalMAD_HT)}</Text>
                  <Text style={[s.td, { width: '12%', textAlign: 'center' }]}>{line.vatCode}%</Text>
                </View>
              ))
            : Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={[s.tr, { backgroundColor: i % 2 === 0 ? WHT : ORXL }]}>
                  {[33, 14, 15, 6, 16, 12].map((w, j) => (
                    <Text key={j} style={[s.td, { width: `${w}%`, height: 18 }]}>{''}</Text>
                  ))}
                </View>
              ))
          }
        </View>

        {/* ── VAT + TOTALS ───────────────────────────────────────── */}
        <View style={s.vatBlock}>
          {/* VAT */}
          <View style={{ flex: 1 }}>
            <View style={s.vatHead}>
              {['Montant HT', 'Code TVA', 'TVA %', 'Total TVA'].map(h => (
                <Text key={h} style={[s.vatTh, { flex: 1 }]}>{h}</Text>
              ))}
            </View>
            {vatGroups.map((g, i) => (
              <View key={g.code} style={[s.vatTr, { backgroundColor: i % 2 === 0 ? WHT : ORXL }]}>
                <Text style={[s.vatTd, { flex: 1, textAlign: 'right' }]}>{g.ht > 0 ? fN(g.ht) : ''}</Text>
                <Text style={[s.vatTd, { flex: 1, textAlign: 'center' }]}>{g.code === 0 ? '-' : g.code}</Text>
                <Text style={[s.vatTd, { flex: 1, textAlign: 'center' }]}>{g.code === 0 ? '0%' : `${g.code},00%`}</Text>
                <Text style={[s.vatTd, { flex: 1, textAlign: 'right' }]}>{g.vt > 0 ? fN(g.vt) : ''}</Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={{ flex: 1 }}>
            {[
              { label: 'TOTAL MONTANT H.T :', value: fMAD(totals.totalHT_MAD), lt: false },
              { label: 'T.V.A',               value: fMAD(totals.totalVAT),    lt: false },
              { label: 'TOTAL MONTANT TTC :', value: fMAD(totals.totalTTC),    lt: false },
              { label: 'Taux de change :',    value: invoice.exchangeRateGlobal > 0 ? invoice.exchangeRateGlobal.toLocaleString('fr-MA', { minimumFractionDigits: 3 }) : '—', lt: true },
              { label: 'NET A PAYER T.T.C :', value: fMAD(totals.totalTTC),    lt: false },
            ].map(({ label, value, lt }) => (
              <View key={label} style={s.totRow}>
                <Text style={lt ? s.totLabelLt : s.totLabel}>{label}</Text>
                <Text style={lt ? s.totValueLt : s.totValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── DETAILS + SOIT UN MONTANT DE ───────────────────────── */}
        <View style={s.detBlock}>
          {/* DÉTAILS */}
          <View style={s.detBox}>
            <View style={s.detHead}><Text style={s.detHeadTxt}>DÉTAILS</Text></View>
            <View style={s.detBody}>
              {([
                ['Incoterme',      invoice.incoterm || ''],
                ['Taux de change', invoice.exchangeRateGlobal > 0 ? String(invoice.exchangeRateGlobal) : ''],
                ['Franchise',      modeData.franchise || ''],
                ['Conditions',     invoice.paymentTerms ? `${invoice.paymentTerms} jours` : ''],
                ['Ref Client',     invoice.clientRef || ''],
              ] as [string, string][]).map(([label, val]) => (
                <View key={label} style={s.detRow}>
                  <Text style={s.detLabel}>{label}</Text>
                  <Text style={s.detColon}> :</Text>
                  <Text style={s.detVal}>{val}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* SOIT UN MONTANT DE */}
          <View style={s.detBox}>
            <View style={s.detHead}><Text style={s.detHeadTxt}>SOIT UN MONTANT DE</Text></View>
            <View style={s.montantBody}>
              <Text style={s.montantTxt}>
                {totals.totalTTC > 0 ? amountToWordsFR(totals.totalTTC) : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* ── BANK INFO ──────────────────────────────────────────── */}
        <View style={s.bankBox}>
          {([
            ['BANQUE',            settings.bankName    || 'Attijariwafa Bank'],
            ['RIB',               settings.rib         || '007780000262500000100428'],
            ['BIC / SWIFT',       settings.swift       || 'BCMAMAMC'],
            ['LIBELLÉ DU CHÈQUE', settings.bankLibelle || 'Axis Shipping Line'],
          ] as [string, string][]).map(([label, val]) => (
            <View key={label} style={s.bankRow}>
              <Text style={s.bankLabel}>{label}</Text>
              <Text style={s.bankColon}> :</Text>
              <Text style={s.bankVal}>{val}</Text>
            </View>
          ))}
        </View>

        {/* ── FOOTER ─────────────────────────────────────────────── */}
        <View style={s.footer}>
          <Image src={footerLogoSrc} style={s.footLogo} />
          <View style={s.footCenter}>
            <Text style={s.footTxt}>
              {settings.address || '29, Rue Med El Baamrani Res Sara 2, Etg 2, N° 206, Casablanca - Maroc'}
            </Text>
            <Text style={s.footTxt}>
              R.C : {settings.rc || 'Casa 666085'}{'  -  '}
              I.F : {settings.if_ || '66239820'}{'  -  '}
              ICE : {settings.ice || '003637927000014'}{'  -  '}
              Patente : {settings.patente || '32301566'}
            </Text>
            <Text style={s.footTxt}>
              Tél : {settings.phone1 || '+212 661-711416'}{'  |  '}
              Bureau Casa : {settings.phone2 || '+212 522-403939'}
            </Text>
            <Text style={s.footTxt}>
              Email : {settings.email || 'info@axis-shipping.com'}{'  |  '}
              Site web : {settings.website || 'axis-shipping.com'}
            </Text>
          </View>
          <Image src={footerLogoSrc} style={s.footLogo} />
        </View>

      </Page>
    </Document>
  )
}
