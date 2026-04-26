import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from './useAuth'
import { ROUTES } from '../../constants'
import { toast } from 'sonner'
import { Loader2, Check } from 'lucide-react'

export function AuthPage() {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  
  // Détection du lien d'invitation ?join=UUID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const joinId = params.get('join')
    if (joinId && joinId.length >= 30) {
      setInviteCode(joinId)
      setMode('signup')
    }
  }, [])

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!loading && session) return <Navigate to={ROUTES.DASHBOARD} replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.user) {
          const uid = data.user.id
          if (inviteCode && inviteCode.trim().length >= 30) {
            const cleanCode = inviteCode.trim()
            localStorage.setItem('pending_join_org_id', cleanCode)
            
            try {
              await (supabase.from('user_roles') as any).insert({
                user_id: uid,
                organization_id: cleanCode,
                role: 'employee',
                email: email
              })
            } catch (e) {
              // Silencieux car useAuth s'en occupera au prochain login
            }
          } else {
            const { data: org, error: orgErr } = await (supabase.from('organizations') as any)
              .insert({ name: 'Mon Entreprise', owner_id: uid })
              .select()
              .single()
              
            if (orgErr) throw orgErr
            
            const { error: roleError } = await (supabase.from('user_roles') as any).insert({
              user_id: uid,
              organization_id: org.id,
              role: 'admin',
              email: email
            })
            
            if (roleError) throw roleError
            toast.success('Votre espace de travail est prêt !')
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur de connexion')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg-app)', position: 'relative', overflow: 'hidden', padding: 20,
      fontFamily: "'Outfit', sans-serif"
    }}>
      {/* Decorative Background Elements */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'var(--color-brand)', opacity: 0.05, filter: 'blur(100px)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%', background: '#00BFA5', opacity: 0.05, filter: 'blur(100px)', borderRadius: '50%' }} />
      
      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 10, animation: 'fadeIn 0.6s ease-out' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', padding: 12, borderRadius: 16,
            background: 'var(--grad-main)', boxShadow: '0 8px 24px rgba(0,229,160,0.2)', marginBottom: 16
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-main)', margin: 0, letterSpacing: '-0.02em' }}>
            Réunions GT
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 4 }}>
            Le Pilotage d'Équipe Intelligent
          </p>
        </div>

        {/* Card */}
        <div className="glass-card" style={{ padding: isMobile ? 24 : 40, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />
          
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-main)', margin: 0 }}>
              {mode === 'login' ? 'Bon retour' : 'Créer un compte'}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
              {mode === 'login' ? 'Connectez-vous pour accéder à votre espace.' : 'Rejoignez votre équipe en quelques secondes.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 8 }}>Email Professionnel</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="nom@entreprise.fr" required
                style={{
                  width: '100%', padding: '12px 16px', background: 'var(--color-bg-input)',
                  border: '1px solid var(--color-border)', borderRadius: 12, color: 'var(--color-text-main)',
                  fontSize: 14, outline: 'none', transition: 'all 0.2s'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 8 }}>Mot de passe</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••" required
                style={{
                  width: '100%', padding: '12px 16px', background: 'var(--color-bg-input)',
                  border: '1px solid var(--color-border)', borderRadius: 12, color: 'var(--color-text-main)',
                  fontSize: 14, outline: 'none', transition: 'all 0.2s'
                }}
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 8 }}>Code d'invitation</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)}
                    placeholder="Code ou lien reçu"
                    style={{
                      width: '100%', padding: '12px 16px', background: 'var(--color-bg-input)',
                      border: inviteCode ? '1px solid var(--color-brand)' : '1px solid var(--color-border)',
                      borderRadius: 12, color: 'var(--color-text-main)', fontSize: 14, outline: 'none'
                    }}
                  />
                  {inviteCode && (
                    <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                      <Check style={{ width: 16, height: 16, color: 'var(--color-brand)' }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit" disabled={busy}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                background: 'var(--grad-main)', color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 8px 16px var(--color-brand-glow)', marginTop: 8, transition: 'all 0.2s'
              }}
            >
              {busy ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> : (
                mode === 'login' ? 'Se connecter' : 'Créer mon compte'
              )}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center', paddingTop: 24, borderTop: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: 13, cursor: 'pointer' }}
            >
              {mode === 'login' ? "Pas encore de compte ? S'inscrire" : "Déjà membre ? Se connecter"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-faded)', marginTop: 32, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Réunions GT v3.0 • Système Sécurisé
        </p>
      </div>
    </div>
  )
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 style={{ animation: 'spin 1s linear infinite', color: 'var(--color-brand)' }} />
    </div>
  )
  if (!session) return <Navigate to={ROUTES.LOGIN} replace />
  return <>{children}</>
}
