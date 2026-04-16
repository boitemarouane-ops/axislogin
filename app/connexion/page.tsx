'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login, getUserByEmail, updateUser } from '@/lib/users'
import {
  User, Lock, Eye, EyeOff, AlertCircle, CheckCircle2,
  FileText, Ship, FileSearch, Bell, ShieldCheck,
  X, Mail, KeyRound, RefreshCcw, ShieldAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAVY   = '#111439'
const GOLD   = '#ff9700'
const BORDER = '#e2e5ed'

/* ─── Real logo ─────────────────────────────────────────────────── */
function AxisLogo({ height = 52 }: { height?: number }) {
  return (
    <img
      src="/images/axis-logo.png"
      alt="Axis-Shipping Line"
      style={{ height, width: 'auto', display: 'block' }}
    />
  )
}

const FEATURES = [
  { icon: FileText,    text: 'Vos factures et l\'historique de vos opérations' },
  { icon: Ship,        text: 'Le suivi de vos expéditions avec historique détaillé' },
  { icon: FileSearch,  text: 'Vos devis, consultables et enregistrables à tout moment' },
  { icon: Bell,        text: 'Des alertes et notifications actualisées en temps réel' },
  { icon: ShieldCheck, text: 'Un accès sécurisé 24h/24 et 7j/7 sur tous vos appareils' },
]

/* ═══════════════════════════════════════════════════════════════════
   MODAL — Mot de passe oublié
   3 étapes : (1) email + captcha  →  (2) code reçu  →  (3) nouveau mdp
═══════════════════════════════════════════════════════════════════ */
type ForgotStep = 'email' | 'code' | 'password' | 'done'

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [step,         setStep]         = useState<ForgotStep>('email')
  const [fpEmail,      setFpEmail]      = useState('')
  const [robotChecked, setRobotChecked] = useState(false)
  const [fpCode,       setFpCode]       = useState('')
  const [serverCode,   setServerCode]   = useState('')
  const [newPwd,       setNewPwd]       = useState('')
  const [confirmPwd,   setConfirmPwd]   = useState('')
  const [showNew,      setShowNew]      = useState(false)
  const [showConf,     setShowConf]     = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [info,         setInfo]         = useState('')

  /* Step 1 — envoyer le code */
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!fpEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fpEmail)) {
      setError('Veuillez entrer une adresse email valide.')
      return
    }
    if (!robotChecked) {
      setError('Veuillez confirmer que vous n\'êtes pas un robot.')
      return
    }
    setLoading(true)
    try {
      const res  = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erreur.'); return }
      setServerCode(data.code)
      setInfo(`Code envoyé à ${fpEmail}${data.code ? ` — Code : ${data.code}` : ''}`)
      setStep('code')
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  /* Step 2 — vérifier le code */
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!fpCode.trim()) { setError('Entrez le code reçu.'); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/forgot-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail, code: fpCode, newPassword: 'placeholder' }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Code invalide.'); return }
      setStep('password')
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  /* Step 3 — nouveau mot de passe */
  function handleNewPassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPwd.length < 6) { setError('Minimum 6 caractères requis.'); return }
    if (newPwd !== confirmPwd) { setError('Les mots de passe ne correspondent pas.'); return }
    // Update in localStorage
    const user = getUserByEmail(fpEmail)
    if (!user) { setError('Utilisateur introuvable.'); return }
    const ok = updateUser(user.id, { password: newPwd })
    if (ok) setStep('done')
    else setError('Impossible de mettre à jour le mot de passe.')
  }

  const STEP_LABELS: Record<ForgotStep, string> = {
    email:    'Étape 1 sur 3 — Vérification de l\'identité',
    code:     'Étape 2 sur 3 — Saisie du code',
    password: 'Étape 3 sur 3 — Nouveau mot de passe',
    done:     'Terminé',
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(17,20,57,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Modal card */}
      <div
        className="relative w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex"
        style={{ minHeight: '460px', maxHeight: '90vh' }}
      >
        {/* ── LEFT: ship image ── */}
        <div className="hidden md:block relative w-2/5 shrink-0">
          <img
            src="/images/axis-port.png"
            alt="Terminal portuaire Axis Shipping Line"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-0 flex flex-col justify-end p-6"
            style={{ background: 'linear-gradient(to top, rgba(17,20,57,0.85) 0%, rgba(17,20,57,0.3) 60%, transparent 100%)' }}
          >
              <AxisLogo height={40} />
            <h3 className="text-white text-xl font-bold mt-3 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
              Réinitialisation<br/>du mot de passe
            </h3>
            <p className="text-white/70 text-xs mt-1">Sécurisez votre accès My Axis Shipping</p>
          </div>
        </div>

        {/* ── RIGHT: form ── */}
        <div className="flex-1 bg-white flex flex-col overflow-y-auto">
          {/* Header modal */}
          <div
            className="flex items-center justify-between px-6 py-4 shrink-0"
            style={{ borderBottom: `2px solid ${GOLD}` }}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: GOLD }}>
                {step !== 'done' ? STEP_LABELS[step] : ''}
              </p>
              <h2 className="text-lg font-bold mt-0.5" style={{ color: NAVY }}>
                Mot de passe oublié
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <X size={16} style={{ color: NAVY }} />
            </button>
          </div>

          {/* Progress bar */}
          {step !== 'done' && (
            <div className="h-1 bg-gray-100 shrink-0">
              <div
                className="h-full transition-all duration-500"
                style={{
                  backgroundColor: GOLD,
                  width: step === 'email' ? '33%' : step === 'code' ? '66%' : '100%',
                }}
              />
            </div>
          )}

          {/* Body */}
          <div className="flex-1 px-6 py-6">

            {/* ─── STEP 1: Email + Captcha ─── */}
            {step === 'email' && (
              <form onSubmit={handleSendCode} className="space-y-5 max-w-sm">
                <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>
                  Entrez l&apos;adresse email associée à votre compte. Nous vous enverrons un code de vérification à 6 chiffres.
                </p>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm" style={{ backgroundColor: '#fff2f2', border: '1px solid #fca5a5', color: '#b91c1c' }}>
                    <AlertCircle size={14} /> {error}
                  </div>
                )}

                {/* Email input */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: NAVY }}>
                    Adresse email
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
                    <input
                      type="email"
                      value={fpEmail}
                      onChange={e => setFpEmail(e.target.value)}
                      placeholder="votre@email.com"
                      className="w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg outline-none transition-all"
                      style={{ borderColor: BORDER, color: '#374151' }}
                      onFocus={e => (e.target.style.borderColor = NAVY)}
                      onBlur={e  => (e.target.style.borderColor = BORDER)}
                    />
                  </div>
                </div>

                {/* Anti-robot checkbox */}
                <div
                  className="rounded-xl p-4 flex items-center gap-3"
                  style={{ backgroundColor: '#f9fafb', border: `1px solid ${BORDER}` }}
                >
                  <div className="relative shrink-0">
                    <input
                      type="checkbox"
                      id="robot-check"
                      checked={robotChecked}
                      onChange={e => setRobotChecked(e.target.checked)}
                      className="w-5 h-5 cursor-pointer"
                      style={{ accentColor: NAVY }}
                    />
                  </div>
                  <label htmlFor="robot-check" className="text-sm font-medium cursor-pointer select-none" style={{ color: '#374151' }}>
                    Je ne suis pas un robot
                  </label>
                  <div className="ml-auto shrink-0">
                    <ShieldAlert size={22} style={{ color: robotChecked ? GOLD : '#d1d5db' }} />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg text-white text-sm font-bold transition-all"
                  style={{ backgroundColor: NAVY, opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Envoi en cours...
                    </span>
                  ) : 'Envoyer le code de vérification'}
                </button>
              </form>
            )}

            {/* ─── STEP 2: Code ─── */}
            {step === 'code' && (
              <form onSubmit={handleVerifyCode} className="space-y-5 max-w-sm">
                {info && (
                  <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm" style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', color: '#166534' }}>
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                    <span>{info}</span>
                  </div>
                )}
                {error && (
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm" style={{ backgroundColor: '#fff2f2', border: '1px solid #fca5a5', color: '#b91c1c' }}>
                    <AlertCircle size={14} /> {error}
                  </div>
                )}

                <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>
                  Saisissez le code à 6 chiffres envoyé à <strong style={{ color: NAVY }}>{fpEmail}</strong>.
                </p>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: NAVY }}>Code de vérification</label>
                  <div className="relative">
                    <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={fpCode}
                      onChange={e => setFpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full pl-9 pr-3 py-3 text-lg font-mono tracking-widest border rounded-lg outline-none text-center transition-all"
                      style={{ borderColor: BORDER, color: NAVY, letterSpacing: '0.25em' }}
                      onFocus={e => (e.target.style.borderColor = NAVY)}
                      onBlur={e  => (e.target.style.borderColor = BORDER)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || fpCode.length !== 6}
                  className="w-full py-3 rounded-lg text-white text-sm font-bold transition-all"
                  style={{ backgroundColor: GOLD, opacity: (loading || fpCode.length !== 6) ? 0.6 : 1 }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Vérification...
                    </span>
                  ) : 'Vérifier le code'}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('email'); setFpCode(''); setError(''); setInfo(''); setRobotChecked(false) }}
                  className="w-full flex items-center justify-center gap-1.5 text-sm font-medium py-2 hover:underline"
                  style={{ color: '#6b7280' }}
                >
                  <RefreshCcw size={13} /> Renvoyer le code
                </button>
              </form>
            )}

            {/* ─── STEP 3: Nouveau mot de passe ─── */}
            {step === 'password' && (
              <form onSubmit={handleNewPassword} className="space-y-5 max-w-sm">
                <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>
                  Définissez votre nouveau mot de passe. Il doit contenir au moins 6 caractères.
                </p>
                {error && (
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm" style={{ backgroundColor: '#fff2f2', border: '1px solid #fca5a5', color: '#b91c1c' }}>
                    <AlertCircle size={14} /> {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: NAVY }}>Nouveau mot de passe</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPwd}
                      onChange={e => setNewPwd(e.target.value)}
                      placeholder="Minimum 6 caractères"
                      className="w-full pl-9 pr-9 py-2.5 text-sm border rounded-lg outline-none transition-all"
                      style={{ borderColor: BORDER, color: '#374151' }}
                      onFocus={e => (e.target.style.borderColor = NAVY)}
                      onBlur={e  => (e.target.style.borderColor = BORDER)}
                    />
                    <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1" tabIndex={-1}>
                      {showNew ? <EyeOff size={14} style={{ color: '#9ca3af' }} /> : <Eye size={14} style={{ color: '#9ca3af' }} />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {newPwd.length > 0 && (
                    <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: newPwd.length < 6 ? '25%' : newPwd.length < 10 ? '60%' : '100%',
                          backgroundColor: newPwd.length < 6 ? '#ef4444' : newPwd.length < 10 ? GOLD : '#22c55e',
                        }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: NAVY }}>Confirmer le mot de passe</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
                    <input
                      type={showConf ? 'text' : 'password'}
                      value={confirmPwd}
                      onChange={e => setConfirmPwd(e.target.value)}
                      placeholder="Répétez le mot de passe"
                      className="w-full pl-9 pr-9 py-2.5 text-sm border rounded-lg outline-none transition-all"
                      style={{ borderColor: BORDER, color: '#374151' }}
                      onFocus={e => (e.target.style.borderColor = NAVY)}
                      onBlur={e  => (e.target.style.borderColor = BORDER)}
                    />
                    <button type="button" onClick={() => setShowConf(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1" tabIndex={-1}>
                      {showConf ? <EyeOff size={14} style={{ color: '#9ca3af' }} /> : <Eye size={14} style={{ color: '#9ca3af' }} />}
                    </button>
                  </div>
                  {confirmPwd.length > 0 && newPwd !== confirmPwd && (
                    <p className="text-xs mt-1" style={{ color: '#ef4444' }}>Les mots de passe ne correspondent pas</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={newPwd.length < 6 || newPwd !== confirmPwd}
                  className="w-full py-3 rounded-lg text-white text-sm font-bold transition-all"
                  style={{ backgroundColor: NAVY, opacity: (newPwd.length < 6 || newPwd !== confirmPwd) ? 0.5 : 1 }}
                >
                  Enregistrer le nouveau mot de passe
                </button>
              </form>
            )}

            {/* ─── DONE ─── */}
            {step === 'done' && (
              <div className="flex flex-col items-center justify-center py-8 text-center max-w-xs mx-auto">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: '#f0fdf4', border: '2px solid #86efac' }}
                >
                  <CheckCircle2 size={32} style={{ color: '#22c55e' }} />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: NAVY }}>Mot de passe réinitialisé !</h3>
                <p className="text-sm mb-6" style={{ color: '#6b7280' }}>
                  Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                </p>
                <button
                  onClick={onClose}
                  className="px-8 py-3 rounded-lg text-white text-sm font-bold"
                  style={{ backgroundColor: GOLD }}
                >
                  Retour à la connexion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   PAGE CONNEXION PRINCIPALE
═══════════════════════════════════════════════════════════════════ */
export default function LoginPage() {
  const router = useRouter()
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPwd,      setShowPwd]      = useState(false)
  const [rememberMe,   setRememberMe]   = useState(false)
  const [error,        setError]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [showForgot,   setShowForgot]   = useState(false)

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password.trim()) {
      setError('Veuillez renseigner tous les champs')
      return
    }
    setLoading(true)
    setTimeout(() => {
      const user = login(email, password)
      setLoading(false)
      if (user) {
        router.push('/')
      } else {
        setError('Identifiant ou mot de passe incorrect')
      }
    }, 700)
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#f5f7fa' }}>

      {/* ══ HEADER ══ */}
      <header
        className="shrink-0 flex items-center justify-center py-4 px-8"
        style={{ backgroundColor: '#fff', borderBottom: `3px solid ${NAVY}` }}
      >
        <AxisLogo height={56} />
      </header>

      {/* ══ BODY ══ */}
      <div className="flex flex-1 min-h-0">

        {/* LEFT: ship image — fixed */}
        <div className="hidden md:block shrink-0 relative overflow-hidden" style={{ width: '65%' }}>
          <img
            src="/images/axis-port.png"
            alt="Terminal portuaire Axis Shipping Line"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.08) 0%, transparent 70%)' }} />
        </div>

        {/* RIGHT: scrollable */}
        <div className="flex-1 overflow-y-auto bg-white" style={{ borderLeft: `1px solid ${BORDER}` }}>
          <div className="flex flex-col justify-center min-h-full px-10 lg:px-16 py-10">

            {/* Title */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2 leading-tight" style={{ color: NAVY, fontFamily: 'Georgia, serif' }}>
                Bienvenue sur<br />My Axis Shipping
              </h1>
              <div className="h-0.5 w-20 rounded-full" style={{ backgroundColor: GOLD }} />
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium" style={{ backgroundColor: '#fff2f2', border: '1px solid #fca5a5', color: '#b91c1c' }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5 max-w-sm w-full">

              {/* Email */}
              <div className="relative">
                <User size={17} className="absolute left-0 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Identifiant (email)"
                  className="w-full pl-7 pr-3 py-3 text-sm bg-transparent outline-none"
                  style={{ border: 'none', borderBottom: `2px solid ${BORDER}`, color: '#374151' }}
                  onFocus={e => (e.target.style.borderBottomColor = NAVY)}
                  onBlur={e  => (e.target.style.borderBottomColor = BORDER)}
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock size={17} className="absolute left-0 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
                <input
                  type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Mot de passe"
                  className="w-full pl-7 pr-9 py-3 text-sm bg-transparent outline-none"
                  style={{ border: 'none', borderBottom: `2px solid ${BORDER}`, color: '#374151' }}
                  onFocus={e => (e.target.style.borderBottomColor = NAVY)}
                  onBlur={e  => (e.target.style.borderBottomColor = BORDER)}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-1 top-1/2 -translate-y-1/2 p-1" tabIndex={-1} style={{ color: '#9ca3af' }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-4 h-4" style={{ accentColor: NAVY }} />
                  <span className="text-sm" style={{ color: '#6b7280' }}>Se souvenir de moi</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-sm font-semibold hover:underline transition-all"
                  style={{ color: NAVY }}
                >
                  Mot de passe oublié ?
                </button>
              </div>

              {/* Se connecter */}
              <button
                type="submit" disabled={loading}
                className={cn('w-full py-3 rounded-md text-white text-sm font-bold tracking-wide transition-all', loading ? 'opacity-70 cursor-not-allowed' : 'hover:brightness-110 active:scale-[0.99]')}
                style={{ backgroundColor: GOLD }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connexion en cours...
                  </span>
                ) : 'Se connecter'}
              </button>

              {/* Register */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-sm font-semibold" style={{ color: '#374151' }}>Vous n&apos;avez pas de compte ?</span>
                <button type="button" disabled
                  className="text-sm font-bold px-3 py-1 rounded-md border-2 transition-all opacity-40 cursor-not-allowed"
                  style={{ borderColor: NAVY, color: NAVY, backgroundColor: '#fff' }}
                  title="Bientôt disponible"
                >
                  S&apos;inscrire
                </button>
              </div>
            </form>

            {/* Divider */}
            <div className="relative flex items-center gap-4 max-w-sm w-full mt-8 mb-6">
              <div className="flex-1 h-px" style={{ backgroundColor: BORDER }} />
              <span className="text-xs font-semibold uppercase tracking-widest shrink-0" style={{ color: '#9ca3af' }}>En quelques clics</span>
              <div className="flex-1 h-px" style={{ backgroundColor: BORDER }} />
            </div>

            {/* Features */}
            <div className="space-y-3 max-w-sm w-full mb-8">
              <p className="text-xs font-semibold mb-3" style={{ color: '#6b7280' }}>
                Accédez à l&apos;essentiel de vos opérations logistiques :
              </p>
              {FEATURES.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${NAVY}10` }}>
                    <Icon size={14} style={{ color: NAVY }} />
                  </div>
                  <span className="text-sm leading-relaxed" style={{ color: '#374151' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ FOOTER ══ */}
      <footer className="shrink-0 py-2.5 px-8 text-center text-xs font-medium" style={{ backgroundColor: '#002f62', color: '#ffffff' }}>
        © 2026 Axis Shipping Line S.A.R.L — Tous droits réservés.
      </footer>

      {/* ══ MODAL Mot de passe oublié ══ */}
      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}

    </div>
  )
}
