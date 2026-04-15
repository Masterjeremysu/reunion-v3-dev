import { useAuth } from '../auth/useAuth'
import { 
  Shield, Copy, Check, Users, CalendarDays, Car, 
  ShoppingCart, Heart, Plane, Sun, FileText, Loader2
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export function AdminPage() {
  const { organization, role, loading } = useAuth()
  const [copied, setCopied] = useState(false)
  const [localFeatures, setLocalFeatures] = useState<any>(null)

  // Sync avec l'organisation quand elle charge
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

  // Fetch count of users in this organization
  const { data: userCount } = useQuery({
    queryKey: ['org_users_count', organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization!.id)
      if (error) throw error
      return count || 0
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
  if (!loading && role !== 'admin') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg-app)', padding: 24 }}>
        <Shield style={{ width: 64, height: 64, color: '#E24B4A', opacity: 0.5, marginBottom: 16 }} />
        <h1 style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--color-text-main)', marginBottom: 8 }}>Accès Refusé</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Seuls les administrateurs peuvent accéder à cette page.</p>
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

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-app)' }}>
      <Loader2 style={{ animation: 'spin 1s linear infinite', color: '#1D9E75' }} />
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--color-bg-app)', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: '0 0 auto 0', height: 400, background: 'linear-gradient(180deg, rgba(29,158,117,0.06) 0%, transparent 100%)', pointerEvents: 'none' }} />
      
      <main style={{ flex: 1, overflowY: 'auto', padding: '32px 16px', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: 850, margin: '0 auto' }}>
          
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: 12, margin: 0, letterSpacing: '-0.02em' }}>
              <Shield style={{ width: 32, height: 32, color: '#1D9E75' }} />
              Administration SaaS
            </h1>
            <p style={{ color: 'var(--color-text-muted)', marginTop: 8, fontSize: 16 }}>
              Gérez l'espace de travail <strong>{organization?.name}</strong> et configurez vos modules.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 24 }}>
            
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
                  Accès collaborateurs
                </h3>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                  Partagez ce code avec votre équipe pour qu'ils rejoignent votre organisation lors de leur inscription.
                </p>
                
                <div style={{ 
                  background: 'var(--color-bg-input)', border: '1px solid var(--color-border2)', 
                  borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 
                }}>
                  <code style={{ fontSize: 13, color: '#1D9E75', fontWeight: 700, flex: 1, wordBreak: 'break-all', fontFamily: 'monospace' }}>
                    {organization?.id}
                  </code>
                  <button
                    onClick={handleCopy}
                    style={{ 
                      padding: 8, background: '#1D9E75', color: '#fff', border: 'none', 
                      borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' 
                    }}
                  >
                    {copied ? <Check style={{ width: 16, height: 16 }} /> : <Copy style={{ width: 16, height: 16 }} />}
                  </button>
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
