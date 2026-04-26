import { useAuth } from '../auth/useAuth'
import { useColleagues } from '../colleagues/useColleagues'
import { 
  Shield, Copy, Check, Users, CalendarDays, Car, 
  ShoppingCart, Heart, Plane, Sun, FileText, Loader2,
  X, UserCheck, Link as LinkIcon
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export function AdminPage() {
  const { organization, role, user, loading } = useAuth()
  const { data: colleagues } = useColleagues()
  const [copied, setCopied] = useState(false)
  const [localFeatures, setLocalFeatures] = useState<any>(null)

  useEffect(() => {
    if (organization?.settings?.features && !localFeatures) {
      setLocalFeatures(organization.settings.features)
    }
  }, [organization, localFeatures])

  const handleCopy = () => {
    if (organization?.id) {
      navigator.clipboard.writeText(organization.id)
      setCopied(true)
      toast.success("Code d'invitation copié !")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Fetch all members in this organization
  const { data: members, refetch: refetchMembers } = useQuery({
    queryKey: ['org_members', organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('organization_id', organization!.id)
      if (error) throw error
      return data || []
    }
  })

  const userCount = members?.length || 0
  const isManager = role === 'admin' || role === 'manager'

  // Fetch Pending Consumables
  const { data: pendingConsos } = useQuery({
    queryKey: ['pending_consumables', organization?.id],
    enabled: !!organization?.id && isManager,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consumable_requests')
        .select('*, requested_by_colleague_id(name)')
        .eq('organization_id', organization!.id)
        .eq('status', 'pending')
      if (error) throw error
      return data || []
    }
  })

  // Fetch Pending Leaves
  const { data: pendingLeaves } = useQuery({
    queryKey: ['pending_leaves', organization?.id],
    enabled: !!organization?.id && isManager,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, colleague_id(name)')
        .eq('organization_id', organization!.id)
        .eq('status', 'pending')
      if (error) throw error
      return data || []
    }
  })

  // Calculer les features à afficher (local ou base)
  const features = localFeatures || (organization?.settings as any)?.features || {
    meetings: true,
    vehicles: true,
    consumables: true,
    mood: true,
    leaves: true,
    notes: true
  }

  // Empêcher les non-admins de voir cette page dès que le chargement est fini
  if (!loading && role !== 'admin' && role !== 'manager') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg-app)', padding: 24 }}>
        <Shield style={{ width: 64, height: 64, color: '#E24B4A', opacity: 0.5, marginBottom: 16 }} />
        <h1 style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--color-text-main)', marginBottom: 8 }}>Accès Refusé</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Seuls les administrateurs et managers peuvent accéder à cette page.</p>
      </div>
    )
  }

  const toggleFeature = async (key: string) => {
    // Optimistic UI : On change l'état local immédiatement pour la sensation de "Temps Réel"
    const newFeatures = { ...features, [key]: !features[key] }
    setLocalFeatures(newFeatures)
    
    const { error } = await (supabase.from('organizations') as any)
      .update({ settings: { ...organization?.settings, features: newFeatures } })
      .eq('id', organization?.id)

    if (error) {
      toast.error("Erreur lors de la mise à jour")
      // En cas d'erreur, on remet l'ancien état
      setLocalFeatures(features)
    } else {
      toast.success("Réglages mis à jour")
    }
  }

  const FeatureToggle = ({ label, featureKey, icon: Icon }: { label: string, featureKey: string, icon: any }) => (
    <div style={{ 
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
      padding: '12px 16px', background: 'var(--color-bg-input)', 
      border: '1px solid var(--color-border)', borderRadius: 12,
      transition: 'all 0.2s'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ padding: 8, background: features[featureKey] ? 'rgba(29,158,117,0.1)' : 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
          <Icon style={{ width: 18, height: 18, color: features[featureKey] ? '#1D9E75' : 'var(--color-text-faded)' }} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--color-text-main)' }}>{label}</p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-faded)' }}>{features[featureKey] ? 'Activé' : 'Désactivé'}</p>
        </div>
      </div>
      <button 
        onClick={() => toggleFeature(featureKey)}
        style={{ 
          width: 44, height: 24, borderRadius: 12, border: 'none', 
          background: features[featureKey] ? '#1D9E75' : 'var(--color-bg-card)',
          cursor: 'pointer', position: 'relative', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <div style={{ 
          position: 'absolute', top: 3, left: features[featureKey] ? 23 : 3,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)', transition: 'inherit'
        }} />
      </button>
    </div>
  )

  const unlinkUser = async (uid: string) => {
    const links = { ...(organization?.settings as any)?.user_links }
    delete links[uid]
    
    const { error } = await (supabase.from('organizations') as any)
      .update({ settings: { ...organization?.settings, user_links: links } })
      .eq('id', organization?.id)

    if (error) toast.error("Erreur")
    else {
      toast.success("Utilisateur délié")
      refetchMembers()
    }
  }

  const linkUser = async (uid: string, cid: string) => {
    if (!cid) return
    const links = { ...(organization?.settings as any)?.user_links, [uid]: cid }
    
    const { error } = await (supabase.from('organizations') as any)
      .update({ settings: { ...organization?.settings, user_links: links } })
      .eq('id', organization?.id)

    if (error) toast.error("Erreur")
    else {
      toast.success("Utilisateur lié")
      refetchMembers()
    }
  }

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-app)' }}>
      <Loader2 style={{ animation: 'spin 1s linear infinite', color: '#1D9E75' }} />
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--color-bg-app)', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: '0 0 auto 0', height: 400, background: 'linear-gradient(180deg, rgba(29,158,117,0.06) 0%, transparent 100%)', pointerEvents: 'none' }} />
      
      <main style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: 850, margin: '0 auto' }}>
          
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: window.innerWidth < 640 ? 24 : 32, fontWeight: 800, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: 12, margin: 0, letterSpacing: '-0.02em' }}>
              <Shield style={{ width: window.innerWidth < 640 ? 24 : 32, height: window.innerWidth < 640 ? 24 : 32, color: '#1D9E75' }} />
              Administration
            </h1>
            <p style={{ color: 'var(--color-text-muted)', marginTop: 8, fontSize: window.innerWidth < 640 ? 14 : 16 }}>
              Espace de travail <strong>{organization?.name}</strong>
            </p>
          </div>

          {/* Validation Hub (Manager only) */}
          {(pendingConsos?.length || 0) + (pendingLeaves?.length || 0) > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: '#EF9F27', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF9F27', boxShadow: '0 0 10px #EF9F27' }} />
                Centre de Validation
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                {pendingConsos && pendingConsos.length > 0 && (
                  <div onClick={() => window.location.hash = '#/consumables'} style={{ cursor: 'pointer', background: 'var(--color-bg-card)', border: '1px solid #EF9F2740', borderRadius: 16, padding: 20, transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#EF9F27'}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <ShoppingCart style={{ width: 24, height: 24, color: '#EF9F27' }} />
                      <span style={{ fontSize: 18, fontWeight: 800, color: '#EF9F27', fontFamily: 'monospace' }}>{pendingConsos.length}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-text-main)' }}>Consommables en attente</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>Des demandes d'opérants nécessitent votre accord.</p>
                  </div>
                )}
                {pendingLeaves && pendingLeaves.length > 0 && (
                  <div onClick={() => window.location.hash = '#/leaves'} style={{ cursor: 'pointer', background: 'var(--color-bg-card)', border: '1px solid #EF9F2740', borderRadius: 16, padding: 20, transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#EF9F27'}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <CalendarDays style={{ width: 24, height: 24, color: '#EF9F27' }} />
                      <span style={{ fontSize: 18, fontWeight: 800, color: '#EF9F27', fontFamily: 'monospace' }}>{pendingLeaves.length}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-text-main)' }}>Congés en attente</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>Nouveaux dossiers d'absences à valider.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
            
            {/* Colonne Gauche: Modules */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-main)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check style={{ width: 18, height: 18, color: '#1D9E75' }} />
                Modules activés
              </h2>
              
              <div style={{ display: 'grid', gap: 12 }}>
                <FeatureToggle label="Réunions & Compte-rendus" featureKey="meetings" icon={CalendarDays} />
                <FeatureToggle label="Gestion du Parc Automobile" featureKey="vehicles" icon={Car} />
                <FeatureToggle label="Stock Consommables" featureKey="consumables" icon={ShoppingCart} />
                <FeatureToggle label="Baromètre d'Humeur" featureKey="mood" icon={Heart} />
                <FeatureToggle label="Gestion des Congés" featureKey="leaves" icon={Plane || Sun} />
                <FeatureToggle label="Notes de Préparation" featureKey="notes" icon={FileText} />
              </div>
            </div>

            {/* Colonne Droite: Accès & Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Invite Code Card */}
              <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-main)', marginTop: 0, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users style={{ width: 18, height: 18, color: '#1D9E75' }} />
                  Invitation de l'équipe
                </h3>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                  Donnez ce code à vos collaborateurs pour qu'ils rejoignent votre entreprise lors de leur inscription.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: '#1D9E75', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Lien d'invitation direct (Recommandé)</label>
                    <div style={{ 
                      background: 'var(--color-bg-input)', border: '2px solid #1D9E7540', 
                      borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 
                    }}>
                      <code style={{ fontSize: 12, color: '#5DCAA5', fontWeight: 600, flex: 1, wordBreak: 'break-all', fontFamily: 'monospace' }}>
                        {window.location.origin}/login?join={organization?.id}
                      </code>
                      <button onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/login?join=${organization?.id}`)
                        toast.success("Lien d'invitation copié !")
                      }} style={{ padding: 8, background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <LinkIcon style={{ width: 16, height: 16 }} />
                      </button>
                    </div>
                    <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--color-text-muted)' }}>L'employé qui clique sur ce lien sera automatiquement rattaché à votre entreprise.</p>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: 'var(--color-text-faded)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Code Entreprise (Manuel)</label>
                    <div style={{ 
                      background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', 
                      borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 
                    }}>
                      <code style={{ fontSize: 13, color: 'var(--color-text-faded)', fontWeight: 600, flex: 1, wordBreak: 'break-all', fontFamily: 'monospace' }}>
                        {organization?.id}
                      </code>
                      <button onClick={handleCopy} style={{ padding: 6, background: 'transparent', color: 'var(--color-text-faded)', border: '1px solid var(--color-border)', borderRadius: 6, cursor: 'pointer' }}>
                        {copied ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--color-border)', borderRadius: 10 }}>
                    <label style={{ display: 'block', fontSize: 10, color: 'var(--color-text-faded)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Votre ID Utilisateur (Perso)</label>
                    <code style={{ fontSize: 11, color: 'var(--color-text-faded)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{user?.id}</code>
                    <p style={{ margin: '8px 0 0', fontSize: 10, color: '#E24B4A', fontStyle: 'italic' }}>Attention : ne partagez pas votre ID Utilisateur, seul le Code Entreprise permet de vous rejoindre.</p>
                  </div>
                </div>
              </div>

              {/* Members Management Card */}
              <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-main)', marginTop: 0, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users style={{ width: 18, height: 18, color: '#1D9E75' }} />
                  Membres de l'organisation
                </h3>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                  Tous les utilisateurs ayant rejoint via votre lien d'invitation.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {members?.map((m: any) => {
                    const cid = (organization?.settings as any)?.user_links?.[m.user_id]
                    const c = (colleagues as any[])?.find(col => col.id === cid)
                    const isMe = m.user_id === user?.id
                    
                    return (
                      <div key={m.id} style={{ 
                        padding: '12px 16px', background: 'var(--color-bg-input)', 
                        borderRadius: 12, border: '1px solid var(--color-border2)',
                        display: 'flex', flexDirection: 'column', gap: 10
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--color-text-main)' }}>
                                {m.email || `Compte ${m.user_id.slice(0, 8)}`}
                              </p>
                              {isMe && <span style={{ fontSize: 9, background: 'rgba(29,158,117,0.1)', color: '#1D9E75', padding: '1px 6px', borderRadius: 4 }}>VOUS</span>}
                              <span style={{ fontSize: 9, background: 'var(--color-border)', color: 'var(--color-text-muted)', padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase' }}>{m.role}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: 10, color: 'var(--color-text-faded)', fontFamily: 'monospace' }}>{m.user_id}</p>
                          </div>
                          
                          {cid ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ textAlign: 'right' }}>
                                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#1D9E75' }}>Lié à : {c?.name || 'Inconnu'}</p>
                                <button onClick={() => unlinkUser(m.user_id)} 
                                  style={{ padding: 0, background: 'none', border: 'none', color: '#F09595', fontSize: 10, cursor: 'pointer', textDecoration: 'underline' }}>
                                  Délier
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 10, color: '#EF9F27', fontWeight: 600 }}>Non lié</span>
                            </div>
                          )}
                        </div>

                        {!cid && (
                          <div style={{ display: 'flex', gap: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                            <select 
                              onChange={(e) => linkUser(m.user_id, e.target.value)}
                              style={{ flex: 1, padding: '6px 10px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-main)', fontSize: 11, outline: 'none' }}
                            >
                              <option value="">Lier à un profil d'équipe...</option>
                              {colleagues?.filter(col => !Object.values((organization?.settings as any)?.user_links || {}).includes(col.id)).map(col => (
                                <option key={col.id} value={col.id}>{col.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  
                  {(!members || members.length === 0) && (
                    <div style={{ textAlign: 'center', padding: '32px 0', border: '1px dashed var(--color-border)', borderRadius: 12, color: 'var(--color-text-faded)', fontSize: 12 }}>
                      Aucun membre n'a encore rejoint.
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Card */}
              <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-main)', marginTop: 0, marginBottom: 16 }}>Statistiques</h3>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: 'var(--color-bg-input)', borderRadius: 8 }}>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Membres actifs</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>{userCount ?? '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: 'var(--color-bg-input)', borderRadius: 8 }}>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Silo sécurisé</span>
                    <span style={{ color: '#1D9E75', fontSize: 11, fontWeight: 700 }}>ACTIF</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
