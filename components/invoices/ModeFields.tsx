'use client'

import type {
  TransportMode, AirFreightData, SeaFCLData, SeaLCLData,
  RoadFTLData, RoadLTLData, ModeData, NatureMarchandise
} from '@/lib/types'
import type { Agent } from '@/lib/types'
import { cn } from '@/lib/utils'

const NATURE_OPTIONS: { value: NatureMarchandise | ''; label: string }[] = [
  { value: '', label: 'Sélectionner...' },
  { value: 'GENERAL', label: 'Général Normal' },
  { value: 'DGR', label: 'DGR (Marchandises Dangereuses)' },
  { value: 'ADR', label: 'ADR (Transport Route Dangereux)' },
  { value: 'IMO', label: 'IMO (Maritime)' },
  { value: 'SPECIAL', label: 'Spécial' },
  { value: 'OTHER', label: 'Autre (préciser)' },
]

interface FieldProps {
  label: string
  children: React.ReactNode
  required?: boolean
  className?: string
}

function F({ label, children, required, className = '' }: FieldProps) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-foreground/60 mb-1">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full border border-border rounded-md px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring'
const selectCls = 'w-full border border-border rounded-md px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring'

interface NatureFieldProps {
  value: NatureMarchandise | ''
  otherValue: string
  onChange: (nature: NatureMarchandise | '', other: string) => void
}
function NatureField({ value, otherValue, onChange }: NatureFieldProps) {
  return (
    <div className="col-span-2 grid grid-cols-2 gap-3">
      <F label="Nature de marchandise" required>
        <select value={value} onChange={e => onChange(e.target.value as NatureMarchandise | '', otherValue)} className={selectCls}>
          {NATURE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </F>
      {value === 'OTHER' && (
        <F label="Préciser">
          <input type="text" value={otherValue} onChange={e => onChange(value, e.target.value)} className={inputCls} />
        </F>
      )}
    </div>
  )
}

interface AgentSelectProps {
  label: string
  value: string
  agents: Agent[]
  onChange: (v: string) => void
  className?: string
}
function AgentSelect({ label, value, agents, onChange, className = '' }: AgentSelectProps) {
  return (
    <F label={label} className={className}>
      <select value={value} onChange={e => onChange(e.target.value)} className={selectCls}>
        <option value="">Sélectionner un agent...</option>
        {agents.map(a => (
          <option key={a.id} value={a.id}>{a.agentCode} — {a.companyName}</option>
        ))}
      </select>
    </F>
  )
}

// ============================================================
// AIR FREIGHT
// ============================================================
export function AirFields({ data, agents, onChange }: {
  data: AirFreightData; agents: Agent[]
  onChange: (d: AirFreightData) => void
}) {
  const u = (field: keyof AirFreightData) => (v: string) => onChange({ ...data, [field]: v })
  return (
    <div className="grid grid-cols-2 gap-3">
      <F label="Origine" required><input type="text" value={data.origin} onChange={e => u('origin')(e.target.value)} className={inputCls} /></F>
      <F label="Destination" required><input type="text" value={data.destination} onChange={e => u('destination')(e.target.value)} className={inputCls} /></F>
      <F label="N° LTA / AWB"><input type="text" value={data.awbNumber} onChange={e => u('awbNumber')(e.target.value)} className={inputCls} placeholder="Ex: 057-12345678" /></F>
      <F label="Type"><input type="text" value={data.type} onChange={e => u('type')(e.target.value)} className={inputCls} /></F>
      <F label="Fournisseur"><input type="text" value={data.supplier} onChange={e => u('supplier')(e.target.value)} className={inputCls} /></F>
      <F label="Marchandise"><input type="text" value={data.commodity} onChange={e => u('commodity')(e.target.value)} className={inputCls} /></F>
      <NatureField value={data.natureMarchandise} otherValue={data.natureOther}
        onChange={(n, o) => onChange({ ...data, natureMarchandise: n, natureOther: o })} />
      <F label="N° Voyage (auto)">
        <input type="text" value={data.voyageNumber} onChange={e => u('voyageNumber')(e.target.value)} className={cn(inputCls, 'font-mono text-xs bg-muted/30')} />
      </F>
      <F label="Compagnie aérienne"><input type="text" value={data.airline} onChange={e => u('airline')(e.target.value)} className={inputCls} /></F>
      <AgentSelect label="Agent" value={data.agentId} agents={agents} onChange={u('agentId')} className="col-span-2" />
      <F label="Franchise (jours)"><input type="text" value={data.franchise} onChange={e => u('franchise')(e.target.value)} className={inputCls} /></F>
      <F label="Nb. Colis (# of Packages)"><input type="text" value={data.packages} onChange={e => u('packages')(e.target.value)} className={inputCls} /></F>
      <F label="Poids Brut (kg)"><input type="text" value={data.grossWeight} onChange={e => u('grossWeight')(e.target.value)} className={inputCls} /></F>
      <F label="Chargeable Weight (kg)"><input type="text" value={data.chargeableWeight} onChange={e => u('chargeableWeight')(e.target.value)} className={inputCls} /></F>
      <F label="Volume (m³)"><input type="text" value={data.volume} onChange={e => u('volume')(e.target.value)} className={inputCls} /></F>
      <F label="ETD"><input type="date" value={data.etd} onChange={e => u('etd')(e.target.value)} className={inputCls} /></F>
      <F label="ETA"><input type="date" value={data.eta} onChange={e => u('eta')(e.target.value)} className={inputCls} /></F>
    </div>
  )
}

// ============================================================
// SEA FCL
// ============================================================
export function SeaFCLFields({ data, agents, onChange }: {
  data: SeaFCLData; agents: Agent[]
  onChange: (d: SeaFCLData) => void
}) {
  const u = (field: keyof SeaFCLData) => (v: string) => onChange({ ...data, [field]: v })
  return (
    <div className="grid grid-cols-2 gap-3">
      <F label="Origine" required><input type="text" value={data.origin} onChange={e => u('origin')(e.target.value)} className={inputCls} /></F>
      <F label="Destination" required><input type="text" value={data.destination} onChange={e => u('destination')(e.target.value)} className={inputCls} /></F>
      <F label="POL (Port of Loading)"><input type="text" value={data.pol} onChange={e => u('pol')(e.target.value)} className={inputCls} /></F>
      <F label="POD (Port of Discharge)"><input type="text" value={data.pod} onChange={e => u('pod')(e.target.value)} className={inputCls} /></F>
      <F label="Fournisseur"><input type="text" value={data.supplier} onChange={e => u('supplier')(e.target.value)} className={inputCls} /></F>
      <F label="Marchandise"><input type="text" value={data.commodity} onChange={e => u('commodity')(e.target.value)} className={inputCls} /></F>
      <NatureField value={data.natureMarchandise} otherValue={data.natureOther}
        onChange={(n, o) => onChange({ ...data, natureMarchandise: n, natureOther: o })} />
      <F label="N° Voyage (auto)">
        <input type="text" value={data.voyageNumber} onChange={e => u('voyageNumber')(e.target.value)} className={cn(inputCls, 'font-mono text-xs bg-muted/30')} />
      </F>
      <F label="Conteneurs"><input type="text" value={data.containers} onChange={e => u('containers')(e.target.value)} className={inputCls} /></F>
      <AgentSelect label="Agent" value={data.agentId} agents={agents} onChange={u('agentId')} className="col-span-2" />
      <F label="Booking"><input type="text" value={data.booking} onChange={e => u('booking')(e.target.value)} className={inputCls} /></F>
      <F label="B/L"><input type="text" value={data.bl} onChange={e => u('bl')(e.target.value)} className={inputCls} /></F>
      <F label="Navire"><input type="text" value={data.vessel} onChange={e => u('vessel')(e.target.value)} className={inputCls} /></F>
      <F label="Ocean Carrier"><input type="text" value={data.oceanCarrier} onChange={e => u('oceanCarrier')(e.target.value)} className={inputCls} /></F>
      <F label="Quantité"><input type="text" value={data.quantity} onChange={e => u('quantity')(e.target.value)} className={inputCls} /></F>
      <F label="Type conteneur"><input type="text" value={data.containerType} onChange={e => u('containerType')(e.target.value)} className={inputCls} placeholder="20' GP, 40' HC..." /></F>
      <F label="ETD"><input type="date" value={data.etd} onChange={e => u('etd')(e.target.value)} className={inputCls} /></F>
      <F label="ETA"><input type="date" value={data.eta} onChange={e => u('eta')(e.target.value)} className={inputCls} /></F>
      <F label="Volume (m³)"><input type="text" value={data.volume} onChange={e => u('volume')(e.target.value)} className={inputCls} /></F>
      <F label="Poids Brut (kg)"><input type="text" value={data.grossWeight} onChange={e => u('grossWeight')(e.target.value)} className={inputCls} /></F>
      <F label="Poids Net (kg)"><input type="text" value={data.netWeight} onChange={e => u('netWeight')(e.target.value)} className={inputCls} /></F>
    </div>
  )
}

// ============================================================
// SEA LCL — same as FCL + MEAD
// ============================================================
export function SeaLCLFields({ data, agents, onChange }: {
  data: SeaLCLData; agents: Agent[]
  onChange: (d: SeaLCLData) => void
}) {
  return (
    <div className="space-y-3">
      <SeaFCLFields data={data} agents={agents} onChange={d => onChange({ ...data, ...d })} />
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
        <AgentSelect label="MEAD (Agent intermédiaire)" value={data.meadAgentId} agents={agents}
          onChange={v => onChange({ ...data, meadAgentId: v })} className="col-span-2" />
      </div>
    </div>
  )
}

// ============================================================
// ROAD FTL
// ============================================================
export function RoadFTLFields({ data, agents, onChange }: {
  data: RoadFTLData; agents: Agent[]
  onChange: (d: RoadFTLData) => void
}) {
  const u = (field: keyof RoadFTLData) => (v: string) => onChange({ ...data, [field]: v })
  return (
    <div className="grid grid-cols-2 gap-3">
      <F label="Origine" required><input type="text" value={data.origin} onChange={e => u('origin')(e.target.value)} className={inputCls} /></F>
      <F label="Destination" required><input type="text" value={data.destination} onChange={e => u('destination')(e.target.value)} className={inputCls} /></F>
      <F label="POL"><input type="text" value={data.pol} onChange={e => u('pol')(e.target.value)} className={inputCls} /></F>
      <F label="POD"><input type="text" value={data.pod} onChange={e => u('pod')(e.target.value)} className={inputCls} /></F>
      <F label="Fournisseur"><input type="text" value={data.supplier} onChange={e => u('supplier')(e.target.value)} className={inputCls} /></F>
      <F label="Marchandise"><input type="text" value={data.commodity} onChange={e => u('commodity')(e.target.value)} className={inputCls} /></F>
      <NatureField value={data.natureMarchandise} otherValue={data.natureOther}
        onChange={(n, o) => onChange({ ...data, natureMarchandise: n, natureOther: o })} />
      <F label="N° Voyage (auto)">
        <input type="text" value={data.voyageNumber} onChange={e => u('voyageNumber')(e.target.value)} className={cn(inputCls, 'font-mono text-xs bg-muted/30')} />
      </F>
      <F label="Remorque"><input type="text" value={data.trailer} onChange={e => u('trailer')(e.target.value)} className={inputCls} /></F>
      <F label="Tracteur"><input type="text" value={data.truck} onChange={e => u('truck')(e.target.value)} className={inputCls} /></F>
      <AgentSelect label="Agent" value={data.agentId} agents={agents} onChange={u('agentId')} className="col-span-2" />
      <F label="Booking"><input type="text" value={data.booking} onChange={e => u('booking')(e.target.value)} className={inputCls} /></F>
      <F label="CMR"><input type="text" value={data.cmr} onChange={e => u('cmr')(e.target.value)} className={inputCls} /></F>
      <F label="B/L"><input type="text" value={data.bl} onChange={e => u('bl')(e.target.value)} className={inputCls} /></F>
      <F label="Navire"><input type="text" value={data.vessel} onChange={e => u('vessel')(e.target.value)} className={inputCls} /></F>
      <F label="ETD"><input type="date" value={data.etd} onChange={e => u('etd')(e.target.value)} className={inputCls} /></F>
      <F label="ETA"><input type="date" value={data.eta} onChange={e => u('eta')(e.target.value)} className={inputCls} /></F>
      <F label="Volume (m³)"><input type="text" value={data.volume} onChange={e => u('volume')(e.target.value)} className={inputCls} /></F>
      <F label="Poids Brut (kg)"><input type="text" value={data.grossWeight} onChange={e => u('grossWeight')(e.target.value)} className={inputCls} /></F>
      <F label="Poids Net (kg)"><input type="text" value={data.netWeight} onChange={e => u('netWeight')(e.target.value)} className={inputCls} /></F>
      <F label="Quantité"><input type="text" value={data.quantity} onChange={e => u('quantity')(e.target.value)} className={inputCls} /></F>
      <F label="Type camion"><input type="text" value={data.truckType} onChange={e => u('truckType')(e.target.value)} className={inputCls} /></F>
    </div>
  )
}

// ============================================================
// ROAD LTL — same as FTL + MEAD
// ============================================================
export function RoadLTLFields({ data, agents, onChange }: {
  data: RoadLTLData; agents: Agent[]
  onChange: (d: RoadLTLData) => void
}) {
  return (
    <div className="space-y-3">
      <RoadFTLFields data={data} agents={agents} onChange={d => onChange({ ...data, ...d })} />
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
        <AgentSelect label="MEAD (Agent intermédiaire)" value={data.meadAgentId} agents={agents}
          onChange={v => onChange({ ...data, meadAgentId: v })} className="col-span-2" />
      </div>
    </div>
  )
}

// ============================================================
// GENERIC (Transit, Logistics, Other)
// ============================================================
export function GenericFields({ data, onChange }: {
  data: { details: string }
  onChange: (d: { details: string }) => void
}) {
  return (
    <div>
      <F label="Détails de la prestation">
        <textarea
          value={data.details}
          onChange={e => onChange({ details: e.target.value })}
          rows={8}
          className={inputCls}
          style={{ resize: 'vertical', minHeight: '120px', whiteSpace: 'pre-wrap' }}
          placeholder="Décrivez librement les détails de la prestation...&#10;Vous pouvez sauter des lignes, ajouter des listes, etc."
        />
      </F>
    </div>
  )
}

// ============================================================
// Main dispatcher
// ============================================================
export default function ModeFields({ mode, data, agents, onChange }: {
  mode: TransportMode
  data: ModeData
  agents: Agent[]
  onChange: (d: ModeData) => void
}) {
  switch (mode) {
    case 'AIR':      return <AirFields    data={data as AirFreightData} agents={agents} onChange={onChange} />
    case 'SEA_FCL':  return <SeaFCLFields data={data as SeaFCLData}     agents={agents} onChange={onChange} />
    case 'SEA_LCL':  return <SeaLCLFields data={data as SeaLCLData}     agents={agents} onChange={onChange} />
    case 'ROAD_FTL': return <RoadFTLFields data={data as RoadFTLData}   agents={agents} onChange={onChange} />
    case 'ROAD_LTL': return <RoadLTLFields data={data as RoadLTLData}   agents={agents} onChange={onChange} />
    default:         return <GenericFields data={data as { details: string }} onChange={onChange} />
  }
}
