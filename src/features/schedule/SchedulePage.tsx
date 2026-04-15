import { useState, useMemo } from 'react'
import { Card, Spinner, PageHeader, Button, Avatar } from '../../components/ui'
import { Plus, ChevronLeft, ChevronRight, Users, Briefcase, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react'
import { format, addDays, subDays, startOfWeek, differenceInCalendarDays, parseISO, max, min, isBefore, isAfter, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useTeams, useMissions, useScheduleMutations, Team, Mission } from './useSchedule'
import { useColleagues } from '../colleagues/useColleagues'
import { toast } from 'sonner'
import * as Dialog from '@radix-ui/react-dialog'

export function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const daysInView = 14
  
  const periodEnd = addDays(currentDate, daysInView - 1)
  
  const { data: teams, isLoading: isLoadingTeams } = useTeams()
  const { data: missions, isLoading: isLoadingMissions } = useMissions(
    format(currentDate, 'yyyy-MM-dd'),
    format(periodEnd, 'yyyy-MM-dd')
  )
  
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false)

  // Generate days array for the header
  const days = useMemo(() => {
    return Array.from({ length: daysInView }).map((_, i) => addDays(currentDate, i))
  }, [currentDate])

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-app)] overflow-hidden">
      <PageHeader 
        title="Planning des Interventions" 
        subtitle="Vue macro des missions et gestion des équipes"
        actions={
          <>
            <Button variant="default" onClick={() => setIsTeamModalOpen(true)}>
              <Users className="w-4 h-4 mr-2" /> Créer une équipe
            </Button>
            <Button variant="primary" onClick={() => setIsMissionModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Assigner une mission
            </Button>
          </>
        }
      />

      <div className="flex-1 flex flex-col p-6 min-h-0">
        
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 bg-[var(--color-bg-card)] p-2 rounded-xl backdrop-blur-sm border border-[var(--color-border)] shadow-sm">
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentDate(subDays(currentDate, 7))} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-input)] rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => setCurrentDate(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-input)] rounded-lg transition-colors">
              Aujourd'hui
            </button>
            <button onClick={() => setCurrentDate(addDays(currentDate, 7))} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-input)] rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <div className="text-sm font-medium text-[var(--color-text-main)] capitalize px-4">
            {format(currentDate, "MMMM yyyy", { locale: fr })}
          </div>
        </div>

        {/* Timeline Gantt */}
        <Card className="flex-1 flex flex-col overflow-hidden border-[var(--color-border)] shadow-md">
          {(isLoadingTeams || isLoadingMissions) && (
            <div className="absolute inset-0 bg-[var(--color-overlay)] backdrop-blur-sm z-50 flex items-center justify-center">
              <Spinner />
            </div>
          )}

          {/* Timeline Header */}
          <div className="flex border-b border-[var(--color-border)] bg-[var(--color-bg-input)]">
            <div className="w-64 flex-shrink-0 p-4 border-r border-[var(--color-border)] flex items-center font-medium text-xs text-[var(--color-text-faded)] uppercase tracking-wider">
              Équipes
            </div>
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${daysInView}, minmax(40px, 1fr))` }}>
              {days.map((day, i) => {
                const isToday = isSameDay(day, new Date())
                const isWeekend = day.getDay() === 0 || day.getDay() === 6
                return (
                  <div key={i} className={`flex flex-col items-center justify-center p-2 border-r border-[var(--color-border)] ${isWeekend ? 'bg-[var(--color-bg-card)] opacity-50' : ''}`}>
                    <span className="text-[10px] text-[var(--color-text-faded)] uppercase">{format(day, 'EEE', { locale: fr })}</span>
                    <span className={`text-sm font-medium mt-1 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-teal-500/20 text-[var(--color-brand)] ring-1 ring-[var(--color-brand)]' : 'text-[var(--color-text-main)]'}`}>
                      {format(day, 'd')}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Timeline Body */}
          <div className="flex-1 overflow-y-auto bg-[var(--color-bg-card)]">
            {teams?.map(team => {
              // Get missions for this team
              const teamMissions = missions?.filter(m => m.team_id === team.id) || []
              
              return (
                <div key={team.id} className="flex border-b border-[var(--color-border)] group hover:bg-[var(--color-bg-input)] transition-colors relative">
                  
                  {/* Left Col: Team Info */}
                  <div className="w-64 flex-shrink-0 p-4 border-r border-[var(--color-border)] bg-[var(--color-bg-card)] z-10 transition-colors group-hover:bg-[var(--color-bg-input)]">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--color-text-main)] truncate">{team.name}</p>
                        <div className="flex items-center gap-1 mt-1.5 overflow-hidden">
                          {team.team_members?.map((tm, idx) => (
                            <div key={tm.id} className="relative" style={{ zIndex: 10 - idx, marginLeft: idx > 0 ? '-8px' : '0' }}>
                              <Avatar name={tm.colleagues?.name || '?'} size="sm" />
                            </div>
                          ))}
                          <span className="text-[10px] text-[var(--color-text-faded)] ml-2">{team.team_members?.length || 0} mbrs</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Col: The Grid */}
                  <div className="flex-1 grid relative py-2" style={{ gridTemplateColumns: `repeat(${daysInView}, minmax(40px, 1fr))` }}>
                    {/* Background grid lines */}
                    {days.map((day, i) => {
                       const isWeekend = day.getDay() === 0 || day.getDay() === 6
                       return <div key={i} className={`h-full border-r border-[var(--color-border)] ${isWeekend ? 'bg-[var(--color-bg-app)] opacity-30' : ''}`} style={{ gridColumnStart: i + 1 }} />
                    })}

                    {/* Mission Blocks */}
                    {teamMissions.map(mission => {
                      const mStart = parseISO(mission.start_date)
                      const mEnd = parseISO(mission.end_date)
                      
                      if (isAfter(mStart, periodEnd) || isBefore(mEnd, currentDate)) return null

                      const startCol = Math.max(1, differenceInCalendarDays(mStart, currentDate) + 1)
                      const endCol = Math.min(daysInView + 1, differenceInCalendarDays(mEnd, currentDate) + 2) 
                      
                      const bgStyle = mission.color ? `${mission.color}33` : 'var(--color-bg-input)'
                      
                      return (
                        <div 
                          key={mission.id}
                          className="h-10 my-auto rounded-md mx-1 border flex items-center px-3 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all"
                          style={{ 
                            gridColumnStart: startCol, 
                            gridColumnEnd: endCol,
                            backgroundColor: bgStyle,
                            borderColor: `${mission.color}66`,
                            zIndex: 20
                          }}
                          title={`${mission.title} (${mission.status})`}
                        >
                          <Briefcase className="w-3.5 h-3.5 mr-2 opacity-80" style={{ color: mission.color }} />
                          <span className="text-xs font-semibold truncate" style={{ color: mission.color }}>{mission.title}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            
            {(teams?.length === 0) && (
              <div className="p-16 flex flex-col items-center justify-center text-[var(--color-text-faded)] text-sm">
                <Users className="w-8 h-8 mb-3 opacity-50" />
                <p>Aucune équipe créée. Commencez par créer une équipe en haut à droite !</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <NewTeamModal isOpen={isTeamModalOpen} onClose={() => setIsTeamModalOpen(false)} />
      <NewMissionModal isOpen={isMissionModalOpen} onClose={() => setIsMissionModalOpen(false)} teams={teams || []} />
    </div>
  )
}

function NewTeamModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [leaderId, setLeaderId] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  
  const { data: colleagues } = useColleagues()
  const { createTeam } = useScheduleMutations()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return toast.error('Le nom est requis')
    
    createTeam.mutate({ name, color, leader_id: leaderId || undefined, member_ids: selectedMembers }, {
      onSuccess: () => {
        toast.success('Équipe créée avec succès')
        onClose()
        setName(''); setSelectedMembers([]); setLeaderId('')
      },
      onError: (err: any) => toast.error(err.message)
    })
  }

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm z-50 transition-opacity" />
        <Dialog.Content aria-describedby={undefined} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl p-6 z-50 focus:outline-none">
          <Dialog.Title className="text-xl font-semibold text-[var(--color-text-main)] mb-6">Créer une équipe</Dialog.Title>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium mb-2">Nom de l'équipe</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-faded)] focus:outline-none focus:border-[var(--color-brand)]" placeholder="Ex: Équipe Alpha" autoFocus />
            </div>
            
            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium mb-2">Couleur d'identification</label>
              <div className="flex gap-2">
                {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(c => (
                  <button type="button" key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full flex-shrink-0 ${color === c ? 'ring-2 ring-[var(--color-text-main)] ring-offset-2 ring-offset-[var(--color-bg-card)]' : 'opacity-60 hover:opacity-100 transition-opacity'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium mb-2">Chef d'équipe</label>
              <select value={leaderId} onChange={e => setLeaderId(e.target.value)} className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-brand)]">
                <option value="">— Sélectionner le chef —</option>
                {colleagues?.map(c => <option key={c.id} value={c.id}>{c.name} ({c.post})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium mb-2">Membres ({selectedMembers.length})</label>
              <div className="bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg max-h-48 overflow-y-auto p-2">
                {colleagues?.map(c => (
                  <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-[var(--color-bg-card)] rounded-md cursor-pointer transition-colors">
                    <input type="checkbox" checked={selectedMembers.includes(c.id)} onChange={() => toggleMember(c.id)} className="w-4 h-4 rounded border-[var(--color-border)] bg-transparent focus:ring-[var(--color-brand)] focus:ring-offset-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text-main)] truncate">{c.name}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)] truncate">{c.post}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-[var(--color-border)] mt-6">
              <Button type="button" variant="default" onClick={onClose} className="flex-1 justify-center">Annuler</Button>
              <Button type="submit" variant="primary" className="flex-1 justify-center" disabled={createTeam.isPending}>
                {createTeam.isPending ? <Spinner className="w-4 h-4 text-white" /> : 'Créer'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function NewMissionModal({ isOpen, onClose, teams }: { isOpen: boolean, onClose: () => void, teams: Team[] }) {
  const [title, setTitle] = useState('')
  const [teamId, setTeamId] = useState('')
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 2), 'yyyy-MM-dd'))
  
  const { createMission } = useScheduleMutations()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !teamId) return toast.error('Titre et équipe requis')
    if (isBefore(parseISO(endDate), parseISO(startDate))) return toast.error('Date de fin invalide')

    const selectedTeam = teams.find(t => t.id === teamId)
    
    createMission.mutate({ 
      title, 
      team_id: teamId, 
      start_date: startDate, 
      end_date: endDate, 
      status: 'planned',
      color: selectedTeam?.color || '#10b981'
    }, {
      onSuccess: () => {
        toast.success('Mission assignée avec succès')
        onClose()
        setTitle('')
      },
      onError: (err: any) => toast.error(err.message)
    })
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm z-50 transition-opacity" />
        <Dialog.Content aria-describedby={undefined} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl p-6 z-50 focus:outline-none">
          <Dialog.Title className="text-xl font-semibold text-[var(--color-text-main)] mb-6">Assigner une mission</Dialog.Title>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium mb-2">Titre de la prestation</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-faded)] focus:outline-none focus:border-[var(--color-brand)]" placeholder="Ex: Nettoyage Chantier X" autoFocus />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium mb-2">Assigner à l'équipe</label>
              <select value={teamId} onChange={e => setTeamId(e.target.value)} className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-brand)]">
                <option value="">— Sélectionner une équipe —</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium mb-2">Du</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-brand)]" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium mb-2">Au</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-brand)]" />
              </div>
            </div>

            {teams.find(t => t.id === teamId) && (
              <div className="bg-[var(--color-bg-input)] p-3 rounded-lg border border-[var(--color-border)] flex items-start gap-3 mt-4">
                <AlertTriangle className="w-4 h-4 text-[var(--color-brand)] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[var(--color-text-muted)]">
                  L'équipe <strong>{teams.find(t => t.id === teamId)?.name}</strong> sera mobilisée sur toute cette période.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-[var(--color-border)] mt-6">
              <Button type="button" variant="default" onClick={onClose} className="flex-1 justify-center">Annuler</Button>
              <Button type="submit" variant="primary" className="flex-1 justify-center" disabled={createMission.isPending}>
                {createMission.isPending ? <Spinner className="w-4 h-4 text-white" /> : 'Assigner'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
