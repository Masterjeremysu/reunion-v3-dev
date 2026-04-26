import React, { useEffect, useState, createContext, useContext, useCallback } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { Database, AppRole } from '../../types/database'

type Organization = Database['public']['Tables']['organizations']['Row']

interface AuthState {
  session: Session | null
  user: User | null
  organization: Organization | null
  role: AppRole | null
  colleagueId: string | null
  loading: boolean
  signOut: () => Promise<void>
  refreshOrg: () => Promise<void>
  linkColleague: (cid: string) => Promise<void>
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  organization: null,
  role: null,
  colleagueId: null,
  loading: true,
  signOut: async () => {},
  refreshOrg: async () => {},
  linkColleague: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [role, setRole] = useState<AppRole | null>(null)
  const [colleagueId, setColleagueId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Récupération des données
  const loadData = useCallback(async (userId: string) => {
    try {
      // Gestion de l'adhésion en attente
      const pendingOrgId = localStorage.getItem('pending_join_org_id')
      if (pendingOrgId) {
        await (supabase.from('user_roles') as any).upsert({
          user_id: userId,
          organization_id: pendingOrgId,
          role: 'employee',
          email: session?.user?.email
        })
        localStorage.removeItem('pending_join_org_id')
      }

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role, organization_id, email')
        .eq('user_id', userId)
        .maybeSingle()

      if (roleData) {
        setRole((roleData as any).role)
        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', (roleData as any).organization_id)
          .single()
        if (orgData) setOrganization(orgData as any)
      }
    } catch (e) {
      console.error("Error loading auth data", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    // 1. Session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadData(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // 2. Écoute des changements d'auth (SANS reset du loading)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadData(session.user.id)
      } else {
        setOrganization(null)
        setRole(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadData])

  // 3. Temps réel pour l'organisation (SANS comparaison JSON pour éviter les boucles)
  useEffect(() => {
    if (!organization?.id) return
    const channel = supabase.channel('realtime_org')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'organizations', filter: `id=eq.${organization.id}` }, 
      (payload) => {
        setOrganization(payload.new as any)
      })
      .subscribe()
    return () => { channel.unsubscribe() }
  }, [organization?.id])

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setOrganization(null)
    setRole(null)
    setColleagueId(null)
    window.location.href = '/'
  }

  const linkColleague = async (cid: string) => {
    if (!user || !organization) return
    const links = (organization.settings as any)?.user_links || {}
    const newLinks = { ...links, [user.id]: cid }
    
    const { error } = await (supabase.from('organizations') as any)
      .update({ settings: { ...organization.settings, user_links: newLinks } })
      .eq('id', organization.id)
      
    if (error) throw error
    setOrganization({ ...organization, settings: { ...organization.settings, user_links: newLinks } } as any)
  }

  // Résoudre le colleagueId quand l'organisation change
  useEffect(() => {
    if (user && organization) {
      const id = (organization.settings as any)?.user_links?.[user.id] || null
      setColleagueId(id)
    }
  }, [user, organization])

  return (
    <AuthContext.Provider value={{ 
      session, user, organization, role, colleagueId, loading, 
      signOut, refreshOrg: () => loadData(user?.id || ''),
      linkColleague
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
