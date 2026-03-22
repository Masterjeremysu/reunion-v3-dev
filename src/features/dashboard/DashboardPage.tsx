import { useDashboardStats } from './useDashboardStats'
import { useMeetings } from '../meetings/useMeetings'
import { useActions } from '../actions/useActions'
import { useAllInspections } from '../vehicles/useVehicles'
import { Card, Badge, Spinner, Avatar, PageHeader, Button } from '../../components/ui'
import { fDate, isOverdue, isDueSoon } from '../../utils'
import { INSPECTION_STATUS, ACTION_STATUS } from '../../constants'
import {
  CalendarDays, CheckSquare, TrendingUp, Car,
  ArrowUpRight, ArrowDownRight, AlertTriangle, Plus,
  ShoppingCart, Activity
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../constants'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subWeeks, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: meetings } = useMeetings()
  const { data: actions } = useActions()
  const { data: inspections } = useAllInspections()

  const recentMeetings = meetings?.slice(0, 4) ?? []
  const urgentActions = actions?.filter(a => a.status !== 'completed' && a.status !== 'cancelled').slice(0, 5) ?? []
  const criticalInspections = inspections?.filter(i => i.status === 'overdue' || isDueSoon(i.due_date, 45)).slice(0, 5) ?? []

  // Build 6-week sparkline data
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const weekStart = startOfWeek(subWeeks(new Date(), 5 - i), { weekStartsOn: 1 })
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7)
    const weekMeetings = meetings?.filter(m => {
      const d = new Date(m.date); return d >= weekStart && d < weekEnd
    }).length ?? 0
    return { week: format(weekStart, "'S'ww", { locale: fr }), réunions: weekMeetings }
  })

  const meetingsDelta = stats ? stats.meetingsThisMonth - stats.meetingsLastMonth : 0

  return (
    <div className="flex flex-col min-h-full bg-[#0f1117]">
      <PageHeader
        title="Tableau de bord"
        subtitle={format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
        actions={
          <Button variant="primary" size="sm" onClick={() => navigate(ROUTES.MEETINGS)}>
            <Plus className="w-3.5 h-3.5" /> Nouvelle réunion
          </Button>
        }
      />

      <div className="p-6 flex flex-col gap-6">

        {/* KPI row */}
        {statsLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            <KpiCard
              icon={CalendarDays} color="teal"
              label="Réunions ce mois" value={stats?.meetingsThisMonth ?? 0}
              delta={meetingsDelta > 0 ? `+${meetingsDelta}` : `${meetingsDelta}`}
              deltaUp={meetingsDelta >= 0}
              onClick={() => navigate(ROUTES.MEETINGS)}
            />
            <KpiCard
              icon={CheckSquare} color={stats?.lateActions ? 'red' : 'purple'}
              label="Actions ouvertes" value={stats?.openActions ?? 0}
              delta={stats?.lateActions ? `${stats.lateActions} en retard` : 'À jour'}
              deltaUp={!stats?.lateActions}
              onClick={() => navigate(ROUTES.ACTIONS)}
            />
            <KpiCard
              icon={TrendingUp} color="purple"
              label="Taux complétion" value={`${stats?.completionRate ?? 0}%`}
              delta="Actions terminées"
              deltaUp={true}
              onClick={() => navigate(ROUTES.ACTIONS)}
            />
            <KpiCard
              icon={Car} color={stats?.expiredInspections ? 'red' : 'amber'}
              label="Inspections dues" value={(stats?.upcomingInspections ?? 0) + (stats?.expiredInspections ?? 0)}
              delta={stats?.expiredInspections ? `${stats.expiredInspections} expirée(s)` : '60 prochains jours'}
              deltaUp={!stats?.expiredInspections}
              onClick={() => navigate(ROUTES.VEHICLES)}
            />
          </div>
        )}

        {/* Chart + mood */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="col-span-2 p-4">
            <p className="text-xs font-medium text-slate-400 mb-4">Réunions — 6 dernières semaines</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: -24 }}>
                <defs>
                  <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#1D9E75" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1e2333', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8', fontSize: 12 }}
                  itemStyle={{ color: '#5DCAA5', fontSize: 12 }}
                />
                <Area type="monotone" dataKey="réunions" stroke="#1D9E75" strokeWidth={2} fill="url(#tealGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-4 flex flex-col gap-3">
            <p className="text-xs font-medium text-slate-400">Vue d'ensemble</p>
            <StatRow label="Consommables en attente" value={stats?.pendingConsumables ?? 0} color="amber" onClick={() => navigate(ROUTES.CONSUMABLES)} />
            <StatRow label="Score humeur équipe" value={stats?.avgMoodScore != null ? `${stats.avgMoodScore}/5` : '—'} color="purple" onClick={() => navigate(ROUTES.MOOD)} />
            <StatRow label="Inspections à venir (60j)" value={stats?.upcomingInspections ?? 0} color="blue" onClick={() => navigate(ROUTES.VEHICLES)} />
            <StatRow label="Inspections expirées" value={stats?.expiredInspections ?? 0} color={stats?.expiredInspections ? 'red' : 'teal'} onClick={() => navigate(ROUTES.VEHICLES)} />
          </Card>
        </div>

        {/* Bottom 3 panels */}
        <div className="grid grid-cols-3 gap-4">
          {/* Recent meetings */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-300">Dernières réunions</p>
              <button onClick={() => navigate(ROUTES.MEETINGS)} className="text-[11px] text-teal-400 hover:text-teal-300 transition-colors">Voir tout →</button>
            </div>
            <div className="flex flex-col gap-1">
              {recentMeetings.length === 0 && <p className="text-xs text-slate-500 py-4 text-center">Aucune réunion</p>}
              {recentMeetings.map(m => (
                <button key={m.id} onClick={() => navigate(`/meetings/${m.id}`)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.04] transition-colors text-left w-full">
                  <div className="w-9 h-9 bg-[#1e2333] rounded-lg flex flex-col items-center justify-center flex-shrink-0 border border-white/[0.07]">
                    <span className="text-sm font-medium text-white leading-none">{format(new Date(m.date), 'd')}</span>
                    <span className="text-[9px] text-slate-500 uppercase">{format(new Date(m.date), 'MMM', { locale: fr })}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{m.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{fDate(m.date, 'EEEE', { locale: fr } as any)}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Urgent actions */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-300">Actions urgentes</p>
              <button onClick={() => navigate(ROUTES.ACTIONS)} className="text-[11px] text-teal-400 hover:text-teal-300 transition-colors">Voir tout →</button>
            </div>
            <div className="flex flex-col gap-1">
              {urgentActions.length === 0 && <p className="text-xs text-slate-500 py-4 text-center">Tout est à jour ✓</p>}
              {urgentActions.map(a => {
                const late = a.due_date ? isOverdue(a.due_date) : false
                return (
                  <div key={a.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/[0.04] transition-colors">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${late ? 'bg-red-400' : 'bg-amber-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-200 truncate">{a.description}</p>
                      <p className={`text-[10px] mt-0.5 ${late ? 'text-red-400' : 'text-slate-500'}`}>
                        {a.due_date ? fDate(a.due_date) : 'Sans échéance'}
                        {late && ' · En retard'}
                      </p>
                    </div>
                    <Badge variant={late ? 'red' : 'amber'}>
                      {ACTION_STATUS[a.status]?.label ?? a.status}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Critical inspections */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-300">Inspections critiques</p>
              <button onClick={() => navigate(ROUTES.VEHICLES)} className="text-[11px] text-teal-400 hover:text-teal-300 transition-colors">Parc auto →</button>
            </div>
            <div className="flex flex-col gap-1">
              {criticalInspections.length === 0 && <p className="text-xs text-slate-500 py-4 text-center">Aucune alerte ✓</p>}
              {criticalInspections.map((i: any) => {
                const st = INSPECTION_STATUS[i.status]
                const color = st?.color as any ?? 'gray'
                return (
                  <div key={i.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/[0.04] transition-colors">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${i.status === 'overdue' ? 'bg-red-400' : 'bg-amber-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-200 truncate">{i.vehicles?.name ?? '—'}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{i.inspection_type} · {fDate(i.due_date)}</p>
                    </div>
                    <Badge variant={color}>{st?.label ?? i.status}</Badge>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, color, label, value, delta, deltaUp, onClick }: {
  icon: React.ElementType; color: string; label: string; value: number | string
  delta: string; deltaUp: boolean; onClick: () => void
}) {
  const colorMap: Record<string, string> = {
    teal: 'bg-teal-500/10 text-teal-400', purple: 'bg-purple-500/10 text-purple-400',
    red: 'bg-red-500/10 text-red-400', amber: 'bg-amber-500/10 text-amber-400',
    blue: 'bg-blue-500/10 text-blue-400',
  }
  return (
    <Card className="p-4 cursor-pointer hover:border-white/[0.15] transition-all" onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-slate-400">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorMap[color] ?? colorMap.teal}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-3xl font-medium text-white leading-none mb-2">{value}</p>
      <div className={`flex items-center gap-1 text-[11px] ${deltaUp ? 'text-teal-400' : 'text-red-400'}`}>
        {deltaUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {delta}
      </div>
    </Card>
  )
}

function StatRow({ label, value, color, onClick }: { label: string; value: any; color: string; onClick: () => void }) {
  const textColor: Record<string, string> = {
    teal: 'text-teal-400', amber: 'text-amber-400', red: 'text-red-400',
    blue: 'text-blue-400', purple: 'text-purple-400',
  }
  return (
    <button onClick={onClick}
      className="flex items-center justify-between w-full py-2 border-b border-white/[0.05] last:border-0 hover:opacity-80 transition-opacity">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-sm font-medium ${textColor[color] ?? 'text-slate-300'}`}>{value}</span>
    </button>
  )
}
