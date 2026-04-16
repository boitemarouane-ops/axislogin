import type { InvoiceLine, VatCode } from './types'

// ============================================================
// Financial Calculations
// ============================================================

/** Round to 2 decimal places */
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Format currency in MAD */
export function formatMAD(amount: number): string {
  return new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' MAD'
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' ' + currency
}

/** Calculate line totals */
export function calcLine(line: InvoiceLine): InvoiceLine {
  const totalForeign = round2(line.unitPrice * line.quantity)
  const totalMAD_HT = line.currency === 'MAD'
    ? totalForeign
    : round2(totalForeign * line.exchangeRate)
  return { ...line, totalForeign, totalMAD_HT }
}

/** Aggregate all lines into invoice totals */
export function calcInvoiceTotals(lines: InvoiceLine[]): {
  totalHT_MAD: number
  vatBreakdown: Record<VatCode, number>
  totalVAT: number
  totalTTC: number
} {
  const totalHT_MAD = round2(lines.reduce((s, l) => s + l.totalMAD_HT, 0))
  const vatBreakdown: Record<VatCode, number> = { 0: 0, 10: 0, 20: 0 }

  lines.forEach(l => {
    const vatAmt = round2(l.totalMAD_HT * (l.vatCode / 100))
    vatBreakdown[l.vatCode] = round2((vatBreakdown[l.vatCode] || 0) + vatAmt)
  })

  const totalVAT = round2(Object.values(vatBreakdown).reduce((s, v) => s + v, 0))
  const totalTTC = round2(totalHT_MAD + totalVAT)

  return { totalHT_MAD, vatBreakdown, totalVAT, totalTTC }
}

/** Add business days to a date */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

/** Format date to FR locale */
export function formatDateFR(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ============================================================
// Number to French Words
// ============================================================

const UNITS = [
  '', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf',
]
const TENS = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante']

function belowHundred(n: number): string {
  if (n < 20) return UNITS[n] || ''
  if (n < 70) {
    const t = Math.floor(n / 10)
    const u = n % 10
    if (u === 0) return TENS[t]
    if (u === 1) return TENS[t] + '-et-un'
    return TENS[t] + '-' + UNITS[u]
  }
  if (n < 80) {
    const u = n - 60
    if (u === 11) return 'soixante-et-onze'
    return 'soixante-' + UNITS[u]
  }
  if (n < 100) {
    const u = n - 80
    if (u === 0) return 'quatre-vingts'
    return 'quatre-vingt-' + UNITS[u]
  }
  return ''
}

function belowThousand(n: number): string {
  if (n === 0) return ''
  if (n < 100) return belowHundred(n)
  const h = Math.floor(n / 100)
  const rest = n % 100
  const centStr = h === 1 ? 'cent' : UNITS[h] + ' cent'
  if (rest === 0) return h === 1 ? 'cent' : UNITS[h] + ' cents'
  return centStr + ' ' + belowHundred(rest)
}

function integerToWords(n: number): string {
  if (n === 0) return 'zéro'
  if (n < 0) return 'moins ' + integerToWords(-n)

  const parts: string[] = []

  const billions = Math.floor(n / 1_000_000_000)
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000)
  const thousands = Math.floor((n % 1_000_000) / 1_000)
  const remainder = n % 1_000

  if (billions > 0) {
    parts.push(belowThousand(billions) + (billions === 1 ? ' milliard' : ' milliards'))
  }
  if (millions > 0) {
    parts.push(belowThousand(millions) + (millions === 1 ? ' million' : ' millions'))
  }
  if (thousands > 0) {
    if (thousands === 1) parts.push('mille')
    else parts.push(belowThousand(thousands) + ' mille')
  }
  if (remainder > 0) {
    parts.push(belowThousand(remainder))
  }

  return parts.join(' ').trim()
}

/** Convert amount to French words in Dirhams */
export function amountToWordsFR(amount: number): string {
  const total = round2(Math.abs(amount))
  const [intPart, decPart] = total.toFixed(2).split('.')
  const intVal = parseInt(intPart)
  const decVal = parseInt(decPart)

  const intWords = integerToWords(intVal)
  const result = `${intWords} dirham${intVal > 1 ? 's' : ''}`

  if (decVal > 0) {
    const decWords = integerToWords(decVal)
    return result + ` et ${decWords} centime${decVal > 1 ? 's' : ''}`
  }
  return result
}

/** Capitalize first letter */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
