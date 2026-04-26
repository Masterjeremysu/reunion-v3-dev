import { useState, useMemo, useEffect } from 'react'
import { useAuth } from '../auth/useAuth'
import { useActions, useUpdateAction, useDeleteAction, useCreateAction } from './useActions'
import { useColleagues } from '../colleagues/useColleagues'
import { useMeetings } from '../meetings/useMeetings'
import { Spinner, Avatar, Button } from '../../components/ui'
import { fDate, isOverdue } from '../../utils'
import { 
  Plus, Search, Trash2, Check, Clock, X, 
  AlertTriangle, Kanban as KanbanIcon, List as ListIcon,
  Link2, Loader2, Filter
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import * as Dialog from '@radix-ui/react-dialog'

type Status = 'pending' | 'in_progress' | 'completed' | 'cancelled'
type View = 'kanban' | 'list'

const COLUMNS: { key: Status; label: string; color: string; bg: string; border: string }[] = [
  { key: 'pending',     label: 'À faire',   color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' },
  { key: 'in_progress', label: 'En cours',   color: '#3b82f6', bg: '#eff6ff', border: '#dbeafe' },
  { key: 'completed',   label: 'Terminé',   color: '#10b981', bg: '#ecfdf5', border: '#d1fae5' },
  { key: 'cancelled',   label: 'Annulé',    color: '#94a3b8', bg: '#f8fafc', border: '#f1f5f9' },
]

function isLate(a: any) {
  return a.due_date && isOverdue(a.due_date) && a.status !== 'completed' && a.status !== 'cancelled'
}

export function ActionsPage() {
  const { role, colleagueId } = useAuth()
  const isAdmin = role === 'admin' || role === 'manager'

  const { data: actions, isLoading } = useActions()
  const { data: colleagues } = useColleagues()
  const { data: meetings } = useMeetings()
  const deleteAction = useDeleteAction()

  const [view, setView] = useState<View>('kanban')
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Status>('pending')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)

  // Handle responsive resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const filtered = useMemo(() => {
    if (!actions) return []
    
    const q = search.toLowerCase().trim()
    let base = (actions as any[])

    // Filter by role: employees only see their assigned actions
    // Important: we only filter IF we are sure the user is an employee
    if (role === 'employee') {
      base = base.filter(a => a.assigned_to_colleague_id === colleagueId)
    }

    if (!q) return base
    return base.filter(a => {
      const c = colleagues?.find(col => col.id === a.assigned_to_colleague_id)
      const desc = a.description?.toLowerCase() || ''
      const name = c?.name?.toLowerCase() || ''
      return desc.includes(q) || name.includes(q)
    })
  }, [actions, search, colleagues, role, colleagueId])

  const byStatus = useMemo(() => {
    const map: Record<Status, any[]> = { pending: [], in_progress: [], completed: [], cancelled: [] }
    filtered.forEach(a => { if (a?.status && map[a.status as Status]) map[a.status as Status].push(a) })
    // Sort: late first
    Object.keys(map).forEach(k => {
      map[k as Status].sort((a, b) => (isLate(a) ? -1 : 1) - (isLate(b) ? -1 : 1))
    })
    return map
  }, [filtered])

  const stats = useMemo(() => ({
    total: filtered?.length ?? 0,
    late: filtered?.filter(isLate).length ?? 0,
    rate: filtered?.length ? Math.round((filtered.filter(a => a.status === 'completed').length / filtered.length) * 100) : 0,
  }), [filtered])

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-app)] overflow-hidden">
      
      {/* Header Premium Area */}
      <div className="flex-shrink-0 bg-[var(--color-bg-sidebar)] border-b border-[var(--color-border)] px-4 md:px-6 py-3 md:py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg md:text-xl font-bold text-[var(--color-text-main)] flex items-center gap-2">
                {isAdmin ? 'Gestion Actions' : 'Mes Actions'} <span className="text-[10px] md:text-xs font-mono bg-[var(--color-bg-input)] px-2 py-0.5 rounded-full text-[var(--color-text-faded)]">{stats.total}</span>
              </h1>
              <p className="hidden md:block text-xs text-[var(--color-text-muted)] mt-0.5">
                {isAdmin ? 'Suivi global des engagements' : 'Mes tâches et engagements'}
              </p>
            </div>
            
            {/* Mobile Stats chips */}
            <div className="flex sm:hidden items-center gap-2">
               {stats.late > 0 && (
                 <div className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-[9px] font-bold text-red-400">
                    <AlertTriangle className="w-3 h-3" /> {stats.late}
                 </div>
               )}
               <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-[9px] font-bold text-green-400">
                  <Check className="w-3 h-3" /> {stats.rate}%
               </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
             {/* Desktop Stats chips */}
             <div className="hidden sm:flex items-center gap-2 mr-2">
               {stats.late > 0 && (
                 <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-[10px] font-bold text-red-400">
                    <AlertTriangle className="w-3 h-3" /> {stats.late} En retard
                 </div>
               )}
               <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] font-bold text-green-400">
                  <Check className="w-3 h-3" /> {stats.rate}% {isAdmin ? 'Terminées' : 'Réussies'}
               </div>
             </div>

             <div className="flex items-center gap-2 flex-1 md:flex-none">
                <div className="relative flex-1 md:min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-faded)]" />
                  <input 
                    value={search} onChange={e => setSearch(e.target.value)} 
                    placeholder="Filtrer..."
                    className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-brand)] transition-all"
                  />
                </div>
                
                <div className="flex bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg p-1">
                  <button onClick={() => setView('kanban')} className={`p-1.5 rounded-md transition-all ${view === 'kanban' ? 'bg-[var(--color-bg-card)] text-[var(--color-brand)] shadow-sm' : 'text-[var(--color-text-faded)]'}`}>
                    <KanbanIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition-all ${view === 'list' ? 'bg-[var(--color-bg-card)] text-[var(--color-brand)] shadow-sm' : 'text-[var(--color-text-faded)]'}`}>
                    <ListIcon className="w-4 h-4" />
                  </button>
                </div>

                {isAdmin && (
                  <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)} className="px-3 md:px-4 min-h-[38px] md:min-h-[auto]">
                    <Plus className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Nouvelle</span>
                  </Button>
                )}
             </div>
          </div>
        </div>
      </div>

      {/* Mobile Tabs */}
      {view === 'kanban' && isMobile && (
        <div className="mobile-tabs-container">
          {COLUMNS.map(col => (
            <button 
              key={col.key} 
              onClick={() => setActiveTab(col.key)}
              className={`mobile-tab-btn ${activeTab === col.key ? 'active' : ''}`}
            >
              {col.label} ({byStatus[col.key].length})
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-app)]/50 backdrop-blur-sm z-10"><Spinner /></div>
        ) : view === 'kanban' ? (
          <div className="kanban-grid h-full overflow-x-auto p-4 lg:p-6 pb-20 sm:pb-6">
             {COLUMNS.filter(col => !isMobile || activeTab === col.key).map(col => (
                <KanbanColumn 
                  key={col.key}
                  col={col}
                  actions={byStatus[col.key]}
                  colleagues={colleagues ?? []}
                  meetings={meetings ?? []}
                  isAdmin={isAdmin}
                />
             ))}
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto pb-24">
             {COLUMNS.map(col => {
               const list = byStatus[col.key]
               if (list.length === 0) return null
               return (
                 <div key={col.key} className="mb-8">
                   <div className="flex items-center gap-2 mb-4">
                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                     <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">{col.label}</h3>
                     <span className="text-[10px] font-mono text-[var(--color-text-faded)] bg-[var(--color-bg-input)] px-2 py-0.5 rounded-full">{list.length}</span>
                   </div>
                   <div className="space-y-3">
                     {list.map(a => (
                       <ActionCard key={a.id} action={a} colleagues={colleagues ?? []} meetings={meetings ?? []} isAdmin={isAdmin} />
                     ))}
                   </div>
                 </div>
               )
             })}
             {filtered.length === 0 && (
               <div className="py-20 text-center text-[var(--color-text-faded)]">
                 <Filter className="w-12 h-12 mx-auto mb-4 opacity-10" />
                 <p>{search ? 'Aucun résultat pour cette recherche' : 'Aucune action assignée'}</p>
               </div>
             )}
          </div>
        )}
      </div>

      <CreateActionModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} colleagues={colleagues ?? []} meetings={meetings ?? []} />
    </div>
  )
}

function KanbanColumn({ col, actions, colleagues, meetings, isAdmin }: any) {
  const [showQuick, setShowQuick] = useState(false)
  
  return (
    <div className="flex flex-col min-w-[280px] h-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col.color }} />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-main)]">{col.label}</span>
          <span className="text-[10px] bg-[var(--color-bg-input)] text-[var(--color-text-faded)] px-1.5 py-0.5 rounded-md font-mono">{actions.length}</span>
        </div>
        {isAdmin && (
          <button onClick={() => setShowQuick(!showQuick)} className="p-1 hover:bg-[var(--color-bg-input)] rounded-md text-[var(--color-text-faded)] hover:text-[var(--color-brand)] transition-all">
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
        {showQuick && <QuickCreateInline status={col.key} onClose={() => setShowQuick(false)} colleagues={colleagues} meetings={meetings} />}
        {actions.length === 0 && !showQuick && (
          <div className="h-20 border-2 border-dashed border-[var(--color-border)] rounded-xl flex items-center justify-center text-[11px] text-[var(--color-text-faded)]">
            Vide
          </div>
        )}
        {actions.map((a: any) => (
          <ActionCard key={a.id} action={a} colleagues={colleagues} meetings={meetings} isAdmin={isAdmin} />
        ))}
      </div>
    </div>
  )
}

function ActionCard({ action, colleagues, meetings, isAdmin }: any) {
  const { role } = useAuth()
  const updateAction = useUpdateAction()
  const deleteAction = useDeleteAction()
  const [editing, setEditing] = useState(false)
  const [desc, setDesc] = useState(action.description)
  
  const late = isLate(action)
  const assignee = colleagues?.find((c: any) => c.id === action.assigned_to_colleague_id)
  const meeting = meetings?.find((m: any) => m.id === action.meeting_id)

  const handleToggle = () => {
    const next: Status = action.status === 'completed' ? 'pending' : 'completed'
    updateAction.mutate({ id: action.id, status: next })
  }

  const handleDelete = () => {
    if (confirm('Supprimer cette action ?')) deleteAction.mutate(action.id)
  }

  const handleSave = () => {
    if (desc.trim() && desc !== action.description) {
      updateAction.mutate({ id: action.id, description: desc.trim() })
    }
    setEditing(false)
  }

  return (
    <div className={`action-card-modern relative group ${late ? 'border-red-500/30 bg-red-500/5' : ''}`}>
      {late && <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 rounded-t-xl" />}
      
      <div className="flex gap-3">
        <button 
          onClick={handleToggle}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
            action.status === 'completed' 
              ? 'bg-green-500 border-green-500 scale-110' 
              : 'border-[var(--color-border)] hover:border-[var(--color-brand)]'
          }`}
        >
          {action.status === 'completed' && <Check className="w-3 h-3 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          {editing && isAdmin ? (
            <textarea 
              value={desc} onChange={e => setDesc(e.target.value)}
              onBlur={handleSave}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() }; if (e.key==='Escape') setEditing(false) }}
              autoFocus className="w-full bg-transparent text-sm text-[var(--color-text-main)] focus:outline-none resize-none leading-relaxed"
            />
          ) : (
            <p 
              onClick={() => isAdmin && setEditing(true)}
              className={`text-sm leading-relaxed transition-all ${action.status === 'completed' ? 'text-[var(--color-text-faded)] line-through' : 'text-[var(--color-text-main)]'} ${isAdmin ? 'cursor-pointer' : ''}`}
            >
              {action.description}
            </p>
          )}
          {role === 'employee' && action.status !== 'completed' && (
            <button 
              onClick={handleToggle}
              className="mt-2 text-[10px] font-bold text-[var(--color-brand)] flex items-center gap-1 hover:underline"
            >
              <Check className="w-3 h-3" /> Marquer comme terminée
            </button>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
            {assignee && (
              <div className="flex items-center gap-1.5">
                <Avatar name={assignee.name} size="xs" />
                <span className="text-[10px] font-medium text-[var(--color-text-muted)] truncate max-w-[80px]">{assignee.name}</span>
              </div>
            )}

            {action.due_date && (
              <div className={`flex items-center gap-1 text-[10px] font-mono ${late ? 'text-red-400 font-bold' : 'text-[var(--color-text-faded)]'}`}>
                <Clock className="w-3 h-3" /> {fDate(action.due_date)}
              </div>
            )}

            {meeting && (
              <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-faded)] truncate max-w-[100px]">
                <Link2 className="w-3 h-3" /> {meeting.title}
              </div>
            )}
          </div>
        </div>

        {isAdmin && (
          <button onClick={handleDelete} className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--color-text-faded)] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

