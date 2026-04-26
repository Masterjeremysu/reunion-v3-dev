import { useState, useMemo } from 'react'
import { useAuth } from '../auth/useAuth'
import { useConsumables, useCreateConsumable, useUpdateConsumableStatus } from './useConsumables'
import { useColleagues } from '../colleagues/useColleagues'
import { Spinner } from '../../components/ui'
import { fDate, fRelative } from '../../utils'
import {
  ShoppingCart, Plus, Search, X, Filter,
  Check, Clock, Package, Truck, CheckCircle,
  XCircle, ChevronDown, Loader2, BarChart2,
  AlertTriangle, ArrowUpRight, TrendingUp,
  Users, Hash, Edit2, RefreshCw
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

type ConsoStatus = 'pending' | 'approved' | 'ordered' | 'delivered' | 'rejected'

const STATUS_CONF: Record<ConsoStatus, { label: string; color: string; bg: string; border: string; icon: typeof Check; next?: ConsoStatus }> = {
  pending:   { label: 'En attente', color: '#EF9F27', bg: '#EF9F2712', border: '#EF9F2730', icon: Clock,        next: 'approved'  },
  approved:  { label: 'Approuvé',   color: '#1D9E75', bg: '#1D9E7512', border: '#1D9E7530', icon: Check,        next: 'ordered'   },
  ordered:   { label: 'Commandé',   color: '#378ADD', bg: '#378ADD12', border: '#378ADD30', icon: Truck,        next: 'delivered' },
  delivered: { label: 'Livré',      color: '#5DCAA5', bg: '#5DCAA512', border: '#5DCAA530', icon: CheckCircle, next: undefined   },
  rejected:  { label: 'Rejeté',     color: '#E24B4A', bg: '#E24B4A12', border: '#E24B4A30', icon: XCircle,     next: undefined   },
}

const PIPELINE: ConsoStatus[] = ['pending', 'approved', 'ordered', 'delivered']

// ─── Status pipeline badge ────────────────────────────────────────────────────
function PipelineBadge({ status, onChange }: { status: ConsoStatus; onChange: (s: ConsoStatus) => void }) {
  const [open, setOpen] = useState(false)
  const conf = STATUS_CONF[status]
  const Icon = conf.icon
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: conf.bg, border: `1px solid ${conf.border}`, borderRadius: 20, fontSize: 11, color: conf.color, cursor: 'pointer', fontFamily: 'monospace', fontWeight: 600, transition: 'opacity 0.15s' }}>
        <Icon style={{ width: 10, height: 10 }} />
        {conf.label}
        <ChevronDown style={{ width: 9, height: 9, opacity: 0.6 }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'var(--color-bg-card)', border: '1px solid var(--color-border2)', borderRadius: 10, overflow: 'hidden', zIndex: 20, minWidth: 150, boxShadow: '0 8px 24px var(--color-overlay)' }}>
          {(Object.keys(STATUS_CONF) as ConsoStatus[]).map(s => {
            const c = STATUS_CONF[s]; const CIcon = c.icon
            return (
              <button key={s} onClick={() => { onChange(s); setOpen(false) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: s === status ? 'var(--color-border)' : 'transparent', border: 'none', cursor: 'pointer', color: s === status ? c.color : 'var(--color-text-muted)', fontSize: 12 }}>
                <CIcon style={{ width: 12, height: 12, color: c.color }} />
                {c.label}
                {s === status && <Check style={{ width: 10, height: 10, marginLeft: 'auto' }} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Kanban pipeline view ─────────────────────────────────────────────────────
function PipelineView({ consumables, colleagues, onStatusChange, onAdd }: {
  consumables: any[]; colleagues: any[]
  onStatusChange: (id: string, status: ConsoStatus) => void
  onAdd: (status: ConsoStatus) => void
}) {
  const byStatus = useMemo(() => {
    const map: Record<ConsoStatus, any[]> = { pending: [], approved: [], ordered: [], delivered: [], rejected: [] }
    consumables.forEach(c => { if (map[c.status as ConsoStatus]) map[c.status as ConsoStatus].push(c) })
    return map
  }, [consumables])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, height: '100%', padding: '16px 24px', overflowX: 'auto' }}>
      {PIPELINE.map(status => {
        const conf = STATUS_CONF[status]
        const items = byStatus[status]
        const Icon = conf.icon
        return (
          <div key={status} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <Icon style={{ width: 12, height: 12, color: conf.color }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: conf.color, fontFamily: 'monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{conf.label}</span>
              <span style={{ fontSize: 10, color: 'var(--color-text-faded)', background: 'var(--color-bg-input)', borderRadius: 20, padding: '1px 7px', fontFamily: 'monospace' }}>{items.length}</span>
              {status === 'pending' && (
                <button onClick={() => onAdd(status)} style={{ marginLeft: 'auto', padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: conf.color, opacity: 0.6, display: 'flex' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '0.6')}>
                  <Plus style={{ width: 13, height: 13 }} />
                </button>
              )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.length === 0 && (
                <div style={{ border: '1px dashed var(--color-border)', borderRadius: 10, padding: '16px 12px', textAlign: 'center', color: 'var(--color-text-faded)', fontSize: 12 }}>Vide</div>
              )}
              {items.map((item: any) => {
                const c = colleagues.find((col: any) => col.id === item.requested_by_colleague_id)
                return (
                  <div key={item.id} style={{ background: 'var(--color-bg-sidebar)', border: `1px solid ${conf.border}`, borderRadius: 10, padding: '11px 13px', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = conf.color + '50')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = conf.border)}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-main)', margin: '0 0 5px', lineHeight: 1.3 }}>{item.item_name}</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace', background: 'var(--color-bg-input)', borderRadius: 6, padding: '1px 6px' }}>× {item.quantity}</span>
                      {c && <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{c.name}</span>}
                      {item.details && <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{item.details}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 9, color: 'var(--color-text-faded)', fontFamily: 'monospace' }}>{fRelative(item.created_at)}</span>
                      {conf.next && (
                        <button onClick={() => onStatusChange(item.id, conf.next!)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: STATUS_CONF[conf.next].color, background: `${STATUS_CONF[conf.next].color}12`, border: `1px solid ${STATUS_CONF[conf.next].color}25`, borderRadius: 20, padding: '2px 8px', cursor: 'pointer', fontFamily: 'monospace', transition: 'all 0.15s' }}>
                          {STATUS_CONF[conf.next].label} →
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Create form ──────────────────────────────────────────────────────────────
function CreateForm({ colleagues, defaultStatus = 'pending', onClose }: {
  colleagues: any[]; defaultStatus?: ConsoStatus; onClose: () => void
}) {
  const { role, colleagueId } = useAuth()
  const isAdmin = role === 'admin' || role === 'manager'
  
  const createConsumable = useCreateConsumable()
  const [name, setName] = useState('')
  const [details, setDetails] = useState('')
  const [qty, setQty] = useState(1)
  const [requestedBy, setRequestedBy] = useState(isAdmin ? '' : (colleagueId || ''))
  const [status, setStatus] = useState<ConsoStatus>(defaultStatus)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    await createConsumable.mutateAsync({ item_name: name.trim(), details: details || null, quantity: qty, requested_by_colleague_id: requestedBy || null, status, user_id: user?.id ?? null })
    onClose()
  }

  return (
    <div style={{ padding: '16px 24px', background: 'var(--color-bg-sidebar)', borderBottom: '1px solid var(--color-border)' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 2, minWidth: 200 }}>
          <label style={{ display: 'block', fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Article *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom de l'article" required autoFocus
            style={{ width: '100%', background: 'var(--color-bg-input)', border: '1px solid var(--color-border2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--color-text-main)', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: 2, minWidth: 160 }}>
          <label style={{ display: 'block', fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Détails</label>
          <input value={details} onChange={e => setDetails(e.target.value)} placeholder="Référence, couleur, taille..."
            style={{ width: '100%', background: 'var(--color-bg-input)', border: '1px solid var(--color-border2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--color-text-main)', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ width: 70 }}>
          <label style={{ display: 'block', fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Qté</label>
          <input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} min={1}
            style={{ width: '100%', background: 'var(--color-bg-input)', border: '1px solid var(--color-border2)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--color-text-main)', outline: 'none' }} />
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={{ display: 'block', fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Demandé par</label>
          {isAdmin ? (
            <select value={requestedBy} onChange={e => setRequestedBy(e.target.value)}
              style={{ width: '100%', background: 'var(--color-bg-input)', border: '1px solid var(--color-border2)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: requestedBy ? 'var(--color-text-main)' : 'var(--color-text-faded)', outline: 'none' }}>
              <option value="">— Sélectionner —</option>
              {colleagues.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : (
            <div style={{ width: '100%', background: 'var(--color-bg-input)', border: '1px solid var(--color-border2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--color-text-faded)', fontFamily: 'monospace' }}>
              {colleagues?.find(c => c.id === colleagueId)?.name || 'Moi'}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={onClose}
            style={{ padding: '8px 14px', fontSize: 12, color: 'var(--color-text-muted)', background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 8, cursor: 'pointer' }}>Annuler</button>
          <button type="submit" disabled={!name.trim() || createConsumable.isPending}
            style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-main)', background: '#1D9E75', border: 'none', borderRadius: 8, cursor: 'pointer', opacity: name.trim() ? 1 : 0.4, display: 'flex', alignItems: 'center', gap: 6 }}>
            {createConsumable.isPending ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> : <Plus style={{ width: 12, height: 12 }} />}
            Envoyer
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function ConsumablesPage() {
  const { role, colleagueId, user } = useAuth()
  const isAdmin = role === 'admin' || role === 'manager'

  const { data: consumables, isLoading } = useConsumables()
  const { data: colleagues } = useColleagues()
  const updateStatus = useUpdateConsumableStatus()

  const [view, setView] = useState<'pipeline' | 'list'>(isAdmin ? 'pipeline' : 'list')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<ConsoStatus | 'all'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [createStatus, setCreateStatus] = useState<ConsoStatus>('pending')

  const filtered = useMemo(() => {
    if (!consumables) return []
    const q = search.toLowerCase()
    
    // Filter by role: employees only see their own requests
    let base = (consumables as any[])
    if (!isAdmin) {
      base = base.filter(c => c.user_id === user?.id || (colleagueId && c.requested_by_colleague_id === colleagueId))
    }

    return base.filter(c => {
      if (filterStatus !== 'all' && c.status !== filterStatus) return false
      if (!q) return true
      const col = colleagues?.find((col: any) => col.id === c.requested_by_colleague_id)
      const itemName = c.item_name?.toLowerCase() || ''
      const details = (c.details ?? '').toLowerCase()
      const colName = (col?.name ?? '').toLowerCase()
      return itemName.includes(q) || details.includes(q) || colName.includes(q)
    })
  }, [consumables, search, filterStatus, colleagues, isAdmin, user?.id, colleagueId])

  const stats = useMemo(() => {
    const all = (consumables as any[]) ?? []
    const myItems = isAdmin ? all : all.filter(c => c.user_id === user?.id || (colleagueId && c.requested_by_colleague_id === colleagueId))
    
    const now = new Date()
    const monthStart = startOfMonth(now)
    const thisMonth = myItems.filter(c => new Date(c.created_at) >= monthStart).length
    const prevMonth = myItems.filter(c => {
      const d = new Date(c.created_at); return d >= startOfMonth(subMonths(now, 1)) && d < monthStart
    }).length
    
    return {
      pending:   myItems.filter(c => c.status === 'pending').length,
      approved:  myItems.filter(c => c.status === 'approved').length,
      ordered:   myItems.filter(c => c.status === 'ordered').length,
      delivered: myItems.filter(c => c.status === 'delivered').length,
      rejected:  myItems.filter(c => c.status === 'rejected').length,
      thisMonth, prevMonth, total: myItems.length,
    }
  }, [consumables, isAdmin, user?.id, colleagueId])

  const handleStatusChange = (id: string, status: ConsoStatus) => {
    if (!isAdmin) {
      toast.error("Seuls les administrateurs peuvent changer le statut")
      return
    }
    updateStatus.mutate({ id, status })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--color-bg-app)', overflow: 'hidden' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Topbar */}
      <div style={{ flexShrink: 0, padding: '0 24px', height: 52, borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-sidebar)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-main)', margin: 0 }}>
          {isAdmin ? 'Gestion Consommables' : 'Mes Demandes'}
        </h1>

        {/* Mini stats */}
        <div style={{ display: 'flex', gap: 6 }}>
          {stats.pending > 0 && (
            <span style={{ fontSize: 10, color: '#FAC775', background: '#EF9F2712', border: '1px solid #EF9F2725', borderRadius: 20, padding: '2px 8px', fontFamily: 'monospace', fontWeight: 600 }}>
              {stats.pending} en attente
            </span>
          )}
          {stats.ordered > 0 && (
            <span style={{ fontSize: 10, color: '#85B7EB', background: '#378ADD12', border: '1px solid #378ADD25', borderRadius: 20, padding: '2px 8px', fontFamily: 'monospace' }}>
              {stats.ordered} commandé{stats.ordered > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '0 10px', height: 30, width: 200 }}>
            <Search style={{ width: 12, height: 12, color: 'var(--color-text-faded)', flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
              style={{ flex: 1, background: 'transparent', border: 'none', fontSize: 12, color: 'var(--color-text-main)', outline: 'none' }} />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}><X style={{ width: 10, height: 10 }} /></button>}
          </div>

          {/* View toggle (Admin only) */}
          {isAdmin && (
            <div style={{ display: 'flex', background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 2 }}>
              {(['pipeline', 'list'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'monospace', transition: 'all 0.15s', background: view === v ? 'var(--color-border)' : 'transparent', color: view === v ? 'var(--color-text-main)' : 'var(--color-text-faded)' }}>
                  {v === 'pipeline' ? '⊞ Pipeline' : '≡ Liste'}
                </button>
              ))}
            </div>
          )}

          <button onClick={() => setShowCreate(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: '#1D9E75', border: 'none', borderRadius: 8, color: 'var(--color-text-main)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <Plus style={{ width: 12, height: 12 }} /> Nouvelle demande
          </button>
        </div>
      </div>

      {/* Stats band */}
      <div style={{ flexShrink: 0, padding: '10px 24px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-app)', display: 'flex', gap: 6, overflowX: 'auto' }}>
        <button onClick={() => setFilterStatus('all')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: filterStatus === 'all' ? 'var(--color-border)' : 'transparent', border: `1px solid ${filterStatus === 'all' ? 'var(--color-text-faded)' : 'var(--color-border)'}`, borderRadius: 20, cursor: 'pointer', transition: 'all 0.15s' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-main)', fontFamily: 'monospace' }}>{stats.total}</span>
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{isAdmin ? 'total' : 'mes demandes'}</span>
        </button>
        {(Object.keys(STATUS_CONF) as ConsoStatus[]).map(s => {
          const conf = STATUS_CONF[s]; const count = stats[s as keyof typeof stats] as number
          return (
            <button key={s} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: filterStatus === s ? conf.bg : 'transparent', border: `1px solid ${filterStatus === s ? conf.border : 'var(--color-border)'}`, borderRadius: 20, cursor: 'pointer', transition: 'all 0.15s', opacity: count === 0 ? 0.4 : 1 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: conf.color, fontFamily: 'monospace' }}>{count}</span>
              <span style={{ fontSize: 10, color: conf.color, opacity: 0.7, fontFamily: 'monospace' }}>{conf.label.toLowerCase()}</span>
            </button>
          )
        })}
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateForm 
          colleagues={colleagues ?? []} 
          defaultStatus={createStatus} 
          onClose={() => setShowCreate(false)} 
        />
      )}

      {/* Content */}
      {isLoading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>
      ) : view === 'pipeline' && isAdmin ? (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <PipelineView
            consumables={filtered}
            colleagues={colleagues ?? []}
            onStatusChange={handleStatusChange}
            onAdd={(s) => { setCreateStatus(s); setShowCreate(true) }}
          />
        </div>
      ) : (
        /* List view (Personal for employee, full for admin) */
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-faded)', fontSize: 13 }}>
              <ShoppingCart style={{ width: 32, height: 32, margin: '0 auto 12px', opacity: 0.3 }} />
              {search || filterStatus !== 'all' ? 'Aucun résultat' : 'Aucune demande'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(Object.keys(STATUS_CONF) as ConsoStatus[]).map(status => {
                const items = filtered.filter(c => c.status === status)
                if (items.length === 0) return null
                const conf = STATUS_CONF[status]
                return (
                  <div key={status} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: conf.color }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: conf.color, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {conf.label} · {items.length}
                      </span>
                    </div>
                    <div style={{ background: 'var(--color-bg-sidebar)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
                      {items.map((item: any, i: number) => {
                        const c = colleagues?.find((col: any) => col.id === item.requested_by_colleague_id)
                        return (
                          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < items.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-main)', margin: 0 }}>{item.item_name}</p>
                              <div style={{ display: 'flex', gap: 10, marginTop: 3 }}>
                                <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace', background: 'var(--color-bg-input)', borderRadius: 6, padding: '1px 6px' }}>× {item.quantity}</span>
                                {c && <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{c.name}</span>}
                                {item.details && <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{item.details}</span>}
                                <span style={{ fontSize: 10, color: 'var(--color-text-faded)', fontFamily: 'monospace' }}>{fRelative(item.created_at)}</span>
                              </div>
                            </div>
                            {isAdmin ? (
                              <PipelineBadge status={item.status as ConsoStatus} onChange={(s) => handleStatusChange(item.id, s)} />
                            ) : (
                              <div style={{ padding: '4px 10px', background: conf.bg, border: `1px solid ${conf.border}`, borderRadius: 20, fontSize: 11, color: conf.color, fontFamily: 'monospace', fontWeight: 600 }}>
                                {conf.label}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
