import { useState, useMemo, useEffect } from 'react'
import { useColleagues, useCreateColleague, useDeleteColleague } from './useColleagues'
import { useActions } from '../actions/useActions'
import { useMeetings } from '../meetings/useMeetings'
import { useConsumables } from '../consumables/useConsumables'
import { Spinner } from '../../components/ui'
import { fDate, fRelative, isOverdue } from '../../utils'
import { ACTION_STATUS } from '../../constants'
import {
  Users, Plus, Search, Trash2, X, Check,
  CalendarDays, CheckSquare, ShoppingCart,
  TrendingUp, Clock, AlertTriangle, Edit2,
  Loader2, ChevronRight, ChevronLeft, Activity, Award,
  Zap, BarChart2, UserX, UserCheck, Phone,
  Mail, Briefcase, Calendar, FileText,
  MoreHorizontal, Archive, RefreshCw
} from 'lucide-react'
import {
  format, differenceInDays, differenceInMonths,
  differenceInYears, startOfMonth, endOfMonth,
  subMonths, parseISO
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { QK } from '../../constants'
import { toast } from 'sonner'

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useUpdateColleague() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const { data, error } = await (supabase.from('colleagues') as any).update(payload).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.COLLEAGUES }); toast.success('Mis à jour') },
    onError: (e: any) => toast.error(e.message),
  })
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function useColleagueStats(cId: string | null, actions: any[], meetings: any[], consumables: any[]) {
  return useMemo(() => {
    if (!cId) return null
    const myActions = actions.filter(a => a.assigned_to_colleague_id === cId)
    const myMeetings = meetings.filter(m => m.colleagues_ids?.includes(cId))
    const myConsumables = consumables.filter(c => c.requested_by_colleague_id === cId)
    const lateActions = myActions.filter(a => a.due_date && isOverdue(a.due_date) && a.status !== 'completed' && a.status !== 'cancelled')
    const completedActions = myActions.filter(a => a.status === 'completed')
    const completionRate = myActions.length > 0 ? Math.round((completedActions.length / myActions.length) * 100) : 0
    const lastMeeting = myMeetings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    const daysSinceLastMeeting = lastMeeting ? differenceInDays(new Date(), new Date(lastMeeting.date)) : null
    const now = new Date()
    const thisMonth = myMeetings.filter(m => {
      const d = new Date(m.date)
      return d >= startOfMonth(now) && d <= endOfMonth(now)
    }).length
    const engagementScore = Math.min(100, Math.round(
      (completionRate * 0.4) + (Math.min(thisMonth * 20, 40)) +
      (lateActions.length === 0 ? 20 : Math.max(0, 20 - lateActions.length * 10))
    ))
    return {
      myActions, myMeetings, myConsumables, lateActions,
      completedActions, completionRate, lastMeeting,
      daysSinceLastMeeting, thisMonth, engagementScore,
      openActions: myActions.filter(a => a.status !== 'completed' && a.status !== 'cancelled'),
    }
  }, [cId, actions, meetings, consumables])
}

// ─── Avatar colors ────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: '#1D9E7520', color: '#5DCAA5' }, { bg: '#7F77DD20', color: '#AFA9EC' },
  { bg: '#378ADD20', color: '#85B7EB' }, { bg: '#EF9F2720', color: '#FAC775' },
  { bg: '#E24B4A20', color: '#F09595' }, { bg: '#D4537E20', color: '#ED93B1' },
]
function ColleagueAvatar({ name, size = 40, inactive }: { name: string; size?: number; inactive?: boolean }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length
  const { bg, color } = AVATAR_COLORS[idx]
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: inactive ? 'var(--color-border)' : bg, border: `1.5px solid ${inactive ? 'var(--color-border2)' : color + '40'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.28, fontWeight: 700, color: inactive ? 'var(--color-text-faded)' : color, flexShrink: 0, letterSpacing: '-0.02em', filter: inactive ? 'grayscale(1)' : 'none', position: 'relative' }}>
      {initials}
      {inactive && (
        <div style={{ position: 'absolute', bottom: -1, right: -1, width: size * 0.32, height: size * 0.32, borderRadius: '50%', background: 'var(--color-text-faded)', border: '1.5px solid var(--color-bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UserX style={{ width: size * 0.16, height: size * 0.16, color: 'var(--color-text-main)' }} />
        </div>
      )}
    </div>
  )
}

// ─── Engagement ring ──────────────────────────────────────────────────────────
function EngagementRing({ score, size = 52 }: { score: number; size?: number }) {
  const r = (size - 8) / 2; const circ = 2 * Math.PI * r; const fill = (score / 100) * circ
  const color = score >= 70 ? '#1D9E75' : score >= 40 ? '#EF9F27' : '#E24B4A'
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={4} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px`, fill: color, fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>
        {score}
      </text>
    </svg>
  )
}

