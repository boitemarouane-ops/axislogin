'use client'

/**
 * DemoSeed — seeds one test client, one test agent, and one test invoice.
 *
 * IMPORTANT: seed() runs synchronously at module-load time (inside a
 * typeof-window guard so it's safe during SSR). This guarantees the demo
 * client is already in localStorage BEFORE any component's useEffect reads
 * getClients() — eliminating the race condition completely.
 */

import { useEffect } from 'react'
import {
  getClients, saveClient,
  getAgents,  saveAgent,
  getInvoices, saveInvoice,
  nextInvoiceNumber,
} from '@/lib/storage'
import type { AirFreightData } from '@/lib/types'

function safeUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function seed() {
  if (typeof window === 'undefined') return   // SSR guard

  /* ── 1. Client ─────────────────────────────────────────────── */
  let clientId = ''
  const clients = getClients()
  const existingClient = clients.find(c => c.companyName === 'DEMO CLIENT SARL')
  if (existingClient) {
    clientId = existingClient.id
  } else {
    const c = saveClient({
      companyName:  'DEMO CLIENT SARL',
      address1:     '12 Avenue Hassan II',
      address2:     'Bureau 301',
      city:         'Casablanca',
      postalCode:   '20000',
      country:      'Maroc',
      industry:     'Commerce',
      ice:          '123456789000099',
      rc:           'Casa 999001',
      if_:          '55551234',
      patente:      '12345678',
      paymentTerms: 30,
      contacts: [{
        id:        safeUUID(),
        firstName: 'Mohamed',
        lastName:  'Bennani',
        email:     'mbennani@democlient.ma',
        phone:     '+212 661-000001',
      }],
    })
    clientId = c.id
  }

  /* ── 2. Agent ──────────────────────────────────────────────── */
  const agents = getAgents()
  if (!agents.find(a => a.companyName === 'Royal Air Maroc')) {
    saveAgent({
      companyName:      'Royal Air Maroc',
      address1:         'Aéroport Mohammed V',
      address2:         '',
      city:             'Casablanca',
      postalCode:       '20250',
      country:          'Maroc',
      serviceTypes:     ['AIRFREIGHT'],
      paymentTerms:     30,
      contacts: [{
        id:        safeUUID(),
        firstName: 'Ali',
        lastName:  'Haddad',
        email:     'ali.haddad@royalairmaroc.com',
        phone:     '+212 522-489797',
        role:      'Commercial',
      }],
      bank:             'Attijariwafa Bank',
      rib:              '007780000262500000100428',
      swift:            'BCMAMAMC',
      bankAddress:      '2 Boulevard Moulay Youssef, Casablanca',
      networks:         ['AllForward'],
      caafUploaded:     false,
      caafFileName:     '',
      caafFileData:     '',
      bankCertFileName: '',
      bankCertFileData: '',
    })
  }

  /* ── 3. Invoice ────────────────────────────────────────────── */
  const invoices = getInvoices()
  if (!invoices.find(i => i.clientRef === 'DEMO-001')) {
    const today = new Date()
    const due   = new Date(today)
    due.setDate(due.getDate() + 30)
    const fmt = (d: Date) => d.toISOString().slice(0, 10)

    saveInvoice({
      invoiceNumber:      nextInvoiceNumber(),
      invoiceDate:        fmt(today),
      dueDate:            fmt(due),
      paymentTerms:       30,
      mode:               'AIR',
      clientId,
      modeData: {
        origin:            'CDG Paris',
        destination:       'CMN Casablanca',
        awbNumber:         '057-12345678',
        type:              'Import',
        supplier:          'Royal Air Maroc',
        commodity:         'Pièces mécaniques',
        natureMarchandise: 'GENERAL',
        natureOther:       '',
        voyageNumber:      'Air05401',
        airline:           'Royal Air Maroc',
        agentId:           '',
        franchise:         '30 kg',
        packages:          '5',
        grossWeight:       '120',
        chargeableWeight:  '135',
        volume:            '0.85',
        etd:               fmt(today),
        eta:               fmt(due),
      } as AirFreightData,
      lines: [
        {
          id:           safeUUID(),
          description:  'Fret aérien import CDG → CMN',
          currency:     'EUR',
          unitPrice:    850,
          quantity:     1,
          totalForeign: 850,
          exchangeRate: 10.8,
          totalMAD_HT:  9180,
          vatCode:      20,
        },
        {
          id:           safeUUID(),
          description:  'Handling aéroport',
          currency:     'MAD',
          unitPrice:    350,
          quantity:     1,
          totalForeign: 350,
          exchangeRate: 1,
          totalMAD_HT:  350,
          vatCode:      20,
        },
      ],
      exchangeRateGlobal: 10.8,
      totalHT_MAD:        9530,
      totalVAT:           1906,
      totalTTC:           11436,
      incoterm:           'DAP',
      transitTime:        '3 jours',
      freeTime:           '7 jours',
      againstDocuments:   false,
      clientRef:          'DEMO-001',
      notes:              '',
      status:             'ISSUED',
    })
  }
}

/* ── Run synchronously at module load time (client-side only) ── */
if (typeof window !== 'undefined') {
  seed()
}

/* ── Component: no-op render, just mounts in the tree ────────── */
export default function DemoSeed() {
  useEffect(() => {
    // Re-run seed if localStorage was cleared after initial load
    // (e.g., user manually cleared storage in DevTools)
    if (getClients().length === 0) {
      seed()
      // Dispatch a storage event so all open pages refresh their client lists
      window.dispatchEvent(new StorageEvent('storage', { key: 'axis_clients' }))
    }
  }, [])

  return null
}
