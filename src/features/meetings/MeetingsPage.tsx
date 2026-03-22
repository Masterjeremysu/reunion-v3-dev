import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeetings, useCreateMeeting, useDeleteMeeting } from './useMeetings'
import { useActions } from '../actions/useActions'
import { useColleagues } from '../colleagues/useColleagues'
import { Card, Badge, Spinner, Avatar, PageHeader, Button, EmptyState, Input } from '../../components/ui'
import { fDate, fDateTime, isOverdue, getInitials } from '../../utils'
import { ACTION_STATUS } from '../../constants'
import {
  CalendarDays, Plus, Search, CheckSquare, Users,
  Clock, MapPin, Trash2, ChevronRight, ThumbsUp, ThumbsDown,
  AlertCircle, Heart, FileText
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'

type CRTab = 'successes' | 'failures' | 'sensitive_points' | 'relational_points'

const CR_TABS: { key: CRTab; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'successes',       label: 'Succès',    icon: ThumbsUp,    color: 'text-teal-400'   },
  { key: 'failures',        label: 'Défauts',   icon: ThumbsDown,  color: 'text-red-400'    },
  { key: 'sensitive_points',label: 'Sensibles', icon: AlertCircle, color: 'text-amber-400'  },
  { key: 'relational_points',label: 'Relationnels', icon: Heart,   color: 'text-purple-400' },
]