// ─── Editable field ───────────────────────────────────────────────────────────
function EditableField({ value, placeholder, onSave, style: s, multiline }: {
  value: string; placeholder?: string; onSave: (v: string) => void; style?: any; multiline?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const save = () => { if (val.trim() !== value) onSave(val.trim() || value); setEditing(false) }
  if (editing) {
    if (multiline) return (
      <textarea value={val} onChange={e => setVal(e.target.value)} autoFocus onBlur={save}
        onKeyDown={e => { if (e.key === 'Escape') { setVal(value); setEditing(false) } }}
        rows={3} style={{ width: '100%', background: 'var(--color-bg-input)', border: '1px solid #1D9E75', borderRadius: 6, padding: '4px 8px', fontSize: 'inherit', color: 'var(--color-text-main)', outline: 'none', resize: 'none', fontFamily: 'inherit', ...s }} />
    )
    return (
      <input value={val} onChange={e => setVal(e.target.value)} autoFocus onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setVal(value); setEditing(false) } }}
        style={{ background: 'var(--color-bg-input)', border: '1px solid #1D9E75', borderRadius: 6, padding: '2px 8px', fontSize: 'inherit', color: 'var(--color-text-main)', outline: 'none', fontFamily: 'inherit', ...s }} />
    )
  }
  return (
    <span onClick={() => setEditing(true)}
      style={{ cursor: 'text', borderBottom: '1px dashed transparent', ...s }}
      onMouseEnter={e => (e.currentTarget.style.borderBottomColor = 'var(--color-text-faded)')}
      onMouseLeave={e => (e.currentTarget.style.borderBottomColor = 'transparent')}>
      {value || <span style={{ opacity: 0.3 }}>{placeholder ?? '—'}</span>}
    </span>
  )
}

