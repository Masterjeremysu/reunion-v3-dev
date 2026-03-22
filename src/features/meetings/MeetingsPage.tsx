import { useState } from 'react'
import { useMeetings, useCreateMeeting, useDeleteMeeting, useUpdateMeeting } from './useMeetings'
import { useActions, useCreateAction } from '../actions/useActions'
import { useColleagues } from '../colleagues/useColleagues'
import { Badge, Spinner, Avatar, EmptyState, Button } from '../../components/ui'
import { fDate, fDateTime, isOverdue, getInitials } from '../../utils'
import { ACTION_STATUS } from '../../constants'
import {
  CalendarDays, Plus, Search, Trash2,
  ThumbsUp, ThumbsDown, AlertCircle, Heart,
  X, Clock, MapPin, Users, ChevronDown, Check,
  FileText, Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'

type CRTab = 'successes' | 'failures' | 'sensitive_points' | 'relational_points'

const CR_TABS: { key: CRTab; label: string; icon: React.ElementType; color: string; dot: string }[] = [
  { key: 'successes',        label: 'Succès',       icon: ThumbsUp,    color: 'text-teal-400',   dot: 'bg-teal-400'   },
  { key: 'failures',         label: 'Défauts',      icon: ThumbsDown,  color: 'text-red-400',    dot: 'bg-red-400'    },
  { key: 'sensitive_points', label: 'Sensibles',    icon: AlertCircle, color: 'text-amber-400',  dot: 'bg-amber-400'  },
  { key: 'relational_points',label: 'Relationnels', icon: Heart,       color: 'text-purple-400', dot: 'bg-purple-400' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isUUID(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}
function cleanItem(item: string) {
  // If it's a UUID (old format), show a placeholder instead of the raw ID
  if (isUUID(item)) return null
  return item.trim()
}

// ─── New Meeting Modal ─────────────────────────────────────────────────────────
function NewMeetingModal({
  onClose,
  colleagues,
  userId,
}: {
  onClose: () => void
  colleagues: any[]
  userId: string
}) {
  const createMeeting = useCreateMeeting()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [time, setTime] = useState('09:00')
  const [selectedColleagues, setSelectedColleagues] = useState<string[]>([])
  const [successes, setSuccesses] = useState<string[]>([''])
  const [failures, setFailures] = useState<string[]>([''])
  const [sensPoints, setSensPoints] = useState<string[]>([''])
  const [relPoints, setRelPoints] = useState<string[]>([''])
  const [activeSection, setActiveSection] = useState<string | null>('info')

  const toggleColleague = (id: string) =>
    setSelectedColleagues(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )

  const updateList = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    idx: number,
    val: string
  ) => {
    const next = [...list]
    next[idx] = val
    setList(next)
  }

  const addItem = (setList: React.Dispatch<React.SetStateAction<string[]>>) =>
    setList(prev => [...prev, ''])

  const removeItem = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    idx: number
  ) => setList(list.filter((_, i) => i !== idx))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Le titre est obligatoire'); return }

    const dateTime = `${date}T${time}:00`
    const clean = (arr: string[]) => arr.map(s => s.trim()).filter(Boolean)

    await createMeeting.mutateAsync({
      title: title.trim(),
      description: description || null,
      date: dateTime,
      colleagues_ids: selectedColleagues.length > 0 ? selectedColleagues : null,
      successes: clean(successes),
      failures: clean(failures),
      sensitive_points: clean(sensPoints),
      relational_points: clean(relPoints),
      created_by_user_id: userId,
    })
    onClose()
  }

  const SectionHeader = ({ id, label, icon: Icon }: { id: string; label: string; icon: React.ElementType }) => (
    <button
      type="button"
      onClick={() => setActiveSection(activeSection === id ? null : id)}
      className="w-full flex items-center justify-between py-2.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
    >
      <span className="flex items-center gap-2"><Icon className="w-3.5 h-3.5" />{label}</span>
      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeSection === id ? 'rotate-180' : ''}`} />
    </button>
  )

  const ListEditor = ({
    items, setItems, placeholder, color,
  }: {
    items: string[]
    setItems: React.Dispatch<React.SetStateAction<string[]>>
    placeholder: string
    color: string
  }) => (
    <div className="flex flex-col gap-1.5 pb-3">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color}`} />
          <input
            value={item}
            onChange={e => updateList(items, setItems, idx, e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-[#252b3d] border border-white/[0.07] rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-teal-500/50 transition-colors"
          />
          {items.length > 1 && (
            <button type="button" onClick={() => removeItem(items, setItems, idx)}
              className="p-1 text-slate-600 hover:text-red-400 transition-colors">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => addItem(setItems)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors ml-3.5 mt-0.5"
      >
        <Plus className="w-3 h-3" /> Ajouter
      </button>
    </div>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="h-full w-full max-w-lg bg-[#181c27] border-l border-white/[0.07] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] flex-shrink-0">
          <h2 className="text-sm font-medium text-white">Nouvelle réunion</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-0">

          {/* Info section */}
          <div className="border-b border-white/[0.05]">
            <SectionHeader id="info" label="Informations" icon={FileText} />
            {activeSection === 'info' && (
              <div className="flex flex-col gap-3 pb-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Titre <span className="text-red-400">*</span></label>
                  <input
                    value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="Ex : Réunion GT hebdo — S14"
                    required autoFocus
                    className="w-full bg-[#1e2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Description</label>
                  <textarea
                    value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Contexte, ordre du jour..."
                    rows={2}
                    className="w-full bg-[#1e2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-teal-500 resize-none transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)}
                      className="w-full bg-[#1e2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-teal-500 transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block flex items-center gap-1"><Clock className="w-3 h-3" /> Heure</label>
                    <input type="time" value={time} onChange={e => setTime(e.target.value)}
                      className="w-full bg-[#1e2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-teal-500 transition-colors" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Participants */}
          <div className="border-b border-white/[0.05]">
            <SectionHeader id="participants" label={`Participants${selectedColleagues.length > 0 ? ` (${selectedColleagues.length})` : ''}`} icon={Users} />
            {activeSection === 'participants' && (
              <div className="flex flex-col gap-1.5 pb-4">
                {colleagues.map(c => {
                  const selected = selectedColleagues.includes(c.id)
                  return (
                    <button
                      key={c.id} type="button"
                      onClick={() => toggleColleague(c.id)}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                        selected
                          ? 'border-teal-500/40 bg-teal-500/5'
                          : 'border-white/[0.07] hover:border-white/15 hover:bg-white/[0.02]'
                      }`}
                    >
                      <Avatar name={c.name} size="sm" />
                      <div className="flex-1 text-left">
                        <p className="text-xs font-medium text-white">{c.name}</p>
                        <p className="text-[10px] text-slate-500">{c.post}</p>
                      </div>
                      {selected && <Check className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />}
                    </button>
                  )
                })}
                {colleagues.length === 0 && <p className="text-xs text-slate-500 py-2">Aucun collègue enregistré</p>}
              </div>
            )}
          </div>

          {/* Succès */}
          <div className="border-b border-white/[0.05]">
            <SectionHeader id="successes" label="Succès" icon={ThumbsUp} />
            {activeSection === 'successes' && (
              <ListEditor items={successes} setItems={setSuccesses} placeholder="Décrivez un succès..." color="bg-teal-400" />
            )}
          </div>

          {/* Défauts */}
          <div className="border-b border-white/[0.05]">
            <SectionHeader id="failures" label="Défauts" icon={ThumbsDown} />
            {activeSection === 'failures' && (
              <ListEditor items={failures} setItems={setFailures} placeholder="Décrivez un défaut..." color="bg-red-400" />
            )}
          </div>

          {/* Sensibles */}
          <div className="border-b border-white/[0.05]">
            <SectionHeader id="sensitive" label="Points sensibles" icon={AlertCircle} />
            {activeSection === 'sensitive' && (
              <ListEditor items={sensPoints} setItems={setSensPoints} placeholder="Point sensible..." color="bg-amber-400" />
            )}
          </div>

          {/* Relationnels */}
          <div>
            <SectionHeader id="relational" label="Points relationnels" icon={Heart} />
            {activeSection === 'relational' && (
              <ListEditor items={relPoints} setItems={setRelPoints} placeholder="Point relationnel..." color="bg-purple-400" />
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.07] flex gap-3 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 text-sm text-slate-400 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
            Annuler
          </button>
          <button
            onClick={handleSubmit as any}
            disabled={createMeeting.isPending}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {createMeeting.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Créer la réunion
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function MeetingsPage() {
  const { data: meetings, isLoading } = useMeetings()
  const { data: colleagues } = useColleagues()
  const deleteMeeting = useDeleteMeeting()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<CRTab>('successes')
  const [showModal, setShowModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const filtered = meetings?.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  const selected = meetings?.find(m => m.id === selectedId) ?? filtered[0] ?? null

  const getColleague = (id: string) => colleagues?.find(c => c.id === id)

  const crItems = selected
    ? (selected[activeTab] ?? []).map(cleanItem).filter(Boolean) as string[]
    : []

  const handleDelete = async (id: string) => {
    await deleteMeeting.mutateAsync(id)
    setDeleteConfirm(null)
    if (selectedId === id) setSelectedId(null)
  }

  // Fake userId for now — will come from auth
  const userId = ''

  return (
    <div className="flex flex-col h-screen bg-[#0f1117] overflow-hidden">

      {/* Modal */}
      {showModal && (
        <NewMeetingModal
          onClose={() => setShowModal(false)}
          colleagues={colleagues ?? []}
          userId={userId}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)' }}
        >
          <div className="bg-[#1e2333] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-sm font-medium text-white mb-2">Supprimer cette réunion ?</h3>
            <p className="text-xs text-slate-400 mb-5">Cette action est irréversible. Les points d'action liés seront également supprimés.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 text-sm text-slate-400 border border-white/10 rounded-lg hover:bg-white/5 transition-colors">Annuler</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Topbar */}
      <div className="flex items-center gap-3 px-6 py-3.5 border-b border-white/[0.07] bg-[#181c27] flex-shrink-0">
        <div>
          <h1 className="text-sm font-medium text-white">Réunions</h1>
          <p className="text-[10px] text-slate-500 mt-0.5">{meetings?.length ?? 0} au total</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouvelle réunion
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">

        {/* ── Left list panel ── */}
        <div className="w-[280px] flex-shrink-0 border-r border-white/[0.07] flex flex-col bg-[#0f1117]">
          {/* Search */}
          <div className="p-3 border-b border-white/[0.05]">
            <div className="flex items-center gap-2 bg-[#1e2333] border border-white/[0.07] rounded-lg px-3 h-8">
              <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-600 outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-slate-500 hover:text-white transition-colors">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            )}
            {!isLoading && filtered.length === 0 && (
              <EmptyState icon={CalendarDays} title="Aucune réunion" description="Créez votre première réunion" />
            )}
            {filtered.map(m => {
              const isSelected = (selectedId ?? filtered[0]?.id) === m.id
              const d = new Date(m.date)
              const successCount = (m.successes ?? []).filter(s => !isUUID(s)).length
              const failureCount = (m.failures ?? []).filter(s => !isUUID(s)).length
              const sensCount = (m.sensitive_points ?? []).filter(s => !isUUID(s)).length

              return (
                <button
                  key={m.id}
                  onClick={() => { setSelectedId(m.id); setActiveTab('successes') }}
                  className={`w-full text-left px-3 py-3 border-b border-white/[0.04] transition-all hover:bg-[#1a1f2e] ${
                    isSelected ? 'bg-[#1e2535] border-l-2 border-l-teal-500 pl-[10px]' : ''
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Date block */}
                    <div className="w-9 flex-shrink-0 text-center">
                      <div className="text-base font-medium text-white leading-none">{format(d, 'd')}</div>
                      <div className="text-[9px] text-slate-500 uppercase mt-0.5">{format(d, 'MMM', { locale: fr })}</div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate leading-snug">{m.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {format(d, 'HH:mm') !== '00:00' ? format(d, 'HH:mm') : ''}
                      </p>
                      {(successCount + failureCount + sensCount) > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {successCount > 0 && (
                            <span className="text-[9px] bg-teal-500/10 text-teal-400 px-1.5 py-0.5 rounded-full">
                              {successCount} succès
                            </span>
                          )}
                          {failureCount > 0 && (
                            <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded-full">
                              {failureCount} défaut{failureCount > 1 ? 's' : ''}
                            </span>
                          )}
                          {sensCount > 0 && (
                            <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-full">
                              {sensCount} sensible{sensCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Right detail panel ── */}
        <div className="flex-1 overflow-y-auto bg-[#0d1018]">
          {!selected ? (
            <div className="h-full flex items-center justify-center">
              <EmptyState icon={CalendarDays} title="Sélectionnez une réunion" />
            </div>
          ) : (
            <div className="max-w-2xl mx-auto p-6 flex flex-col gap-6">

              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h2 className="text-lg font-medium text-white leading-snug">{selected.title}</h2>
                  {selected.description && (
                    <p className="text-sm text-slate-400 mt-1">{selected.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {fDateTime(selected.date)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteConfirm(selected.id)}
                  className="p-2 text-slate-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Participants */}
              {(selected.colleagues_ids?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[10px] font-medium tracking-widest text-slate-500 uppercase mb-3 flex items-center gap-1.5">
                    <Users className="w-3 h-3" /> Participants ({selected.colleagues_ids!.length})
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {selected.colleagues_ids!.map(id => {
                      const c = getColleague(id)
                      if (!c) return (
                        <div key={id} className="flex items-center gap-2 bg-[#1e2333] border border-white/[0.07] rounded-lg px-3 py-2">
                          <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[9px] text-slate-400">?</div>
                          <span className="text-xs text-slate-500">Collègue supprimé</span>
                        </div>
                      )
                      return (
                        <div key={id} className="flex items-center gap-2.5 bg-[#1e2333] border border-white/[0.07] rounded-lg px-3 py-2 hover:border-white/15 transition-colors">
                          <Avatar name={c.name} size="sm" />
                          <div>
                            <p className="text-xs font-medium text-white leading-none">{c.name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{c.post}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Compte-rendu */}
              <div>
                <p className="text-[10px] font-medium tracking-widest text-slate-500 uppercase mb-3 flex items-center gap-1.5">
                  <FileText className="w-3 h-3" /> Compte-rendu
                </p>

                {/* Tab bar */}
                <div className="flex border-b border-white/[0.07] mb-0">
                  {CR_TABS.map(tab => {
                    const rawItems = selected[tab.key] ?? []
                    const validItems = rawItems.filter(s => !isUUID(s) && s.trim())
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-xs transition-colors border-b-2 -mb-px ${
                          activeTab === tab.key
                            ? `${tab.color} border-current`
                            : 'text-slate-500 border-transparent hover:text-slate-300'
                        }`}
                      >
                        <tab.icon className="w-3 h-3" />
                        {tab.label}
                        {validItems.length > 0 && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                            activeTab === tab.key ? 'bg-current/20' : 'bg-white/10'
                          }`}>
                            {validItems.length}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Tab content */}
                <div className="bg-[#181c27] border border-t-0 border-white/[0.07] rounded-b-xl p-4">
                  {crItems.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">Aucun point renseigné pour cette catégorie</p>
                  ) : (
                    <ul className="flex flex-col gap-2.5">
                      {crItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${CR_TABS.find(t => t.key === activeTab)?.dot}`} />
                          <span className="text-sm text-slate-300 leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Actions liées */}
              <MeetingActionsPanel meetingId={selected.id} />

            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Actions panel ─────────────────────────────────────────────────────────────
function MeetingActionsPanel({ meetingId }: { meetingId: string }) {
  const { data: actions, isLoading } = useActions(meetingId)
  const { data: colleagues } = useColleagues()
  const createAction = useCreateAction()
  const [showAdd, setShowAdd] = useState(false)
  const [desc, setDesc] = useState('')
  const [assignTo, setAssignTo] = useState('')
  const [dueDate, setDueDate] = useState('')

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!desc.trim()) return
    await createAction.mutateAsync({
      description: desc.trim(),
      assigned_to_colleague_id: assignTo || null,
      due_date: dueDate || null,
      meeting_id: meetingId,
      status: 'pending',
    })
    setDesc(''); setAssignTo(''); setDueDate(''); setShowAdd(false)
  }

  if (isLoading) return <Spinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-medium tracking-widest text-slate-500 uppercase flex items-center gap-1.5">
          <Check className="w-3 h-3" /> Actions ({actions?.length ?? 0})
        </p>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition-colors"
        >
          <Plus className="w-3 h-3" /> Ajouter
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="mb-3 p-3 bg-[#1e2333] border border-white/[0.07] rounded-xl flex flex-col gap-2">
          <input
            value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Description de l'action..." required autoFocus
            className="w-full bg-[#252b3d] border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-teal-500 transition-colors"
          />
          <div className="grid grid-cols-2 gap-2">
            <select value={assignTo} onChange={e => setAssignTo(e.target.value)}
              className="bg-[#252b3d] border border-white/[0.07] rounded-lg px-3 py-1.5 text-xs text-white outline-none">
              <option value="">Assigner à...</option>
              {colleagues?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="bg-[#252b3d] border border-white/[0.07] rounded-lg px-3 py-1.5 text-xs text-white outline-none" />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">Annuler</button>
            <button type="submit" className="px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors">Créer</button>
          </div>
        </form>
      )}

      {(actions?.length ?? 0) > 0 && (
        <div className="bg-[#181c27] border border-white/[0.07] rounded-xl divide-y divide-white/[0.05]">
          {actions!.map((a: any) => {
            const c = colleagues?.find(col => col.id === a.assigned_to_colleague_id)
            const late = a.due_date ? isOverdue(a.due_date) && a.status !== 'completed' : false
            const st = ACTION_STATUS[a.status]
            return (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  a.status === 'completed' ? 'bg-teal-400' : late ? 'bg-red-400' : 'bg-amber-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${a.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                    {a.description}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-500">
                    {c && <span>{c.name}</span>}
                    {a.due_date && (
                      <span className={late ? 'text-red-400' : ''}>{fDate(a.due_date)}</span>
                    )}
                  </div>
                </div>
                <Badge variant={st?.color as any ?? 'gray'}>{st?.label}</Badge>
              </div>
            )
          })}
        </div>
      )}

      {(actions?.length ?? 0) === 0 && !showAdd && (
        <p className="text-xs text-slate-600 text-center py-4">Aucune action liée à cette réunion</p>
      )}
    </div>
  )
}