function QuickCreateInline({ status, onClose, colleagues, meetings }: any) {
  const createAction = useCreateAction()
  const [desc, setDesc] = useState('')
  const [assignTo, setAssignTo] = useState('')

  const handleAdd = () => {
    if (!desc.trim()) return
    createAction.mutate({ description: desc.trim(), status, assigned_to_colleague_id: assignTo || null }, {
      onSuccess: () => { setDesc(''); onClose() }
    })
  }

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-brand)] p-3 rounded-xl shadow-lg ring-4 ring-[var(--color-brand)]/5 animate-in fade-in slide-in-from-top-2">
      <textarea 
        autoFocus value={desc} onChange={e => setDesc(e.target.value)}
        placeholder="Que faut-il faire ?"
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd() }; if (e.key==='Escape') onClose() }}
        className="w-full bg-transparent text-sm focus:outline-none resize-none min-h-[60px]"
      />
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--color-border)]">
        <select value={assignTo} onChange={e => setAssignTo(e.target.value)} className="bg-transparent text-[10px] text-[var(--color-text-muted)] focus:outline-none max-w-[100px]">
          <option value="">À qui ?</option>
          {colleagues?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex gap-2">
           <button onClick={onClose} className="p-1 px-3 text-[10px] text-[var(--color-text-faded)] hover:bg-[var(--color-bg-input)] rounded-md font-bold">Annuler</button>
           <button onClick={handleAdd} className="p-1 px-3 text-[10px] bg-[var(--color-brand)] text-white rounded-md font-bold shadow-sm">Créer</button>
        </div>
      </div>
    </div>
  )
}

