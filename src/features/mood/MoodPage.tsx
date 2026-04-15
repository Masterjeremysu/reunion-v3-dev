import { useState, useMemo } from 'react'
import { useMood, useAddMood } from '../consumables/useConsumables'
import { useColleagues } from '../colleagues/useColleagues'
import { Spinner } from '../../components/ui'
import { fDate, fRelative } from '../../utils'
import {
  Activity, Plus, TrendingUp, TrendingDown,
  Minus, Calendar, Users, MessageSquare,
  Award, AlertTriangle, ChevronDown, X,
  Loader2, BarChart2, Zap, Heart
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell
} from 'recharts'
import {
  format, startOfWeek, subWeeks, endOfWeek,
  differenceInDays, startOfMonth, subMonths, endOfMonth
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

// ─── Constants ────────────────────────────────────────────────────────────────
const SCORES = [
  { score: 1, emoji: '😔', label: 'Très difficile', color: '#E24B4A', desc: 'Situation critique, intervention nécessaire' },
  { score: 2, emoji: '😕', label: 'Difficile',       color: '#EF9F27', desc: 'Tensions perceptibles, à surveiller' },
  { score: 3, emoji: '😐', label: 'Neutre',          color: 'var(--color-text-muted)', desc: 'Ambiance stable, sans signe fort' },
  { score: 4, emoji: '🙂', label: 'Bien',            color: '#378ADD', desc: 'Atmosphère positive et constructive' },
  { score: 5, emoji: '😄', label: 'Excellent',       color: '#1D9E75', desc: 'Énergie collective au top' },
]

function scoreConf(s: number) { return SCORES[Math.round(s) - 1] ?? SCORES[2] }

// ─── Tooltip ──────────────────────────────────────────────────────────────────
const MoodTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const v = payload[0]?.value
  const conf = v ? scoreConf(v) : null
  return (
    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border2)', borderRadius: 10, padding: '10px 14px' }}>
      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 4px', fontFamily: 'monospace' }}>{label}</p>
      {conf && (
        <p style={{ fontSize: 14, fontWeight: 700, color: conf.color, margin: 0, fontFamily: 'monospace' }}>
          {conf.emoji} {v?.toFixed(1)} — {conf.label}
        </p>
      )}
    </div>
  )
}

