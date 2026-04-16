'use client'

import { useState, useEffect, useRef } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { getAgents, saveAgent, updateAgent, deleteAgent } from '@/lib/storage'
import type { Agent, AgentContact } from '@/lib/types'
import { NETWORK_OPTIONS, SERVICE_TYPES } from '@/lib/types'
import { Plus, Search, Pencil, Trash2, X, Building2, ChevronDown, ChevronUp, AlertTriangle, Upload, FileCheck, File } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ─── Field défini EN DEHORS du composant principal ─────────────────────────
   Si Field est défini à l'intérieur, React le recrée à chaque render,
   ce qui démonte/remonte l'<input> à chaque frappe et perd le focus.        */
function Field({ label, name, value, onChange, required, error, type = 'text', className = '' }: {
  label: string
  name: string
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  required?: boolean
  error?: string
  type?: string
  className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-xs font-medium text-foreground/70 mb-1">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        className={cn(
          'w-full border rounded-md px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
          error ? 'border-destructive' : 'border-border'
        )}
      />
      {error && <p className="text-destructive text-xs mt-1">{error}</p>}
    </div>
  )
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

const emptyContact = (): AgentContact => ({
  id: safeUUID(), firstName: '', lastName: '', email: '', phone: '', role: '',
})

const emptyForm = (): Omit<Agent, 'id' | 'agentCode' | 'createdAt' | 'updatedAt'> => ({
  companyName: '', address1: '', address2: '', city: '', postalCode: '', country: '',
  serviceTypes: [], paymentTerms: 30,
  contacts: [emptyContact()],
  bank: '', rib: '', swift: '', bankAddress: '',
  networks: [], caafUploaded: false, caafFileName: '',
  caafFileData: '',
  bankCertFileName: '',
  bankCertFileData: '',
})

