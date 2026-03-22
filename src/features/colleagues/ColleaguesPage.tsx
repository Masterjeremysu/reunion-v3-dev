import { useState } from 'react'
import { useColleagues, useCreateColleague, useDeleteColleague } from './useColleagues'
import { useActions } from '../actions/useActions'
import { useMeetings } from '../meetings/useMeetings'
import { Card, Badge, Spinner, Avatar, PageHeader, Button, EmptyState, Input } from '../../components/ui'
import { ACTION_STATUS } from '../../constants'
import { Users, Plus, Trash2, CheckSquare, CalendarDays } from 'lucide-react'
import { getInitials } from '../../utils'

export function ColleaguesPage() {
  const { data: colleagues, isLoading } = useColleagues()
  const { data: actions } = useActions()
  const { data: meetings } = useMeetings()
  const createColleague = useCreateColleague()
  const deleteColleague = useDeleteColleague()

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [post, setPost] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !post.trim()) return
    await createColleague.mutateAsync({ name: name.trim(), post: post.trim() })
    setName(''); setPost(''); setShowForm(false)
  }

  const selectedColleague = colleagues?.find(c => c.id === selected)
  const colleagueActions = actions?.filter(a => a.assigned_to_colleague_id === selected) ?? []
  const colleagueMeetings = meetings?.filter(m => m.colleagues_ids?.includes(selected ?? '')) ?? []

  return (
    <div className="flex flex-col min-h-full bg-[#0f1117]">
      <PageHeader
        title="Collègues"
        subtitle={`${colleagues?.length ?? 0} membre(s) d'équipe`}
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </Button>
        }
      />

      <div className="flex flex-1 min-h-0">
        {/* Grid panel */}
        <div className="flex-1 p-6 overflow-y-auto">
          {showForm && (
            <Card className="p-4 mb-4">
              <form onSubmit={handleCreate} className="flex gap-3">
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nom complet" required className="flex-1" />
                <Input value={post} onChange={e => setPost(e.target.value)} placeholder="Poste / Fonction" required className="flex-1" />
                <Button variant="primary" type="submit" size="sm">Créer</Button>
                <Button variant="ghost" type="button" size="sm" onClick={() => setShowForm(false)}>Annuler</Button>
              </form>
            </Card>
          )}

          {isLoading && <div className="flex justify-center py-12"><Spinner /></div>}
          {!isLoading && (colleagues?.length ?? 0) === 0 && (
            <EmptyState icon={Users} title="Aucun collègue" description="Ajoutez les membres de votre équipe" />
          )}

          <div className="grid grid-cols-3 gap-4">
            {colleagues?.map(c => {
              const cActions = actions?.filter(a => a.assigned_to_colleague_id === c.id) ?? []
              const openActions = cActions.filter(a => a.status !== 'completed' && a.status !== 'cancelled').length
              const cMeetings = meetings?.filter(m => m.colleagues_ids?.includes(c.id)).length ?? 0
              const isSelected = selected === c.id

              return (
                <Card
                  key={c.id}
                  onClick={() => setSelected(isSelected ? null : c.id)}
                  className={`p-4 cursor-pointer transition-all ${isSelected ? 'border-teal-500/50 bg-[#1a2535]' : ''}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <Avatar name={c.name} size="lg" />
                    <button
                      onClick={e => { e.stopPropagation(); deleteColleague.mutate(c.id) }}
                      className="p-1 text-slate-600 hover:text-red-400 transition-colors rounded opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-sm font-medium text-white">{c.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{c.post}</p>
                  <div className="flex gap-3 mt-3 pt-3 border-t border-white/[0.07]">
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <CheckSquare className="w-3 h-3" />
                      {openActions} action{openActions !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <CalendarDays className="w-3 h-3" />
                      {cMeetings} réunion{cMeetings !== 1 ? 's' : ''}
                    </span>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Side detail */}
        {selectedColleague && (
          <div className="w-[300px] flex-shrink-0 border-l border-white/[0.07] p-5 overflow-y-auto">
            <div className="flex flex-col items-center gap-2 mb-5 text-center">
              <Avatar name={selectedColleague.name} size="lg" />
              <p className="text-sm font-medium text-white">{selectedColleague.name}</p>
              <p className="text-xs text-slate-400">{selectedColleague.post}</p>
            </div>

            {colleagueActions.length > 0 && (
              <div className="mb-5">
                <p className="text-[10px] font-medium tracking-widest text-slate-500 uppercase mb-2">Actions assignées</p>
                <div className="flex flex-col gap-1.5">
                  {colleagueActions.map(a => {
                    const st = ACTION_STATUS[a.status]
                    return (
                      <div key={a.id} className="flex items-center gap-2 py-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          a.status === 'completed' ? 'bg-teal-400' : 'bg-amber-400'
                        }`} />
                        <p className="text-xs text-slate-300 flex-1 truncate">{a.description}</p>
                        <Badge variant={st?.color as any ?? 'gray'}>{st?.label}</Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {colleagueMeetings.length > 0 && (
              <div>
                <p className="text-[10px] font-medium tracking-widest text-slate-500 uppercase mb-2">Réunions participées</p>
                <div className="flex flex-col gap-1">
                  {colleagueMeetings.slice(0, 6).map(m => (
                    <p key={m.id} className="text-xs text-slate-400 py-1.5 border-b border-white/[0.05]">{m.title}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
