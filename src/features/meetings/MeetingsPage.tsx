import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useMeetings, useDeleteMeeting } from './useMeetings'
import { useActions, useCreateAction } from '../actions/useActions'
import { useColleagues } from '../colleagues/useColleagues'
import { Badge, Spinner, Avatar, Button } from '../../components/ui'
import { fDate, fDateTime, isOverdue } from '../../utils'
import { NewMeetingModal } from './NewMeetingModal'
import { EditMeetingModal } from './EditMeetingModal'
import { exportMeetingPDF } from './usePDFExport'
import {
  CalendarDays, Plus, Search, Trash2, Pencil, FileDown,
  ThumbsUp, ThumbsDown, AlertCircle, Heart, Shield, TrendingUp,
  X, Users, Check, FileText, Clock, ChevronRight, ChevronLeft,
  Calendar, MessageSquare, Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'

// ─── Hook cr_items ────────────────────────────────────────────────────────────
function useCRItems(meetingId: string | null) {
  return useQuery({
    queryKey: ['cr_items', meetingId],
    enabled: !!meetingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cr_items')
        .select('*, colleagues(id, name, post)')
        .eq('meeting_id', meetingId!)
        .order('order_index', { ascending: true })
      if (error) return []
      return data ?? []
    },
    staleTime: 1000 * 60 * 2,
  })
}

// ─── Data helpers ─────────────────────────────────────────────────────────────
function parseItem(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  const match = t.match(/^[0-9a-f\-]{36}::(.+)$/i)
  if (match) return match[1].trim() || null
  return t
}

function parseItems(arr: string[] | null | undefined): string[] {
  return (arr ?? []).map(parseItem).filter(Boolean) as string[]
}

const CR_CONF = [
  { key: 'successes',         label: 'Succès',       icon: ThumbsUp,    color: '#10b981', light: '#ecfdf5', border: '#d1fae5' },
  { key: 'failures',          label: 'Défauts',      icon: ThumbsDown,  color: '#ef4444', light: '#fef2f2', border: '#fee2e2' },
  { key: 'sensitive_points',  label: 'Sensibles',    icon: AlertCircle, color: '#f59e0b', light: '#fffbeb', border: '#fef3c7' },
  { key: 'relational_points', label: 'Relationnels', icon: Heart,       color: '#8b5cf6', light: '#f5f3ff', border: '#ede9fe' },
  { key: 'sse',               label: 'SSE',          icon: Shield,      color: '#3b82f6', light: '#eff6ff', border: '#dbeafe' },
  { key: 'improvements',      label: 'Amélioration', icon: TrendingUp,  color: '#ec4899', light: '#fdf2f8', border: '#fce7f3' },
] as const