// ─── Score button ─────────────────────────────────────────────────────────────
function ScoreButton({ s, selected, onClick }: { s: typeof SCORES[0]; selected: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button" onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '16px 8px', borderRadius: 14, border: `2px solid ${selected || hovered ? s.color : 'var(--color-border)'}`,
        background: selected ? `${s.color}12` : hovered ? `${s.color}08` : 'var(--color-border)',
        cursor: 'pointer', transition: 'all 0.18s', position: 'relative',
      }}
    >
      {selected && (
        <div style={{ position: 'absolute', top: -1, left: -1, right: -1, height: 3, background: s.color, borderRadius: '14px 14px 0 0' }} />
      )}
      <span style={{ fontSize: 28, lineHeight: 1, filter: selected ? 'none' : 'grayscale(40%)', transition: 'filter 0.18s' }}>{s.emoji}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: selected ? s.color : 'var(--color-text-muted)', fontFamily: 'monospace', transition: 'color 0.18s' }}>
        {s.label}
      </span>
    </button>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string | number; sub?: string; color: string; icon: typeof Activity
}) {
  return (
    <div style={{ background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Icon style={{ width: 12, height: 12, color }} />
        <span style={{ fontSize: 10, color, fontFamily: 'monospace', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
      </div>
      <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-main)', margin: 0, fontFamily: 'monospace', letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '6px 0 0', fontFamily: 'monospace' }}>{sub}</p>}
    </div>
  )
}

// ─── Trend indicator ──────────────────────────────────────────────────────────
function TrendBadge({ current, previous }: { current: number; previous: number }) {
  const delta = Math.round((current - previous) * 10) / 10
  if (Math.abs(delta) < 0.1) return <span style={{ fontSize: 11, color: 'var(--color-text-faded)', fontFamily: 'monospace' }}>= stable</span>
  const up = delta > 0
  const Icon = up ? TrendingUp : TrendingDown
  const color = up ? '#1D9E75' : '#E24B4A'
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color, fontFamily: 'monospace', fontWeight: 600 }}>
      <Icon style={{ width: 12, height: 12 }} />
      {up ? '+' : ''}{delta} vs période préc.
    </span>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function MoodPage() {
  const { data: moods, isLoading } = useMood()
  const addMood = useAddMood()

  const [score, setScore] = useState(3)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month')
  const [expandForm, setExpandForm] = useState(true)

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!moods?.length) return null
    const all = moods
    const now = new Date()

    const inPeriod = all.filter(m => {
      const d = new Date(m.created_at)
      if (period === 'week') return d >= startOfWeek(now, { weekStartsOn: 1 })
      if (period === 'month') return d >= startOfMonth(now)
      return true
    })
    const prevPeriod = all.filter(m => {
      const d = new Date(m.created_at)
      if (period === 'week') {
        const ws = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
        const we = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
        return d >= ws && d <= we
      }
      if (period === 'month') {
        const ms = startOfMonth(subMonths(now, 1))
        const me = endOfMonth(subMonths(now, 1))
        return d >= ms && d <= me
      }
      return false
    })

    const avg = (arr: any[]) => arr.length ? arr.reduce((a, b) => a + b.mood_score, 0) / arr.length : 0
    const currentAvg = avg(inPeriod)
    const prevAvg = avg(prevPeriod)
    const dist = [1, 2, 3, 4, 5].map(s => ({ score: s, count: inPeriod.filter(m => m.mood_score === s).length }))
    const best = dist.sort((a, b) => b.count - a.count)[0]
    const distSorted = [1, 2, 3, 4, 5].map(s => ({ score: s, count: inPeriod.filter(m => m.mood_score === s).length }))

    // Streak: consecutive days with score >= 4
    let streak = 0
    const sorted = [...all].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    for (const m of sorted) {
      if (m.mood_score >= 4) streak++
      else break
    }

    // Alerts
    const recentLow = sorted.slice(0, 3).filter(m => m.mood_score <= 2).length
    const alert = recentLow >= 2 ? 'critical' : recentLow === 1 ? 'warn' : null

    return { currentAvg, prevAvg, inPeriod, dist: distSorted, streak, alert, total: all.length }
  }, [moods, period])

  // ─── Chart data ───────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!moods?.length) return []
    const now = new Date()
    const weeks = period === 'all' ? 12 : period === 'month' ? 5 : 7

    if (period === 'week') {
      return (moods ?? []).slice(0, 14).reverse().map((m, i) => ({
        label: format(new Date(m.created_at), 'd/MM', { locale: fr }),
        score: m.mood_score,
        color: scoreConf(m.mood_score).color,
      }))
    }

    return Array.from({ length: weeks }, (_, i) => {
      const wStart = period === 'month'
        ? startOfMonth(subMonths(now, weeks - 1 - i))
        : startOfWeek(subWeeks(now, weeks - 1 - i), { weekStartsOn: 1 })
      const wEnd = period === 'month'
        ? endOfMonth(wStart)
        : endOfWeek(wStart, { weekStartsOn: 1 })
      const bucket = (moods ?? []).filter(m => {
        const d = new Date(m.created_at); return d >= wStart && d <= wEnd
      })
      const avg = bucket.length ? bucket.reduce((a, b) => a + b.mood_score, 0) / bucket.length : null
      return {
        label: period === 'month'
          ? format(wStart, 'MMM', { locale: fr })
          : format(wStart, "'S'ww", { locale: fr }),
        score: avg ? Math.round(avg * 10) / 10 : null,
        count: bucket.length,
        color: avg ? scoreConf(avg).color : 'var(--color-text-faded)',
      }
    })
  }, [moods, period])

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Non connecté'); return }
      await addMood.mutateAsync({ mood_score: score, comment: comment.trim() || null, user_id: user.id })
      setComment('')
      setSubmitted(true)
      setExpandForm(false)
      setTimeout(() => setSubmitted(false), 3000)
    } finally {
      setSubmitting(false)
    }
  }

  const todayEntry = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    return moods?.find(m => m.created_at.startsWith(today))
  }, [moods])

  const recentMoods = useMemo(() => (moods ?? []).slice(0, 20), [moods])
  const conf = stats ? scoreConf(stats.currentAvg) : null

  return (
    <div style={{ background: 'var(--color-bg-app)', minHeight: '100vh', overflowY: 'auto' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(0.92)}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{
        padding: '24px 28px 20px',
        borderBottom: '1px solid var(--color-border)',
        background: conf ? `linear-gradient(180deg, ${conf.color}06 0%, transparent 100%)` : 'transparent',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 4px' }}>Baromètre d'équipe</p>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-main)', margin: 0, letterSpacing: '-0.03em' }}>
              Climat social
            </h1>
            {stats && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <span style={{ fontSize: 28 }}>{conf?.emoji}</span>
                <div>
                  <p style={{ fontSize: 18, fontWeight: 800, color: conf?.color, margin: 0, fontFamily: 'monospace' }}>
                    {stats.currentAvg.toFixed(1)}/5 — {conf?.label}
                  </p>
                  <TrendBadge current={stats.currentAvg} previous={stats.prevAvg} />
                </div>
              </div>
            )}
          </div>

          {/* Period selector */}
          <div style={{ display: 'flex', background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 3 }}>
            {([['week', 'Cette semaine'], ['month', 'Ce mois'], ['all', 'Tout']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setPeriod(key)}
                style={{ padding: '5px 12px', fontSize: 11, borderRadius: 8, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: period === key ? 'var(--color-border2)' : 'transparent', color: period === key ? 'var(--color-text-main)' : 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Alert banner */}
        {stats?.alert && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 10, marginBottom: 16,
            background: stats.alert === 'critical' ? '#E24B4A10' : '#EF9F2710',
            border: `1px solid ${stats.alert === 'critical' ? '#E24B4A30' : '#EF9F2730'}`,
            animation: 'fadeIn 0.3s ease',
          }}>
            <AlertTriangle style={{ width: 14, height: 14, color: stats.alert === 'critical' ? '#F09595' : '#FAC775', animation: 'pulse 2s ease-in-out infinite', flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: stats.alert === 'critical' ? '#F09595' : '#FAC775', margin: 0, fontWeight: 500 }}>
              {stats.alert === 'critical'
                ? '⚠️ Plusieurs signaux négatifs récents — le moral de l\'équipe mérite une attention particulière.'
                : 'Un signal négatif récent — à surveiller lors de la prochaine réunion.'
              }
            </p>
          </div>
        )}

        {/* KPI row */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <StatCard label="Score moyen" value={`${stats.currentAvg.toFixed(1)}/5`} sub={`sur ${stats.inPeriod.length} entr.`} color={conf?.color ?? '#1D9E75'} icon={Activity} />
            <StatCard label="Entrées" value={stats.inPeriod.length} sub={`${stats.total} au total`} color="#378ADD" icon={BarChart2} />
            <StatCard label="Série positive" value={`${stats.streak}×`} sub="humeurs ≥ 4 d'affilée" color="#7F77DD" icon={Award} />
            <StatCard
              label="Tendance"
              value={stats.currentAvg >= 4 ? '🔥 Top' : stats.currentAvg >= 3 ? '✓ OK' : '⚠ Bas'}
              sub={`vs ${stats.prevAvg > 0 ? stats.prevAvg.toFixed(1) : '—'} période préc.`}
              color={stats.currentAvg >= 4 ? '#1D9E75' : stats.currentAvg >= 3 ? '#EF9F27' : '#E24B4A'}
              icon={TrendingUp}
            />
          </div>
        )}
      </div>

      <div style={{ padding: '20px 28px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>

        {/* ── Left: charts + history ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Trend chart */}
          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '18px 20px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-faded)', fontFamily: 'monospace', margin: '0 0 16px' }}>
              Évolution du score
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData.filter(d => d.score !== null)} margin={{ top: 4, right: 0, bottom: 0, left: -28 }}>
                <defs>
                  <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7F77DD" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7F77DD" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fill: 'var(--color-text-faded)', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: 'var(--color-text-faded)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <ReferenceLine y={3} stroke="var(--color-border)" strokeDasharray="4 4" />
                <ReferenceLine y={4} stroke="#1D9E7520" strokeDasharray="4 4" />
                <Tooltip content={<MoodTooltip />} />
                <Area type="monotone" dataKey="score" stroke="#7F77DD" strokeWidth={2.5} fill="url(#moodGrad)"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props
                    if (!payload.score) return <g key={props.key} />
                    const c = scoreConf(payload.score)
                    return <circle key={props.key} cx={cx} cy={cy} r={4} fill={c.color} stroke="var(--color-bg-app)" strokeWidth={2} />
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Distribution bar chart */}
          {stats && (
            <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '18px 20px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-faded)', fontFamily: 'monospace', margin: '0 0 16px' }}>
                Distribution des scores
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                {stats.dist.map(d => {
                  const conf = scoreConf(d.score)
                  const max = Math.max(...stats.dist.map(x => x.count), 1)
                  const pct = max > 0 ? (d.count / max) * 100 : 0
                  return (
                    <div key={d.score} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: d.count > 0 ? conf.color : 'var(--color-text-faded)', fontFamily: 'monospace' }}>{d.count}</span>
                      <div style={{ width: '100%', height: 80, display: 'flex', alignItems: 'flex-end' }}>
                        <div style={{ width: '100%', height: `${Math.max(pct, 4)}%`, background: d.count > 0 ? `${conf.color}30` : 'var(--color-border)', border: `1px solid ${d.count > 0 ? conf.color + '40' : 'var(--color-border)'}`, borderRadius: '6px 6px 0 0', transition: 'height 0.6s ease' }} />
                      </div>
                      <span style={{ fontSize: 16 }}>{conf.emoji}</span>
                      <span style={{ fontSize: 9, color: 'var(--color-text-muted)', fontFamily: 'monospace', textAlign: 'center' }}>{conf.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* History */}
          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '18px 20px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-faded)', fontFamily: 'monospace', margin: '0 0 14px' }}>
              Historique récent
            </p>
            {recentMoods.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--color-text-faded)', textAlign: 'center', padding: '20px 0' }}>Aucune entrée</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {recentMoods.map((m, i) => {
                  const c = scoreConf(m.mood_score)
                  const d = new Date(m.created_at)
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: i < recentMoods.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                      {/* Score pill */}
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: `${c.color}12`, border: `1px solid ${c.color}25`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 18, lineHeight: 1 }}>{c.emoji}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: c.color, fontFamily: 'monospace' }}>{m.mood_score}/5</span>
                          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-main)' }}>{c.label}</span>
                        </div>
                        {m.comment && (
                          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>"{m.comment}"</p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: 10, color: 'var(--color-text-faded)', margin: 0, fontFamily: 'monospace' }}>{fRelative(m.created_at)}</p>
                        <p style={{ fontSize: 10, color: 'var(--color-text-faded)', margin: '2px 0 0', fontFamily: 'monospace' }}>{format(d, 'dd/MM', { locale: fr })}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: input + insights ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Input card */}
          <div style={{
            background: 'var(--color-bg-card)', border: '1px solid var(--color-border2)',
            borderRadius: 16, overflow: 'hidden',
            boxShadow: expandForm ? '0 0 0 1px rgba(29,158,117,0.15)' : 'none',
            transition: 'box-shadow 0.3s',
          }}>
            <button
              onClick={() => setExpandForm(!expandForm)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: expandForm ? '1px solid var(--color-border)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', animation: 'pulse 2s ease-in-out infinite' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-main)' }}>
                  {submitted ? '✓ Enregistré !' : todayEntry ? `Aujourd'hui : ${scoreConf(todayEntry.mood_score).emoji} ${todayEntry.mood_score}/5` : "Comment va l'équipe ?"}
                </span>
              </div>
              <ChevronDown style={{ width: 14, height: 14, color: 'var(--color-text-muted)', transform: expandForm ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {expandForm && (
              <div style={{ padding: '18px' }}>
                {/* Score selector */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                  {SCORES.map(s => <ScoreButton key={s.score} s={s} selected={score === s.score} onClick={() => setScore(s.score)} />)}
                </div>

                {/* Selected description */}
                <div style={{ padding: '8px 12px', background: `${SCORES[score - 1].color}08`, border: `1px solid ${SCORES[score - 1].color}20`, borderRadius: 8, marginBottom: 14 }}>
                  <p style={{ fontSize: 11, color: SCORES[score - 1].color, margin: 0, fontFamily: 'monospace' }}>
                    {SCORES[score - 1].desc}
                  </p>
                </div>

                {/* Comment */}
                <textarea
                  value={comment} onChange={e => setComment(e.target.value)}
                  placeholder="Précisez si nécessaire... (optionnel)"
                  rows={3}
                  style={{ width: '100%', background: 'var(--color-bg-input)', border: '1px solid var(--color-border2)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: 'var(--color-text-main)', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 12 }}
                />

                <button onClick={handleSubmit} disabled={submitting}
                  style={{ width: '100%', padding: '11px 0', background: SCORES[score - 1].color, border: 'none', borderRadius: 10, color: 'var(--color-text-main)', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.15s', opacity: submitting ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {submitting ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <Heart style={{ width: 14, height: 14 }} />}
                  Enregistrer mon humeur
                </button>

                {todayEntry && (
                  <p style={{ fontSize: 11, color: 'var(--color-text-faded)', textAlign: 'center', margin: '10px 0 0', fontFamily: 'monospace' }}>
                    Tu as déjà renseigné aujourd'hui ({scoreConf(todayEntry.mood_score).emoji} {todayEntry.mood_score}/5). Tu peux quand même remettre à jour.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Score guide */}
          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '16px 18px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-faded)', fontFamily: 'monospace', margin: '0 0 12px' }}>Guide d'interprétation</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...SCORES].reverse().map(s => (
                <div key={s.score} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: `${s.color}06`, border: `1px solid ${s.color}15`, borderRadius: 8 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{s.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.score}/5 · {s.label}</span>
                    <p style={{ fontSize: 10, color: 'var(--color-text-muted)', margin: '1px 0 0', fontFamily: 'monospace' }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips contextual */}
          {stats && stats.currentAvg < 3 && (
            <div style={{ background: '#E24B4A08', border: '1px solid #E24B4A25', borderRadius: 14, padding: '16px 18px', animation: 'fadeIn 0.4s ease' }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F09595', fontFamily: 'monospace', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle style={{ width: 11, height: 11 }} /> Points d'attention
              </p>
              <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {['Prévoir un point individuel rapide', 'Vérifier la charge de travail', 'Proposer un moment collectif informel', 'Identifier les facteurs de stress récents'].map(tip => (
                  <li key={tip} style={{ fontSize: 12, color: 'var(--color-text-main)', lineHeight: 1.5 }}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {stats && stats.currentAvg >= 4 && stats.streak >= 3 && (
            <div style={{ background: '#1D9E7508', border: '1px solid #1D9E7525', borderRadius: 14, padding: '14px 18px', animation: 'fadeIn 0.4s ease', textAlign: 'center' }}>
              <p style={{ fontSize: 22, margin: '0 0 6px' }}>🏆</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#5DCAA5', margin: '0 0 4px' }}>Série de {stats.streak} humeurs positives !</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0, fontFamily: 'monospace' }}>L'équipe est dans une bonne dynamique. Continuez comme ça.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
