'use client'

import { useState, useEffect, useRef } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { getCurrentSession, updateUser, changePassword, type User } from '@/lib/users'
import { Save, Upload, User as UserIcon, Lock, Mail, Phone, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    postalCode: '',
    country: '',
    avatar: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const avatarRef = useRef<HTMLInputElement>(null)
  
  // Email verification state
  const [emailChanged, setEmailChanged] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)

  useEffect(() => {
    const u = getCurrentSession()
    if (!u) {
      window.location.href = '/'
      return
    }
    setUser(u)
    setForm({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      address1: u.address1,
      address2: u.address2,
      city: u.city,
      postalCode: u.postalCode,
      country: u.country,
      avatar: u.avatar || '',
    })
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setErrors(er => ({ ...er, [name]: '' }))
    setSuccessMessage('')
    
    // Detect email change
    if (name === 'email' && user && value !== user.email) {
      setEmailChanged(true)
      setEmailVerified(false)
      setCodeSent(false)
    } else if (name === 'email' && user && value === user.email) {
      setEmailChanged(false)
      setEmailVerified(true)
    }
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPasswordForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErrors(er => ({ ...er, [e.target.name]: '' }))
    setSuccessMessage('')
  }

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setErrors({ avatar: 'Image trop volumineuse (max 2MB)' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setForm(f => ({ ...f, avatar: reader.result as string }))
      setErrors(er => ({ ...er, avatar: '' }))
    }
    reader.readAsDataURL(file)
  }

  async function sendVerificationCode() {
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setErrors({ email: 'Veuillez entrer une adresse email valide' })
      return
    }
    setLoading(true)
    try {
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      setGeneratedCode(code)
      
      // Call API to send email
      const response = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, code }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setCodeSent(true)
        setCodeInput('')
        // Display the code prominently since no email service is configured yet
        setSuccessMessage(`✅ Code de vérification : ${data.code}`)
        setTimeout(() => setSuccessMessage(''), 15000)
      } else {
        setErrors({ email: data.error || 'Erreur lors de l\'envoi du code' })
      }
    } catch (error) {
      setErrors({ email: 'Erreur réseau. Veuillez réessayer.' })
    } finally {
      setLoading(false)
    }
  }

  function verifyCode() {
    if (codeInput.trim() === generatedCode) {
      setEmailVerified(true)
      setSuccessMessage('Email vérifié avec succès !')
      setTimeout(() => setSuccessMessage(''), 3000)
      setErrors(er => ({ ...er, verificationCode: '' }))
    } else {
      setErrors({ verificationCode: 'Code incorrect' })
    }
  }

  function validateProfile(): boolean {
    const err: Record<string, string> = {}
    if (!form.firstName.trim()) err.firstName = 'Prénom requis'
    if (!form.lastName.trim()) err.lastName = 'Nom requis'
    if (!form.email.trim()) err.email = 'Email requis'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) err.email = 'Email invalide'
    if (emailChanged && !emailVerified) err.email = 'Veuillez vérifier votre email avec le code reçu'
    if (!form.phone.trim()) err.phone = 'Téléphone requis'
    if (!form.city.trim()) err.city = 'Ville requise'
    if (!form.country.trim()) err.country = 'Pays requis'
    setErrors(err)
    return Object.keys(err).length === 0
  }

  function handleSaveProfile() {
    if (!user || !validateProfile()) return
    setLoading(true)
    const success = updateUser(user.id, {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      address1: form.address1,
      address2: form.address2,
      city: form.city,
      postalCode: form.postalCode,
      country: form.country,
      avatar: form.avatar,
    })
    setLoading(false)
    if (success) {
      setSuccessMessage('Profil mis à jour avec succès !')
      setTimeout(() => setSuccessMessage(''), 3000)
    } else {
      setErrors({ general: 'Erreur lors de la mise à jour' })
    }
  }

  function handleChangePassword() {
    if (!user) return
    const err: Record<string, string> = {}
    if (!passwordForm.current.trim()) err.current = 'Mot de passe actuel requis'
    if (!passwordForm.new.trim()) err.new = 'Nouveau mot de passe requis'
    else if (passwordForm.new.length < 6) err.new = 'Minimum 6 caractères'
    if (passwordForm.new !== passwordForm.confirm) err.confirm = 'Les mots de passe ne correspondent pas'
    setErrors(err)
    if (Object.keys(err).length > 0) return

    const success = changePassword(user.id, passwordForm.current, passwordForm.new)
    if (success) {
      setSuccessMessage('Mot de passe changé avec succès !')
      setPasswordForm({ current: '', new: '', confirm: '' })
      setTimeout(() => setSuccessMessage(''), 3000)
    } else {
      setErrors({ current: 'Mot de passe actuel incorrect' })
    }
  }

  if (!user) return null

  const initials = `${user.firstName[0] || ''}${user.lastName[0] || ''}`.toUpperCase()

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
            <UserIcon size={28} className="text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mon Profile</h1>
            <p className="text-sm text-muted-foreground mt-1">Gérez vos informations personnelles et paramètres de sécurité</p>
          </div>
        </div>

        {/* Success message */}
        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-600 font-medium">{successMessage}</p>
          </div>
        )}

        {/* Avatar section */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-sm font-bold text-foreground/60 uppercase tracking-widest mb-4 pb-2 border-b border-border">Photo de profil</h2>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl border-2 border-border overflow-hidden bg-muted flex items-center justify-center">
                {form.avatar ? (
                  <img src={form.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-muted-foreground">{initials}</span>
                )}
              </div>
              <button
                onClick={() => avatarRef.current?.click()}
                className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Upload size={20} className="text-white" />
              </button>
            </div>
            <div>
              <button
                onClick={() => avatarRef.current?.click()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Changer la photo
              </button>
              <p className="text-xs text-muted-foreground mt-2">JPG, PNG ou GIF (max 2MB)</p>
              {errors.avatar && <p className="text-xs text-destructive mt-1">{errors.avatar}</p>}
            </div>
            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Profile information */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-sm font-bold text-foreground/60 uppercase tracking-widest mb-4 pb-2 border-b border-border flex items-center gap-2">
            <UserIcon size={14} />
            Informations personnelles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground/70 mb-1">
                Prénom <span className="text-destructive">*</span>
              </label>
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                className={cn(
                  'w-full border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
                  errors.firstName ? 'border-destructive' : 'border-border'
                )}
              />
              {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground/70 mb-1">
                Nom <span className="text-destructive">*</span>
              </label>
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                className={cn(
                  'w-full border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
                  errors.lastName ? 'border-destructive' : 'border-border'
                )}
              />
              {errors.lastName && <p className="text-xs text-destructive mt-1">{errors.lastName}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground/70 mb-1 flex items-center gap-1">
                <Mail size={12} />
                Email <span className="text-destructive">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className={cn(
                  'w-full border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
                  errors.email ? 'border-destructive' : 'border-border'
                )}
              />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>
            
            {/* Email verification code block */}
            {emailChanged && (
              <div className="md:col-span-2 bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <AlertCircle size={16} />
                  Vérification de l&apos;email requise
                </div>
                <p className="text-xs text-muted-foreground">
                  Vous avez modifié votre adresse email. Pour confirmer ce changement, nous devons vérifier votre nouvelle adresse.
                </p>
                {!codeSent ? (
                  <button
                    type="button"
                    onClick={sendVerificationCode}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Envoyer le code de vérification
                  </button>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-foreground/70">
                      Entrez le code reçu par email
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="123456"
                        value={codeInput}
                        onChange={e => setCodeInput(e.target.value)}
                        maxLength={6}
                        className={cn(
                          'flex-1 border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring transition-colors font-mono',
                          errors.verificationCode ? 'border-destructive' : 'border-border'
                        )}
                      />
                      <button
                        type="button"
                        onClick={verifyCode}
                        disabled={codeInput.length !== 6}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Vérifier
                      </button>
                    </div>
                    {errors.verificationCode && <p className="text-xs text-destructive">{errors.verificationCode}</p>}
                    <button
                      type="button"
                      onClick={sendVerificationCode}
                      className="text-xs text-primary hover:underline"
                    >
                      Renvoyer le code
                    </button>
                  </div>
                )}
                {emailVerified && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 size={14} />
                    Email vérifié avec succès
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-foreground/70 mb-1 flex items-center gap-1">
                <Phone size={12} />
                Téléphone <span className="text-destructive">*</span>
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className={cn(
                  'w-full border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
                  errors.phone ? 'border-destructive' : 'border-border'
                )}
              />
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground/70 mb-1">Rôle</label>
              <input
                value={user.role}
                readOnly
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-muted text-muted-foreground cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-sm font-bold text-foreground/60 uppercase tracking-widest mb-4 pb-2 border-b border-border flex items-center gap-2">
            <MapPin size={14} />
            Adresse
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-foreground/70 mb-1">Adresse 1</label>
              <input
                name="address1"
                value={form.address1}
                onChange={handleChange}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-foreground/70 mb-1">Adresse 2</label>
              <input
                name="address2"
                value={form.address2}
                onChange={handleChange}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground/70 mb-1">
                Ville <span className="text-destructive">*</span>
              </label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                className={cn(
                  'w-full border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
                  errors.city ? 'border-destructive' : 'border-border'
                )}
              />
              {errors.city && <p className="text-xs text-destructive mt-1">{errors.city}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground/70 mb-1">Code postal</label>
              <input
                name="postalCode"
                value={form.postalCode}
                onChange={handleChange}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-foreground/70 mb-1">
                Pays <span className="text-destructive">*</span>
              </label>
              <input
                name="country"
                value={form.country}
                onChange={handleChange}
                className={cn(
                  'w-full border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
                  errors.country ? 'border-destructive' : 'border-border'
                )}
              />
              {errors.country && <p className="text-xs text-destructive mt-1">{errors.country}</p>}
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-sm font-bold text-foreground/60 uppercase tracking-widest mb-4 pb-2 border-b border-border flex items-center gap-2">
            <Lock size={14} />
            Changer le mot de passe
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground/70 mb-1">Mot de passe actuel</label>
              <input
                type="password"
                name="current"
                value={passwordForm.current}
                onChange={handlePasswordChange}
                className={cn(
                  'w-full border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
                  errors.current ? 'border-destructive' : 'border-border'
                )}
              />
              {errors.current && <p className="text-xs text-destructive mt-1">{errors.current}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground/70 mb-1">Nouveau mot de passe</label>
              <input
                type="password"
                name="new"
                value={passwordForm.new}
                onChange={handlePasswordChange}
                className={cn(
                  'w-full border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
                  errors.new ? 'border-destructive' : 'border-border'
                )}
              />
              {errors.new && <p className="text-xs text-destructive mt-1">{errors.new}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground/70 mb-1">Confirmer le mot de passe</label>
              <input
                type="password"
                name="confirm"
                value={passwordForm.confirm}
                onChange={handlePasswordChange}
                className={cn(
                  'w-full border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
                  errors.confirm ? 'border-destructive' : 'border-border'
                )}
              />
              {errors.confirm && <p className="text-xs text-destructive mt-1">{errors.confirm}</p>}
            </div>
          </div>
          <button
            onClick={handleChangePassword}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Changer le mot de passe
          </button>
        </div>

        {/* Save button */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleSaveProfile}
            disabled={loading}
            className={cn(
              'flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:scale-105',
              loading && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Save size={16} />
            {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
