import { useState } from 'react'
import { useActions, useUpdateAction, useDeleteAction, useCreateAction } from './useActions'
import { useColleagues } from '../colleagues/useColleagues'
import { useMeetings } from '../meetings/useMeetings'
import { Card, Badge, Spinner, Avatar, PageHeader, Button, EmptyState, Input } from '../../components/ui'
import { fDate, isOverdue } from '../../utils'
import { ACTION_STATUS } from '../../constants'
import { CheckSquare, Plus, Search, Trash2, Check, Clock, Filter } from 'lucide-react'
import { toast } from 'sonner'

type Filter = 'all' | 'pending' | 'in_progress' | 'completed' | 'late'

export function ActionsPage() {
  const { data: actions, isLoading } = useActions()
  const { data: colleagues } = useColleagues()
  const { data: meetings } = useMeetings()
  const updateAction = useUpdateAction()
  const deleteAction = useDeleteAction()
  const createAction = useCreateAction()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [showForm, setShowForm] = useState(false)
  const [newDesc, setNewDesc] = useState('')
  const [newColleague, setNewColleague] = useState('')
  const [newDue, setNewDue] = useState('')
  const [newMeeting, setNewMeeting] = useState('')

  const filtered = (actions ?? []).filter(a => {
    const matchSearch = a.description.toLowerCase().includes(search.toLowerCase())
    const late = a.due_date ? isOverdue(a.due_date) && a.status !== 'completed' : false
    if (filter === 'late') return matchSearch && late
    if (filter === 'all') return matchSearch
    return matchSearch && a.status === filter
  })

  const counts = {
    all: actions?.length ?? 0,
    pending: actions?.filter(a => a.status === 'pending').length ?? 0,
    in_progress: actions?.filter(a => a.status === 'in_progress').length ?? 0,
    completed: actions?.filter(a => a.status === 'completed').length ?? 0,
    late: actions?.filter(a => a.due_date ? isOverdue(a.due_date) && a.status !== 'completed' : false).length ?? 0,
  }

  const toggleStatus = (id: string, current: string) => {
    const next = current === 'completed' ? 'in_progress' : 'completed'
    updateAction.mutate({ id, status: next as any })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDesc.trim()) return
    await createAction.mutateAsync({
      description: newDesc.trim(),
      assigned_to_colleague_id: newColleague || null,
      due_date: newDue || null,
      meeting_id: newMeeting || null,
      status: 'pending',
    })
    setNewDesc(''); setNewColleague(''); setNewDue(''); setNewMeeting(''); setShowForm(false)
  }

  return (
    <div className="flex flex-col min-h-full bg-[#0f1117]">
      <PageHeader
        title="Points d'action"
        subtitle={`${counts.pending + counts.in_progress} ouvert(s) · ${counts.late} en retard`}
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-3.5 h-3.5" /> Nouvelle action
          </Button>
        }
      />

      <div className="p-6 flex flex-col gap-4">
        {/* Create form */}
        {showForm && (
          <Card className="p-4">
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <p className="text-xs font-medium text-slate-300 mb-1">Nouvelle action</p>
              <Input
                value={newDesc} onChange={e => setNewDesc(e.target.value)}
                placeholder="Description de l'action..." required autoFocus
              />
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={newColleague} onChange={e => setNewColleague(e.target.value)}
                  className="bg-[#1e2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-teal-500 transition-colors"
                >
                  <option value="">Assigner à...</option>
                  {colleagues?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input
                  type="date" value={newDue} onChange={e => setNewDue(e.target.value)}
                  className="bg-[#1e2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-teal-500 transition-colors"
                />
                <select
                  value={newMeeting} onChange={e => setNewMeeting(e.target.value)}
                  className="bg-[#1e2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-teal-500 transition-colors"
                >
                  <option value="">Lier à une réunion...</option>
                  {meetings?.slice(0, 10).map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowForm(false)}>Annuler</Button>
                <Button variant="primary" size="sm" type="submit">Créer</Button>
              </div>
            </form>
          </Card>
        )}

        {/* Filters + search */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#1e2333] border border-white/[0.07] rounded-lg px-3 h-9 flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une action..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none"
            />
          </div>
          <div className="flex gap-1">
            {([
              { key: 'all',         label: 'Toutes',      count: counts.all },
              { key: 'pending',     label: 'En attente',  count: counts.pending },
              { key: 'in_progress', label: 'En cours',    count: counts.in_progress },
              { key: 'completed',   label: 'Terminées',   count: counts.completed },
              { key: 'late',        label: 'En retard',   count: counts.late },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  filter === f.key
                    ? f.key === 'late' ? 'bg-red-500/20 text-red-400' : 'bg-teal-500/20 text-teal-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {f.label}
                <span className="bg-white/10 px-1.5 py-0.5 rounded-full text-[10px]">{f.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {isLoading && <div className="flex justify-center py-12"><Spinner /></div>}
        {!isLoading && filtered.length === 0 && (
          <EmptyState icon={CheckSquare} title="Aucune action" description="Créez votre première action" />
        )}

        {!isLoading && filtered.length > 0 && (
          <Card>
            <div className="divide-y divide-white/[0.05]">
              {filtered.map(a => {
                const c = colleagues?.find(col => col.id === a.assigned_to_colleague_id)
                const m = meetings?.find(mt => mt.id === a.meeting_id)
                const late = a.due_date ? isOverdue(a.due_date) && a.status !== 'completed' : false
                const done = a.status === 'completed'
                const st = ACTION_STATUS[a.status]

                return (
                  <div key={a.id} className="flex items-center gap-3 p-3 hover:bg-white/[0.02] transition-colors group">
                    {/* Toggle check */}
                    <button
                      onClick={() => toggleStatus(a.id, a.status)}
                      className={`w-5 h-5 rounded flex items-center justify-center border flex-shrink-0 transition-colors ${
                        done
                          ? 'bg-teal-500 border-teal-500 text-white'
                          : 'border-white/20 hover:border-teal-500'
                      }`}
                    >
                      {done && <Check className="w-3 h-3" />}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${done ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                        {a.description}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 flex-wrap">
                        {c && (
                          <span className="flex items-center gap-1">
                            <Avatar name={c.name} size="sm" />
                            {c.name}
                          </span>
                        )}
                        {a.due_date && (
                          <span className={`flex items-center gap-1 ${late ? 'text-red-400' : ''}`}>
                            <Clock className="w-3 h-3" />
                            {fDate(a.due_date)}
                            {late && ' · En retard'}
                          </span>
                        )}
                        {m && (
                          <span className="flex items-center gap-1 text-slate-600">
                            <CheckSquare className="w-3 h-3" />
                            {m.title}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status badge + change */}
                    <select
                      value={a.status}
                      onChange={e => updateAction.mutate({ id: a.id, status: e.target.value as any })}
                      className="bg-transparent border-none text-xs outline-none cursor-pointer text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      <option value="pending">En attente</option>
                      <option value="in_progress">En cours</option>
                      <option value="completed">Terminée</option>
                      <option value="cancelled">Annulée</option>
                    </select>

                    <button
                      onClick={() => deleteAction.mutate(a.id)}
                      className="p-1.5 text-slate-600 hover:text-red-400 transition-colors rounded opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