export function MeetingsPage() {
  const { data: meetings, isLoading } = useMeetings()
  const { data: colleagues } = useColleagues()
  const deleteMeeting = useDeleteMeeting()

  const [selectedId,    setSelectedId]    = useState<string | null>(null)
  const [search,        setSearch]        = useState('')
  const [showModal,     setShowModal]     = useState(false)
  const [editMeeting,   setEditMeeting]   = useState<any | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [mobileView,    setMobileView]    = useState<'list' | 'detail'>('list')
  const [isMobile,      setIsMobile]      = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const filtered = useMemo(() => {
    if (!meetings) return []
    const q = search.toLowerCase().trim()
    if (!q) return meetings
    return meetings.filter(m => {
      if (m.title.toLowerCase().includes(q)) return true
      const allText = [
        ...parseItems(m.successes), ...parseItems(m.failures),
        ...parseItems(m.sensitive_points), ...parseItems(m.relational_points),
        ...parseItems(m.sse), ...parseItems(m.improvements),
      ].join(' ').toLowerCase()
      return allText.includes(q)
    })
  }, [meetings, search])

  const selectedMeeting = meetings?.find(m => m.id === (selectedId ?? filtered[0]?.id)) || null

  const handleSelect = (id: string) => {
    setSelectedId(id)
    if (isMobile) setMobileView('detail')
  }

  const handleDelete = async (id: string) => {
    await deleteMeeting.mutateAsync(id)
    setDeleteConfirm(null)
    if (selectedId === id) {
      setSelectedId(null)
      setMobileView('list')
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-app)] overflow-hidden">
      
      {showModal   && <NewMeetingModal onClose={() => setShowModal(false)} />}
      {editMeeting && <EditMeetingModal meeting={editMeeting} onClose={() => setEditMeeting(null)} />}

      {/* Delete confirm Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-2">Supprimer la réunion ?</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">Cette action est irréversible et supprimera tout le contenu associé.</p>
            <div className="flex gap-3">
              <Button variant="default" className="flex-1" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
              <Button variant="destructive" className="flex-1" onClick={() => handleDelete(deleteConfirm)}>Supprimer</Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex flex-1 min-h-0 relative">
        
        {/* Master: List Pane */}
        <aside className={`
          flex-col transition-all duration-300 border-r border-[var(--color-border)] bg-[var(--color-bg-sidebar)]
          ${isMobile ? (mobileView === 'list' ? 'flex w-full' : 'hidden') : 'flex w-72 md:w-80 lg:w-96'}
        `}>
          {/* List Header */}
          <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-bg-sidebar)]/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-[var(--color-text-main)]">Réunions</h1>
              <Button size="sm" variant="primary" onClick={() => setShowModal(true)} className="rounded-full w-8 h-8 p-0">
                <Plus className="w-5 h-5" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-faded)]" />
              <input 
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Chercher une réunion..."
                className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[var(--color-brand)] transition-all"
              />
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center px-6">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-10" />
                <p className="text-sm text-[var(--color-text-faded)]">Aucune réunion trouvée</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {filtered.map(m => {
                  const isSelected = selectedMeeting?.id === m.id
                  const d = new Date(m.date)
                  const totalPoints = CR_CONF.reduce((acc, c) => acc + parseItems(m[c.key]).length, 0)
                  
                  return (
                    <button 
                      key={m.id} 
                      onClick={() => handleSelect(m.id)}
                      className={`
                        w-full text-left p-4 transition-all hover:bg-[var(--color-bg-input)] group
                        ${isSelected ? 'bg-[var(--color-brand)]/5 border-l-4 border-[var(--color-brand)]' : 'border-l-4 border-transparent'}
                      `}
                    >
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-bg-input)] border border-[var(--color-border)] flex-shrink-0">
                          <span className="text-lg font-bold leading-none">{format(d, 'dd')}</span>
                          <span className="text-[9px] uppercase font-bold text-[var(--color-text-faded)] mt-1">{format(d, 'MMM', { locale: fr })}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                             <h3 className={`text-sm font-bold truncate ${isSelected ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-main)]'}`}>
                               {m.title}
                             </h3>
                             <ChevronRight className={`w-4 h-4 text-[var(--color-text-faded)] transition-transform ${isSelected ? 'translate-x-1' : ''}`} />
                          </div>
                          <p className="text-[10px] text-[var(--color-text-faded)] font-mono mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {format(d, 'HH:mm')}
                          </p>
                          {totalPoints > 0 && (
                            <div className="flex gap-1.5 mt-2 flex-wrap">
                               {CR_CONF.map(conf => {
                                 const count = parseItems(m[conf.key]).length
                                 if (count === 0) return null
                                 return <div key={conf.key} className="w-2 h-2 rounded-full" style={{ backgroundColor: conf.color }} title={`${count} ${conf.label}`} />
                               })}
                               <span className="text-[9px] font-bold text-[var(--color-text-muted)] ml-1">{totalPoints} points</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Detail: Content Pane */}
        <main className={`
          flex-1 flex flex-col bg-[var(--color-bg-app)] overflow-hidden
          ${isMobile && mobileView === 'list' ? 'hidden' : 'flex'}
        `}>
          {!selectedMeeting ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div className="max-w-xs animate-in fade-in slide-in-from-bottom-4">
                <div className="w-20 h-20 bg-[var(--color-bg-sidebar)] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-[var(--color-border)]">
                  <MessageSquare className="w-10 h-10 text-[var(--color-brand)] opacity-50" />
                </div>
                <h2 className="text-lg font-bold mb-2">Aucune réunion sélectionnée</h2>
                <p className="text-sm text-[var(--color-text-muted)]">Choisissez une réunion dans la liste pour consulter son compte-rendu et ses points d'action.</p>
              </div>
            </div>
          ) : (
            <DetailView 
              meeting={selectedMeeting} 
              onBack={() => setMobileView('list')} 
              onEdit={() => setEditMeeting(selectedMeeting)}
              onDelete={() => setDeleteConfirm(selectedMeeting.id)}
              colleagues={colleagues ?? []}
              isMobile={isMobile}
            />
          )}
        </main>
      </div>
    </div>
  )
}

