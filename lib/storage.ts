import type {
  Client, Agent, Invoice, Sequences,
  TransportMode,
  AirFreightData, SeaFCLData, SeaLCLData, RoadFTLData, RoadLTLData, GenericData
} from './types'

// ============================================================
// Storage keys
// ============================================================
const KEYS = {
  clients: 'axis_clients',
  agents: 'axis_agents',
  invoices: 'axis_invoices',
  sequences: 'axis_sequences',
} as const

// ============================================================
// Helpers
// ============================================================
function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* quota exceeded — ignore */ }
}

function uuid(): string {
  // Safe UUID generation that works in all environments
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback: RFC4122 v4 UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function now(): string {
  return new Date().toISOString()
}

// ============================================================
// Sequences
// ============================================================
const DEFAULT_SEQUENCES: Sequences = {
  invoiceYear: new Date().getFullYear(),
  invoiceCount: 0,
  airVoyageCount: 0,
  fclVoyageCount: 0,
  lclVoyageCount: 0,
  ftlVoyageCount: 0,
  ltlVoyageCount: 0,
  agentCount: 0,
  clientRefYear: new Date().getFullYear(),
  clientRefCounts: {},
}

export function getSequences(): Sequences {
  return load<Sequences>(KEYS.sequences, DEFAULT_SEQUENCES)
}

function saveSequences(seq: Sequences): void {
  save(KEYS.sequences, seq)
}

/** Generate next invoice number, resetting counter each year */
export function nextInvoiceNumber(): string {
  const seq = getSequences()
  const year = new Date().getFullYear()
  let count = seq.invoiceCount

  if (seq.invoiceYear !== year) {
    // New year: reset counter
    count = 0
    seq.invoiceYear = year
  }
  count++
  seq.invoiceCount = count
  saveSequences(seq)
  return `${year}A${String(count).padStart(2, '0')}`
}

/** Peek next invoice number without consuming it */
export function peekInvoiceNumber(): string {
  const seq = getSequences()
  const year = new Date().getFullYear()
  let count = seq.invoiceCount
  if (seq.invoiceYear !== year) count = 0
  count++
  return `${year}A${String(count).padStart(2, '0')}`
}

/** Generate next voyage number by mode */
export function nextVoyageNumber(mode: TransportMode): string {
  const seq = getSequences()
  let count: number
  let prefix: string
  let base: number

  switch (mode) {
    case 'AIR':
      seq.airVoyageCount++
      count = seq.airVoyageCount
      prefix = 'Air'
      base = 5400
      break
    case 'SEA_FCL':
      seq.fclVoyageCount++
      count = seq.fclVoyageCount
      prefix = 'FCL'
      base = 6130
      break
    case 'SEA_LCL':
      seq.lclVoyageCount++
      count = seq.lclVoyageCount
      prefix = 'LCL'
      base = 7130
      break
    case 'ROAD_FTL':
      seq.ftlVoyageCount++
      count = seq.ftlVoyageCount
      prefix = 'FTL'
      base = 6130
      break
    case 'ROAD_LTL':
      seq.ltlVoyageCount++
      count = seq.ltlVoyageCount
      prefix = 'LTL'
      base = 6130
      break
    default:
      return ''
  }
  saveSequences(seq)
  const num = (base * 10) + count  // e.g., 54000 + 1 = 54001 → Air054001? No let's do 05400+count
  // Format: Air05401 = "Air" + "054" + "01" → let's treat as Air + padded(base+count)
  return `${prefix}${String(base + count).padStart(5, '0')}`
}

/** Generate next agent code */
export function nextAgentCode(): string {
  const seq = getSequences()
  seq.agentCount++
  saveSequences(seq)
  const year = new Date().getFullYear()
  return `AGT${year}-${String(seq.agentCount).padStart(3, '0')}`
}

/** Generate client reference */
export function nextClientRef(clientId: string): string {
  const seq = getSequences()
  const year = new Date().getFullYear()
  if (seq.clientRefYear !== year) {
    seq.clientRefYear = year
    seq.clientRefCounts = {}
  }
  const count = (seq.clientRefCounts[clientId] || 0) + 1
  seq.clientRefCounts[clientId] = count
  saveSequences(seq)
  return `REF-${year}-${clientId.slice(0, 4).toUpperCase()}-${String(count).padStart(3, '0')}`
}

// ============================================================
// CLIENTS
// ============================================================
export function getClients(): Client[] {
  return load<Client[]>(KEYS.clients, [])
}

export function getClientById(id: string): Client | undefined {
  return getClients().find(c => c.id === id)
}

export function saveClient(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Client {
  const clients = getClients()
  const newClient: Client = {
    ...client,
    id: uuid(),
    createdAt: now(),
    updatedAt: now(),
  }
  clients.push(newClient)
  save(KEYS.clients, clients)
  return newClient
}

export function updateClient(id: string, updates: Partial<Client>): Client | null {
  const clients = getClients()
  const idx = clients.findIndex(c => c.id === id)
  if (idx === -1) return null
  clients[idx] = { ...clients[idx], ...updates, id, updatedAt: now() }
  save(KEYS.clients, clients)
  return clients[idx]
}

export function deleteClient(id: string): boolean {
  const clients = getClients().filter(c => c.id !== id)
  save(KEYS.clients, clients)
  return true
}

// ============================================================
// AGENTS
// ============================================================
export function getAgents(): Agent[] {
  return load<Agent[]>(KEYS.agents, [])
}

export function getAgentById(id: string): Agent | undefined {
  return getAgents().find(a => a.id === id)
}

export function saveAgent(agent: Omit<Agent, 'id' | 'agentCode' | 'createdAt' | 'updatedAt'>): Agent {
  const agents = getAgents()
  const newAgent: Agent = {
    caafFileData: '',
    bankCertFileData: '',
    ...agent,
    id: uuid(),
    agentCode: nextAgentCode(),
    createdAt: now(),
    updatedAt: now(),
  }
  agents.push(newAgent)
  save(KEYS.agents, agents)
  return newAgent
}

export function updateAgent(id: string, updates: Partial<Agent>): Agent | null {
  const agents = getAgents()
  const idx = agents.findIndex(a => a.id === id)
  if (idx === -1) return null
  agents[idx] = { ...agents[idx], ...updates, id, updatedAt: now() }
  save(KEYS.agents, agents)
  return agents[idx]
}

export function deleteAgent(id: string): boolean {
  const agents = getAgents().filter(a => a.id !== id)
  save(KEYS.agents, agents)
  return true
}

// ============================================================
// INVOICES
// ============================================================
export function getInvoices(): Invoice[] {
  return load<Invoice[]>(KEYS.invoices, [])
}

export function getInvoiceById(id: string): Invoice | undefined {
  return getInvoices().find(i => i.id === id)
}

export function saveInvoice(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Invoice {
  const invoices = getInvoices()
  const newInvoice: Invoice = {
    ...invoice,
    id: uuid(),
    createdAt: now(),
    updatedAt: now(),
  }
  invoices.push(newInvoice)
  save(KEYS.invoices, invoices)
  return newInvoice
}

export function updateInvoice(id: string, updates: Partial<Invoice>): Invoice | null {
  const invoices = getInvoices()
  const idx = invoices.findIndex(i => i.id === id)
  if (idx === -1) return null
  invoices[idx] = { ...invoices[idx], ...updates, id, updatedAt: now() }
  save(KEYS.invoices, invoices)
  return invoices[idx]
}

export function deleteInvoice(id: string): boolean {
  const invoices = getInvoices().filter(i => i.id !== id)
  save(KEYS.invoices, invoices)
  return true
}

// ============================================================
// ANALYTICS — Revenue per client
// ============================================================
export interface RevenueEntry {
  clientId: string
  clientName: string
  totalTTC: number
  invoiceCount: number
}

export function getRevenueByClient(months?: number): RevenueEntry[] {
  const invoices = getInvoices()
  const now_ = new Date()
  const cutoff = months
    ? new Date(now_.getFullYear(), now_.getMonth() - months + 1, 1)
    : null

  const filtered = invoices.filter(inv => {
    if (inv.status === 'CANCELLED') return false
    if (!cutoff) return true
    return new Date(inv.invoiceDate) >= cutoff
  })

  const map = new Map<string, RevenueEntry>()
  filtered.forEach(inv => {
    const existing = map.get(inv.clientId)
    const clients = getClients()
    const client = clients.find(c => c.id === inv.clientId)
    const clientName = client?.companyName || 'Client inconnu'
    if (existing) {
      existing.totalTTC += inv.totalTTC
      existing.invoiceCount++
    } else {
      map.set(inv.clientId, {
        clientId: inv.clientId,
        clientName,
        totalTTC: inv.totalTTC,
        invoiceCount: 1,
      })
    }
  })

  return Array.from(map.values()).sort((a, b) => b.totalTTC - a.totalTTC)
}

export function getRevenueSummary(months?: number) {
  const invoices = getInvoices()
  const now_ = new Date()
  const cutoff = months
    ? new Date(now_.getFullYear(), now_.getMonth() - months + 1, 1)
    : null

  const filtered = invoices.filter(inv => {
    if (inv.status === 'CANCELLED') return false
    if (!cutoff) return true
    return new Date(inv.invoiceDate) >= cutoff
  })

  return {
    totalTTC: filtered.reduce((s, i) => s + i.totalTTC, 0),
    totalHT: filtered.reduce((s, i) => s + i.totalHT_MAD, 0),
    count: filtered.length,
    paid: filtered.filter(i => i.status === 'PAID').length,
    pending: filtered.filter(i => i.status === 'ISSUED').length,
    overdue: filtered.filter(i => i.status === 'OVERDUE').length,
  }
}

// ============================================================
// ANALYTICS — Advanced
// ============================================================

/** Summary filtered by arbitrary date range */
export function getRevenueSummaryByRange(from: string, to: string) {
  const invoices = getInvoices()
  const f = new Date(from)
  const t = new Date(to)
  t.setHours(23, 59, 59, 999)

  const filtered = invoices.filter(inv => {
    if (inv.status === 'CANCELLED') return false
    const d = new Date(inv.invoiceDate)
    return d >= f && d <= t
  })

  const paid    = filtered.filter(i => i.status === 'PAID')
  const pending = filtered.filter(i => i.status === 'ISSUED')
  const overdue = filtered.filter(i => i.status === 'OVERDUE')
  const draft   = filtered.filter(i => i.status === 'DRAFT')

  const totalTTC     = filtered.reduce((s, i) => s + i.totalTTC, 0)
  const totalPaidTTC = paid.reduce((s, i) => s + i.totalTTC, 0)
  const totalVAT     = filtered.reduce((s, i) => s + i.totalVAT, 0)
  const avgInvoice   = filtered.length > 0 ? totalTTC / filtered.length : 0

  return {
    totalTTC, totalHT: filtered.reduce((s, i) => s + i.totalHT_MAD, 0),
    totalVAT, totalPaidTTC, avgInvoice,
    count: filtered.length,
    paid: paid.length, pending: pending.length,
    overdue: overdue.length, draft: draft.length,
    recoveryRate: totalTTC > 0 ? (totalPaidTTC / totalTTC) * 100 : 0,
  }
}

/** Revenue by client filtered by date range */
export function getRevenueByClientRange(from: string, to: string): RevenueEntry[] {
  const invoices = getInvoices()
  const clients  = getClients()
  const f = new Date(from)
  const t = new Date(to); t.setHours(23, 59, 59, 999)

  const filtered = invoices.filter(inv => {
    if (inv.status === 'CANCELLED') return false
    const d = new Date(inv.invoiceDate)
    return d >= f && d <= t
  })

  const map = new Map<string, RevenueEntry>()
  filtered.forEach(inv => {
    const client = clients.find(c => c.id === inv.clientId)
    const clientName = client?.companyName || 'Client inconnu'
    const existing = map.get(inv.clientId)
    if (existing) {
      existing.totalTTC += inv.totalTTC
      existing.invoiceCount++
    } else {
      map.set(inv.clientId, { clientId: inv.clientId, clientName, totalTTC: inv.totalTTC, invoiceCount: 1 })
    }
  })
  return Array.from(map.values()).sort((a, b) => b.totalTTC - a.totalTTC)
}

/** Monthly trend for N months back */
export function getMonthlyTrend(months: number) {
  const invoices = getInvoices()
  const now = new Date()
  const result: { label: string; month: string; totalTTC: number; totalHT: number; count: number }[] = []

  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const label = start.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
    const month = start.toISOString().slice(0, 7)

    const slice = invoices.filter(inv =>
      inv.status !== 'CANCELLED' &&
      new Date(inv.invoiceDate) >= start &&
      new Date(inv.invoiceDate) < end
    )
    result.push({
      label, month,
      totalTTC: slice.reduce((s, i) => s + i.totalTTC, 0),
      totalHT:  slice.reduce((s, i) => s + i.totalHT_MAD, 0),
      count:    slice.length,
    })
  }
  return result
}

/** Revenue by mode filtered by date range */
export function getModeRevenueByRange(from: string, to: string) {
  const invoices = getInvoices()
  const f = new Date(from)
  const t = new Date(to); t.setHours(23, 59, 59, 999)

  const filtered = invoices.filter(inv => {
    if (inv.status === 'CANCELLED') return false
    const d = new Date(inv.invoiceDate)
    return d >= f && d <= t
  })

  const map = new Map<string, { label: string; totalTTC: number; count: number }>()
  filtered.forEach(inv => {
    const existing = map.get(inv.mode)
    if (existing) { existing.totalTTC += inv.totalTTC; existing.count++ }
    else map.set(inv.mode, { label: inv.mode, totalTTC: inv.totalTTC, count: 1 })
  })
  return Array.from(map.entries()).map(([mode, v]) => ({ mode, ...v }))
    .sort((a, b) => b.totalTTC - a.totalTTC)
}

/** Overdue invoices with days overdue */
export function getOverdueInvoices() {
  const invoices = getInvoices()
  const clients  = getClients()
  const now = new Date()

  return invoices
    .filter(inv => inv.status === 'OVERDUE' || (inv.status === 'ISSUED' && inv.dueDate && new Date(inv.dueDate) < now))
    .map(inv => {
      const client = clients.find(c => c.id === inv.clientId)
      const daysOverdue = inv.dueDate
        ? Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86_400_000)
        : 0
      return { ...inv, clientName: client?.companyName || 'Inconnu', daysOverdue }
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
}

// Default mode data factories
export function defaultAirData(): AirFreightData {
  return {
    origin: '', destination: '', awbNumber: '', type: '', supplier: '', commodity: '',
    natureMarchandise: '', natureOther: '', voyageNumber: '', airline: '', agentId: '',
    franchise: '', packages: '', grossWeight: '', chargeableWeight: '', volume: '', etd: '', eta: '',
  }
}
export function defaultSeaFCLData(): SeaFCLData {
  return {
    origin: '', destination: '', pol: '', pod: '', supplier: '', commodity: '',
    natureMarchandise: '', natureOther: '', voyageNumber: '', containers: '', agentId: '',
    booking: '', bl: '', vessel: '', etd: '', eta: '', volume: '', grossWeight: '',
    netWeight: '', oceanCarrier: '', quantity: '', containerType: '',
  }
}
export function defaultSeaLCLData(): SeaLCLData {
  return { ...defaultSeaFCLData(), meadAgentId: '' }
}
export function defaultRoadFTLData(): RoadFTLData {
  return {
    origin: '', destination: '', pol: '', pod: '', supplier: '', commodity: '',
    natureMarchandise: '', natureOther: '', voyageNumber: '', trailer: '', truck: '',
    agentId: '', booking: '', cmr: '', bl: '', vessel: '', etd: '', eta: '',
    volume: '', grossWeight: '', netWeight: '', quantity: '', truckType: '',
  }
}
export function defaultRoadLTLData(): RoadLTLData {
  return { ...defaultRoadFTLData(), meadAgentId: '' }
}
export function defaultGenericData(): GenericData {
  return { details: '' }
}
