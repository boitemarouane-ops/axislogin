// ============================================================
// AXIS SHIPPING LINE — Core Types
// ============================================================

export type TransportMode =
  | 'AIR'
  | 'SEA_FCL'
  | 'SEA_LCL'
  | 'ROAD_FTL'
  | 'ROAD_LTL'
  | 'TRANSIT'
  | 'LOGISTICS'
  | 'OTHER'

export type NatureMarchandise = 'GENERAL' | 'DGR' | 'ADR' | 'IMO' | 'SPECIAL' | 'OTHER'

export type Currency = 'MAD' | 'EUR' | 'USD'

export type VatCode = 0 | 10 | 20

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'CANCELLED'

export type PaymentTerms = number

export const MODE_LABELS: Record<TransportMode, string> = {
  AIR:       'Aérien',
  SEA_FCL:   'Maritime FCL',
  SEA_LCL:   'Maritime LCL',
  ROAD_FTL:  'Routier FTL',
  ROAD_LTL:  'Routier LTL',
  TRANSIT:   'Transit',
  LOGISTICS: 'Accompagnement Logistique',
  OTHER:     'Autre',
}

export const MODE_COLORS: Record<TransportMode, { bg: string; text: string; border: string }> = {
  AIR:       { bg: 'bg-blue-500',    text: 'text-white',        border: 'border-blue-500' },
  SEA_FCL:   { bg: 'bg-blue-900',    text: 'text-white',        border: 'border-blue-900' },
  SEA_LCL:   { bg: 'bg-blue-400',    text: 'text-white',        border: 'border-blue-400' },
  ROAD_FTL:  { bg: 'bg-orange-500',  text: 'text-white',        border: 'border-orange-500' },
  ROAD_LTL:  { bg: 'bg-amber-400',   text: 'text-gray-900',     border: 'border-amber-400' },
  TRANSIT:   { bg: 'bg-purple-600',  text: 'text-white',        border: 'border-purple-600' },
  LOGISTICS: { bg: 'bg-emerald-600', text: 'text-white',        border: 'border-emerald-600' },
  OTHER:     { bg: 'bg-gray-500',    text: 'text-white',        border: 'border-gray-500' },
}

export const INCOTERMS_2020 = [
  'EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP',
  'FAS', 'FOB', 'CFR', 'CIF',
]

export const NETWORK_OPTIONS = ['JC Trans', 'AllForward', 'WCA World', 'DF Alliance']

export const SERVICE_TYPES = ['LCL', 'FCL', 'AIRFREIGHT', 'ROUTIER', 'LTL', 'FTL', 'Transitaire', 'Autre']

// ============================================================
// CLIENT
// ============================================================
export interface ClientContact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
}

export interface Client {
  id: string
  companyName: string
  address1: string
  address2: string
  city: string
  postalCode: string
  country: string
  industry: string
  ice: string           // mandatory
  rc: string
  if_: string
  patente: string
  paymentTerms: PaymentTerms
  contacts: ClientContact[]
  createdAt: string
  updatedAt: string
}

// ============================================================
// AGENT
// ============================================================
export interface AgentContact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: string
}

export interface Agent {
  id: string
  agentCode: string     // unique e.g., AGT2026-001
  companyName: string
  address1: string
  address2: string
  city: string
  postalCode: string
  country: string
  serviceTypes: string[]
  paymentTerms: number
  contacts: AgentContact[]
  bank: string
  rib: string
  swift: string
  bankAddress: string
  networks: string[]
  caafUploaded: boolean  // mandatory
  caafFileName: string
  caafFileData: string   // base64
  bankCertFileName: string
  bankCertFileData: string // base64
  createdAt: string
  updatedAt: string
}

// ============================================================
// MODE-SPECIFIC DATA
// ============================================================
export interface AirFreightData {
  origin: string
  destination: string
  awbNumber: string
  type: string
  supplier: string
  commodity: string
  natureMarchandise: NatureMarchandise | ''
  natureOther: string
  voyageNumber: string
  airline: string
  agentId: string
  franchise: string
  packages: string
  grossWeight: string
  chargeableWeight: string
  volume: string
  etd: string
  eta: string
}

export interface SeaFCLData {
  origin: string
  destination: string
  pol: string
  pod: string
  supplier: string
  commodity: string
  natureMarchandise: NatureMarchandise | ''
  natureOther: string
  voyageNumber: string
  containers: string
  agentId: string
  booking: string
  bl: string
  vessel: string
  etd: string
  eta: string
  volume: string
  grossWeight: string
  netWeight: string
  oceanCarrier: string
  quantity: string
  containerType: string
}

export interface SeaLCLData extends SeaFCLData {
  meadAgentId: string
}

export interface RoadFTLData {
  origin: string
  destination: string
  pol: string
  pod: string
  supplier: string
  commodity: string
  natureMarchandise: NatureMarchandise | ''
  natureOther: string
  voyageNumber: string
  trailer: string
  truck: string
  agentId: string
  booking: string
  cmr: string
  bl: string
  vessel: string
  etd: string
  eta: string
  volume: string
  grossWeight: string
  netWeight: string
  quantity: string
  truckType: string
}

export interface RoadLTLData extends RoadFTLData {
  meadAgentId: string
}

export interface GenericData {
  details: string
}

export type ModeData =
  | AirFreightData
  | SeaFCLData
  | SeaLCLData
  | RoadFTLData
  | RoadLTLData
  | GenericData

// ============================================================
// INVOICE
// ============================================================
export interface InvoiceLine {
  id: string
  description: string
  currency: Currency
  unitPrice: number
  quantity: number
  totalForeign: number
  exchangeRate: number
  totalMAD_HT: number
  vatCode: VatCode
}

export interface Invoice {
  id: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  paymentTerms: PaymentTerms
  mode: TransportMode
  clientId: string
  modeData: ModeData
  lines: InvoiceLine[]
  exchangeRateGlobal: number
  totalHT_MAD: number
  totalVAT: number
  totalTTC: number
  incoterm: string
  transitTime: string
  freeTime: string
  againstDocuments: boolean
  clientRef: string
  notes: string
  status: InvoiceStatus
  createdAt: string
  updatedAt: string
}

// ============================================================
// SEQUENCES (for auto-numbering)
// ============================================================
export interface Sequences {
  invoiceYear: number
  invoiceCount: number
  airVoyageCount: number
  fclVoyageCount: number
  lclVoyageCount: number
  ftlVoyageCount: number
  ltlVoyageCount: number
  agentCount: number
  clientRefYear: number
  clientRefCounts: Record<string, number>
}
