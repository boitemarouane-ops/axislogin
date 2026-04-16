'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { getClients, saveClient, updateClient, deleteClient } from '@/lib/storage'
import type { Client, ClientContact, PaymentTerms } from '@/lib/types'
import { getSettings } from '@/lib/settings'
import { Plus, Search, Pencil, Trash2, ChevronDown, ChevronUp, X, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ─── helpers ─── */
function safeUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

const emptyContact = (): ClientContact => ({
  id: safeUUID(), firstName: '', lastName: '', email: '', phone: '',
})

const emptyForm = (): Omit<Client, 'id' | 'createdAt' | 'updatedAt'> => ({
  companyName: '', address1: '', address2: '', city: '', postalCode: '', country: 'Maroc',
  industry: '', ice: '', rc: '', if_: '', patente: '',
  paymentTerms: 30,
  contacts: [emptyContact()],
})

/* ─── Field component defined OUTSIDE the page component ─── */
/* This is critical: if defined inside, React remounts it on every render  */
/* causing the input to lose focus after every keystroke.                  */
interface FieldProps {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  required?: boolean
  error?: string
  type?: string
  className?: string
  placeholder?: string
}

function Field({ label, name, value, onChange, required, error, type = 'text', className = '', placeholder }: FieldProps) {
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
        placeholder={placeholder}
        className={cn(
          'w-full border rounded-md px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
          error ? 'border-destructive' : 'border-border'
        )}
      />
      {error && <p className="text-destructive text-xs mt-1">{error}</p>}
    </div>
  )
}

/* ─── ContactField also outside ─── */
interface ContactFieldProps {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
  id: string
}
function ContactField({ label, value, onChange, type = 'text', id }: ContactFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-foreground/70 mb-1">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        className="w-full border border-border rounded-md px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
      />
    </div>
  )
}