function DetailView({ meeting, onBack, onEdit, onDelete, colleagues, isMobile }: any) {
  const [exporting, setExporting] = useState(false)
  const [crSearch, setCrSearch] = useState('')
  const { data: crItemsRaw } = useCRItems(meeting.id)
  const { data: actions } = useActions(meeting.id)
  
  const d = new Date(meeting.date)
  
  const handleExport = async () => {
    setExporting(true)
    try {
      await exportMeetingPDF(meeting, colleagues, crItemsRaw ?? [], actions ?? [])
      toast.success('PDF généré !')
    } catch (err) {
      toast.error('Erreur lors de la génération du PDF')
    }
    setExporting(false)
  }

  const crAttributionMap = useMemo(() => {
    const map: Record<string, any> = {}
    ;(crItemsRaw ?? []).forEach((item: any) => {
      if (item.content && item.colleagues) map[item.content.trim()] = item.colleagues
    })
    return map
  }, [crItemsRaw])

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-bg-app)]">
      {/* Header Detail */}
      <header className="flex-shrink-0 bg-[var(--color-bg-sidebar)] border-b border-[var(--color-border)] px-4 md:px-8 py-4 z-10">
        <div className="flex items-center justify-between gap-4">
           <div className="flex items-center gap-3">
             {isMobile && (
               <Button variant="default" size="sm" onClick={onBack} className="p-2 h-auto">
                 <ChevronLeft className="w-5 h-5" />
               </Button>
             )}
             <div>
               <h2 className="text-lg md:text-xl font-bold text-[var(--color-text-main)] truncate max-w-[200px] md:max-w-md">
                 {meeting.title}
               </h2>
               <div className="flex items-center gap-2 mt-1">
                 <span className="text-xs text-[var(--color-text-main)] opacity-70 flex items-center gap-1 font-medium">
                   <Calendar className="w-3.5 h-3.5 text-[var(--color-brand)]" /> {format(d, 'EEEE d MMMM yyyy', { locale: fr })}
                 </span>
                 <span className="text-xs text-[var(--color-brand)] px-2 py-0.5 bg-[var(--color-brand)]/10 rounded-full font-bold">
                   {format(d, 'HH:mm')}
                 </span>
               </div>
             </div>
           </div>

           <div className="flex items-center gap-2">
              <Button size="sm" variant="default" onClick={onEdit} className="hidden sm:flex">
                <Pencil className="w-4 h-4 mr-2" /> Éditer
              </Button>
              <Button size="sm" variant="primary" onClick={handleExport} disabled={exporting}>
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4 sm:mr-2" />}
                <span className="hidden sm:inline">Exporter</span>
              </Button>
              <Button size="sm" variant="destructive" onClick={onDelete} className="p-2 h-auto">
                <Trash2 className="w-4 h-4" />
              </Button>
           </div>
        </div>
      </header>

      {/* Detail Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar pb-24">
        
        {/* Participants Section */}
        {meeting.colleagues_ids?.length > 0 && (
          <section className="animate-in fade-in slide-in-from-top-2 duration-300">
             <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-[var(--color-text-faded)]" />
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-main)] opacity-50">Participants ({meeting.colleagues_ids.length})</h4>
             </div>
             <div className="flex flex-wrap gap-2">
                {meeting.colleagues_ids.map((id: string) => {
                  const c = colleagues.find((col: any) => col.id === id)
                  if (!c) return null
                  return (
                    <div key={id} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-full shadow-sm">
                      <Avatar name={c.name} size="xs" />
                      <span className="text-xs font-medium">{c.name}</span>
                    </div>
                  )
                })}
             </div>
          </section>
        )}

        {/* Compte Rendu Grid */}
        <section className="animate-in fade-in slide-in-from-top-4 duration-500 delay-150">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--color-text-faded)]" />
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-main)] opacity-50">Compte-rendu</h4>
             </div>
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--color-text-faded)]" />
                <input 
                  value={crSearch} onChange={e => setCrSearch(e.target.value)}
                  placeholder="Filtrer les points..."
                  className="bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg pl-8 pr-3 py-1 text-[11px] focus:outline-none focus:border-[var(--color-brand)] w-40"
                />
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {CR_CONF.map(conf => {
              const rawItems = parseItems(meeting[conf.key])
              const displayItems = crSearch ? rawItems.filter(s => s.toLowerCase().includes(crSearch.toLowerCase())) : rawItems
              if (rawItems.length === 0) return null
              const Icon = conf.icon

              return (
                <div key={conf.key} className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden shadow-sm group">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]" style={{ backgroundColor: `${conf.color}08` }}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" style={{ color: conf.color }} />
                      <span className="text-xs font-bold uppercase tracking-tight" style={{ color: conf.color }}>{conf.label}</span>
                    </div>
                    <span className="text-[10px] font-mono opacity-50">{rawItems.length}</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {displayItems.length === 0 && crSearch ? (
                      <p className="text-[11px] text-[var(--color-text-faded)] italic">Aucun résultat</p>
                    ) : displayItems.map((item, i) => {
                      const attributed = crAttributionMap[item.trim()]
                      return (
                        <div key={i} className={`flex gap-3 pb-3 ${i < displayItems.length - 1 ? 'border-b border-[var(--color-border)]/50' : ''}`}>
                          <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: conf.color }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-relaxed text-[var(--color-text-main)]">
                               {item}
                            </p>
                            {attributed && (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-[9px] text-[var(--color-text-faded)] uppercase tracking-widest font-bold">Attribué à</span>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-500/5 rounded-full border border-[var(--color-border)]">
                                   <Avatar name={attributed.name} size="xs" />
                                   <span className="text-[10px] font-medium text-[var(--color-text-muted)]">{attributed.name.split(' ')[0]}</span>
                                </div>
                              </div>
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
        </section>

        {/* Linked Actions */}
        <section className="animate-in fade-in slide-in-from-top-4 duration-500 delay-300">
           <MeetingActionsPanel meetingId={meeting.id} />
        </section>

      </div>
    </div>
  )
}

function MeetingActionsPanel({ meetingId }: { meetingId: string }) {
  const { data: actions, isLoading } = useActions(meetingId)
  const { data: colleagues } = useColleagues()
  const createAction = useCreateAction()
  const [showAdd, setShowAdd] = useState(false)
  const [desc, setDesc] = useState(''); const [assignTo, setAssignTo] = useState(''); const [dueDate, setDueDate] = useState('')

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); if (!desc.trim()) return
    await createAction.mutateAsync({ 
      description: desc.trim(), 
      assigned_to_colleague_id: assignTo || null, 
      due_date: dueDate || null, 
      meeting_id: meetingId, 
      status: 'pending' 
    })
    toast.success('Action créée !')
    setDesc(''); setAssignTo(''); setDueDate(''); setShowAdd(false)
  }

  if (isLoading) return <Spinner />

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
           <Check className="w-4 h-4 text-green-500" />
           <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Actions liées ({actions?.length ?? 0})</h4>
        </div>
        <Button size="sm" variant="default" onClick={() => setShowAdd(!showAdd)}>
           {showAdd ? 'Annuler' : 'Ajouter une action'}
        </Button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="mb-6 p-4 bg-[var(--color-bg-input)] rounded-xl border border-[var(--color-brand)]/20 animate-in slide-in-from-top-2">
          <textarea 
            value={desc} onChange={e => setDesc(e.target.value)} 
            placeholder="Quelle action faut-il mener ?" required autoFocus
            className="w-full bg-transparent border-none text-sm focus:outline-none min-h-[80px] mb-4"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
             <select value={assignTo} onChange={e => setAssignTo(e.target.value)} className="bg-[var(--color-bg-sidebar)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs focus:outline-none">
                <option value="">Assigner à...</option>
                {colleagues?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
             <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-[var(--color-bg-sidebar)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs focus:outline-none" />
          </div>
          <div className="flex justify-end">
             <Button type="submit" variant="primary" disabled={!desc.trim() || createAction.isPending}>
               {createAction.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer l\'action'}
             </Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {actions?.length === 0 && !showAdd && (
          <p className="py-8 text-center text-sm text-[var(--color-text-faded)] italic">Aucune action liée à cette réunion.</p>
        )}
        {actions?.map((a: any) => {
          const c = colleagues?.find((col: any) => col.id === a.assigned_to_colleague_id)
          const done = a.status === 'completed'
          const late = a.due_date ? isOverdue(a.due_date) && !done : false

          return (
            <div key={a.id} className={`flex items-start gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-sidebar)] transition-all ${done ? 'opacity-60' : ''}`}>
               <div className={`mt-1.5 w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center ${done ? 'bg-green-500 border-green-500' : 'bg-transparent border-[var(--color-border)]'}`}>
                 {done && <Check className="w-2.5 h-2.5 text-white" />}
               </div>
               <div className="flex-1 min-w-0">
                  <p className={`text-sm ${done ? 'line-through text-[var(--color-text-faded)]' : 'text-[var(--color-text-main)]'}`}>
                    {a.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    {c && (
                      <div className="flex items-center gap-1">
                        <Avatar name={c.name} size="xs" />
                        <span className="text-[10px] font-medium text-[var(--color-text-muted)]">{c.name}</span>
                      </div>
                    )}
                    {a.due_date && (
                      <span className={`text-[10px] font-mono ${late ? 'text-red-500 font-bold' : 'text-[var(--color-text-faded)]'}`}>
                        {fDate(a.due_date)}
                      </span>
                    )}
                  </div>
               </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
