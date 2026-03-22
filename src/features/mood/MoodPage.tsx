import { useState } from 'react'
import { useMood, useAddMood } from '../consumables/useConsumables'
import { Card, Spinner, PageHeader, Button, EmptyState } from '../../components/ui'
import { Activity, Smile } from 'lucide-react'
import { fDateTime } from '../../utils'
import { supabase } from '../../lib/supabase'
import { MOOD_LABELS } from '../../constants'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const MOOD_COLORS = ['', '#E24B4A', '#EF9F27', '#8b90a4', '#7F77DD', '#1D9E75']
const MOOD_EMOJIS = ['', '😔', '😕', '😐', '🙂', '😄']

export function MoodPage() {
  const { data: moods, isLoading } = useMood()
  const addMood = useAddMood()
  const [score, setScore] = useState(3)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await addMood.mutateAsync({ mood_score: score, comment: comment || null, user_id: user.id })
    setComment(''); setSubmitting(false)
  }

  const avg = moods?.length
    ? (moods.reduce((a, b) => a + b.mood_score, 0) / moods.length).toFixed(1)
    : null

  const chartData = moods?.slice(0, 20).reverse().map((m, i) => ({
    i: i + 1,
    score: m.mood_score,
    date: format(new Date(m.created_at), 'dd/MM', { locale: fr }),
  })) ?? []

  return (
    <div className="flex flex-col min-h-full bg-[#0f1117]">
      <PageHeader title="Baromètre d'équipe" subtitle={avg ? `Score moyen : ${avg}/5` : 'Aucune donnée'} />

      <div className="p-6 flex flex-col gap-5 max-w-2xl">
        {/* Add mood */}
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-400 mb-4">Comment vous sentez-vous aujourd'hui ?</p>
          <div className="flex justify-center gap-3 mb-4">
            {[1, 2, 3, 4, 5].map(s => (
              <button
                key={s}
                onClick={() => setScore(s)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                  score === s
                    ? 'border-current bg-white/5'
                    : 'border-white/[0.07] hover:border-white/20'
                }`}
                style={{ color: score === s ? MOOD_COLORS[s] : undefined }}
              >
                <span className="text-2xl">{MOOD_EMOJIS[s]}</span>
                <span className="text-[10px] text-slate-400">{MOOD_LABELS[s]}</span>
              </button>
            ))}
          </div>
          <textarea
            value={comment} onChange={e => setComment(e.target.value)}
            placeholder="Commentaire optionnel..."
            rows={2}
            className="w-full bg-[#1e2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-teal-500 resize-none mb-3"
          />
          <Button variant="primary" onClick={handleSubmit} disabled={submitting} className="w-full justify-center">
            Enregistrer mon humeur
          </Button>
        </Card>

        {/* Chart */}
        {chartData.length > 1 && (
          <Card className="p-4">
            <p className="text-xs font-medium text-slate-400 mb-4">Évolution récente</p>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7F77DD" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7F77DD" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1e2333', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }} labelStyle={{ color: '#94a3b8', fontSize: 12 }} itemStyle={{ color: '#AFA9EC', fontSize: 12 }} />
                <Area type="monotone" dataKey="score" stroke="#7F77DD" strokeWidth={2} fill="url(#moodGrad)" dot={{ fill: '#7F77DD', strokeWidth: 0, r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* History */}
        {isLoading && <Spinner />}
        {!isLoading && (moods?.length ?? 0) === 0 && (
          <EmptyState icon={Smile} title="Aucune donnée" description="Enregistrez votre première humeur" />
        )}
        {(moods?.length ?? 0) > 0 && (
          <Card>
            <p className="text-xs font-medium text-slate-400 p-4 pb-2">Historique</p>
            <div className="divide-y divide-white/[0.05]">
              {moods?.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3.5">
                  <span className="text-xl">{MOOD_EMOJIS[m.mood_score]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: MOOD_COLORS[m.mood_score] }}>
                        {MOOD_LABELS[m.mood_score]}
                      </span>
                      <span className="text-xs text-slate-500">{fDateTime(m.created_at)}</span>
                    </div>
                    {m.comment && <p className="text-xs text-slate-400 mt-0.5">{m.comment}</p>}
                  </div>
                  <span className="text-lg font-medium" style={{ color: MOOD_COLORS[m.mood_score] }}>{m.mood_score}/5</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
