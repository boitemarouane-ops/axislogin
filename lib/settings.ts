// ============================================================
// AXIS SHIPPING LINE — Company Settings (localStorage)
// ============================================================

export interface NetworkLogo {
  id: string
  name: string
  imageData: string // base64
}

export interface CompanySettings {
  // Company logo
  logoData: string        // base64 image
  // Header / invoice info
  companyName: string
  address: string
  rc: string
  if_: string
  ice: string
  patente: string
  phone1: string
  phone2: string
  email: string
  website: string
  // Bank details
  bankName: string
  rib: string
  swift: string
  bankLibelle: string
  // Footer logo (compass icon)
  footerLogoData: string  // base64 image
  // Member Of networks logos
  networkLogos: NetworkLogo[]
  // Payment term presets (quick-select buttons in invoices & clients)
  paymentTermPresets: number[]
}

const KEY = 'axis_company_settings'

export const DEFAULT_SETTINGS: CompanySettings = {
  logoData: '',
  companyName: 'Axis Shipping Line',
  address: '29, Rue Med El Baamrani Res Sara 2, Etg 2, N° 206, Casablanca - Maroc',
  rc: 'Casa 666085',
  if_: '66239820',
  ice: '003637927000014',
  patente: '32301566',
  phone1: '+212 661-711416',
  phone2: '+212 522-403939',
  email: 'info@axis-shipping.com',
  website: 'axis-shipping.com',
  bankName: 'attiiariwafa bank',
  rib: '007780000262500000100428',
  swift: 'BCMAMAMC',
  bankLibelle: 'Axis Shipping Line',
  footerLogoData: '',
  networkLogos: [],
  paymentTermPresets: [30, 60, 90],
}

function safeUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

export function getSettings(): CompanySettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(s: CompanySettings): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
    // Notify same-tab listeners (storage event only fires cross-tab)
    window.dispatchEvent(new CustomEvent('axis:settings-saved'))
  } catch { /* quota */ }
}

export function makeNetworkLogo(name: string, imageData: string): NetworkLogo {
  return { id: safeUUID(), name, imageData }
}