// ---- File Upload Helper Component ----
function FileUploadField({
  label, required, description, fileName, fileData,
  error, onFile, onRemove,
}: {
  label: string
  required?: boolean
  description?: string
  fileName: string
  fileData: string
  error?: string
  onFile: (name: string, data: string) => void
  onRemove: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target?.result as string
      onFile(file.name, result)
    }
    reader.readAsDataURL(file)
    // reset so same file can be re-selected
    e.target.value = ''
  }

  const hasFile = !!fileName && !!fileData

  return (
    <div className={cn(
      'rounded-lg border p-3 transition-colors',
      hasFile ? 'border-emerald-300 bg-emerald-50/60' : required ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-muted/20'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {label} {required && <span className="text-destructive">*</span>}
          </p>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {hasFile ? (
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
            title="Supprimer le fichier"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {hasFile ? (
        <div className="mt-2 flex items-center gap-2 p-2 bg-white rounded border border-emerald-200">
          <FileCheck size={16} className="text-emerald-600 shrink-0" />
          <span className="text-xs font-medium text-emerald-700 truncate flex-1">{fileName}</span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs text-muted-foreground hover:text-foreground underline shrink-0"
          >
            Remplacer
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            'mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-md border-2 border-dashed text-sm font-medium transition-colors',
            required
              ? 'border-destructive/40 text-destructive/70 hover:bg-destructive/5'
              : 'border-border text-muted-foreground hover:bg-muted hover:border-border/80'
          )}
        >
          <Upload size={15} />
          Joindre un fichier (PDF, JPG, PNG)
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        className="hidden"
        onChange={handleChange}
      />

      {error && (
        <p className="text-destructive text-xs mt-1.5 flex items-center gap-1">
          <AlertTriangle size={11} /> {error}
        </p>
      )}
    </div>
  )
}

// ---- Main Page ----
export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Agent | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => { setAgents(getAgents()) }, [])
  const refresh = () => setAgents(getAgents())

  const filtered = agents.filter(a =>
    a.companyName.toLowerCase().includes(search.toLowerCase()) ||
    a.agentCode.toLowerCase().includes(search.toLowerCase()) ||
    a.city.toLowerCase().includes(search.toLowerCase())
  )

  function openNew() {
    setEditing(null); setForm(emptyForm()); setErrors({}); setShowForm(true)
  }

  function openEdit(agent: Agent) {
    setEditing(agent)
    setForm({
      companyName: agent.companyName, address1: agent.address1, address2: agent.address2,
      city: agent.city, postalCode: agent.postalCode, country: agent.country,
      serviceTypes: agent.serviceTypes, paymentTerms: agent.paymentTerms,
      contacts: agent.contacts.length ? agent.contacts : [emptyContact()],
      bank: agent.bank, rib: agent.rib, swift: agent.swift, bankAddress: agent.bankAddress,
      networks: agent.networks, caafUploaded: agent.caafUploaded,
      caafFileName: agent.caafFileName,
      caafFileData: agent.caafFileData || '',
      bankCertFileName: agent.bankCertFileName,
      bankCertFileData: agent.bankCertFileData || '',
    })
    setErrors({}); setShowForm(true)
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.companyName.trim()) e.companyName = 'Raison sociale obligatoire'
    if (!form.address1.trim()) e.address1 = 'Adresse obligatoire'
    if (!form.caafUploaded || !form.caafFileName) e.caaf = 'Le formulaire CAAF est obligatoire — veuillez joindre le fichier'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    if (editing) updateAgent(editing.id, form)
    else saveAgent(form)
    refresh(); setShowForm(false)
  }

  function handleDelete(id: string) {
    if (confirm('Supprimer cet agent ?')) { deleteAgent(id); refresh() }
  }

  function toggleService(s: string) {
    setForm(f => ({
      ...f, serviceTypes: f.serviceTypes.includes(s)
        ? f.serviceTypes.filter(x => x !== s)
        : [...f.serviceTypes, s]
    }))
  }

  function toggleNetwork(n: string) {
    setForm(f => ({
      ...f, networks: f.networks.includes(n)
        ? f.networks.filter(x => x !== n)
        : [...f.networks, n]
    }))
  }

  function setContact(idx: number, field: keyof AgentContact, value: string) {
    const contacts = [...form.contacts]
    contacts[idx] = { ...contacts[idx], [field]: value }
    setForm({ ...form, contacts })
  }

  /* Stable handler for top-level form fields — uses input name attribute */
  function handleFormField(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Agents & Fournisseurs</h1>
              <p className="text-sm text-muted-foreground">{agents.length} agent{agents.length > 1 ? 's' : ''} enregistré{agents.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus size={16} /> Nouvel agent
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Rechercher par nom, code, ville..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground/70 uppercase tracking-wide">Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground/70 uppercase tracking-wide">Raison sociale</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground/70 uppercase tracking-wide">Ville / Pays</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground/70 uppercase tracking-wide">Services</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground/70 uppercase tracking-wide">Réseaux</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground/70 uppercase tracking-wide">CAAF</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-foreground/70 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">
                  {search ? 'Aucun agent trouvé' : 'Aucun agent. Créez votre premier agent.'}
                </td></tr>
              ) : filtered.map(agent => (
                <>
                  <tr key={agent.id} className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === agent.id ? null : agent.id)}>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{agent.agentCode}</td>
                    <td className="px-4 py-3 font-medium">{agent.companyName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{agent.city}{agent.country ? `, ${agent.country}` : ''}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {agent.serviceTypes.slice(0, 3).map(s => (
                          <span key={s} className="text-xs bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground">{s}</span>
                        ))}
                        {agent.serviceTypes.length > 3 && <span className="text-xs text-muted-foreground">+{agent.serviceTypes.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {agent.networks.slice(0, 2).map(n => (
                          <span key={n} className="text-xs bg-accent/10 text-accent px-1.5 py-0.5 rounded">{n}</span>
                        ))}
                        {agent.networks.length > 2 && <span className="text-xs text-muted-foreground">+{agent.networks.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {agent.caafUploaded && agent.caafFileName
                        ? (
                          <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                            <FileCheck size={10} /> {agent.caafFileName.length > 20 ? agent.caafFileName.slice(0, 18) + '…' : agent.caafFileName}
                          </span>
                        )
                        : <span className="text-xs text-destructive font-medium bg-destructive/10 px-2 py-0.5 rounded flex items-center gap-1 w-fit"><AlertTriangle size={10} /> Manquant</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {expandedId === agent.id ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                        <button onClick={e => { e.stopPropagation(); openEdit(agent) }} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"><Pencil size={14} /></button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(agent.id) }} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === agent.id && (
                    <tr key={`${agent.id}-exp`} className="bg-muted/20">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Adresse</p>
                            <p>{agent.address1}</p>
                            {agent.address2 && <p>{agent.address2}</p>}
                            <p>{agent.postalCode} {agent.city}</p>
                            <p>{agent.country}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Banque</p>
                            <p>{agent.bank}</p>
                            <p className="font-mono text-xs text-muted-foreground">{agent.rib}</p>
                            <p className="font-mono text-xs text-muted-foreground">SWIFT: {agent.swift}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Délai paiement</p>
                            <span className="bg-accent/10 text-accent text-xs font-semibold px-2 py-0.5 rounded">{agent.paymentTerms} jours</span>
                            {agent.caafFileName && agent.caafFileData && (
                              <div className="mt-2">
                                <a
                                  href={agent.caafFileData}
                                  download={agent.caafFileName}
                                  className="flex items-center gap-1 text-xs text-accent hover:underline"
                                >
                                  <File size={11} /> Télécharger CAAF
                                </a>
                              </div>
                            )}
                            {agent.bankCertFileName && agent.bankCertFileData && (
                              <div className="mt-1">
                                <a
                                  href={agent.bankCertFileData}
                                  download={agent.bankCertFileName}
                                  className="flex items-center gap-1 text-xs text-accent hover:underline"
                                >
                                  <File size={11} /> Télécharger Attestation bancaire
                                </a>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Contacts ({agent.contacts.length})</p>
                            {agent.contacts.slice(0, 2).map(c => (
                              <div key={c.id} className="mb-1">
                                <p className="font-medium text-xs">{c.firstName} {c.lastName} — {c.role}</p>
                                <p className="text-muted-foreground text-xs">{c.email}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal Form */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl my-8 border border-border">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="font-bold text-lg">{editing ? 'Modifier l\'agent' : 'Nouvel agent'}</h2>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
              </div>

              <div className="px-6 py-4 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* CAAF warning */}
                {!form.caafFileName && (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                    <p>Le formulaire <strong>Customer Account Application Form (CAAF)</strong> signé doit être joint en pièce jointe avant de pouvoir créer l&apos;agent.</p>
                  </div>
                )}

                <section>
                  <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide mb-3 border-b border-border pb-1">Informations société</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Raison sociale (STE)" name="companyName" value={form.companyName} onChange={handleFormField} required error={errors.companyName} className="col-span-2" />
                    <Field label="Adresse 1" name="address1" value={form.address1} onChange={handleFormField} required error={errors.address1} className="col-span-2" />
                    <Field label="Adresse 2" name="address2" value={form.address2} onChange={handleFormField} />
                    <Field label="Code postal" name="postalCode" value={form.postalCode} onChange={handleFormField} />
                    <Field label="Ville" name="city" value={form.city} onChange={handleFormField} />
                    <Field label="Pays" name="country" value={form.country} onChange={handleFormField} />
                    <div>
                      <label className="block text-xs font-medium text-foreground/70 mb-1">Délai de paiement (jours)</label>
                      <input type="number" value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: parseInt(e.target.value) || 30 })}
                        className="w-full border border-border rounded-md px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  </div>
                </section>

                {/* Services */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide mb-3 border-b border-border pb-1">Types de service</h3>
                  <div className="flex flex-wrap gap-2">
                    {SERVICE_TYPES.map(s => (
                      <button key={s} type="button" onClick={() => toggleService(s)}
                        className={cn('px-3 py-1.5 text-xs rounded-full border font-medium transition-colors',
                          form.serviceTypes.includes(s) ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted')}>
                        {s}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Networks */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide mb-3 border-b border-border pb-1">Réseaux</h3>
                  <div className="flex flex-wrap gap-2">
                    {NETWORK_OPTIONS.map(n => (
                      <button key={n} type="button" onClick={() => toggleNetwork(n)}
                        className={cn('px-3 py-1.5 text-xs rounded-full border font-medium transition-colors',
                          form.networks.includes(n) ? 'bg-accent text-accent-foreground border-accent' : 'border-border hover:bg-muted')}>
                        {n}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Bank */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide mb-3 border-b border-border pb-1">Coordonnées bancaires</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Banque"         name="bank"        value={form.bank}        onChange={handleFormField} />
                    <Field label="RIB"            name="rib"         value={form.rib}         onChange={handleFormField} />
                    <Field label="SWIFT Code"     name="swift"       value={form.swift}       onChange={handleFormField} />
                    <Field label="Adresse banque" name="bankAddress" value={form.bankAddress} onChange={handleFormField} />
                  </div>
                </section>

                {/* Contacts */}
                <section>
                  <div className="flex items-center justify-between mb-3 border-b border-border pb-1">
                    <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">Contacts</h3>
                    <button onClick={() => setForm({ ...form, contacts: [...form.contacts, emptyContact()] })} className="text-xs text-accent hover:underline flex items-center gap-1">
                      <Plus size={12} /> Ajouter
                    </button>
                  </div>
                  {form.contacts.map((c, idx) => (
                    <div key={c.id} className="mb-3 p-3 bg-muted/30 rounded-lg relative">
                      {form.contacts.length > 1 && (
                        <button onClick={() => setForm({ ...form, contacts: form.contacts.filter((_, i) => i !== idx) })}
                          className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"><X size={14} /></button>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Prénom"    name={`c-${c.id}-firstName`} value={c.firstName} onChange={e => setContact(idx, 'firstName', e.target.value)} />
                        <Field label="Nom"       name={`c-${c.id}-lastName`}  value={c.lastName}  onChange={e => setContact(idx, 'lastName',  e.target.value)} />
                        <Field label="Email"     name={`c-${c.id}-email`}     value={c.email}     onChange={e => setContact(idx, 'email',     e.target.value)} type="email" />
                        <Field label="Téléphone" name={`c-${c.id}-phone`}     value={c.phone}     onChange={e => setContact(idx, 'phone',     e.target.value)} />
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-foreground/70 mb-1">Rôle</label>
                          <select value={c.role} onChange={e => setContact(idx, 'role', e.target.value)}
                            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring">
                            <option value="">Sélectionner...</option>
                            {['Directeur Général', 'Commercial', 'Finance', 'Opérations', 'Autre'].map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </section>

                {/* Documents */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide mb-3 border-b border-border pb-1">Documents</h3>
                  <div className="space-y-3">
                    {/* CAAF Upload */}
                    <FileUploadField
                      label="Customer Account Application Form (CAAF)"
                      required
                      description="Document obligatoire — sans ce fichier, la création de l'agent est impossible"
                      fileName={form.caafFileName}
                      fileData={form.caafFileData}
                      error={errors.caaf}
                      onFile={(name, data) => setForm({ ...form, caafUploaded: true, caafFileName: name, caafFileData: data })}
                      onRemove={() => setForm({ ...form, caafUploaded: false, caafFileName: '', caafFileData: '' })}
                    />
                    {/* Bank cert Upload */}
                    <FileUploadField
                      label="Attestation bancaire"
                      description="Document optionnel — RIB certifié ou attestation de domiciliation bancaire"
                      fileName={form.bankCertFileName}
                      fileData={form.bankCertFileData}
                      onFile={(name, data) => setForm({ ...form, bankCertFileName: name, bankCertFileData: data })}
                      onRemove={() => setForm({ ...form, bankCertFileName: '', bankCertFileData: '' })}
                    />
                  </div>
                </section>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">Annuler</button>
                <button onClick={handleSave} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
                  {editing ? 'Enregistrer' : 'Créer l\'agent'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
