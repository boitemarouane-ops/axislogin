'use client'

import { useState, useEffect, useRef } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { getSettings, saveSettings, makeNetworkLogo, type CompanySettings, type NetworkLogo } from '@/lib/settings'
import { Building2, Upload, Trash2, Plus, Save, Image, CheckCircle2, X, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ─── Reusable sub-components (defined OUTSIDE to avoid remount) ─────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-bold text-foreground/60 uppercase tracking-widest mb-4 pb-2 border-b border-border">
      {children}
    </h2>
  )
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-foreground/70 mb-1">
      {children}{required && <span className="text-destructive ml-1">*</span>}
    </label>
  )
}

function TextInput({ name, value, onChange, placeholder, mono }: {
  name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string; mono?: boolean
}) {
  return (
    <input
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={cn(
        'w-full border border-border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
        mono && 'font-mono'
      )}
    />
  )
}

function ImageUploadBox({ label, description, data, onUpload, onRemove }: {
  label: string; description: string; data: string
  onUpload: (d: string) => void; onRemove: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { onUpload(ev.target?.result as string) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-4">
      <p className="text-sm font-semibold text-foreground mb-0.5">{label}</p>
      <p className="text-xs text-muted-foreground mb-3">{description}</p>
      {data ? (
        <div className="flex items-center gap-3">
          <div className="h-16 w-auto bg-white border border-border rounded-lg overflow-hidden flex items-center justify-center p-2">
            <img src={data} alt={label} className="h-full w-auto object-contain" />
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => ref.current?.click()}
              className="flex items-center gap-1.5 text-xs text-accent hover:underline font-medium"
            >
              <Upload size={12} /> Remplacer
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="flex items-center gap-1.5 text-xs text-destructive hover:underline"
            >
              <Trash2 size={12} /> Supprimer
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="w-full flex flex-col items-center gap-2 py-6 rounded-lg border-2 border-dashed border-border/60 text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          <Image size={24} className="opacity-40" />
          <span className="text-xs font-medium">Cliquer pour choisir une image</span>
          <span className="text-[10px] opacity-60">PNG, JPG, SVG recommandés</span>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSettings(getSettings())
  }, [])

  function handleField(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setSettings(prev => prev ? { ...prev, [name]: value } : prev)
  }

  function handleSave() {
    if (!settings) return
    saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  /* Network logos */
  function addNetworkLogo(name: string, imageData: string) {
    setSettings(prev => {
      if (!prev) return prev
      return { ...prev, networkLogos: [...prev.networkLogos, makeNetworkLogo(name, imageData)] }
    })
  }

  function removeNetworkLogo(id: string) {
    setSettings(prev => {
      if (!prev) return prev
      return { ...prev, networkLogos: prev.networkLogos.filter(n => n.id !== id) }
    })
  }

  function updateNetworkLogoName(id: string, name: string) {
    setSettings(prev => {
      if (!prev) return prev
      return { ...prev, networkLogos: prev.networkLogos.map(n => n.id === id ? { ...n, name } : n) }
    })
  }

  if (!settings) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Building2 size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Paramètres Entreprise</h1>
              <p className="text-sm text-muted-foreground">Personnaliser les informations affichées sur les factures</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
              saved
                ? 'bg-emerald-600 text-white'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
            {saved ? 'Enregistré !' : 'Enregistrer'}
          </button>
        </div>

        {/* Logos */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
          <SectionTitle>Logos & Identité visuelle</SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ImageUploadBox
              label="Logo principal"
              description="Affiché en haut à gauche de la facture"
              data={settings.logoData}
              onUpload={d => setSettings(prev => prev ? { ...prev, logoData: d } : prev)}
              onRemove={() => setSettings(prev => prev ? { ...prev, logoData: '' } : prev)}
            />
            <ImageUploadBox
              label="Logo pied de page (gauche)"
              description="Icône/symbole affiché en bas gauche du footer"
              data={settings.footerLogoData}
              onUpload={d => setSettings(prev => prev ? { ...prev, footerLogoData: d } : prev)}
              onRemove={() => setSettings(prev => prev ? { ...prev, footerLogoData: '' } : prev)}
            />
            <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-4">
              <p className="text-sm font-semibold text-foreground mb-0.5">Apercu logo</p>
              <p className="text-xs text-muted-foreground mb-3">Le logo tel qu&apos;il apparaît sur la facture</p>
              {settings.logoData ? (
                <div className="bg-white rounded-lg border border-border p-3 flex items-center justify-center h-20">
                  <img src={settings.logoData} alt="Logo" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-border p-3 flex items-center justify-center h-20">
                  <span className="text-xs text-muted-foreground">Aucun logo chargé</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Member Of Networks */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <SectionTitle>Réseaux — &quot;Member Of&quot;</SectionTitle>
          <p className="text-xs text-muted-foreground -mt-2 mb-4">
            Les logos ajoutés ici s&apos;affichent dans la zone &quot;Member Of&quot; en haut à droite de la facture. Télécharger chaque logo réseau séparément.
          </p>

          <div className="space-y-3">
            {settings.networkLogos.map((n) => (
              <NetworkLogoRow
                key={n.id}
                logo={n}
                onNameChange={name => updateNetworkLogoName(n.id, name)}
                onRemove={() => removeNetworkLogo(n.id)}
              />
            ))}
          </div>

          <AddNetworkLogoButton onAdd={addNetworkLogo} />

          {settings.networkLogos.length > 0 && (
            <div className="mt-4 p-3 bg-muted/40 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Apercu &quot;Member Of&quot; :</p>
              <div className="flex items-center gap-3 flex-wrap">
                {settings.networkLogos.map(n => (
                  <img key={n.id} src={n.imageData} alt={n.name} title={n.name} className="h-6 w-auto object-contain" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Company Info */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <SectionTitle>Informations de l&apos;entreprise</SectionTitle>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label required>Raison sociale</Label>
              <TextInput name="companyName" value={settings.companyName} onChange={handleField} placeholder="Axis Shipping Line" />
            </div>
            <div>
              <Label required>Adresse complète</Label>
              <textarea
                name="address"
                value={settings.address}
                onChange={handleField}
                rows={2}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="29, Rue Med El Baamrani..."
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>R.C</Label>
                <TextInput name="rc" value={settings.rc} onChange={handleField} placeholder="Casa 666085" mono />
              </div>
              <div>
                <Label>I.F</Label>
                <TextInput name="if_" value={settings.if_} onChange={handleField} placeholder="66239820" mono />
              </div>
              <div>
                <Label required>ICE</Label>
                <TextInput name="ice" value={settings.ice} onChange={handleField} placeholder="003637927000014" mono />
              </div>
              <div>
                <Label>Patente</Label>
                <TextInput name="patente" value={settings.patente} onChange={handleField} placeholder="32301566" mono />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Téléphone principal</Label>
                <TextInput name="phone1" value={settings.phone1} onChange={handleField} placeholder="+212 661-711416" />
              </div>
              <div>
                <Label>Téléphone bureau</Label>
                <TextInput name="phone2" value={settings.phone2} onChange={handleField} placeholder="+212 522-403939" />
              </div>
              <div>
                <Label>Email</Label>
                <TextInput name="email" value={settings.email} onChange={handleField} placeholder="info@axis-shipping.com" />
              </div>
            </div>
            <div>
              <Label>Site web</Label>
              <TextInput name="website" value={settings.website} onChange={handleField} placeholder="axis-shipping.com" />
            </div>
          </div>
        </div>

        {/* Payment Term Presets */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <SectionTitle>Modalités de paiement</SectionTitle>
          <p className="text-xs text-muted-foreground -mt-2">
            Ces boutons apparaissent dans la création/modification de facture et dans la fiche client. Vous pouvez ajouter, modifier ou supprimer librement.
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            {(settings.paymentTermPresets ?? [30, 60, 90]).sort((a, b) => a - b).map((preset, idx) => (
              <div key={idx} className="flex items-center gap-1 bg-muted/50 border border-border rounded-lg px-2 py-1.5">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={preset}
                  onChange={e => {
                    const val = Math.max(0, parseInt(e.target.value) || 0)
                    const next = [...(settings.paymentTermPresets ?? [30, 60, 90])]
                    next[idx] = val
                    setSettings(s => ({ ...s, paymentTermPresets: next }))
                  }}
                  className="w-14 text-center text-sm font-mono font-bold bg-transparent border-none outline-none text-foreground"
                />
                <span className="text-xs text-muted-foreground">j</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = (settings.paymentTermPresets ?? [30, 60, 90]).filter((_, i) => i !== idx)
                    setSettings(s => ({ ...s, paymentTermPresets: next }))
                  }}
                  className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const current = settings.paymentTermPresets ?? [30, 60, 90]
                const max = current.length > 0 ? Math.max(...current) : 0
                setSettings(s => ({ ...s, paymentTermPresets: [...current, max + 30] }))
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary text-xs font-semibold transition-colors"
            >
              <Plus size={13} /> Ajouter
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground/60">Cliquez sur un nombre pour le modifier directement.</p>
        </div>

        {/* Bank Details */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <SectionTitle>Coordonnées bancaires</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Banque</Label>
              <TextInput name="bankName" value={settings.bankName} onChange={handleField} placeholder="Attijariwafa Bank" />
            </div>
            <div>
              <Label>Libellé du chèque</Label>
              <TextInput name="bankLibelle" value={settings.bankLibelle} onChange={handleField} placeholder="Axis Shipping Line" />
            </div>
            <div className="md:col-span-2">
              <Label>RIB</Label>
              <TextInput name="rib" value={settings.rib} onChange={handleField} placeholder="007780000262500000100428" mono />
            </div>
            <div>
              <Label>BIC / SWIFT</Label>
              <TextInput name="swift" value={settings.swift} onChange={handleField} placeholder="BCMAMAMC" mono />
            </div>
          </div>
        </div>

        {/* Save button bottom */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className={cn(
              'flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all',
              saved
                ? 'bg-emerald-600 text-white'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
            {saved ? 'Enregistré !' : 'Enregistrer les paramètres'}
          </button>
        </div>
      </div>
    </AppLayout>
  )
}

/* ─── Network logo row ───────────────────────────────────────────────── */
function NetworkLogoRow({ logo, onNameChange, onRemove }: {
  logo: NetworkLogo
  onNameChange: (name: string) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border">
      <GripVertical size={14} className="text-muted-foreground shrink-0" />
      <div className="h-8 w-16 bg-white rounded border border-border flex items-center justify-center overflow-hidden shrink-0">
        <img src={logo.imageData} alt={logo.name} className="max-h-full max-w-full object-contain p-0.5" />
      </div>
      <input
        value={logo.name}
        onChange={e => onNameChange(e.target.value)}
        placeholder="Nom du réseau"
        className="flex-1 border border-border rounded-lg px-2 py-1.5 text-sm bg-card focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
      >
        <X size={15} />
      </button>
    </div>
  )
}

/* ─── Add network logo button ────────────────────────────────────────── */
function AddNetworkLogoButton({ onAdd }: { onAdd: (name: string, data: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [pendingName, setPendingName] = useState('')
  const [pendingData, setPendingData] = useState('')

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setPendingData(ev.target?.result as string)
      setPendingName(file.name.replace(/\.[^.]+$/, ''))
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleConfirm() {
    if (!pendingData) return
    onAdd(pendingName || 'Réseau', pendingData)
    setPendingData('')
    setPendingName('')
  }

  if (pendingData) {
    return (
      <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
        <div className="h-8 w-16 bg-white rounded border border-emerald-300 flex items-center justify-center overflow-hidden shrink-0">
          <img src={pendingData} alt="preview" className="max-h-full max-w-full object-contain p-0.5" />
        </div>
        <input
          value={pendingName}
          onChange={e => setPendingName(e.target.value)}
          placeholder="Nom du réseau (ex: WCA)"
          className="flex-1 border border-emerald-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
        />
        <button onClick={handleConfirm} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors">
          Ajouter
        </button>
        <button onClick={() => { setPendingData(''); setPendingName('') }} className="p-1.5 text-muted-foreground hover:text-destructive">
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => ref.current?.click()}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:border-primary/40 hover:text-primary transition-all"
    >
      <Plus size={15} /> Ajouter un logo réseau
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </button>
  )
}
