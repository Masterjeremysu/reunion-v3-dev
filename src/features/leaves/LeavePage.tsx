import { useState, useMemo } from 'react'
import { useColleagues } from '../colleagues/useColleagues'
import { Spinner } from '../../components/ui'
import { fDate } from '../../utils'
import {
  Calendar, Plus, Check, X, Clock, AlertTriangle,
  ChevronDown, Loader2, Users, TrendingUp,
  Sun, Sunset, FileText, RefreshCw, Heart,
  Award, Briefcase, Edit2, Filter, Search,
  ChevronLeft, ChevronRight, Minus
} from 'lucide-react'
import {
  format, isWeekend, isSameMonth, startOfMonth,
  endOfMonth, eachDayOfInterval, addMonths, subMonths,
  isToday, isSameDay, isWithinInterval, parseISO,
  differenceInCalendarDays, getDay
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────
type LeaveType = 'conges_payes' | 'rtt' | 'maladie' | 'arret_travail' | 'conge_sans_solde' | 'evenement_familial' | 'formation' | 'autre'
type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

const LEAVE_TYPES: Record<LeaveType, { label: string; color: string; icon: string; short: string }> = {
  conges_payes:      { label: 'Congés payés',         color: '#1D9E75', icon: '🏖️', short: 'CP' },
  rtt:               { label: 'RTT',                   color: '#378ADD', icon: '⏰', short: 'RTT' },
  maladie:           { label: 'Maladie',               color: '#EF9F27', icon: '🤒', short: 'MAL' },
  arret_travail:     { label: 'Arrêt de travail',      color: '#E24B4A', icon: '🏥', short: 'AT' },
  conge_sans_solde:  { label: 'Congé sans solde',      color: '#8b90a4', icon: '📋', short: 'CSS' },
  evenement_familial:{ label: 'Événement familial',    color: '#D4537E', icon: '👨‍👩‍👧', short: 'EF' },
  formation:         { label: 'Formation',             color: '#7F77DD', icon: '📚', short: 'FOR' },
  autre:             { label: 'Autre',                 color: '#565c75', icon: '📌', short: 'AUT' },
}

const STATUS_CONF: Record<LeaveStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: 'En attente',  color: '#EF9F27', bg: '#EF9F2715' },
  approved:  { label: 'Approuvé',   color: '#1D9E75', bg: '#1D9E7515' },
  rejected:  { label: 'Refusé',     color: '#E24B4A', bg: '#E24B4A15' },
  cancelled: { label: 'Annulé',     color: '#565c75', bg: '#56507515' },
}

const FRENCH_HOLIDAYS_2026 = [
  '2026-01-01','2026-04-06','2026-05-01','2026-05-08',
  '2026-05-14','2026-05-25','2026-07-14','2026-08-15',
  '2026-11-01','2026-11-11','2026-12-25'
]

function isHoliday(d: Date) {
  return FRENCH_HOLIDAYS_2026.includes(format(d, 'yyyy-MM-dd'))
}
function isWorkingDay(d: Date) {
  return !isWeekend(d) && !isHoliday(d)
}
function countWorkingDays(start: Date, end: Date): number {
  return eachDayOfInterval({ start, end }).filter(isWorkingDay).length
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useLeaveRequests() {
  return useQuery({
    queryKey: ['leave_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, colleagues(id, name, post)')
        .order('start_date', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

function useLeaveBalances() {
  return useQuery({
    queryKey: ['leave_balances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_balances')
        .select('*, colleagues(id, name, post)')
        .eq('year', new Date().getFullYear())
      if (error) throw error
      return data ?? []
    },
  })
}

function useCreateLeaveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from('leave_requests').insert(payload).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave_requests'] })
      qc.invalidateQueries({ queryKey: ['leave_balances'] })
      toast.success('Demande créée')
    },
    onError: (e: any) => toast.error(e.message),
  })
}

function useUpdateLeaveStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, rejection_reason }: { id: string; status: LeaveStatus; rejection_reason?: string }) => {
      const { error } = await supabase.from('leave_requests')
        .update({ status, rejection_reason: rejection_reason ?? null, approved_at: status === 'approved' ? new Date().toISOString() : null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave_requests'] })
      qc.invalidateQueries({ queryKey: ['leave_balances'] })
      toast.success('Statut mis à jour')
    },
    onError: (e: any) => toast.error(e.message),
  })
}

function useUpdateBalance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const { error } = await supabase.from('leave_balances').update(payload).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave_balances'] }); toast.success('Solde mis à jour') },
    onError: (e: any) => toast.error(e.message),
  })
}

function useCreateBalance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from('leave_balances').upsert(payload, { onConflict: 'colleague_id,year' })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave_balances'] }); toast.success('Solde initialisé') },
    onError: (e: any) => toast.error(e.message),
  })
}

// ─── Balance card ─────────────────────────────────────────────────────────────
function BalanceCard({ balance, onEdit }: { balance: any; onEdit: (b: any) => void }) {
  const cpRemaining = (balance.cp_total ?? 25) - (balance.cp_taken ?? 0) - (balance.cp_pending ?? 0)
  const rttRemaining = (balance.rtt_total ?? 0) - (balance.rtt_taken ?? 0)
  const c = balance.colleagues

  const cpPct = balance.cp_total > 0 ? Math.round(((balance.cp_taken ?? 0) / balance.cp_total) * 100) : 0
  const urgency = cpRemaining < 0 ? 'critical' : cpRemaining < 3 ? 'warn' : 'ok'
  const urgColor = urgency === 'critical' ? '#E24B4A' : urgency === 'warn' ? '#EF9F27' : '#1D9E75'

  return (
    <div style={{ background: '#0e1118', border: `1px solid ${urgency === 'critical' ? '#E24B4A25' : 'rgba(255,255,255,0.06)'}`, borderRadius: 14, padding: '16px 18px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#1D9E7520', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
          {c?.name?.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#e8eaf0', margin: 0 }}>{c?.name}</p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: 0, fontFamily: 'monospace' }}>{c?.post}</p>
        </div>
        <button onClick={() => onEdit(balance)}
          style={{ padding: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex' }}>
          <Edit2 style={{ width: 11, height: 11 }} />
        </button>
      </div>

      {/* CP gauge */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Congés payés</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: urgColor, fontFamily: 'monospace' }}>
            {cpRemaining.toFixed(1)}j restants / {balance.cp_total}j
          </span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(cpPct, 100)}%`, background: urgColor, borderRadius: 3, transition: 'width 0.5s ease' }} />
        </div>
        {balance.cp_pending > 0 && (
          <p style={{ fontSize: 10, color: '#EF9F27', margin: '4px 0 0', fontFamily: 'monospace' }}>
            {balance.cp_pending}j en attente de validation
          </p>
        )}
      </div>

      {/* RTT + stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'RTT', value: `${rttRemaining.toFixed(1)}j`, sub: `/ ${balance.rtt_total ?? 0}j`, color: '#378ADD' },
          { label: 'CP pris', value: `${(balance.cp_taken ?? 0).toFixed(1)}j`, color: '#1D9E75' },
          { label: 'Maladie', value: `${(balance.sick_days ?? 0).toFixed(1)}j`, color: '#EF9F27' },
        ].map(s => (
          <div key={s.label} style={{ background: `${s.color}08`, border: `1px solid ${s.color}18`, borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: s.color, margin: 0, fontFamily: 'monospace' }}>{s.value}</p>
            {s.sub && <p style={{ fontSize: 9, color: `${s.color}70`, margin: '1px 0 0', fontFamily: 'monospace' }}>{s.sub}</p>}
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0', fontFamily: 'monospace', textTransform: 'uppercase' }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Edit balance modal ───────────────────────────────────────────────────────
function EditBalanceModal({ balance, onClose }: { balance: any; onClose: () => void }) {
  const update = useUpdateBalance()
  const [cpTotal, setCpTotal] = useState(String(balance.cp_total ?? 25))
  const [rttTotal, setRttTotal] = useState(String(balance.rtt_total ?? 0))
  const [notes, setNotes] = useState(balance.notes ?? '')

  const handleSave = async () => {
    await update.mutateAsync({ id: balance.id, cp_total: parseFloat(cpTotal), rtt_total: parseFloat(rttTotal), notes: notes || null })
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)' }}>
      <div style={{ background: '#161b26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 28, width: 380 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Modifier le solde</h3>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 20px', fontFamily: 'monospace' }}>{balance.colleagues?.name} · {balance.year}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Solde CP annuel (jours)', value: cpTotal, set: setCpTotal, hint: 'Généralement 25j pour un temps plein' },
            { label: 'Solde RTT annuel (jours)', value: rttTotal, set: setRttTotal, hint: '0 si pas de RTT dans votre accord' },
          ].map(f => (
            <div key={f.label}>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', marginBottom: 5 }}>{f.label}</label>
              <input type="number" value={f.value} onChange={e => f.set(e.target.value)} step="0.5" min="0"
                style={{ width: '100%', background: '#1e2535', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 12px', fontSize: 14, color: '#fff', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }} />
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', margin: '4px 0 0', fontFamily: 'monospace' }}>{f.hint}</p>
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', marginBottom: 5 }}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Accord particulier, cas spécial..."
              style={{ width: '100%', background: '#1e2535', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#fff', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 0', fontSize: 13, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, cursor: 'pointer' }}>Annuler</button>
          <button onClick={handleSave} disabled={update.isPending}
            style={{ flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 700, color: '#fff', background: '#1D9E75', border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {update.isPending ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> : <Check style={{ width: 13, height: 13 }} />}
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Create request form ──────────────────────────────────────────────────────
function CreateRequestForm({ colleagues, onClose }: { colleagues: any[]; onClose: () => void }) {
  const createRequest = useCreateLeaveRequest()
  const [colleagueId, setColleagueId] = useState('')
  const [leaveType, setLeaveType] = useState<LeaveType>('conges_payes')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isHalfDay, setIsHalfDay] = useState(false)
  const [halfDayPeriod, setHalfDayPeriod] = useState<'morning' | 'afternoon'>('morning')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('12:00')
  const [reason, setReason] = useState('')
  const [hasDocument, setHasDocument] = useState(false)

  const duration = useMemo(() => {
    if (!startDate) return 0
    if (isHalfDay) return 0.5
    if (!endDate) return 0
    const s = parseISO(startDate); const e = parseISO(endDate)
    if (e < s) return 0
    return countWorkingDays(s, e)
  }, [startDate, endDate, isHalfDay])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!colleagueId || !startDate) { toast.error('Remplissez tous les champs obligatoires'); return }
    const { data: { user } } = await supabase.auth.getUser()
    await createRequest.mutateAsync({
      colleague_id: colleagueId,
      leave_type: leaveType,
      start_date: startDate,
      end_date: isHalfDay ? startDate : (endDate || startDate),
      is_half_day: isHalfDay,
      half_day_period: isHalfDay ? halfDayPeriod : null,
      start_time: isHalfDay ? startTime : null,
      end_time: isHalfDay ? endTime : null,
      status: 'pending',
      reason: reason || null,
      has_document: hasDocument,
      created_by_user_id: user?.id ?? null,
    })
    onClose()
  }

  const fieldStyle = { width: '100%', background: '#1e2535', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' as const }
  const labelStyle = { display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', marginBottom: 5 }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.7)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ height: '100%', width: 480, background: '#0d1018', borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 10, color: '#1D9E75', fontFamily: 'monospace', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>Nouvelle demande</p>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '2px 0 0', letterSpacing: '-0.02em' }}>Demande d'absence</h2>
          </div>
          <button onClick={onClose} style={{ padding: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex' }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div>
            <label style={labelStyle}>Collaborateur *</label>
            <select value={colleagueId} onChange={e => setColleagueId(e.target.value)} required style={fieldStyle}>
              <option value="">— Sélectionner —</option>
              {colleagues.map(c => <option key={c.id} value={c.id}>{c.name} · {c.post}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Type d'absence *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {(Object.keys(LEAVE_TYPES) as LeaveType[]).map(t => {
                const conf = LEAVE_TYPES[t]
                const selected = leaveType === t
                return (
                  <button key={t} type="button" onClick={() => setLeaveType(t)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: selected ? `${conf.color}15` : 'rgba(255,255,255,0.02)', border: `1px solid ${selected ? conf.color + '40' : 'rgba(255,255,255,0.07)'}`, borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }}>
                    <span style={{ fontSize: 14 }}>{conf.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: selected ? 600 : 400, color: selected ? conf.color : 'rgba(255,255,255,0.5)' }}>{conf.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Demi-journée toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: isHalfDay ? '#1D9E7508' : 'rgba(255,255,255,0.02)', border: `1px solid ${isHalfDay ? '#1D9E7530' : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, cursor: 'pointer' }}
            onClick={() => setIsHalfDay(!isHalfDay)}>
            <div style={{ width: 36, height: 20, borderRadius: 10, background: isHalfDay ? '#1D9E75' : 'rgba(255,255,255,0.1)', transition: 'background 0.2s', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 2, left: isHalfDay ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </div>
            <span style={{ fontSize: 13, color: isHalfDay ? '#5DCAA5' : 'rgba(255,255,255,0.5)', fontWeight: isHalfDay ? 600 : 400 }}>
              Demi-journée uniquement
            </span>
          </div>

          {isHalfDay ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Période</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { key: 'morning', label: 'Matin', icon: Sun, timeStart: '08:00', timeEnd: '12:00' },
                    { key: 'afternoon', label: 'Après-midi', icon: Sunset, timeStart: '13:00', timeEnd: '17:00' },
                  ].map(p => (
                    <button key={p.key} type="button"
                      onClick={() => { setHalfDayPeriod(p.key as any); setStartTime(p.timeStart); setEndTime(p.timeEnd) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: halfDayPeriod === p.key ? '#1D9E7510' : 'rgba(255,255,255,0.02)', border: `1px solid ${halfDayPeriod === p.key ? '#1D9E7540' : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, cursor: 'pointer' }}>
                      <p.icon style={{ width: 14, height: 14, color: halfDayPeriod === p.key ? '#1D9E75' : 'rgba(255,255,255,0.4)' }} />
                      <span style={{ fontSize: 13, fontWeight: halfDayPeriod === p.key ? 600 : 400, color: halfDayPeriod === p.key ? '#5DCAA5' : 'rgba(255,255,255,0.5)' }}>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={labelStyle}>Heure début</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Heure fin</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={fieldStyle} />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Date début *</label>
                <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value) }} required style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Date fin *</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} required style={fieldStyle} />
              </div>
            </div>
          )}

          {/* Duration preview */}
          {duration > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#1D9E7508', border: '1px solid #1D9E7525', borderRadius: 10 }}>
              <Calendar style={{ width: 14, height: 14, color: '#1D9E75' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#5DCAA5', fontFamily: 'monospace' }}>
                {duration === 0.5 ? 'Demi-journée (0.5j)' : `${duration} jour${duration > 1 ? 's' : ''} ouvré${duration > 1 ? 's' : ''}`}
              </span>
              {leaveType === 'conges_payes' && (
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginLeft: 'auto' }}>
                  Week-ends et jours fériés exclus
                </span>
              )}
            </div>
          )}

          <div>
            <label style={labelStyle}>Motif (optionnel)</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
              placeholder="Précisez si nécessaire..."
              style={{ ...fieldStyle, resize: 'none' }} />
          </div>

          {(leaveType === 'maladie' || leaveType === 'arret_travail') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, cursor: 'pointer' }}
              onClick={() => setHasDocument(!hasDocument)}>
              <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${hasDocument ? '#1D9E75' : 'rgba(255,255,255,0.2)'}`, background: hasDocument ? '#1D9E75' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                {hasDocument && <Check style={{ width: 11, height: 11, color: '#fff' }} />}
              </div>
              <div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>Justificatif fourni</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: 0, fontFamily: 'monospace' }}>Arrêt médical, certificat médical</p>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button type="button" onClick={onClose}
            style={{ flex: 1, padding: '11px 0', fontSize: 13, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, cursor: 'pointer' }}>
            Annuler
          </button>
          <button onClick={handleSubmit as any} disabled={!colleagueId || !startDate || createRequest.isPending}
            style={{ flex: 2, padding: '11px 0', fontSize: 13, fontWeight: 700, color: '#fff', background: '#1D9E75', border: 'none', borderRadius: 10, cursor: 'pointer', opacity: !colleagueId || !startDate ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {createRequest.isPending ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> : <Plus style={{ width: 13, height: 13 }} />}
            Soumettre la demande
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Mini calendar ────────────────────────────────────────────────────────────
function LeaveCalendar({ requests }: { requests: any[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const firstDow = (getDay(startOfMonth(currentMonth)) + 6) % 7 // Monday=0

  const getDayLeaves = (d: Date) =>
    requests.filter(r => r.status !== 'cancelled' && r.status !== 'rejected' && isWithinInterval(d, { start: parseISO(r.start_date), end: parseISO(r.end_date) }))

  return (
    <div style={{ background: '#0e1118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', margin: 0 }}>
          Calendrier des absences
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setCurrentMonth(m => subMonths(m, 1))}
            style={{ padding: 5, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex' }}>
            <ChevronLeft style={{ width: 12, height: 12 }} />
          </button>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#e8eaf0', fontFamily: 'monospace', minWidth: 100, textAlign: 'center' }}>
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </span>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            style={{ padding: 5, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex' }}>
            <ChevronRight style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {['L','M','M','J','V','S','D'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, color: i >= 5 ? '#E24B4A' : 'rgba(255,255,255,0.3)', fontFamily: 'monospace', padding: '4px 0', fontWeight: 600 }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {Array.from({ length: firstDow }, (_, i) => <div key={`e${i}`} />)}
        {days.map(d => {
          const leaves = getDayLeaves(d)
          const holiday = isHoliday(d)
          const weekend = isWeekend(d)
          const today = isToday(d)
          const hasLeave = leaves.length > 0
          const firstLeave = leaves[0]
          const leaveColor = hasLeave ? LEAVE_TYPES[firstLeave?.leave_type as LeaveType]?.color ?? '#1D9E75' : null

          return (
            <div key={d.toString()} title={hasLeave ? leaves.map(l => `${l.colleagues?.name}: ${LEAVE_TYPES[l.leave_type as LeaveType]?.label}`).join('\n') : undefined}
              style={{
                height: 32, borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                background: today ? '#1D9E7520' : hasLeave ? `${leaveColor}18` : 'transparent',
                border: `1px solid ${today ? '#1D9E75' : hasLeave ? `${leaveColor}35` : 'transparent'}`,
                cursor: hasLeave ? 'pointer' : 'default',
                transition: 'all 0.1s',
              }}>
              <span style={{ fontSize: 11, fontWeight: today ? 700 : 400, color: weekend || holiday ? '#E24B4A60' : today ? '#5DCAA5' : hasLeave ? leaveColor! : 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                {format(d, 'd')}
              </span>
              {hasLeave && (
                <div style={{ display: 'flex', gap: 1 }}>
                  {leaves.slice(0, 3).map((l, i) => (
                    <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: LEAVE_TYPES[l.leave_type as LeaveType]?.color ?? '#1D9E75' }} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        {Object.entries(LEAVE_TYPES).slice(0, 4).map(([key, conf]) => (
          <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: conf.color, display: 'inline-block' }} />
            {conf.short}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function LeavePage() {
  const { data: colleagues, isLoading: cLoading } = useColleagues()
  const { data: requests, isLoading: rLoading } = useLeaveRequests()
  const { data: balances, isLoading: bLoading } = useLeaveBalances()
  const updateStatus = useUpdateLeaveStatus()
  const createBalance = useCreateBalance()

  const [tab, setTab] = useState<'requests' | 'balances' | 'calendar'>('requests')
  const [showCreate, setShowCreate] = useState(false)
  const [editBalance, setEditBalance] = useState<any | null>(null)
  const [filterStatus, setFilterStatus] = useState<LeaveStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const filtered = useMemo(() => {
    if (!requests) return []
    return requests.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false
      if (!search) return true
      const name = (r as any).colleagues?.name?.toLowerCase() ?? ''
      return name.includes(search.toLowerCase()) || r.leave_type.includes(search.toLowerCase())
    })
  }, [requests, filterStatus, search])

  const stats = useMemo(() => ({
    pending: requests?.filter(r => r.status === 'pending').length ?? 0,
    today: requests?.filter(r => {
      const today = format(new Date(), 'yyyy-MM-dd')
      return r.status === 'approved' && r.start_date <= today && r.end_date >= today
    }).length ?? 0,
    thisMonth: requests?.filter(r => {
      const m = format(new Date(), 'yyyy-MM')
      return r.status === 'approved' && r.start_date.startsWith(m)
    }).length ?? 0,
  }), [requests])

  // Init balances for colleagues who don't have one
  const missingBalances = useMemo(() => {
    if (!colleagues || !balances) return []
    return colleagues.filter(c => !balances.find((b: any) => b.colleague_id === c.id))
  }, [colleagues, balances])

  const handleApprove = (id: string) => updateStatus.mutate({ id, status: 'approved' })
  const handleReject = async () => {
    if (!rejectId) return
    await updateStatus.mutateAsync({ id: rejectId, status: 'rejected', rejection_reason: rejectReason || undefined })
    setRejectId(null); setRejectReason('')
  }
  const handleCancel = (id: string) => updateStatus.mutate({ id, status: 'cancelled' })

  const initMissingBalances = async () => {
    for (const c of missingBalances) {
      await createBalance.mutateAsync({ colleague_id: c.id, year: new Date().getFullYear(), cp_total: 25, rtt_total: 0 })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0c12', overflow: 'hidden' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Reject modal */}
      {rejectId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)' }}>
          <div style={{ background: '#161b26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, maxWidth: 360, width: '100%' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Motif de refus</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="Expliquez le motif du refus (optionnel)..."
              style={{ width: '100%', background: '#1e2535', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#fff', outline: 'none', resize: 'none', boxSizing: 'border-box', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setRejectId(null); setRejectReason('') }} style={{ flex: 1, padding: '9px 0', fontSize: 13, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleReject} style={{ flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 600, color: '#fff', background: '#E24B4A', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Confirmer le refus</button>
            </div>
          </div>
        </div>
      )}

      {showCreate && <CreateRequestForm colleagues={colleagues ?? []} onClose={() => setShowCreate(false)} />}
      {editBalance && <EditBalanceModal balance={editBalance} onClose={() => setEditBalance(null)} />}

      {/* Topbar */}
      <div style={{ flexShrink: 0, padding: '0 24px', height: 52, borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#0e1118', display: 'flex', alignItems: 'center', gap: 14 }}>
        <h1 style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>Congés & Absences</h1>

        <div style={{ display: 'flex', gap: 6 }}>
          {stats.pending > 0 && (
            <span style={{ fontSize: 10, color: '#FAC775', background: '#EF9F2712', border: '1px solid #EF9F2725', borderRadius: 20, padding: '2px 8px', fontFamily: 'monospace', fontWeight: 700 }}>
              {stats.pending} en attente
            </span>
          )}
          {stats.today > 0 && (
            <span style={{ fontSize: 10, color: '#5DCAA5', background: '#1D9E7512', border: '1px solid #1D9E7525', borderRadius: 20, padding: '2px 8px', fontFamily: 'monospace' }}>
              {stats.today} absent{stats.today > 1 ? 's' : ''} aujourd'hui
            </span>
          )}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {missingBalances.length > 0 && (
            <button onClick={initMissingBalances} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#EF9F27', fontSize: 12, cursor: 'pointer' }}>
              <RefreshCw style={{ width: 11, height: 11 }} /> Init soldes ({missingBalances.length})
            </button>
          )}
          <button onClick={() => setShowCreate(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: '#1D9E75', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <Plus style={{ width: 12, height: 12 }} /> Nouvelle demande
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ flexShrink: 0, display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0 24px', background: '#0a0c12' }}>
        {([
          ['requests', 'Demandes', requests?.length ?? 0],
          ['balances', 'Soldes', colleagues?.length ?? 0],
          ['calendar', 'Calendrier', null],
        ] as const).map(([key, label, count]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', background: 'transparent', borderBottom: `2px solid ${tab === key ? '#1D9E75' : 'transparent'}`, color: tab === key ? '#5DCAA5' : 'rgba(255,255,255,0.35)', transition: 'all 0.15s', marginBottom: -1 }}>
            {label}
            {count !== null && count > 0 && <span style={{ fontSize: 10, background: tab === key ? '#1D9E7520' : 'rgba(255,255,255,0.06)', color: tab === key ? '#1D9E75' : 'rgba(255,255,255,0.3)', borderRadius: 20, padding: '1px 6px', fontFamily: 'monospace' }}>{count}</span>}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

        {/* ── REQUESTS TAB ── */}
        {tab === 'requests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '0 10px', height: 32, width: 220 }}>
                <Search style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un collègue..."
                  style={{ flex: 1, background: 'transparent', border: 'none', fontSize: 12, color: '#fff', outline: 'none' }} />
              </div>
              {(['all', 'pending', 'approved', 'rejected', 'cancelled'] as const).map(s => {
                const conf = s === 'all' ? { label: 'Toutes', color: '#e8eaf0', bg: 'rgba(255,255,255,0.06)' } : STATUS_CONF[s]
                const count = s === 'all' ? (requests?.length ?? 0) : (requests?.filter(r => r.status === s).length ?? 0)
                return (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: filterStatus === s ? (s === 'all' ? 'rgba(255,255,255,0.08)' : conf.bg) : 'transparent', border: `1px solid ${filterStatus === s ? (s === 'all' ? 'rgba(255,255,255,0.15)' : conf.color + '40') : 'rgba(255,255,255,0.07)'}`, borderRadius: 20, cursor: 'pointer', transition: 'all 0.15s' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: s === 'all' ? '#e8eaf0' : conf.color, fontFamily: 'monospace' }}>{count}</span>
                    <span style={{ fontSize: 10, color: s === 'all' ? 'rgba(255,255,255,0.5)' : conf.color, opacity: 0.8 }}>{conf.label}</span>
                  </button>
                )
              })}
            </div>

            {rLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>}
            {!rLoading && filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
                <Calendar style={{ width: 32, height: 32, margin: '0 auto 12px', opacity: 0.3 }} />
                Aucune demande
              </div>
            )}

            {filtered.map(r => {
              const lt = LEAVE_TYPES[r.leave_type as LeaveType]
              const st = STATUS_CONF[r.status as LeaveStatus]
              const c = (r as any).colleagues
              const isHalf = r.is_half_day
              const periodLabel = r.half_day_period === 'morning' ? 'Matin' : r.half_day_period === 'afternoon' ? 'Après-midi' : null

              return (
                <div key={r.id} style={{ background: '#0e1118', border: `1px solid ${r.status === 'pending' ? '#EF9F2720' : r.status === 'approved' ? '#1D9E7515' : 'rgba(255,255,255,0.06)'}`, borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    {/* Avatar */}
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#1D9E7520', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#5DCAA5', flexShrink: 0 }}>
                      {c?.name?.charAt(0)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#e8eaf0' }}>{c?.name}</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{c?.post}</span>
                        <span style={{ fontSize: 11 }}>{lt?.icon}</span>
                        <span style={{ fontSize: 11, color: lt?.color, fontWeight: 600 }}>{lt?.label}</span>
                        {r.has_document && <span style={{ fontSize: 9, color: '#378ADD', background: '#378ADD15', borderRadius: 20, padding: '1px 6px', fontFamily: 'monospace' }}>📎 Justif.</span>}
                      </div>

                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: r.reason ? 6 : 0 }}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar style={{ width: 11, height: 11 }} />
                          {isHalf ? (
                            <>{fDate(r.start_date)} · {periodLabel}{r.start_time && ` (${r.start_time} – ${r.end_time})`}</>
                          ) : r.start_date === r.end_date ? (
                            fDate(r.start_date)
                          ) : (
                            <>{fDate(r.start_date)} → {fDate(r.end_date)}</>
                          )}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: lt?.color, background: `${lt?.color}15`, borderRadius: 20, padding: '1px 8px', fontFamily: 'monospace' }}>
                          {r.duration_days ?? (isHalf ? 0.5 : '?')}j
                        </span>
                      </div>

                      {r.reason && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0', fontStyle: 'italic' }}>"{r.reason}"</p>}
                      {r.status === 'rejected' && r.rejection_reason && (
                        <p style={{ fontSize: 11, color: '#F09595', margin: '4px 0 0', fontFamily: 'monospace' }}>Motif de refus : {r.rejection_reason}</p>
                      )}
                    </div>

                    {/* Right side */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, borderRadius: 20, padding: '3px 10px', fontFamily: 'monospace' }}>
                        {st.label}
                      </span>

                      {r.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => handleApprove(r.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#1D9E7520', border: '1px solid #1D9E7540', borderRadius: 8, color: '#5DCAA5', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            <Check style={{ width: 11, height: 11 }} /> Approuver
                          </button>
                          <button onClick={() => setRejectId(r.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#E24B4A10', border: '1px solid #E24B4A30', borderRadius: 8, color: '#F09595', fontSize: 11, cursor: 'pointer' }}>
                            <X style={{ width: 11, height: 11 }} /> Refuser
                          </button>
                        </div>
                      )}
                      {r.status === 'approved' && (
                        <button onClick={() => handleCancel(r.id)}
                          style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace', transition: 'color 0.15s' }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#E24B4A')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.2)')}>
                          Annuler
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── BALANCES TAB ── */}
        {tab === 'balances' && (
          <div>
            {missingBalances.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#EF9F2708', border: '1px solid #EF9F2725', borderRadius: 12, marginBottom: 16 }}>
                <AlertTriangle style={{ width: 14, height: 14, color: '#FAC775', flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: '#FAC775', margin: 0 }}>
                  {missingBalances.length} collègue{missingBalances.length > 1 ? 's' : ''} sans solde initialisé ({missingBalances.map(c => c.name).join(', ')})
                </p>
                <button onClick={initMissingBalances} style={{ marginLeft: 'auto', padding: '5px 12px', background: '#EF9F2720', border: '1px solid #EF9F2740', borderRadius: 8, color: '#FAC775', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
                  Initialiser à 25j
                </button>
              </div>
            )}

            {bLoading ? <Spinner /> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                {(balances ?? []).map((b: any) => (
                  <BalanceCard key={b.id} balance={b} onEdit={setEditBalance} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CALENDAR TAB ── */}
        {tab === 'calendar' && (
          <div style={{ maxWidth: 900 }}>
            <LeaveCalendar requests={requests ?? []} />
          </div>
        )}
      </div>
    </div>
  )
}
