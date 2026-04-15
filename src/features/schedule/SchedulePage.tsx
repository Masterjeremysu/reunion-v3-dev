import { useState, useMemo } from 'react'
import { Plus, ChevronLeft, ChevronRight, Users, Briefcase, Clock, CheckCircle, Trash2, Edit2, Calendar, CalendarDays, Sparkles, AlertTriangle, Wand2, ArrowRight, X } from 'lucide-react'
import { format, addDays, subDays, startOfWeek, startOfMonth, differenceInCalendarDays, parseISO, isBefore, isAfter, isSameDay, max, min, getDaysInMonth, eachDayOfInterval } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useTeams, useMissions, useScheduleMutations, Team, Mission } from './useSchedule'
import { useColleagues } from '../colleagues/useColleagues'
import { toast } from 'sonner'
import * as Dialog from '@radix-ui/react-dialog'
import { Badge, Spinner, PageHeader, Button, Avatar, Card } from '../../components/ui'
import { cn } from '../../utils'

// Pattern CSS for "En Cours"
const STRIPED_BG = `repeating-linear-gradient(45deg, rgba(255,255,255,0.08), rgba(255,255,255,0.08) 10px, transparent 10px, transparent 20px)`

const COLOR_PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e']

export function SchedulePage() {
  const [viewMode, setViewMode] = useState<'2weeks' | 'month'>('2weeks')
  const [currentDate, setCurrentDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const daysInView = viewMode === 'month' ? getDaysInMonth(currentDate) : 14
  
  const periodEnd = addDays(currentDate, daysInView - 1)
  
  const { data: teams, isLoading: isLoadingTeams } = useTeams()
  const { data: missions, isLoading: isLoadingMissions } = useMissions(
    format(currentDate, 'yyyy-MM-dd'),
    format(periodEnd, 'yyyy-MM-dd')
  )
  const { updateMission, deleteTeam } = useScheduleMutations()
  
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [quickAddMission, setQuickAddMission] = useState<{ teamId: string, date: Date } | null>(null)
  const [editingMission, setEditingMission] = useState<Mission | null>(null)
  const [isAssistantOpen, setIsAssistantOpen] = useState(false)

  // -- Smart Logic Hooks --
  const conflicts = useMemo(() => {
    if (!missions || !teams) return []
    const results: { mission: Mission, type: 'overlap' | 'overload', details: string }[] = []
    
    teams.forEach(team => {
      const teamMissions = missions.filter(m => m.team_id === team.id)
      // Detect overlaps (same team, same day)
      teamMissions.forEach((m1, idx) => {
        teamMissions.slice(idx + 1).forEach(m2 => {
          const s1 = parseISO(m1.start_date); const e1 = parseISO(m1.end_date)
          const s2 = parseISO(m2.start_date); const e2 = parseISO(m2.end_date)
          const overlap = (isBefore(s1, e2) || isSameDay(s1, e2)) && (isAfter(e1, s2) || isSameDay(e1, s2))
          if (overlap) {
            results.push({ mission: m1, type: 'overlap', details: `Conflit avec "${m2.title}"` })
          }
        })
      })
    })
    return results
  }, [missions, teams])

  // Generate days array for the header
  const days = useMemo(() => {
    return Array.from({ length: daysInView }).map((_, i) => addDays(currentDate, i))
  }, [currentDate, daysInView])

  const handleDropMission = (e: React.DragEvent, targetTeamId: string, targetDate: Date) => {
    e.preventDefault()
    document.querySelectorAll('.drag-over-cell').forEach(el => el.classList.remove('drag-over-cell'))

    const missionId = e.dataTransfer.getData('mission_id')
    if (!missionId) return

    const m = missions?.find(x => x.id === missionId)
    if (!m) return

    const dur = differenceInCalendarDays(parseISO(m.end_date), parseISO(m.start_date))
    const newEndDate = addDays(targetDate, dur)

    updateMission.mutate({
      id: missionId,
      updates: {
        team_id: targetTeamId,
        start_date: format(targetDate, 'yyyy-MM-dd'),
        end_date: format(newEndDate, 'yyyy-MM-dd')
      }
    }, {
      onSuccess: () => toast.success('Mission replanifiée avec succès !')
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    const cell = e.currentTarget as HTMLElement
    cell.classList.add('drag-over-cell')
  }
  const handleDragLeave = (e: React.DragEvent) => {
    const cell = e.currentTarget as HTMLElement
    cell.classList.remove('drag-over-cell')
  }

  const handleViewChange = (mode: '2weeks' | 'month') => {
    if (mode === 'month') {
      setCurrentDate(startOfMonth(currentDate))
    } else {
      setCurrentDate(startOfWeek(new Date(), { weekStartsOn: 1 }))
    }
    setViewMode(mode)
  }

  const navigatePeriod = (dir: -1 | 1) => {
    if (viewMode === 'month') {
      const d = new Date(currentDate)
      d.setMonth(d.getMonth() + dir)
      setCurrentDate(startOfMonth(d))
    } else {
      setCurrentDate(dir === -1 ? subDays(currentDate, 7) : addDays(currentDate, 7))
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-app)] overflow-hidden">
      
      <style>{`
        .drag-over-cell { background-color: rgba(255,255,255,0.08) !important; outline: 1px dashed var(--color-brand); z-index: 10; }
        .mission-planned { border-style: dashed !important; opacity: 0.9; }
        .mission-in_progress { background-image: ${STRIPED_BG} !important; border-style: solid !important; animation: moveBg 5s linear infinite; }
        .mission-completed { border-style: solid !important; opacity: 0.85; filter: grayscale(40%); }
        @keyframes moveBg { 0% { background-position: 0 0; } 100% { background-position: 28px 0; } }
      `}</style>

      <PageHeader 
        title="Planning des Interventions" 
        subtitle="Vue macro interactive — Glisser-Déposer, Double-clic pour éditer"
        actions={
          <>
            <Button 
              variant="default" 
              className={cn("border-amber-500/30 text-amber-400 hover:bg-amber-500/10", conflicts.length > 0 && "animate-pulse")}
              onClick={() => setIsAssistantOpen(true)}
            >
              <Sparkles className="w-4 h-4 mr-2" /> 
              Assistant {conflicts.length > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 rounded-full">{conflicts.length}</span>}
            </Button>
            <Button variant="default" onClick={() => setIsTeamModalOpen(true)}>
              <Users className="w-4 h-4 mr-2" /> Créer une équipe
            </Button>
            <Button variant="primary" onClick={() => setQuickAddMission({ teamId: '', date: new Date() })}>
              <Plus className="w-4 h-4 mr-2" /> Nouvelle mission
            </Button>
          </>
        }
      />

      <div className="flex-1 flex flex-col p-6 min-h-0">
        <div className="flex items-center justify-between mb-6 bg-[var(--color-bg-card)] p-2 rounded-xl backdrop-blur-sm border border-[var(--color-border)] shadow-sm flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button onClick={() => navigatePeriod(-1)} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-input)] rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => { setCurrentDate(viewMode === 'month' ? startOfMonth(new Date()) : startOfWeek(new Date(), { weekStartsOn: 1 })); }} className="px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-input)] rounded-lg transition-colors">
              Aujourd'hui
            </button>
            <button onClick={() => navigatePeriod(1)} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-input)] rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="text-sm font-medium text-[var(--color-text-main)] capitalize px-4">
            {format(currentDate, "MMMM yyyy", { locale: fr })}
          </div>
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg p-1">
            <button onClick={() => handleViewChange('2weeks')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === '2weeks' ? 'bg-[var(--color-brand)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}>
              <Calendar className="w-3.5 h-3.5" /> 2 semaines
            </button>
            <button onClick={() => handleViewChange('month')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'month' ? 'bg-[var(--color-brand)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}>
              <CalendarDays className="w-3.5 h-3.5" /> Mensuel
            </button>
          </div>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden border-[var(--color-border)] shadow-md relative">
          {(isLoadingTeams || isLoadingMissions) && (
            <div className="absolute inset-0 bg-[var(--color-overlay)] backdrop-blur-sm z-50 flex items-center justify-center">
              <Spinner />
            </div>
          )}
          <div className="overflow-auto flex-1">
            <div style={{ minWidth: viewMode === 'month' ? '1200px' : '900px' }}>
              {/* En-tête Jours */}
              <div className="flex sticky top-0 z-40 bg-[var(--color-bg-card)] border-b border-[var(--color-border)] shadow-sm">
                <div className="w-64 flex-shrink-0 border-r border-[var(--color-border)] p-3 sticky left-0 z-50 bg-[var(--color-bg-card)]">
                  <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Équipes</span>
                </div>
                <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${daysInView}, minmax(${viewMode === 'month' ? '28px' : '40px'}, 1fr))` }}>
                  {days.map((day: any, i: number) => {
                    const isToday = isSameDay(day, new Date())
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6
                    return (
                      <div key={i} className={`text-center py-2 border-r border-[var(--color-border)] ${isToday ? 'bg-[var(--color-brand)]' : isWeekend ? 'bg-[var(--color-bg-app)]' : ''}`}>
                        <div className={`text-[9px] font-medium uppercase tracking-wider ${isToday ? 'text-white/80' : 'text-[var(--color-text-faded)]'}`}>
                          {format(day, viewMode === 'month' ? 'EEEEE' : 'EEE', { locale: fr })}
                        </div>
                        <span className={`text-sm font-bold ${isToday ? 'text-white' : isWeekend ? 'text-[var(--color-text-faded)]' : 'text-[var(--color-text-main)]'}`}>
                          {format(day, 'd')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Corps du calendrier */}
              <div className="flex-1 flex flex-col bg-[var(--color-bg-card)] relative">
                {teams?.map(team => {
                  const teamMissions = missions?.filter(m => m.team_id === team.id) || []
                  
                  let bookedDays = 0;
                  teamMissions.forEach(m => {
                    const start = max([parseISO(m.start_date), currentDate])
                    const end = min([parseISO(m.end_date), periodEnd])
                    if(isBefore(start, end) || isSameDay(start, end)) {
                      bookedDays += differenceInCalendarDays(end, start) + 1
                    }
                  })
                  const workloadPct = Math.min(100, Math.round((bookedDays / daysInView) * 100))
                  const workloadColor = workloadPct > 80 ? '#EF4444' : workloadPct > 40 ? '#F59E0B' : '#10B981'

                  return (
                    <div key={team.id} className="flex border-b border-[var(--color-border)] group hover:bg-[var(--color-bg-input)] transition-colors relative min-h-[70px]">
                      
                      {/* Colonne de Gauche : Infos Équipe */}
                      <div className="w-64 flex-shrink-0 p-4 border-r border-[var(--color-border)] bg-[var(--color-bg-card)] z-30 transition-colors group-hover:bg-[var(--color-bg-input)] flex flex-col justify-center sticky left-0 shadow-[2px_0_10px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-4 ring-[var(--color-bg-input)]" style={{ backgroundColor: team.color }} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold text-[var(--color-text-main)] truncate flex-1">{team.name}</p>
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingTeam(team); }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-text-faded)] hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all"
                                title="Modifier l'équipe"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); if (confirm(`Supprimer l'équipe "${team.name}" et toutes ses missions ?`)) { deleteTeam.mutate(team.id, { onSuccess: () => toast.success('Équipe supprimée') }) } }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-text-faded)] hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                                title="Supprimer l'équipe"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex items-center gap-1 mt-1 overflow-hidden">
                              {team.team_members?.slice(0, 5).map((tm, idx) => (
                                <div key={tm.id} className="relative ring-2 ring-[var(--color-bg-card)] rounded-full group-hover:ring-[var(--color-bg-input)]" style={{ zIndex: 10 - idx, marginLeft: idx > 0 ? '-10px' : '0' }} title={tm.colleagues?.name}>
                                  <Avatar name={tm.colleagues?.name || '?'} size="sm" />
                                </div>
                              ))}
                              {(team.team_members?.length ?? 0) > 5 && (
                                <span className="text-[9px] font-bold text-[var(--color-text-faded)] ml-1">+{(team.team_members?.length ?? 0) - 5}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Workload bar */}
                        <div className="mt-2">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-[9px] text-[var(--color-text-faded)] font-mono uppercase">Charge</span>
                            <span className="text-[10px] font-bold font-mono" style={{ color: workloadColor }}>{workloadPct}%</span>
                          </div>
                          <div className="h-1 bg-[var(--color-bg-input)] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${workloadPct}%`, backgroundColor: workloadColor }} />
                          </div>
                        </div>
                      </div>
                      
                      {/* Grille Interactive Droite */}
                      <div className="flex-1 grid relative p-1 pb-2 gap-y-1.5" style={{ gridTemplateColumns: `repeat(${daysInView}, minmax(${viewMode === 'month' ? '28px' : '40px'}, 1fr))`, gridAutoRows: 'minmax(32px, max-content)' }}>
                        <div className="hidden drag-over-cell"></div>
                        {/* Cellules droppables */}
                        {days.map((day: any, i: number) => {
                          const isWeekend = day.getDay() === 0 || day.getDay() === 6
                          return (
                            <div 
                              key={i} 
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDropMission(e, team.id, day)}
                              onClick={() => setQuickAddMission({ teamId: team.id, date: day })}
                              className={`border-r border-[var(--color-border)] transition-colors cursor-crosshair group/cell ${isWeekend ? 'bg-[var(--color-bg-app)] opacity-30' : 'hover:bg-white/5'}`} 
                              style={{ gridColumnStart: i + 1, gridRow: '1 / -1', zIndex: 1 }} 
                            >
                                <div className="hidden group-hover/cell:flex items-center justify-center h-full w-full opacity-20">
                                  <Plus className="w-5 h-5 text-white" />
                                </div>
                            </div>
                          )
                        })}

                        {/* Blocs Missions (Draggables) */}
                        {teamMissions.map(mission => {
                          const mStart = parseISO(mission.start_date)
                          const mEnd = parseISO(mission.end_date)
                          
                          if (isAfter(mStart, periodEnd) || isBefore(mEnd, currentDate)) return null

                          const startCol = Math.max(1, differenceInCalendarDays(mStart, currentDate) + 1)
                          const endCol = Math.min(daysInView + 1, differenceInCalendarDays(mEnd, currentDate) + 2) 
                          
                          const bgStyle = mission.color ? `${mission.color}15` : 'var(--color-bg-input)'
                          
                          return (
                            <div 
                              key={mission.id}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('mission_id', mission.id)
                                e.currentTarget.style.opacity = '0.5'
                              }}
                              onDragEnd={(e) => e.currentTarget.style.opacity = '1'}
                              onClick={(e) => { e.stopPropagation(); setEditingMission(mission); }}
                              className={`
                                mission-${mission.status}
                                h-9 mt-1 rounded-md mx-1 border-[1.5px] flex items-center px-2 cursor-grab active:cursor-grabbing hover:shadow-lg transition-transform hover:scale-[1.01]
                              `}
                              style={{ gridColumnStart: startCol, gridColumnEnd: endCol, backgroundColor: bgStyle, borderColor: mission.color, zIndex: 20 }}
                            >
                              {mission.status === 'planned' && <Briefcase className="w-3.5 h-3.5 mr-1.5 opacity-60 flex-shrink-0" style={{ color: mission.color }} />}
                              {mission.status === 'in_progress' && <Clock className="w-3.5 h-3.5 mr-1.5 opacity-80 flex-shrink-0 animate-pulse" style={{ color: mission.color }} />}
                              {mission.status === 'completed' && <CheckCircle className="w-3.5 h-3.5 mr-1.5 opacity-100 flex-shrink-0" style={{ color: mission.color }} />}
                              <span className={`font-bold truncate flex-1 tracking-wide ${viewMode === 'month' ? 'text-[9px]' : 'text-[11px]'}`} style={{ color: mission.color }}>{mission.title}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                {(teams?.length === 0) && (
                  <div className="p-20 flex flex-col items-center justify-center text-[var(--color-text-faded)] text-sm w-full">
                    <Users className="w-10 h-10 mb-4 opacity-30" />
                    <p className="font-medium text-slate-400">Aucune équipe n'est configurée.</p>
                    <Button onClick={() => setIsTeamModalOpen(true)} variant="primary" className="mt-4">Créer ma première équipe</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <NewTeamModal isOpen={isTeamModalOpen} onClose={() => setIsTeamModalOpen(false)} />
      
      {editingTeam && (
        <EditTeamModal isOpen={!!editingTeam} onClose={() => setEditingTeam(null)} team={editingTeam} />
      )}
      
      <NewMissionModal 
        isOpen={!!quickAddMission} 
        onClose={() => setQuickAddMission(null)} 
        teams={teams || []} 
        initialTeamId={quickAddMission?.teamId}
        initialStartDate={quickAddMission?.date}
      />

      <EditMissionModal 
        isOpen={!!editingMission} 
        onClose={() => setEditingMission(null)} 
        mission={editingMission}
        teams={teams || []}
        allMissions={missions || []}
      />

      <PlanningAssistant 
        isOpen={isAssistantOpen} 
        onClose={() => setIsAssistantOpen(false)} 
        conflicts={conflicts} 
        teams={teams || []}
        allMissions={missions || []}
      />
    </div>
  )
}

// ─── Planning Assistant ───────────────────────────────────────────────────────
function PlanningAssistant({ isOpen, onClose, conflicts, teams, allMissions }: { 
  isOpen: boolean, onClose: () => void, conflicts: any[], teams: Team[], allMissions: Mission[] 
}) {
  const { updateMission } = useScheduleMutations()

  const findSolution = (mission: Mission) => {
    const mStart = parseISO(mission.start_date); const mEnd = parseISO(mission.end_date)
    return teams.find(t => {
      if (t.id === mission.team_id) return false
      const tMissions = allMissions.filter(m => m.team_id === t.id)
      return !tMissions.some(m => {
        const s = parseISO(m.start_date); const e = parseISO(m.end_date)
        return (isBefore(s, mEnd) || isSameDay(s, mEnd)) && (isAfter(e, mStart) || isSameDay(e, mStart))
      })
    })
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]" />
        <Dialog.Content className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[var(--color-bg-card)] border-l border-[var(--color-border)] shadow-2xl p-6 z-[100] animate-in slide-in-from-right duration-300 flex flex-col focus:outline-none">
          <div className="flex items-center justify-between mb-8">
            <div>
              <Dialog.Title className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" /> Assistant Intelligent
              </Dialog.Title>
              <p className="text-xs text-[var(--color-text-faded)] mt-1 tracking-wide">Optimisation et résolution automatique des conflits</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[var(--color-bg-input)] rounded-full transition-colors"><X className="w-5 h-5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-6">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Conflits détectés ({conflicts.length})</h4>
              </div>
              
              {conflicts.length === 0 ? (
                <div className="p-10 text-center bg-green-500/5 border border-green-500/20 rounded-2xl">
                  <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium text-green-400">Aucun conflit détecté !</p>
                  <p className="text-xs text-green-500/60 mt-1">Votre planning est parfaitement équilibré.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conflicts.map((c, i) => {
                    const solution = findSolution(c.mission)
                    return (
                      <div key={i} className="p-4 bg-[var(--color-bg-sidebar)] border border-red-500/20 rounded-xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                        <h5 className="font-bold text-sm text-[var(--color-text-main)] mb-1">{c.mission.title}</h5>
                        <p className="text-[10px] text-red-400 font-mono mb-3">{c.details}</p>
                        
                        {solution ? (
                          <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-2.5 mt-2 transition-all group-hover:bg-green-500/10">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="text-[9px] uppercase font-bold text-green-500 tracking-wider">Solution suggérée</span>
                                <span className="text-xs font-semibold text-green-400 flex items-center gap-1.5 mt-0.5">
                                  Réassigner à <Badge className="text-[9px] h-4" variant="teal">{solution.name}</Badge>
                                </span>
                              </div>
                              <Button 
                                size="sm" 
                                variant="primary" 
                                className="h-8 rounded-lg bg-green-600 hover:bg-green-500 border-none px-3"
                                onClick={() => {
                                  updateMission.mutate({ id: c.mission.id, updates: { team_id: solution.id, color: solution.color } })
                                  toast.success(`Réassigné à ${solution.name}`)
                                }}
                              >
                                <Wand2 className="w-3.5 h-3.5 mr-1.5" /> Appliquer
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-[var(--color-text-faded)] italic mt-2">Aucune équipe libre trouvée pour ces dates.</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-4">Équilibrage de charge</h4>
              <div className="p-4 bg-[var(--color-bg-input)] rounded-2xl border border-[var(--color-border)]">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                       <Sparkles className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                       <p className="text-xs font-bold">Mode "Zéro Stress"</p>
                       <p className="text-[10px] text-[var(--color-text-faded)]">Optimise la répartition pour éviter le burn-out.</p>
                    </div>
                 </div>
                 <Button className="w-full justify-between" variant="default" disabled>
                   Lancer l'audit de charge <ArrowRight className="w-4 h-4" />
                 </Button>
              </div>
            </section>
          </div>

          <div className="mt-auto pt-6 border-t border-[var(--color-border)]">
            <Button variant="default" className="w-full" onClick={onClose}>Fermer l'assistant</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── New Team Modal ──────────────────────────────────────────────────────────
function NewTeamModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [leaderId, setLeaderId] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const { data: colleagues } = useColleagues() as { data: any[] | undefined }
  const { createTeam } = useScheduleMutations()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return toast.error('Le nom est requis')
    createTeam.mutate({ name, color, leader_id: leaderId || undefined, member_ids: selectedMembers }, {
      onSuccess: () => { toast.success('Équipe créée !'); onClose(); setName(''); setSelectedMembers([]); setLeaderId('') },
      onError: (err: any) => toast.error(err.message)
    })
  }

  const toggleMember = (id: string) => setSelectedMembers((prev: any) => prev.includes(id) ? prev.filter((m: any) => m !== id) : [...prev, id])

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
                {COLOR_PALETTE.map(c => (
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
              <label className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium mb-2">Assigner des membres ({selectedMembers.length})</label>
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

// ─── Edit Team Modal ──────────────────────────────────────────────────────────
function EditTeamModal({ isOpen, onClose, team }: { isOpen: boolean, onClose: () => void, team: Team }) {
  const [name, setName] = useState(team.name)
  const [color, setColor] = useState(team.color)
  const [leaderId, setLeaderId] = useState(team.leader_id || '')
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    team.team_members?.map(tm => tm.colleague_id) || []
  )
  const { data: colleagues } = useColleagues() as { data: any[] | undefined }
  const { updateTeam } = useScheduleMutations()

  // Sync state when team changes
  useMemo(() => {
    setName(team.name)
    setColor(team.color)
    setLeaderId(team.leader_id || '')
    setSelectedMembers(team.team_members?.map(tm => tm.colleague_id) || [])
  }, [team])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return toast.error('Le nom est requis')
    updateTeam.mutate({ id: team.id, name, color, leader_id: leaderId || null, member_ids: selectedMembers }, {
      onSuccess: () => { toast.success('Équipe mise à jour !'); onClose() },
      onError: (err: any) => toast.error(err.message)
    })
  }

  const toggleMember = (id: string) => setSelectedMembers((prev: any) => prev.includes(id) ? prev.filter((m: any) => m !== id) : [...prev, id])

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm z-50 transition-opacity" />
        <Dialog.Content aria-describedby={undefined} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl p-6 z-50 focus:outline-none">
          <Dialog.Title className="text-xl font-semibold text-[var(--color-text-main)] mb-6 flex items-center gap-2">
            <Edit2 className="w-5 h-5 opacity-70" /> Modifier l'équipe
          </Dialog.Title>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium mb-2">Nom de l'équipe</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-brand)]" autoFocus />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium mb-2">Couleur</label>
              <div className="flex gap-2">
                {COLOR_PALETTE.map(c => (
                  <button type="button" key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full flex-shrink-0 ${color === c ? 'ring-2 ring-[var(--color-text-main)] ring-offset-2 ring-offset-[var(--color-bg-card)]' : 'opacity-60 hover:opacity-100 transition-opacity'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium mb-2">Chef d'équipe</label>
              <select value={leaderId} onChange={e => setLeaderId(e.target.value)} className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-brand)]">
                <option value="">— Aucun chef —</option>
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
              <Button type="submit" variant="primary" className="flex-1 justify-center" disabled={updateTeam.isPending}>
                {updateTeam.isPending ? <Spinner className="w-4 h-4 text-white" /> : 'Sauvegarder'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── New Mission Modal ────────────────────────────────────────────────────────
function NewMissionModal({ isOpen, onClose, teams, initialTeamId, initialStartDate }: { isOpen: boolean, onClose: () => void, teams: Team[], initialTeamId?: string, initialStartDate?: Date }) {
  const [title, setTitle] = useState('')
  const [teamId, setTeamId] = useState(initialTeamId || '')
  const [startDate, setStartDate] = useState(format(initialStartDate || new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(addDays(initialStartDate || new Date(), 2), 'yyyy-MM-dd'))
  const [description, setDescription] = useState('')
  
  const { createMission } = useScheduleMutations()

  useMemo(() => {
    if (isOpen) {
      setTeamId(initialTeamId || '')
      setStartDate(format(initialStartDate || new Date(), 'yyyy-MM-dd'))
      setEndDate(format(addDays(initialStartDate || new Date(), 2), 'yyyy-MM-dd'))
      setTitle('')
      setDescription('')
    }
  }, [isOpen, initialTeamId, initialStartDate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !teamId) return toast.error('Titre et équipe requis')
    if (isBefore(parseISO(endDate), parseISO(startDate))) return toast.error('La date de fin doit être après la date de début')

    const selectedTeam = teams.find(t => t.id === teamId)
    
    createMission.mutate({ 
      title, team_id: teamId, start_date: startDate, end_date: endDate, status: 'planned', color: selectedTeam?.color || '#10b981', description: description || undefined
    }, {
      onSuccess: () => { toast.success('Mission assignée !'); onClose() },
      onError: (err: any) => toast.error(err.message)
    })
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm z-50 transition-opacity" />
        <Dialog.Content aria-describedby={undefined} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl p-6 z-50 focus:outline-none">
          <Dialog.Title className="text-xl font-semibold text-[var(--color-text-main)] mb-6">Nouvelle Mission</Dialog.Title>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium mb-2">Titre de la prestation</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-faded)] focus:outline-none focus:border-[var(--color-brand)]" placeholder="Ex: Déploiement Chantier X" autoFocus />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium mb-2">Assigner à l'équipe</label>
              <select value={teamId} onChange={e => setTeamId(e.target.value)} className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-brand)]">
                <option value="">— Choisir l'équipe —</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
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
            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium mb-2">Description (optionnel)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-faded)] focus:outline-none focus:border-[var(--color-brand)] resize-none" placeholder="Détails, adresse, consignes..." />
            </div>
            <div className="flex gap-3 pt-4 border-t border-[var(--color-border)] mt-6">
              <Button type="button" variant="default" onClick={onClose} className="flex-1 justify-center">Annuler</Button>
              <Button type="submit" variant="primary" className="flex-1 justify-center" disabled={createMission.isPending}>
                {createMission.isPending ? <Spinner className="w-4 h-4 text-white" /> : 'Créer la mission'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── Edit Mission Modal (Full edit: title, dates, team, status, description) ──
function EditMissionModal({ isOpen, onClose, mission, teams, allMissions }: { isOpen: boolean, onClose: () => void, mission: Mission | null, teams: Team[], allMissions: Mission[] }) {
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<'planned'|'in_progress'|'completed'>('planned')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [teamId, setTeamId] = useState('')
  const [description, setDescription] = useState('')
  const { updateMission, deleteMission } = useScheduleMutations()

  const suggestedTeam = useMemo(() => {
    if (!mission || !isOpen) return null
    // Filter out current team
    return teams.find(t => {
      if (t.id === teamId) return false
      // Check if team is free
      const tMissions = allMissions.filter(m => m.team_id === t.id && m.id !== mission.id)
      const mS = parseISO(startDate); const mE = parseISO(endDate)
      const overlap = tMissions.some(m => {
        const s = parseISO(m.start_date); const e = parseISO(m.end_date)
        return (isBefore(s, mE) || isSameDay(s, mE)) && (isAfter(e, mS) || isSameDay(e, mS))
      })
      return !overlap
    })
  }, [mission, teamId, startDate, endDate, allMissions, isOpen])

  const handleUpdate = () => {
    if (!mission) return
    if (!title) return toast.error('Le titre est requis')
    if (isBefore(parseISO(endDate), parseISO(startDate))) return toast.error('La date de fin doit être après le début')

    const selectedTeam = teams.find(t => t.id === teamId)

    updateMission.mutate({ id: mission.id, updates: { 
      title, status, start_date: startDate, end_date: endDate, 
      team_id: teamId || null, 
      description: description || null,
      color: selectedTeam?.color || mission.color
    } }, {
      onSuccess: () => { toast.success('Mission mise à jour !'); onClose() }
    })
  }

  const handleDelete = () => {
    if (!mission) return
    if (confirm('Voulez-vous vraiment supprimer cette mission ?')) {
      deleteMission.mutate(mission.id, {
        onSuccess: () => { toast.success('Mission supprimée'); onClose() }
      })
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm z-[60] transition-opacity" />
        <Dialog.Content aria-describedby={undefined} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl p-6 z-[60] focus:outline-none">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-semibold text-[var(--color-text-main)] flex items-center gap-2">
              <Edit2 className="w-5 h-5 opacity-70" /> Éditer la mission
            </Dialog.Title>
            <button onClick={handleDelete} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition-colors" title="Supprimer la mission">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium mb-2">Titre</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-brand)]" />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium mb-2 flex justify-between items-center">
                <span>Équipe assignée</span>
                {suggestedTeam && suggestedTeam.id !== teamId && (
                  <button 
                    type="button" 
                    onClick={() => setTeamId(suggestedTeam.id)}
                    className="text-[10px] text-amber-500 font-bold flex items-center gap-1 hover:text-amber-400 transition-colors animate-bounce"
                  >
                    <Sparkles className="w-3 h-3" /> Suggérer: {suggestedTeam.name}
                  </button>
                )}
              </label>
              <select value={teamId} onChange={e => setTeamId(e.target.value)} className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-brand)]">
                <option value="">— Aucune équipe —</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium mb-2">Début</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-brand)]" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium mb-2">Fin</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-brand)]" />
              </div>
            </div>
            
            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium mb-2">État d'avancement</label>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => setStatus('planned')} className={`p-2 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-all ${status === 'planned' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 shadow-sm' : 'border-[var(--color-border)] text-[var(--color-text-faded)] hover:bg-[var(--color-bg-input)]'}`}>
                  <Briefcase className="w-4 h-4" /> Planifié
                </button>
                <button type="button" onClick={() => setStatus('in_progress')} className={`p-2 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-all ${status === 'in_progress' ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-sm' : 'border-[var(--color-border)] text-[var(--color-text-faded)] hover:bg-[var(--color-bg-input)]'}`}>
                  <Clock className="w-4 h-4" /> En cours
                </button>
                <button type="button" onClick={() => setStatus('completed')} className={`p-2 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-all ${status === 'completed' ? 'bg-green-500/10 border-green-500/50 text-green-400 shadow-sm' : 'border-[var(--color-border)] text-[var(--color-text-faded)] hover:bg-[var(--color-bg-input)]'}`}>
                  <CheckCircle className="w-4 h-4" /> Terminé
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium mb-2">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-faded)] focus:outline-none focus:border-[var(--color-brand)] resize-none" placeholder="Notes, consignes..." />
            </div>

            <div className="flex gap-3 pt-4 border-t border-[var(--color-border)] mt-6">
              <Button variant="default" onClick={onClose} className="flex-1 justify-center">Annuler</Button>
              <Button variant="primary" onClick={handleUpdate} className="flex-1 justify-center">Sauvegarder</Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