function CreateActionModal({ isOpen, onClose, colleagues, meetings }: any) {
  const { colleagueId } = useAuth()
  const createAction = useCreateAction()
  const [desc, setDesc] = useState('')
  const [status, setStatus] = useState<Status>('pending')
  const [assignTo, setAssignTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [meetingId, setMeetingId] = useState('')

  const handleSubmit = (e: any) => {
    e.preventDefault()
    if (!desc.trim()) return
    createAction.mutate({ 
      description: desc.trim(), status, due_date: dueDate || null, 
      assigned_to_colleague_id: assignTo || null, meeting_id: meetingId || null 
    }, {
      onSuccess: () => { toast.success('Action créée !'); onClose(); setDesc(''); setAssignTo(''); setDueDate(''); setMeetingId(''); setStatus('pending') }
    })
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm z-50 transition-opacity" />
        <Dialog.Content aria-describedby={undefined} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl p-6 z-50 focus:outline-none">
          <Dialog.Title className="text-xl font-bold text-[var(--color-text-main)] mb-6">Nouvelle Action</Dialog.Title>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Description</label>
              <textarea 
                value={desc} onChange={e => setDesc(e.target.value)} autoFocus rows={3}
                className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-brand)] resize-none"
                placeholder="Détail de l'engagement..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Assigné à</label>
                <select value={assignTo} onChange={e => setAssignTo(e.target.value)} className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none">
                  <option value="">Tous</option>
                  {colleagues.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Échéance</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Statut</label>
                <select value={status} onChange={e => setStatus(e.target.value as Status)} className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none">
                  {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Réunion liée</label>
                <select value={meetingId} onChange={e => setMeetingId(e.target.value)} className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none">
                  <option value="">Aucune</option>
                  {meetings.map((m: any) => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
               <Button type="button" variant="default" onClick={onClose} className="flex-1">Annuler</Button>
               <Button type="submit" variant="primary" className="flex-1" disabled={!desc.trim() || createAction.isPending}>
                 {createAction.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer'}
               </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