/* ─── Main Page ─── */
export default function ClientsPage() {
  const [clients, setClients]         = useState<Client[]>([])
  const [paymentPresets, setPaymentPresets] = useState<number[]>([30, 60, 90])
  const [search, setSearch]           = useState('')
  const [showForm, setShowForm]       = useState(false)
  const [editing, setEditing]         = useState<Client | null>(null)
  const [form, setForm]               = useState(emptyForm())
  const [errors, setErrors]           = useState<Record<string, string>>({})
  const [expandedId, setExpandedId]   = useState<string | null>(null)

  useEffect(() => {
    setClients(getClients())
    const s = getSettings()
    if (s.paymentTermPresets?.length) setPaymentPresets(s.paymentTermPresets)
  }, [])

  const refresh = () => setClients(getClients())

  const filtered = clients.filter(c =>
    c.companyName.toLowerCase().includes(search.toLowerCase()) ||
    c.ice.includes(search) ||
    c.city.toLowerCase().includes(search.toLowerCase())
  )

  function openNew() {
    setEditing(null)
    setForm(emptyForm())
    setErrors({})
    setShowForm(true)
  }

  function openEdit(client: Client) {
    setEditing(client)
    setForm({
      companyName: client.companyName,
      address1: client.address1,
      address2: client.address2,
      city: client.city,
      postalCode: client.postalCode,
      country: client.country,
      industry: client.industry,
      ice: client.ice,
      rc: client.rc,
      if_: client.if_,
      patente: client.patente,
      paymentTerms: client.paymentTerms,
      contacts: client.contacts.length ? client.contacts : [emptyContact()],
    })
    setErrors({})
    setShowForm(true)
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.companyName.trim()) e.companyName = 'Raison sociale obligatoire'
    if (!form.ice.trim())         e.ice          = 'ICE obligatoire'
    if (!form.address1.trim())    e.address1     = 'Adresse obligatoire'
    if (!form.city.trim())        e.city         = 'Ville obligatoire'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    if (editing) {
      updateClient(editing.id, form)
    } else {
      saveClient(form)
    }
    refresh()
    setShowForm(false)
  }

  function handleDelete(id: string) {
    if (confirm('Supprimer ce client ?')) {
      deleteClient(id)
      refresh()
    }
  }

  /* Stable top-level form field handler — uses input name attribute */
  const handleFormField = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }, [])

  /* Contact field handler — stable per index via data attribute */
  function handleContactField(idx: number, field: keyof ClientContact) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setForm(prev => {
        const contacts = [...prev.contacts]
        contacts[idx] = { ...contacts[idx], [field]: value }
        return { ...prev, contacts }
      })
    }
  }

  function addContact() {
    setForm(prev => ({ ...prev, contacts: [...prev.contacts, emptyContact()] }))
  }

  function removeContact(idx: number) {
    if (form.contacts.length === 1) return
    setForm(prev => ({ ...prev, contacts: prev.contacts.filter((_, i) => i !== idx) }))
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Users size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Gestion des Clients</h1>
              <p className="text-sm text-muted-foreground">
                {clients.length} client{clients.length !== 1 ? 's' : ''} enregistré{clients.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} /> Nouveau client
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par nom, ICE, ville..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-foreground/70 text-xs uppercase tracking-wide">Raison sociale</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground/70 text-xs uppercase tracking-wide">ICE</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground/70 text-xs uppercase tracking-wide">Ville / Pays</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground/70 text-xs uppercase tracking-wide">Délai paiement</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground/70 text-xs uppercase tracking-wide">Contacts</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground/70 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    {search ? 'Aucun client trouvé' : 'Aucun client enregistré. Créez votre premier client.'}
                  </td>
                </tr>
              ) : (
                filtered.map(client => (
                  <>
                    <tr
                      key={client.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(expandedId === client.id ? null : client.id)}
                    >
                      <td className="px-4 py-3 font-medium">{client.companyName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{client.ice}</td>
                      <td className="px-4 py-3 text-muted-foreground">{client.city}{client.country ? `, ${client.country}` : ''}</td>
                      <td className="px-4 py-3">
                        <span className="bg-accent/10 text-accent text-xs font-semibold px-2 py-0.5 rounded">
                          {client.paymentTerms} jours
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {client.contacts.length} contact{client.contacts.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {expandedId === client.id
                            ? <ChevronUp size={14} className="text-muted-foreground" />
                            : <ChevronDown size={14} className="text-muted-foreground" />}
                          <button
                            onClick={e => { e.stopPropagation(); openEdit(client) }}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(client.id) }}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {expandedId === client.id && (
                      <tr key={`${client.id}-exp`} className="bg-muted/20">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Adresse</p>
                              <p>{client.address1}</p>
                              {client.address2 && <p>{client.address2}</p>}
                              <p>{client.postalCode} {client.city}</p>
                              <p>{client.country}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Identifiants fiscaux</p>
                              <p><span className="text-muted-foreground">ICE:</span> {client.ice}</p>
                              {client.rc    && <p><span className="text-muted-foreground">RC:</span> {client.rc}</p>}
                              {client.if_   && <p><span className="text-muted-foreground">IF:</span> {client.if_}</p>}
                              {client.patente && <p><span className="text-muted-foreground">Patente:</span> {client.patente}</p>}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Contacts</p>
                              {client.contacts.map(c => (
                                <div key={c.id} className="mb-1">
                                  <p className="font-medium">{c.firstName} {c.lastName}</p>
                                  <p className="text-muted-foreground text-xs">{c.email} — {c.phone}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Modal Form ── */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl my-8 border border-border">

              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="font-bold text-lg">
                  {editing ? 'Modifier le client' : 'Nouveau client'}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={20} />
                </button>
              </div>

              <div className="px-6 py-4 space-y-5 max-h-[75vh] overflow-y-auto">

                {/* Company info */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide mb-3 border-b border-border pb-1">
                    Informations société
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Raison sociale (STE)" name="companyName"
                      value={form.companyName} onChange={handleFormField}
                      required error={errors.companyName} className="col-span-2"
                    />
                    <Field
                      label="Adresse 1" name="address1"
                      value={form.address1} onChange={handleFormField}
                      required error={errors.address1} className="col-span-2"
                    />
                    <Field label="Adresse 2"          name="address2"   value={form.address2}   onChange={handleFormField} />
                    <Field label="Ville"               name="city"       value={form.city}       onChange={handleFormField} required error={errors.city} />
                    <Field label="Code postal"         name="postalCode" value={form.postalCode} onChange={handleFormField} />
                    <Field label="Pays"                name="country"    value={form.country}    onChange={handleFormField} />
                    <Field label="Secteur d&apos;activité" name="industry" value={form.industry} onChange={handleFormField} />
                  </div>
                </section>

                {/* Fiscal IDs */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide mb-3 border-b border-border pb-1">
                    Identifiants fiscaux
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="ICE"     name="ice"     value={form.ice}     onChange={handleFormField} required error={errors.ice} />
                    <Field label="RC"      name="rc"      value={form.rc}      onChange={handleFormField} />
                    <Field label="IF"      name="if_"     value={form.if_}     onChange={handleFormField} />
                    <Field label="Patente" name="patente" value={form.patente} onChange={handleFormField} />
                  </div>
                </section>

                {/* Payment terms */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide mb-3 border-b border-border pb-1">
                    Conditions de paiement
                  </h3>
                  <div className="flex flex-wrap gap-2 items-center">
                    {[...paymentPresets].sort((a, b) => a - b).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, paymentTerms: t }))}
                        className={cn(
                          'py-1.5 px-3 rounded-lg text-xs font-bold border-2 transition-all whitespace-nowrap',
                          form.paymentTerms === t
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border text-foreground hover:bg-muted'
                        )}
                      >
                        {t}j
                      </button>
                    ))}
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.paymentTerms}
                      onChange={e => setForm(prev => ({ ...prev, paymentTerms: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-20 border border-border rounded-lg px-2 py-1.5 text-xs bg-background font-mono text-center focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="0"
                    />
                    <span className="text-xs text-muted-foreground">jours</span>
                  </div>
                </section>

                {/* Contacts */}
                <section>
                  <div className="flex items-center justify-between mb-3 border-b border-border pb-1">
                    <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">Contacts</h3>
                    <button
                      type="button"
                      onClick={addContact}
                      className="text-xs text-accent hover:underline flex items-center gap-1"
                    >
                      <Plus size={12} /> Ajouter un contact
                    </button>
                  </div>

                  {form.contacts.map((c, idx) => (
                    <div key={c.id} className="mb-3 p-3 bg-muted/30 rounded-lg relative">
                      {form.contacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeContact(idx)}
                          className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                        >
                          <X size={14} />
                        </button>
                      )}
                      <p className="text-xs font-medium text-muted-foreground mb-2">Contact {idx + 1}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <ContactField
                          id={`c-${c.id}-firstName`}
                          label="Prénom"
                          value={c.firstName}
                          onChange={handleContactField(idx, 'firstName')}
                        />
                        <ContactField
                          id={`c-${c.id}-lastName`}
                          label="Nom"
                          value={c.lastName}
                          onChange={handleContactField(idx, 'lastName')}
                        />
                        <ContactField
                          id={`c-${c.id}-email`}
                          label="Email"
                          value={c.email}
                          onChange={handleContactField(idx, 'email')}
                          type="email"
                        />
                        <ContactField
                          id={`c-${c.id}-phone`}
                          label="Téléphone"
                          value={c.phone}
                          onChange={handleContactField(idx, 'phone')}
                        />
                      </div>
                    </div>
                  ))}
                </section>

              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  {editing ? 'Enregistrer les modifications' : 'Créer le client'}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </AppLayout>
  )
}