export function MeetingsPage() {
  const { data: meetings, isLoading } = useMeetings()
  const { data: colleagues } = useColleagues()
  const deleteMeeting = useDeleteMeeting()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<CRTab>('successes')

  const filtered = meetings?.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  const selected = meetings?.find(m => m.id === selectedId) ?? filtered[0] ?? null

  const getColleague = (id: string) => colleagues?.find(c => c.id === id)

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette réunion ?')) return
    await deleteMeeting.mutateAsync(id)
    if (selectedId === id) setSelectedId(null)
  }

  const crItems = selected ? (selected[activeTab] ?? []) : []

  return (
    <div className="flex flex-col h-full bg-[#0f1117]">
      <PageHeader
        title="Réunions"
        subtitle={`${meetings?.length ?? 0} réunion(s) au total`}
        actions={
          <Button variant="primary" size="sm">
            <Plus className="w-3.5 h-3.5" /> Nouvelle réunion
          </Button>
        }
      />

      <div className="flex flex-1 min-h-0">
        {/* List panel */}
        <div className="w-[320px] flex-shrink-0 border-r border-white/[0.07] flex flex-col">
          <div className="p-3 border-b border-white/[0.07]">
            <div className="flex items-center gap-2 bg-[#1e2333] border border-white/[0.07] rounded-lg px-3 h-9">
              <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading && <div className="flex justify-center py-8"><Spinner /></div>}
            {!isLoading && filtered.length === 0 && (
              <EmptyState icon={CalendarDays} title="Aucune réunion" description="Créez votre première réunion" />
            )}
            {filtered.map(m => {
              const isSelected = (selectedId ?? filtered[0]?.id) === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className={`w-full text-left p-3 border-b border-white/[0.05] transition-colors hover:bg-[#1c2030] ${isSelected ? 'bg-[#1e2333] border-l-2 border-l-teal-500' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#252b3d] rounded-lg flex flex-col items-center justify-center flex-shrink-0 border border-white/[0.07]">
                      <span className="text-base font-medium text-white leading-none">{format(new Date(m.date), 'd')}</span>
                      <span className="text-[9px] text-slate-500 uppercase mt-0.5">{format(new Date(m.date), 'MMM', { locale: fr })}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">{m.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{format(new Date(m.date), 'HH:mm', { locale: fr })}</p>
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {(m.successes?.length ?? 0) > 0 && <span className="text-[9px] bg-teal-500/10 text-teal-400 px-1.5 py-0.5 rounded-full">{m.successes!.length} succès</span>}
                        {(m.failures?.length ?? 0) > 0 && <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded-full">{m.failures!.length} défaut{m.failures!.length > 1 ? 's' : ''}</span>}
                        {(m.sensitive_points?.length ?? 0) > 0 && <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-full">{m.sensitive_points!.length} sensible{m.sensitive_points!.length > 1 ? 's' : ''}</span>}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="flex-1 overflow-y-auto">
          {!selected ? (
            <div className="h-full flex items-center justify-center">
              <EmptyState icon={CalendarDays} title="Sélectionnez une réunion" description="Cliquez sur une réunion pour voir les détails" />
            </div>
          ) : (
            <div className="p-6 flex flex-col gap-5 max-w-3xl">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-medium text-white">{selected.title}</h2>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />{fDateTime(selected.date)}</span>
                    {selected.description && <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />{selected.description}</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Participants */}
              {(selected.colleagues_ids?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[10px] font-medium tracking-widest text-slate-500 uppercase mb-2">Participants</p>
                  <div className="flex gap-2 flex-wrap">
                    {selected.colleagues_ids!.map(id => {
                      const c = getColleague(id)
                      if (!c) return null
                      return (
                        <div key={id} className="flex items-center gap-2 bg-[#1e2333] border border-white/[0.07] rounded-lg px-3 py-2">
                          <Avatar name={c.name} size="sm" />
                          <div>
                            <p className="text-xs text-white font-medium">{c.name}</p>
                            <p className="text-[10px] text-slate-500">{c.post}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* CR Tabs */}
              <div>
                <p className="text-[10px] font-medium tracking-widest text-slate-500 uppercase mb-3">Compte-rendu</p>
                <div className="bg-[#181c27] border border-white/[0.07] rounded-xl overflow-hidden">
                  <div className="flex border-b border-white/[0.07]">
                    {CR_TABS.map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs transition-colors ${activeTab === tab.key ? `${tab.color} border-b-2 border-current` : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        <tab.icon className="w-3 h-3" />
                        {tab.label}
                        {(selected[tab.key]?.length ?? 0) > 0 && (
                          <span className="ml-0.5 text-[9px] bg-white/10 px-1.5 py-0.5 rounded-full">{selected[tab.key]!.length}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="p-4">
                    {crItems.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">Aucun point renseigné</p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {crItems.map((item, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                            <div className={`w-1 h-1 rounded-full mt-1.5 flex-shrink-0 ${CR_TABS.find(t => t.key === activeTab)?.color ?? 'bg-slate-400'} bg-current`} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions from this meeting */}
              <MeetingActions meetingId={selected.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MeetingActions({ meetingId }: { meetingId: string }) {
  const { data: actions, isLoading } = useActions(meetingId)
  const { data: colleagues } = useColleagues()

  if (isLoading) return <Spinner />
  if (!actions?.length) return null

  return (
    <div>
      <p className="text-[10px] font-medium tracking-widest text-slate-500 uppercase mb-3">Points d'action ({actions.length})</p>
      <div className="bg-[#181c27] border border-white/[0.07] rounded-xl divide-y divide-white/[0.05]">
        {actions.map(a => {
          const c = colleagues?.find(col => col.id === a.assigned_to_colleague_id)
          const late = a.due_date ? isOverdue(a.due_date) && a.status !== 'completed' : false
          const st = ACTION_STATUS[a.status]
          return (
            <div key={a.id} className="flex items-center gap-3 p-3">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                a.status === 'completed' ? 'bg-teal-400' :
                late ? 'bg-red-400' : 'bg-amber-400'
              }`} />
              <div className="flex-1 min-w-0">
                <p className={`text-xs ${a.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{a.description}</p>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                  {c && <span>{c.name}</span>}
                  {a.due_date && <span className={late ? 'text-red-400' : ''}>{fDate(a.due_date)}</span>}
                </div>
              </div>
              <Badge variant={st?.color as any ?? 'gray'}>{st?.label ?? a.status}</Badge>
            </div>
          )
        })}
      </div>
    </div>
  )
}