// ─── Activity timeline ────────────────────────────────────────────────────────
function ActivityTimeline({ meetings, actions }: { meetings: any[]; actions: any[] }) {
  const events = useMemo(() => {
    const m = meetings.slice(0, 5).map(mt => ({ type: 'meeting', date: new Date(mt.date), label: mt.title, id: mt.id }))
    const a = actions.filter(ac => ac.status === 'completed' && ac.due_date).slice(0, 5).map(ac => ({ type: 'action', date: new Date(ac.due_date), label: ac.description, id: ac.id }))
    return [...m, ...a].sort((x, y) => y.date.getTime() - x.date.getTime()).slice(0, 8)
  }, [meetings, actions])
  if (!events.length) return <p style={{ fontSize: 12, color: 'var(--color-text-faded)', textAlign: 'center', padding: '16px 0' }}>Aucune activité récente</p>
  return (
    <div style={{ position: 'relative', paddingLeft: 20 }}>
      <div style={{ position: 'absolute', left: 7, top: 6, bottom: 6, width: 1, background: 'var(--color-border)' }} />
      {events.map((e, i) => (
        <div key={e.id + i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12, position: 'relative' }}>
          <div style={{ position: 'absolute', left: -13, top: 4, width: 8, height: 8, borderRadius: '50%', background: e.type === 'meeting' ? '#1D9E75' : '#378ADD', border: '2px solid var(--color-bg-app)' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-main)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.label}</p>
            <p style={{ fontSize: 10, color: 'var(--color-text-muted)', margin: '2px 0 0', fontFamily: 'monospace' }}>
              {e.type === 'meeting' ? '📅 ' : '✓ '}{format(e.date, 'd MMM yyyy', { locale: fr })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Inactivate modal ─────────────────────────────────────────────────────────
function InactivateModal({ colleague, onClose }: { colleague: any; onClose: () => void }) {
  const update = useUpdateColleague()
  const [reason, setReason] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const handle = async () => {
    await update.mutateAsync({
      id: colleague.id,
      is_active: false,
      inactive_since: date,
      inactive_reason: reason || null,
    })
    onClose()
    toast.success(`${colleague.name} marqué comme inactif`)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)' }}>
      <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border2)', borderRadius: 16, padding: 28, maxWidth: 400, width: '100%', margin: '0 16px' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EF9F2715', border: '1px solid #EF9F2730', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <UserX style={{ width: 18, height: 18, color: '#FAC775' }} />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-main)', margin: 0 }}>Inactiver {colleague.name}</h3>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '3px 0 0' }}>Les données historiques sont conservées</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontFamily: 'monospace', marginBottom: 5 }}>Date de départ</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ width: '100%', background: 'var(--color-bg-input)', border: '1px solid var(--color-border2)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--color-text-main)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontFamily: 'monospace', marginBottom: 5 }}>Motif (optionnel)</label>
            <select value={reason} onChange={e => setReason(e.target.value)}
              style={{ width: '100%', background: 'var(--color-bg-input)', border: '1px solid var(--color-border2)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: reason ? 'var(--color-text-main)' : 'var(--color-text-faded)', outline: 'none' }}>
              <option value="">— Sélectionner —</option>
              <option value="Démission">Démission</option>
              <option value="Licenciement">Licenciement</option>
              <option value="Fin de contrat">Fin de contrat</option>
              <option value="Retraite">Retraite</option>
              <option value="Mutation">Mutation</option>
              <option value="Rupture conventionnelle">Rupture conventionnelle</option>
              <option value="Autre">Autre</option>
            </select>
          </div>
        </div>

        <div style={{ padding: '12px 14px', background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 10, marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
            ✓ Toutes les réunions, actions et CR associés sont conservés<br/>
            ✓ La personne n'apparaîtra plus dans les listes actives<br/>
            ✓ Réactivable à tout moment
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 0', fontSize: 13, color: 'var(--color-text-muted)', background: 'var(--color-bg-input)', border: '1px solid var(--color-border2)', borderRadius: 10, cursor: 'pointer' }}>Annuler</button>
          <button onClick={handle} disabled={update.isPending}
            style={{ flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 700, color: 'var(--color-text-main)', background: '#EF9F27', border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {update.isPending ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> : <UserX style={{ width: 13, height: 13 }} />}
            Inactiver
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Profile edit panel ───────────────────────────────────────────────────────
function ProfilePanel({ colleague, onUpdate }: { colleague: any; onUpdate: (payload: any) => void }) {
  const CONTRACT_TYPES = ['CDI', 'CDD', 'Alternance', 'Stage', 'Intérim', 'Freelance']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-faded)', fontFamily: 'monospace', margin: 0 }}>
        Informations
      </p>

      {/* Contract type */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '12px 14px' }}>
          <p style={{ fontSize: 9, color: 'var(--color-text-faded)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 5px' }}>Contrat</p>
          <select value={colleague.contract_type ?? 'CDI'}
            onChange={e => onUpdate({ contract_type: e.target.value })}
            style={{ background: 'transparent', border: 'none', fontSize: 13, fontWeight: 600, color: 'var(--color-text-main)', outline: 'none', cursor: 'pointer', width: '100%' }}>
            {CONTRACT_TYPES.map(c => <option key={c} value={c} style={{ background: 'var(--color-bg-card)' }}>{c}</option>)}
          </select>
        </div>
        <div style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '12px 14px' }}>
          <p style={{ fontSize: 9, color: 'var(--color-text-faded)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 5px' }}>Date d'entrée</p>
          <input type="date" value={colleague.hire_date ?? ''}
            onChange={e => onUpdate({ hire_date: e.target.value || null })}
            style={{ background: 'transparent', border: 'none', fontSize: 13, color: colleague.hire_date ? 'var(--color-text-main)' : 'var(--color-text-faded)', outline: 'none', width: '100%', cursor: 'pointer' }} />
        </div>
      </div>

      {/* Ancienneté */}
      {colleague.hire_date && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#1D9E7508', border: '1px solid #1D9E7520', borderRadius: 10 }}>
          <Award style={{ width: 14, height: 14, color: '#1D9E75', flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#5DCAA5' }}>
              {differenceInYears(new Date(), parseISO(colleague.hire_date))} an{differenceInYears(new Date(), parseISO(colleague.hire_date)) > 1 ? 's' : ''}
              {' '}{differenceInMonths(new Date(), parseISO(colleague.hire_date)) % 12 > 0 ? `${differenceInMonths(new Date(), parseISO(colleague.hire_date)) % 12} mois` : ''} d'ancienneté
            </span>
            <p style={{ fontSize: 10, color: 'var(--color-text-muted)', margin: '1px 0 0', fontFamily: 'monospace' }}>
              Depuis le {fDate(colleague.hire_date)}
            </p>
          </div>
        </div>
      )}

      {/* Contact */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          { icon: Phone, key: 'phone', placeholder: 'Téléphone...', label: 'Tél.' },
          { icon: Mail, key: 'email', placeholder: 'Email pro...', label: 'Email' },
        ].map(f => (
          <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8 }}>
            <f.icon style={{ width: 13, height: 13, color: 'var(--color-text-muted)', flexShrink: 0 }} />
            <EditableField
              value={colleague[f.key] ?? ''}
              placeholder={f.placeholder}
              onSave={v => onUpdate({ [f.key]: v || null })}
              style={{ fontSize: 13, color: colleague[f.key] ? 'var(--color-text-main)' : 'var(--color-text-faded)', flex: 1 }}
            />
          </div>
        ))}
      </div>

      {/* Notes */}
      <div>
        <p style={{ fontSize: 9, color: 'var(--color-text-faded)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>Notes internes</p>
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 12px', minHeight: 60 }}>
          <EditableField
            value={colleague.notes ?? ''}
            placeholder="Informations complémentaires, observations..."
            onSave={v => onUpdate({ notes: v || null })}
            multiline
            style={{ fontSize: 13, color: colleague.notes ? 'var(--color-text-main)' : 'var(--color-text-faded)', width: '100%', display: 'block' }}
          />
        </div>
      </div>

      {/* Inactif depuis */}
      {!colleague.is_active && colleague.inactive_since && (
        <div style={{ padding: '12px 14px', background: '#EF9F2708', border: '1px solid #EF9F2725', borderRadius: 10 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#FAC775', margin: '0 0 4px' }}>
            Inactif depuis le {fDate(colleague.inactive_since)}
          </p>
          {colleague.inactive_reason && (
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0, fontFamily: 'monospace' }}>
              Motif : {colleague.inactive_reason}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function ColleaguesPage() {
  const { data: colleagues, isLoading } = useColleagues()
  const { data: actions } = useActions()
  const { data: meetings } = useMeetings()
  const { data: consumables } = useConsumables()
  const createColleague = useCreateColleague()
  const deleteColleague = useDeleteColleague()
  const updateColleague = useUpdateColleague()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'actions' | 'meetings' | 'consumables' | 'profile'>('overview')
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPost, setNewPost] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [inactivateTarget, setInactivateTarget] = useState<any | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'meetings' | 'actions'>('name')
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const allColleagues = useMemo(() => colleagues ?? [], [colleagues])

  const filtered = useMemo(() => {
    let list = allColleagues.filter(c => {
      const active = c.is_active !== false
      if (!showInactive && !active) return false
      if (showInactive && active) return false
      const q = search.toLowerCase()
      return !q || c.name.toLowerCase().includes(q) || c.post.toLowerCase().includes(q)
    })
    return list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'meetings') return (meetings?.filter(m => m.colleagues_ids?.includes(b.id)).length ?? 0) - (meetings?.filter(m => m.colleagues_ids?.includes(a.id)).length ?? 0)
      if (sortBy === 'actions') return (actions?.filter(ac => ac.assigned_to_colleague_id === b.id).length ?? 0) - (actions?.filter(ac => ac.assigned_to_colleague_id === a.id).length ?? 0)
      return 0
    })
  }, [allColleagues, search, showInactive, sortBy, meetings, actions])

  const selected = allColleagues.find(c => c.id === selectedId) ?? filtered[0] ?? null
  const stats = useColleagueStats(selected?.id ?? null, actions ?? [], meetings ?? [], (consumables ?? []) as any[])

  const activeCount = allColleagues.filter(c => c.is_active !== false).length
  const inactiveCount = allColleagues.filter(c => c.is_active === false).length

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !newPost.trim()) return
    await createColleague.mutateAsync({ name: newName.trim(), post: newPost.trim(), is_active: true })
    setNewName(''); setNewPost(''); setShowCreate(false)
  }

  const handleUpdate = (payload: any) => {
    if (!selected) return
    updateColleague.mutate({ id: selected.id, ...payload })
  }

  const handleReactivate = () => {
    if (!selected) return
    updateColleague.mutate({ id: selected.id, is_active: true, inactive_since: null, inactive_reason: null })
    toast.success(`${selected.name} réactivé`)
  }

  const handleSelect = (id: string) => {
    setSelectedId(id)
    if (isMobile) setMobileView('detail')
  }

  const idx = selected ? selected.name.charCodeAt(0) % AVATAR_COLORS.length : 0
  const accentColor = selected ? AVATAR_COLORS[idx].color : '#1D9E75'
  const isInactive = selected?.is_active === false

  const TABS = [
    { key: 'overview',    label: "Vue d'ensemble", icon: Activity },
    { key: 'actions',     label: 'Actions',         icon: CheckSquare, count: stats?.openActions.length },
    { key: 'meetings',    label: 'Réunions',        icon: CalendarDays, count: stats?.myMeetings.length },
    { key: 'consumables', label: 'Consommables',    icon: ShoppingCart, count: stats?.myConsumables.length },
    { key: 'profile',     label: 'Profil',          icon: Briefcase },
  ] as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--color-bg-app)', overflow: 'hidden' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .col-item:hover{background:rgba(255,255,255,0.025)!important}`}</style>

      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)' }}>
          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border2)', borderRadius: 16, padding: 24, maxWidth: 340, width: '100%', margin: '0 16px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-main)', marginBottom: 8 }}>Supprimer définitivement ?</h3>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>Cette action est irréversible. Toutes les données liées seront orphelines.</p>
            <p style={{ fontSize: 11, color: '#EF9F27', marginBottom: 20, fontFamily: 'monospace' }}>💡 Préférez l'inactivation pour conserver l'historique.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '9px 0', fontSize: 13, color: 'var(--color-text-muted)', background: 'var(--color-bg-input)', border: '1px solid var(--color-border2)', borderRadius: 10, cursor: 'pointer' }}>Annuler</button>
              <button onClick={async () => { await deleteColleague.mutateAsync(deleteConfirm); setDeleteConfirm(null); if (selectedId === deleteConfirm) setSelectedId(null) }}
                style={{ flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 600, color: 'var(--color-text-main)', background: '#E24B4A', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
                Supprimer quand même
              </button>
            </div>
          </div>
        </div>
      )}

      {inactivateTarget && <InactivateModal colleague={inactivateTarget} onClose={() => setInactivateTarget(null)} />}

      {/* Topbar */}
      <div style={{ flexShrink: 0, padding: isMobile ? '0 16px' : '0 24px', height: 52, borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-sidebar)', display: 'flex', alignItems: 'center', gap: 12 }}>
        {isMobile && mobileView === 'detail' && (
          <button onClick={() => setMobileView('list')} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--color-text-main)' }}>
            <ChevronLeft style={{ width: 20, height: 20 }} />
          </button>
        )}
        <h1 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-main)', margin: 0 }}>{isMobile && mobileView === 'detail' ? 'Détails' : 'Équipe'}</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ fontSize: 10, color: '#1D9E75', background: '#1D9E7512', borderRadius: 20, padding: '2px 8px', fontFamily: 'monospace' }}>{activeCount} actif{activeCount > 1 ? 's' : ''}</span>
          {inactiveCount > 0 && <span style={{ fontSize: 10, color: 'var(--color-text-faded)', background: 'var(--color-bg-input)', borderRadius: 20, padding: '2px 8px', fontFamily: 'monospace' }}>{inactiveCount} inactif{inactiveCount > 1 ? 's' : ''}</span>}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => setShowInactive(!showInactive)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'var(--color-border)', border: `1px solid ${showInactive ? 'var(--color-text-faded)' : 'var(--color-border)'}`, borderRadius: 8, color: showInactive ? 'var(--color-text-main)' : 'var(--color-text-muted)', fontSize: 12, cursor: 'pointer' }}>
            <Archive style={{ width: 12, height: 12 }} />
            <span className="hidden sm:inline">{showInactive ? 'Voir actifs' : `Anciens (${inactiveCount})`}</span>
          </button>
          <button onClick={() => setShowCreate(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: '#1D9E75', border: 'none', borderRadius: 8, color: 'var(--color-text-main)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <Plus style={{ width: 12, height: 12 }} /> <span className="hidden sm:inline">Ajouter</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Liste gauche ── */}
        <div style={{ 
          width: isMobile ? '100%' : 300, 
          flexShrink: 0, 
          borderRight: isMobile ? 'none' : '1px solid var(--color-border)', 
          display: isMobile ? (mobileView === 'list' ? 'flex' : 'none') : 'flex', 
          flexDirection: 'column' 
        }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '0 10px', height: 32 }}>
              <Search style={{ width: 12, height: 12, color: 'var(--color-text-faded)', flexShrink: 0 }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                style={{ flex: 1, background: 'transparent', border: 'none', fontSize: 12, color: 'var(--color-text-main)', outline: 'none' }} />
              {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}><X style={{ width: 10, height: 10 }} /></button>}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {([['name', 'A-Z'], ['meetings', 'Réunions'], ['actions', 'Actions']] as const).map(([key, label]) => (
                <button key={key} onClick={() => setSortBy(key)}
                  style={{ flex: 1, padding: '3px 0', fontSize: 10, fontFamily: 'monospace', background: sortBy === key ? 'var(--color-border)' : 'transparent', border: `1px solid ${sortBy === key ? 'var(--color-text-faded)' : 'transparent'}`, borderRadius: 6, color: sortBy === key ? 'var(--color-text-main)' : 'var(--color-text-faded)', cursor: 'pointer' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {showCreate && (
            <form onSubmit={handleCreate} style={{ padding: 12, borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-sidebar)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nom complet" required autoFocus
                style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border2)', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: 'var(--color-text-main)', outline: 'none' }} />
              <input value={newPost} onChange={e => setNewPost(e.target.value)} placeholder="Poste / Fonction" required
                style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border2)', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: 'var(--color-text-main)', outline: 'none' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '7px 0', fontSize: 12, color: 'var(--color-text-muted)', background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 8, cursor: 'pointer' }}>Annuler</button>
                <button type="submit" disabled={!newName.trim() || !newPost.trim() || createColleague.isPending}
                  style={{ flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 600, color: 'var(--color-text-main)', background: '#1D9E75', border: 'none', borderRadius: 8, cursor: 'pointer', opacity: newName.trim() && newPost.trim() ? 1 : 0.4 }}>
                  {createColleague.isPending ? '...' : 'Créer'}
                </button>
              </div>
            </form>
          )}

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>}
            {!isLoading && filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--color-text-faded)', fontSize: 13 }}>
                {showInactive ? 'Aucun ancien membre' : search ? 'Aucun résultat' : 'Aucun collègue actif'}
              </div>
            )}
            {filtered.map(c => {
              const isSelected = (selectedId ?? filtered[0]?.id) === c.id
              const inactive = c.is_active === false
              const cMeetings = meetings?.filter(m => m.colleagues_ids?.includes(c.id)).length ?? 0
              const cActions = actions?.filter(a => a.assigned_to_colleague_id === c.id) ?? []
              const cLate = cActions.filter(a => a.due_date && isOverdue(a.due_date) && a.status !== 'completed').length
              const cOpen = cActions.filter(a => a.status !== 'completed' && a.status !== 'cancelled').length
              const cidx = c.name.charCodeAt(0) % AVATAR_COLORS.length
              const cColor = AVATAR_COLORS[cidx].color
              return (
                <button key={c.id} onClick={() => handleSelect(c.id)}
                  className="col-item"
                  style={{ width: '100%', textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--color-border)', borderLeft: `3px solid ${isSelected ? cColor : 'transparent'}`, background: isSelected ? `${cColor}08` : 'transparent', cursor: 'pointer', transition: 'all 0.12s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <ColleagueAvatar name={c.name} size={36} inactive={inactive} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: inactive ? 'var(--color-text-muted)' : isSelected ? 'var(--color-text-main)' : 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                        {!inactive && cLate > 0 && <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#E24B4A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: 'var(--color-text-main)', flexShrink: 0 }}>{cLate}</span>}
                        {inactive && <span style={{ fontSize: 9, color: 'var(--color-text-faded)', background: 'var(--color-bg-input)', borderRadius: 20, padding: '1px 5px', fontFamily: 'monospace', flexShrink: 0 }}>inactif</span>}
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '2px 0 0', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.post}</p>
                      {!inactive && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          <span style={{ fontSize: 10, color: 'var(--color-text-faded)', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <CalendarDays style={{ width: 9, height: 9 }} />{cMeetings}
                          </span>
                          <span style={{ fontSize: 10, color: cOpen > 0 ? '#EF9F27' : 'var(--color-text-faded)', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <CheckSquare style={{ width: 9, height: 9 }} />{cOpen}
                          </span>
                        </div>
                      )}
                      {inactive && c.inactive_since && (
                        <p style={{ fontSize: 10, color: 'var(--color-text-faded)', margin: '3px 0 0', fontFamily: 'monospace' }}>
                          Parti le {fDate(c.inactive_since)}
                          {c.inactive_reason ? ` · ${c.inactive_reason}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Détail droite ── */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          background: 'var(--color-bg-app)',
          display: isMobile ? (mobileView === 'detail' ? 'block' : 'none') : 'block'
        }}>
          {!selected ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--color-text-faded)' }}>
              <Users style={{ width: 40, height: 40, opacity: 0.2 }} />
              <span style={{ fontSize: 13 }}>Sélectionnez un membre</span>
            </div>
          ) : (
            <div>
              {/* Hero */}
              <div style={{ padding: isMobile ? '20px 16px' : '28px 32px 20px', borderBottom: '1px solid var(--color-border)', background: `linear-gradient(135deg, ${isInactive ? 'var(--color-border)' : accentColor + '08'} 0%, transparent 60%)`, position: 'relative' }}>
                {isInactive && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--color-text-faded), transparent)', opacity: 0.5 }} />
                )}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 16 }}>
                  <ColleagueAvatar name={selected.name} size={56} inactive={isInactive} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <EditableField value={selected.name} onSave={v => handleUpdate({ name: v })}
                        style={{ fontSize: 20, fontWeight: 700, color: isInactive ? 'var(--color-text-muted)' : 'var(--color-text-main)', letterSpacing: '-0.02em' }} />
                      {isInactive && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'var(--color-bg-input)', borderRadius: 20, padding: '2px 10px', fontFamily: 'monospace' }}>Inactif</span>}
                      {stats?.lateActions && stats.lateActions.length > 0 && !isInactive && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#F09595', background: '#E24B4A15', border: '1px solid #E24B4A30', borderRadius: 20, padding: '2px 8px', fontFamily: 'monospace' }}>
                          <AlertTriangle style={{ width: 9, height: 9 }} />{stats.lateActions.length} en retard
                        </span>
                      )}
                    </div>
                    <EditableField value={selected.post} onSave={v => handleUpdate({ post: v })}
                      style={{ fontSize: 13, color: 'var(--color-text-muted)', fontFamily: 'monospace' }} />
                    {selected.hire_date && (
                      <p style={{ fontSize: 11, color: 'var(--color-text-faded)', margin: '6px 0 0', fontFamily: 'monospace' }}>
                        Ancienneté : {differenceInYears(new Date(), parseISO(selected.hire_date))}a {differenceInMonths(new Date(), parseISO(selected.hire_date)) % 12}m
                        {selected.contract_type && ` · ${selected.contract_type}`}
                      </p>
                    )}
                  </div>

                  {!isInactive && stats && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <EngagementRing score={stats.engagementScore} />
                      <span style={{ fontSize: 9, color: 'var(--color-text-faded)', fontFamily: 'monospace' }}>Engagement</span>
                    </div>
                  )}

                  {/* Actions menu */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {isInactive ? (
                      <button onClick={handleReactivate}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: '#1D9E7510', border: '1px solid #1D9E7530', borderRadius: 8, cursor: 'pointer', color: '#5DCAA5', fontSize: 12, fontWeight: 600 }}>
                        <UserCheck style={{ width: 13, height: 13 }} /> Réactiver
                      </button>
                    ) : (
                      <button onClick={() => setInactivateTarget(selected)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: '#EF9F2710', border: '1px solid #EF9F2730', borderRadius: 8, cursor: 'pointer', color: '#FAC775', fontSize: 12 }}
                        title="Marquer comme inactif">
                        <UserX style={{ width: 13, height: 13 }} /> Inactiver
                      </button>
                    )}
                    <button onClick={() => setDeleteConfirm(selected.id)}
                      style={{ padding: 8, background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 8, cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#E24B4A'; (e.currentTarget as HTMLElement).style.borderColor = '#E24B4A30' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border2)' }}>
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                </div>

                {/* Stats grid */}
                {stats && !isInactive && (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 10 }}>
                    {[
                      { label: 'Réunions', value: stats.myMeetings.length, icon: CalendarDays, color: '#1D9E75' },
                      { label: 'Actions', value: stats.myActions.length, icon: CheckSquare, color: '#378ADD' },
                      { label: 'Complétion', value: `${stats.completionRate}%`, icon: TrendingUp, color: stats.completionRate >= 70 ? '#1D9E75' : '#EF9F27' },
                      { label: 'Ce mois', value: stats.thisMonth, icon: Zap, color: '#7F77DD' },
                    ].map(s => (
                      <div key={s.label} style={{ background: `${s.color}08`, border: `1px solid ${s.color}18`, borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                          <s.icon style={{ width: 11, height: 11, color: s.color }} />
                          <span style={{ fontSize: 9, color: s.color, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
                        </div>
                        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-main)', fontFamily: 'monospace' }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inactif banner */}
                {isInactive && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 10 }}>
                    <Archive style={{ width: 14, height: 14, color: 'var(--color-text-muted)', flexShrink: 0 }} />
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
                      Cet ancien membre est archivé. Ses données historiques sont conservées.
                      {stats && ` ${stats.myMeetings.length} réunions · ${stats.myActions.length} actions enregistrées.`}
                    </p>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', padding: isMobile ? '0 16px' : '0 32px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                {TABS.map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 16px', fontSize: 12, border: 'none', cursor: 'pointer', background: 'transparent', borderBottom: `2px solid ${activeTab === tab.key ? accentColor : 'transparent'}`, color: activeTab === tab.key ? accentColor : 'var(--color-text-muted)', transition: 'all 0.15s', marginBottom: -1 }}>
                    <tab.icon style={{ width: 12, height: 12 }} />
                    {tab.label}
                    {'count' in tab && tab.count !== undefined && tab.count > 0 && (
                      <span style={{ fontSize: 9, background: `${accentColor}20`, color: accentColor, borderRadius: 20, padding: '1px 5px', fontFamily: 'monospace' }}>{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div style={{ padding: isMobile ? '20px 16px 80px' : '20px 32px' }}>

                {activeTab === 'overview' && stats && (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-faded)', fontFamily: 'monospace', marginBottom: 12 }}>Activité récente</p>
                      <ActivityTimeline meetings={stats.myMeetings} actions={stats.myActions} />
                    </div>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-faded)', fontFamily: 'monospace', marginBottom: 12 }}>Actions en cours</p>
                      {stats.openActions.length === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#1D9E75' }}>
                          <Check style={{ width: 14, height: 14 }} /> Aucune action en attente
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {stats.openActions.slice(0, 5).map(a => {
                            const late = a.due_date && isOverdue(a.due_date)
                            return (
                              <div key={a.id} style={{ display: 'flex', gap: 8, padding: '8px 12px', background: 'var(--color-bg-input)', border: `1px solid ${late ? '#E24B4A20' : 'var(--color-border)'}`, borderRadius: 8 }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: late ? '#E24B4A' : '#EF9F27', flexShrink: 0, marginTop: 4 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: 12, color: 'var(--color-text-main)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.description}</p>
                                  {a.due_date && <p style={{ fontSize: 10, color: late ? '#F09595' : 'var(--color-text-faded)', margin: '2px 0 0', fontFamily: 'monospace' }}>{fDate(a.due_date)}{late && ' · En retard'}</p>}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'actions' && stats && (
                  <div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                      {[
                        { label: 'En retard', count: stats.lateActions.length, color: '#E24B4A' },
                        { label: 'En cours', count: stats.myActions.filter(a => a.status === 'in_progress').length, color: '#378ADD' },
                        { label: 'En attente', count: stats.myActions.filter(a => a.status === 'pending').length, color: 'var(--color-text-muted)' },
                        { label: 'Terminées', count: stats.completedActions.length, color: '#1D9E75' },
                      ].map(s => (
                        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: `${s.color}12`, border: `1px solid ${s.color}25`, borderRadius: 20 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>{s.count}</span>
                          <span style={{ fontSize: 10, color: `${s.color}90` }}>{s.label}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {stats.myActions.map(a => {
                        const late = a.due_date && isOverdue(a.due_date) && a.status !== 'completed'
                        return (
                          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--color-bg-card)', border: `1px solid ${late ? '#E24B4A20' : 'var(--color-border)'}`, borderRadius: 10 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.status === 'completed' ? '#1D9E75' : late ? '#E24B4A' : '#EF9F27', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, color: a.status === 'completed' ? 'var(--color-text-faded)' : 'var(--color-text-main)', margin: 0, textDecoration: a.status === 'completed' ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.description}</p>
                              {a.due_date && <p style={{ fontSize: 10, color: late ? '#F09595' : 'var(--color-text-faded)', margin: '2px 0 0', fontFamily: 'monospace' }}>{fDate(a.due_date)}</p>}
                            </div>
                            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', background: 'var(--color-bg-input)', borderRadius: 20, padding: '2px 8px', fontFamily: 'monospace', flexShrink: 0 }}>
                              {ACTION_STATUS[a.status]?.label ?? a.status}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {activeTab === 'meetings' && stats && (
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16, fontFamily: 'monospace' }}>
                      {stats.myMeetings.length} réunion{stats.myMeetings.length > 1 ? 's' : ''} · {stats.thisMonth} ce mois
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {stats.myMeetings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(m => {
                        const d = new Date(m.date)
                        return (
                          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--color-bg-input)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-main)', lineHeight: 1 }}>{format(d, 'd')}</span>
                              <span style={{ fontSize: 8, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{format(d, 'MMM', { locale: fr })}</span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-main)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</p>
                              <p style={{ fontSize: 10, color: 'var(--color-text-muted)', margin: '2px 0 0', fontFamily: 'monospace' }}>{format(d, 'EEEE d MMM yyyy', { locale: fr })}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {activeTab === 'consumables' && stats && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {stats.myConsumables.length === 0 ? (
                      <p style={{ fontSize: 13, color: 'var(--color-text-faded)', textAlign: 'center', padding: '24px 0' }}>Aucune demande</p>
                    ) : stats.myConsumables.map((c: any) => {
                      const STATUS_COLORS: Record<string, string> = { pending: '#EF9F27', approved: '#1D9E75', ordered: '#378ADD', delivered: '#5DCAA5', rejected: '#E24B4A' }
                      const sc = STATUS_COLORS[c.status] ?? 'var(--color-text-muted)'
                      return (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, color: 'var(--color-text-main)', margin: 0 }}>{c.item_name}</p>
                            <p style={{ fontSize: 10, color: 'var(--color-text-muted)', margin: '2px 0 0', fontFamily: 'monospace' }}>Qté : {c.quantity}{c.details && ` · ${c.details}`}</p>
                          </div>
                          <span style={{ fontSize: 10, color: sc, background: `${sc}15`, border: `1px solid ${sc}30`, borderRadius: 20, padding: '2px 8px', fontFamily: 'monospace', flexShrink: 0 }}>
                            {c.status === 'pending' ? 'En attente' : c.status === 'approved' ? 'Approuvé' : c.status === 'ordered' ? 'Commandé' : c.status === 'delivered' ? 'Livré' : 'Rejeté'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {activeTab === 'profile' && (
                  <ProfilePanel colleague={selected} onUpdate={handleUpdate} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
