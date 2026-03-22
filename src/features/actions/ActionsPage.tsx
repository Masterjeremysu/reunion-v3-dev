import { useState, useMemo } from 'react'
import { useActions, useUpdateAction, useDeleteAction, useCreateAction } from './useActions'
import { useColleagues } from '../colleagues/useColleagues'
import { useMeetings } from '../meetings/useMeetings'
import { Spinner, Avatar } from '../../components/ui'
import { fDate, isOverdue } from '../../utils'
import { ACTION_STATUS } from '../../constants'
import {
  Plus, Search, Trash2, Check, Clock, X,
  AlertTriangle, ChevronDown, GripVertical,
  CalendarDays, Users, Link2, Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'

type Status = 'pending' | 'in_progress' | 'completed' | 'cancelled'
type View = 'kanban' | 'list'

const COLUMNS: { key: Status; label: string; color: string; bg: string; border: string }[] = [
  { key: 'pending',     label: 'En attente',  color: '#8b90a4', bg: '#8b90a415', border: '#8b90a425' },
  { key: 'in_progress', label: 'En cours',    color: '#378ADD', bg: '#378ADD15', border: '#378ADD25' },
  { key: 'completed',   label: 'Terminée',    color: '#1D9E75', bg: '#1D9E7515', border: '#1D9E7525' },
  { key: 'cancelled',   label: 'Annulée',     color: '#565c75', bg: '#565c7515', border: '#565c7525' },
]

function isLate(a: any) {
  return a.due_date && isOverdue(a.due_date) && a.status !== 'completed' && a.status !== 'cancelled'
}

// ─── Quick create form ────────────────────────────────────────────────────────
function QuickCreate({ onClose, defaultStatus = 'pending', colleagues, meetings }: {
  onClose: () => void
  defaultStatus?: Status
  colleagues: any[]
  meetings: any[]
}) {
  const createAction = useCreateAction()
  const [desc, setDesc] = useState('')
  const [status, setStatus] = useState<Status>(defaultStatus)
  const [assignTo, setAssignTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [meetingId, setMeetingId] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!desc.trim()) return
    await createAction.mutateAsync({
      description: desc.trim(),
      assigned_to_colleague_id: assignTo || null,
      due_date: dueDate || null,
      meeting_id: meetingId || null,
      status,
    })
    onClose()
  }

  return (
    <div style={{
      background: '#161b26', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 14, padding: 16, marginBottom: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <form onSubmit={handleSubmit}>
        <textarea
          value={desc} onChange={e => setDesc(e.target.value)}
          placeholder="Décrire l'action..."
          autoFocus rows={2}
          onKeyDown={e => { if (e.key === 'Escape') onClose() }}
          style={{
            width: '100%', background: 'transparent', border: 'none',
            fontSize: 13, color: '#e8eaf0', outline: 'none', resize: 'none',
            fontFamily: 'inherit', marginBottom: 10,
          }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
          <select value={assignTo} onChange={e => setAssignTo(e.target.value)}
            style={{ background: '#1e2535', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: assignTo ? '#e8eaf0' : '#565c75', outline: 'none' }}>
            <option value="">Assigner à...</option>
            {colleagues.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            style={{ background: '#1e2535', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: dueDate ? '#e8eaf0' : '#565c75', outline: 'none' }} />
          <select value={meetingId} onChange={e => setMeetingId(e.target.value)}
            style={{ background: '#1e2535', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: meetingId ? '#e8eaf0' : '#565c75', outline: 'none' }}>
            <option value="">Lier à une réunion...</option>
            {meetings.slice(0, 15).map(m => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value as Status)}
            style={{ background: '#1e2535', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#e8eaf0', outline: 'none' }}>
            {COLUMNS.filter(c => c.key !== 'cancelled').map(c => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose}
            style={{ padding: '6px 12px', fontSize: 12, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8 }}>
            Annuler
          </button>
          <button type="submit" disabled={!desc.trim() || createAction.isPending}
            style={{ padding: '6px 14px', fontSize: 12, fontWeight: 500, color: '#fff', background: '#1D9E75', border: 'none', borderRadius: 8, cursor: 'pointer', opacity: desc.trim() ? 1 : 0.4, display: 'flex', alignItems: 'center', gap: 6 }}>
            {createAction.isPending ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> : <Plus style={{ width: 12, height: 12 }} />}
            Créer
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Action card ──────────────────────────────────────────────────────────────
function ActionCard({ action, colleagues, meetings, onDelete, compact = false }: {
  action: any; colleagues: any[]; meetings: any[]
  onDelete: (id: string) => void; compact?: boolean
}) {
  const updateAction = useUpdateAction()
  const [editing, setEditing] = useState(false)
  const [editDesc, setEditDesc] = useState(action.description)
  const late = isLate(action)
  const done = action.status === 'completed'
  const c = colleagues.find(col => col.id === action.assigned_to_colleague_id)
  const m = meetings.find(mt => mt.id === action.meeting_id)

  const cycleStatus = () => {
    const order: Status[] = ['pending', 'in_progress', 'completed']
    const idx = order.indexOf(action.status)
    const next = order[(idx + 1) % order.length]
    updateAction.mutate({ id: action.id, status: next })
  }

  const saveEdit = async () => {
    if (!editDesc.trim()) return
    await updateAction.mutateAsync({ id: action.id, description: editDesc.trim() })
    setEditing(false)
  }

  const statusColor = late ? '#E24B4A' : done ? '#1D9E75' : action.status === 'in_progress' ? '#378ADD' : '#565c75'

  return (
    <div
      style={{
        background: '#0e1118',
        border: `1px solid ${late ? '#E24B4A25' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 10, padding: compact ? '10px 12px' : '12px 14px',
        transition: 'border-color 0.15s, background 0.15s',
        position: 'relative',
      }}
      onMouseEnter={e => { if (!late) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = late ? '#E24B4A25' : 'rgba(255,255,255,0.06)' }}
      className="action-card"
    >
      {/* Late banner */}
      {late && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, #E24B4A, #E24B4A80)',
          borderRadius: '10px 10px 0 0',
        }} />
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {/* Status toggle */}
        <button
          onClick={cycleStatus}
          style={{
            width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
            border: `2px solid ${statusColor}`,
            background: done ? statusColor : 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s', padding: 0,
          }}
          title="Changer le statut"
        >
          {done && <Check style={{ width: 10, height: 10, color: '#fff' }} />}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <textarea
              value={editDesc} onChange={e => setEditDesc(e.target.value)}
              autoFocus rows={2}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() } if (e.key === 'Escape') { setEditing(false); setEditDesc(action.description) } }}
              onBlur={saveEdit}
              style={{ width: '100%', background: '#1e2535', border: '1px solid #1D9E75', borderRadius: 6, padding: '4px 8px', fontSize: 13, color: '#e8eaf0', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
            />
          ) : (
            <p
              onClick={() => setEditing(true)}
              style={{
                fontSize: 13, color: done ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.85)',
                textDecoration: done ? 'line-through' : 'none', margin: 0, lineHeight: 1.4,
                cursor: 'text', wordBreak: 'break-word',
              }}
            >
              {action.description}
            </p>
          )}

          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7, flexWrap: 'wrap' }}>
            {c && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#1D9E7520', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 600, color: '#5DCAA5' }}>
                  {c.name.charAt(0)}
                </div>
                {c.name}
              </span>
            )}
            {action.due_date && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontFamily: 'monospace', color: late ? '#F09595' : 'rgba(255,255,255,0.3)' }}>
                {late && <AlertTriangle style={{ width: 9, height: 9 }} />}
                <Clock style={{ width: 9, height: 9 }} />
                {fDate(action.due_date)}
                {late && ' · En retard'}
              </span>
            )}
            {m && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                <Link2 style={{ width: 9, height: 9 }} />
                {m.title}
              </span>
            )}
          </div>
        </div>

        {/* Delete */}
        <button onClick={() => onDelete(action.id)}
          style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.1)', borderRadius: 6, flexShrink: 0, transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#E24B4A')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.1)')}>
          <Trash2 style={{ width: 12, height: 12 }} />
        </button>
      </div>
    </div>
  )
}

// ─── Kanban column ────────────────────────────────────────────────────────────
function KanbanColumn({ col, actions, colleagues, meetings, onDelete }: {
  col: typeof COLUMNS[0]; actions: any[]
  colleagues: any[]; meetings: any[]
  onDelete: (id: string) => void
}) {
  const [showCreate, setShowCreate] = useState(false)
  const late = actions.filter(a => isLate(a)).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* Column header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 4px 10px', marginBottom: 8,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: col.color, fontFamily: 'monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {col.label}
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: '1px 7px' }}>
          {actions.length}
        </span>
        {late > 0 && (
          <span style={{ fontSize: 9, color: '#F09595', background: '#E24B4A15', border: '1px solid #E24B4A25', borderRadius: 20, padding: '1px 6px', fontFamily: 'monospace', marginLeft: 'auto' }}>
            {late} en retard
          </span>
        )}
        {col.key !== 'cancelled' && col.key !== 'completed' && (
          <button onClick={() => setShowCreate(true)}
            style={{ marginLeft: late > 0 ? 0 : 'auto', padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', borderRadius: 6, display: 'flex', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = col.color)}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}>
            <Plus style={{ width: 13, height: 13 }} />
          </button>
        )}
      </div>

      {/* Cards */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', paddingBottom: 8 }}>
        {showCreate && (
          <QuickCreate
            onClose={() => setShowCreate(false)}
            defaultStatus={col.key}
            colleagues={colleagues}
            meetings={meetings}
          />
        )}
        {actions.length === 0 && !showCreate && (
          <div style={{
            border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 10,
            padding: '20px 12px', textAlign: 'center',
            color: 'rgba(255,255,255,0.15)', fontSize: 12,
          }}>
            Aucune action
          </div>
        )}
        {actions.map(a => (
          <ActionCard key={a.id} action={a} colleagues={colleagues} meetings={meetings} onDelete={onDelete} />
        ))}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function ActionsPage() {
  const { data: actions, isLoading } = useActions()
  const { data: colleagues } = useColleagues()
  const { data: meetings } = useMeetings()
  const deleteAction = useDeleteAction()
  const updateAction = useUpdateAction()

  const [view, setView] = useState<View>('kanban')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!actions) return []
    const q = search.toLowerCase().trim()
    if (!q) return actions
    return actions.filter(a => {
      const c = colleagues?.find(col => col.id === a.assigned_to_colleague_id)
      return (
        a.description.toLowerCase().includes(q) ||
        c?.name.toLowerCase().includes(q)
      )
    })
  }, [actions, search, colleagues])

  const byStatus = useMemo(() => {
    const map: Record<Status, any[]> = { pending: [], in_progress: [], completed: [], cancelled: [] }
    filtered.forEach(a => { if (map[a.status as Status]) map[a.status as Status].push(a) })
    // Sort: late first within each column
    Object.keys(map).forEach(k => {
      map[k as Status].sort((a, b) => {
        const aLate = isLate(a) ? -1 : 0
        const bLate = isLate(b) ? -1 : 0
        return aLate - bLate
      })
    })
    return map
  }, [filtered])

  const stats = useMemo(() => ({
    total: actions?.length ?? 0,
    open: actions?.filter(a => a.status === 'pending' || a.status === 'in_progress').length ?? 0,
    late: actions?.filter(isLate).length ?? 0,
    done: actions?.filter(a => a.status === 'completed').length ?? 0,
    rate: actions?.length ? Math.round((actions.filter(a => a.status === 'completed').length / actions.length) * 100) : 0,
  }), [actions])

  const handleDelete = async (id: string) => {
    await deleteAction.mutateAsync(id)
    setDeleteConfirm(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0c12', overflow: 'hidden' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
          <div style={{ background: '#161b26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, maxWidth: 340, width: '100%', margin: '0 16px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 8 }}>Supprimer cette action ?</h3>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Cette action est irréversible.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '9px 0', fontSize: 13, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, cursor: 'pointer' }}>Annuler</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 500, color: '#fff', background: '#E24B4A', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Topbar */}
      <div style={{ flexShrink: 0, padding: '0 24px', height: 52, borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#0e1118', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>Points d'action</h1>
        </div>

        {/* Stats pills */}
        <div style={{ display: 'flex', gap: 6 }}>
          <StatPill label="total" value={stats.total} color="#565c75" />
          <StatPill label="ouvertes" value={stats.open} color="#378ADD" />
          {stats.late > 0 && <StatPill label="en retard" value={stats.late} color="#E24B4A" pulse />}
          <StatPill label="terminées" value={`${stats.rate}%`} color="#1D9E75" />
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '0 10px', height: 30, width: 200 }}>
            <Search style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
              style={{ flex: 1, background: 'transparent', border: 'none', fontSize: 12, color: '#fff', outline: 'none' }} />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex' }}><X style={{ width: 11, height: 11 }} /></button>}
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 2 }}>
            {(['kanban', 'list'] as View[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'monospace', transition: 'all 0.15s', background: view === v ? 'rgba(255,255,255,0.08)' : 'transparent', color: view === v ? '#e8eaf0' : 'rgba(255,255,255,0.3)' }}>
                {v === 'kanban' ? '⊞ Kanban' : '≡ Liste'}
              </button>
            ))}
          </div>

          <button onClick={() => setShowCreate(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: '#1D9E75', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
            <Plus style={{ width: 12, height: 12 }} /> Nouvelle action
          </button>
        </div>
      </div>

      {/* Quick create global */}
      {showCreate && (
        <div style={{ padding: '12px 24px 0', flexShrink: 0 }}>
          <QuickCreate onClose={() => setShowCreate(false)} colleagues={colleagues ?? []} meetings={meetings ?? []} />
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>
      ) : view === 'kanban' ? (
        <div style={{
          flex: 1, minHeight: 0, padding: '16px 24px',
          display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12,
          overflowX: 'auto',
        }}>
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.key} col={col}
              actions={byStatus[col.key]}
              colleagues={colleagues ?? []}
              meetings={meetings ?? []}
              onDelete={id => setDeleteConfirm(id)}
            />
          ))}
        </div>
      ) : (
        /* ── List view ── */
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
              {search ? `Aucun résultat pour "${search}"` : 'Aucune action'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {COLUMNS.filter(c => byStatus[c.key].length > 0).map(col => (
                <div key={col.key} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: col.color }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: col.color, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {col.label} · {byStatus[col.key].length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {byStatus[col.key].map(a => (
                      <ActionCard key={a.id} action={a} colleagues={colleagues ?? []} meetings={meetings ?? []} onDelete={id => setDeleteConfirm(id)} compact />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatPill({ label, value, color, pulse }: { label: string; value: string | number; color: string; pulse?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: `${color}12`, border: `1px solid ${color}25`, borderRadius: 20, position: 'relative' }}>
      {pulse && <span style={{ position: 'absolute', top: -2, right: -2, width: 6, height: 6, borderRadius: '50%', background: color, animation: 'pulse 2s ease-in-out infinite' }} />}
      <span style={{ fontSize: 12, fontWeight: 600, color, fontFamily: 'monospace' }}>{value}</span>
      <span style={{ fontSize: 10, color: `${color}90`, fontFamily: 'monospace' }}>{label}</span>
    </div>
  )
}
