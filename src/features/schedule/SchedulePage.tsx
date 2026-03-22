import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { QK } from '../../constants'
import { useColleagues } from '../colleagues/useColleagues'
import { Card, Spinner, PageHeader, Button, EmptyState, Avatar } from '../../components/ui'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useState } from 'react'
import { toast } from 'sonner'

function useSchedules() {
  return useQuery({
    queryKey: QK.SCHEDULE,
    queryFn: async () => {
      const { data, error } = await supabase.from('weekly_schedules').select('*, colleagues(id, name, post)').order('week_start_date', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function SchedulePage() {
  const { data: schedules, isLoading } = useSchedules()
  const { data: colleagues } = useColleagues()
  const qc = useQueryClient()
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedColleague, setSelectedColleague] = useState('')
  const [notes, setNotes] = useState('')

  const weekStart = format(currentWeek, 'yyyy-MM-dd')
  const existingSchedule = schedules?.find(s => s.week_start_date === weekStart)

  const upsert = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const payload = {
        week_start_date: weekStart,
        in_charge_colleague_id: selectedColleague || null,
        notes: notes || null,
        user_id: user?.id ?? null,
      }
      if (existingSchedule) {
        const { error } = await supabase.from('weekly_schedules').update(payload).eq('id', existingSchedule.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('weekly_schedules').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.SCHEDULE }); toast.success('Planning mis à jour') },
    onError: (e: any) => toast.error(e.message),
  })

  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })

  return (
    <div className="flex flex-col min-h-full bg-[#0f1117]">
      <PageHeader title="Planning hebdomadaire" subtitle="Responsable de semaine et organisation" />

      <div className="p-6 flex flex-col gap-5 max-w-2xl">
        {/* Week navigation */}
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 text-center">
            <p className="text-sm font-medium text-white capitalize">
              {format(currentWeek, "'Semaine du' d MMMM", { locale: fr })} — {format(weekEnd, "d MMMM yyyy", { locale: fr })}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{format(currentWeek, "'S'ww · 'Semaine' ww", { locale: fr })}</p>
          </div>
          <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Current week form */}
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-400 mb-4">Responsable de la semaine</p>
          <select
            value={selectedColleague || existingSchedule?.in_charge_colleague_id || ''}
            onChange={e => setSelectedColleague(e.target.value)}
            className="w-full bg-[#1e2333] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500 mb-3"
          >
            <option value="">— Non défini —</option>
            {colleagues?.map(c => <option key={c.id} value={c.id}>{c.name} · {c.post}</option>)}
          </select>
          <textarea
            value={notes || existingSchedule?.notes || ''}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notes pour cette semaine..."
            rows={3}
            className="w-full bg-[#1e2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-teal-500 resize-none mb-3"
          />
          <Button variant="primary" onClick={() => upsert.mutate()} className="w-full justify-center">
            {existingSchedule ? 'Mettre à jour' : 'Enregistrer'}
          </Button>
        </Card>

        {/* History */}
        {isLoading && <Spinner />}
        {(schedules?.length ?? 0) > 0 && (
          <div>
            <p className="text-[10px] font-medium tracking-widest text-slate-500 uppercase mb-3">Historique</p>
            <Card>
              <div className="divide-y divide-white/[0.05]">
                {schedules?.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-3 p-3.5">
                    <div className="w-10 h-10 bg-[#1e2333] rounded-lg flex flex-col items-center justify-center flex-shrink-0 border border-white/[0.07]">
                      <span className="text-[10px] text-slate-400 uppercase">{format(new Date(s.week_start_date), 'S', { locale: fr })}{format(new Date(s.week_start_date), 'ww')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 capitalize">{format(new Date(s.week_start_date), "d MMMM yyyy", { locale: fr })}</p>
                      {s.notes && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{s.notes}</p>}
                    </div>
                    {s.colleagues && (
                      <div className="flex items-center gap-2">
                        <Avatar name={s.colleagues.name} size="sm" />
                        <span className="text-xs text-slate-400">{s.colleagues.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
