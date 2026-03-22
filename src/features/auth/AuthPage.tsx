import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from './useAuth'
import { ROUTES } from '../../constants'
import { toast } from 'sonner'
import { CalendarDays, Loader2 } from 'lucide-react'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Chargement...</p>
      </div>
    </div>
  )
  if (!session) return <Navigate to={ROUTES.LOGIN} replace />
  return <>{children}</>
}

export function AuthPage() {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  if (!loading && session) return <Navigate to={ROUTES.DASHBOARD} replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast.success('Connexion réussie')
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        toast.success('Vérifiez votre email pour confirmer votre compte')
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur de connexion')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center">
            <CalendarDays className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-medium text-white">Réunions GT</h1>
            <p className="text-sm text-slate-400 mt-1">
              {mode === 'login' ? 'Connectez-vous à votre espace' : 'Créer votre compte'}
            </p>
          </div>
        </div>

        <div className="bg-[#181c27] border border-white/10 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Adresse email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="vous@entreprise.fr" required
                className="w-full bg-[#1e2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-teal-500 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Mot de passe</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="w-full bg-[#1e2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-teal-500 transition-colors"
              />
            </div>
            <button
              type="submit" disabled={busy}
              className="mt-2 w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'login' ? 'Se connecter' : 'Créer le compte'}
            </button>
          </form>
          <div className="mt-4 pt-4 border-t border-white/10 text-center">
            <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-xs text-slate-400 hover:text-teal-400 transition-colors">
              {mode === 'login' ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-slate-600 mt-6">Réunions GT v2 · 2026</p>
      </div>
    </div>
  )
}
