import { useState, useRef } from 'react'
import { useCreateMeeting } from './useMeetings'
import { useColleagues } from '../colleagues/useColleagues'
import { supabase } from '../../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { QK } from '../../constants'
import {
  X, Plus, Check, ChevronDown, Loader2,
  CalendarDays, Clock, Users, FileText,
  ThumbsUp, ThumbsDown, AlertTriangle, Heart, Trash2
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────
type CRCategory = 'success' | 'failure' | 'sensitive' | 'relational'
type CRItem = { content: string; attributed_to: string | null; tempId: string }

const CR_SECTIONS: {
  key: CRCategory; label: string; color: string; bg: string; border: string; icon: typeof ThumbsUp; placeholder: string
}[] = [
  { key: 'success',    label: 'Succès',          color: '#1D9E75', bg: '#1D9E7508', border: '#1D9E7525', icon: ThumbsUp,       placeholder: 'Ex: Livraison en avance, objectif atteint...' },
  { key: 'failure',    label: 'Défauts',          color: '#E24B4A', bg: '#E24B4A08', border: '#E24B4A25', icon: ThumbsDown,     placeholder: 'Ex: Machine en panne, retard fournisseur...' },
  { key: 'sensitive',  label: 'Points sensibles', color: '#EF9F27', bg: '#EF9F2708', border: '#EF9F2725', icon: AlertTriangle,  placeholder: 'Ex: Tension charge de travail, délai serré...' },
  { key: 'relational', label: 'Points relationnels', color: '#7F77DD', bg: '#7F77DD08', border: '#7F77DD25', icon: Heart,    placeholder: 'Ex: Conflit entre équipes, bonne cohésion...' },
]

// ─── Avatar initials ──────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: '#1D9E7520', color: '#5DCAA5' }, { bg: '#7F77DD20', color: '#AFA9EC' },
  { bg: '#378ADD20', color: '#85B7EB' }, { bg: '#EF9F2720', color: '#FAC775' },
  { bg: '#E24B4A20', color: '#F09595' }, { bg: '#D4537E20', color: '#ED93B1' },
]
function ColleagueAvatar({ name, size = 22 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length
  const { bg, color } = AVATAR_COLORS[idx]
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 700, color, flexShrink: 0, letterSpacing: '-0.02em' }}>
      {initials}
    </div>
  )
}

// ─── CR Item row ──────────────────────────────────────────────────────────────
function CRItemRow({
  item, color, placeholder, colleagues, onChange, onRemove, autoFocus
}: {
  item: CRItem; color: string; placeholder: string
  colleagues: any[]; onChange: (item: CRItem) => void; onRemove: () => void; autoFocus?: boolean
}) {
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const attributed = colleagues.find(c => c.id === item.attributed_to)

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      {/* Dot */}
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 10 }} />

      {/* Content input */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <input
          value={item.content}
          onChange={e => onChange({ ...item, content: e.target.value })}
          placeholder={placeholder}
          autoFocus={autoFocus}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.07)`,
            borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#e8eaf0',
            outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
          }}
          onFocus={e => (e.target.style.borderColor = color + '80')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.07)')}
        />

        {/* Attribution row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 8px', borderRadius: 20, fontSize: 11,
              background: attributed ? `${color}15` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${attributed ? color + '35' : 'rgba(255,255,255,0.07)'}`,
              color: attributed ? color : 'rgba(255,255,255,0.3)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {attributed ? (
              <>
                <ColleagueAvatar name={attributed.name} size={14} />
                <span style={{ fontFamily: 'monospace' }}>{attributed.name.split(' ')[0]}</span>
              </>
            ) : (
              <>
                <Users style={{ width: 10, height: 10 }} />
                <span style={{ fontFamily: 'monospace' }}>Attribuer à...</span>
              </>
            )}
            <ChevronDown style={{ width: 9, height: 9, opacity: 0.6 }} />
          </button>

          {/* Picker dropdown */}
          {showPicker && (
            <div
              ref={pickerRef}
              style={{
                position: 'absolute', left: 0, top: '100%', marginTop: 4, zIndex: 30,
                background: '#161b26', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, overflow: 'hidden', minWidth: 180,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}
            >
              <button
                type="button"
                onClick={() => { onChange({ ...item, attributed_to: null }); setShowPicker(false) }}
                style={{ width: '100%', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, background: !item.attributed_to ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'left' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X style={{ width: 10, height: 10 }} />
                </div>
                Aucune attribution
              </button>
              {colleagues.map(c => (
                <button
                  key={c.id} type="button"
                  onClick={() => { onChange({ ...item, attributed_to: c.id }); setShowPicker(false) }}
                  style={{ width: '100%', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, background: item.attributed_to === c.id ? `${color}12` : 'transparent', border: 'none', cursor: 'pointer', color: item.attributed_to === c.id ? color : 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'left' }}>
                  <ColleagueAvatar name={c.name} size={18} />
                  <div style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontWeight: 500 }}>{c.name}</span>
                    <span style={{ display: 'block', fontSize: 10, opacity: 0.5 }}>{c.post}</span>
                  </div>
                  {item.attributed_to === c.id && <Check style={{ width: 11, height: 11 }} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Remove */}
      <button
        type="button" onClick={onRemove}
        style={{ padding: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.15)', borderRadius: 6, display: 'flex', transition: 'color 0.15s', flexShrink: 0 }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#E24B4A')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.15)')}>
        <Trash2 style={{ width: 12, height: 12 }} />
      </button>
    </div>
  )
}

// ─── Section collapsible ──────────────────────────────────────────────────────
function CRSection({
  section, items, colleagues, onChange
}: {
  section: typeof CR_SECTIONS[0]; items: CRItem[]; colleagues: any[]
  onChange: (items: CRItem[]) => void
}) {
  const [open, setOpen] = useState(false)
  const Icon = section.icon
  const filled = items.filter(i => i.content.trim()).length

  const addItem = () => {
    onChange([...items, { content: '', attributed_to: null, tempId: Math.random().toString(36) }])
    if (!open) setOpen(true)
  }

  const updateItem = (idx: number, item: CRItem) => {
    const next = [...items]; next[idx] = item; onChange(next)
  }

  const removeItem = (idx: number) => {
    const next = items.filter((_, i) => i !== idx)
    onChange(next.length === 0 ? [{ content: '', attributed_to: null, tempId: Math.random().toString(36) }] : next)
  }

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button" onClick={() => setOpen(!open)}
          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: section.bg, border: `1px solid ${section.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon style={{ width: 13, height: 13, color: section.color }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: open ? section.color : 'rgba(255,255,255,0.7)', transition: 'color 0.15s' }}>{section.label}</span>
          {filled > 0 && (
            <span style={{ fontSize: 10, color: section.color, background: `${section.color}15`, borderRadius: 20, padding: '1px 7px', fontFamily: 'monospace', fontWeight: 600 }}>
              {filled}
            </span>
          )}
          <ChevronDown style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', marginLeft: 'auto' }} />
        </button>
        <button
          type="button" onClick={addItem}
          style={{ padding: '5px 10px', background: `${section.color}12`, border: `1px solid ${section.border}`, borderRadius: 20, color: section.color, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'monospace', flexShrink: 0 }}>
          <Plus style={{ width: 10, height: 10 }} /> Ajouter
        </button>
      </div>

      {open && (
        <div style={{ paddingBottom: 8 }}>
          {items.map((item, idx) => (
            <CRItemRow
              key={item.tempId}
              item={item}
              color={section.color}
              placeholder={section.placeholder}
              colleagues={colleagues}
              onChange={updated => updateItem(idx, updated)}
              onRemove={() => removeItem(idx)}
              autoFocus={idx === items.length - 1 && item.content === ''}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export function NewMeetingModal({ onClose }: { onClose: () => void }) {
  const createMeeting = useCreateMeeting()
  const { data: colleagues } = useColleagues()
  const qc = useQueryClient()

  const [step, setStep] = useState<'info' | 'team' | 'cr'>('info')
  const [title, setTitle] = useState(format(new Date(), `'Réunion GT Hebdo — 'dd/MM/yyyy`))
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [time, setTime] = useState('09:00')
  const [selectedColleagues, setSelectedColleagues] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const makeItems = (): CRItem[] => [{ content: '', attributed_to: null, tempId: Math.random().toString(36) }]
  const [crItems, setCrItems] = useState<Record<CRCategory, CRItem[]>>({
    success: makeItems(), failure: makeItems(), sensitive: makeItems(), relational: makeItems(),
  })

  const activeColleagues = (colleagues ?? []).filter((c: any) => c.is_active !== false)
  const toggleColleague = (id: string) =>
    setSelectedColleagues(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Titre requis'); return }
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const dateTime = `${date}T${time}:00`

      // Créer la réunion
      const meeting = await createMeeting.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        date: dateTime,
        colleagues_ids: selectedColleagues.length > 0 ? selectedColleagues : null,
        successes: crItems.success.filter(i => i.content.trim()).map(i => i.content.trim()),
        failures: crItems.failure.filter(i => i.content.trim()).map(i => i.content.trim()),
        sensitive_points: crItems.sensitive.filter(i => i.content.trim()).map(i => i.content.trim()),
        relational_points: crItems.relational.filter(i => i.content.trim()).map(i => i.content.trim()),
        created_by_user_id: user?.id ?? null,
      })

      // Insérer les cr_items avec attribution dans la nouvelle table
      const itemsToInsert: any[] = []
      const categoryMap: Record<CRCategory, string> = {
        success: 'success', failure: 'failure', sensitive: 'sensitive', relational: 'relational'
      }
      Object.entries(crItems).forEach(([cat, items]) => {
        items.filter(i => i.content.trim()).forEach((item, idx) => {
          itemsToInsert.push({
            meeting_id: meeting.id,
            category: categoryMap[cat as CRCategory],
            content: item.content.trim(),
            attributed_to: item.attributed_to || null,
            order_index: idx,
          })
        })
      })

      if (itemsToInsert.length > 0) {
        await supabase.from('cr_items').insert(itemsToInsert)
        qc.invalidateQueries({ queryKey: ['cr_items', meeting.id] })
      }

      toast.success('Réunion créée avec succès')
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const STEPS = [
    { key: 'info', label: 'Informations', icon: FileText },
    { key: 'team', label: 'Équipe', icon: Users },
    { key: 'cr', label: 'Compte-rendu', icon: Check },
  ] as const

  const fieldStyle = {
    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#e8eaf0', outline: 'none',
    boxSizing: 'border-box' as const, transition: 'border-color 0.15s',
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.65)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <style>{`@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{
        width: 520, height: '100%', background: '#0d1018',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'slideIn 0.25s ease',
        boxShadow: '-24px 0 60px rgba(0,0,0,0.5)',
      }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 10, color: '#1D9E75', fontFamily: 'monospace', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>Nouvelle réunion</p>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '3px 0 0', letterSpacing: '-0.02em' }}>Créer un compte-rendu</h2>
            </div>
            <button onClick={onClose}
              style={{ padding: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex' }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 4 }}>
            {STEPS.map((s, i) => {
              const isCurrent = step === s.key
              const isDone = STEPS.findIndex(x => x.key === step) > i
              return (
                <button key={s.key} type="button"
                  onClick={() => setStep(s.key)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px 8px', borderRadius: 8, border: `1px solid ${isCurrent ? '#1D9E75' : isDone ? '#1D9E7530' : 'rgba(255,255,255,0.07)'}`, background: isCurrent ? '#1D9E7512' : isDone ? '#1D9E7508' : 'transparent', cursor: 'pointer', transition: 'all 0.15s' }}>
                  {isDone ? <Check style={{ width: 11, height: 11, color: '#1D9E75' }} /> : <s.icon style={{ width: 11, height: 11, color: isCurrent ? '#1D9E75' : 'rgba(255,255,255,0.3)' }} />}
                  <span style={{ fontSize: 11, fontWeight: isCurrent ? 600 : 400, color: isCurrent ? '#5DCAA5' : isDone ? '#1D9E75' : 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{s.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* Step 1 — Info */}
          {step === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', marginBottom: 6 }}>Titre *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} required autoFocus style={fieldStyle}
                  onFocus={e => (e.target.style.borderColor = '#1D9E75')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', marginBottom: 6 }}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                  placeholder="Contexte, ordre du jour..."
                  style={{ ...fieldStyle, resize: 'none' }}
                  onFocus={e => (e.target.style.borderColor = '#1D9E75')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CalendarDays style={{ width: 11, height: 11 }} /> Date
                  </label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} style={fieldStyle}
                    onFocus={e => (e.target.style.borderColor = '#1D9E75')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock style={{ width: 11, height: 11 }} /> Heure
                  </label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} style={fieldStyle}
                    onFocus={e => (e.target.style.borderColor = '#1D9E75')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Team */}
          {step === 'team' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8, fontFamily: 'monospace' }}>
                {selectedColleagues.length} participant{selectedColleagues.length > 1 ? 's' : ''} sélectionné{selectedColleagues.length > 1 ? 's' : ''}
              </p>
              {activeColleagues.length === 0 && (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '24px 0' }}>Aucun collègue actif</p>
              )}
              {activeColleagues.map((c: any) => {
                const selected = selectedColleagues.includes(c.id)
                return (
                  <button key={c.id} type="button" onClick={() => toggleColleague(c.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: selected ? '#1D9E7508' : 'rgba(255,255,255,0.02)', border: `1px solid ${selected ? '#1D9E7540' : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}>
                    <ColleagueAvatar name={c.name} size={32} />
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: selected ? '#e8eaf0' : 'rgba(255,255,255,0.7)', margin: 0 }}>{c.name}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '1px 0 0', fontFamily: 'monospace' }}>{c.post}</p>
                    </div>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selected ? '#1D9E75' : 'rgba(255,255,255,0.15)'}`, background: selected ? '#1D9E75' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}>
                      {selected && <Check style={{ width: 10, height: 10, color: '#fff' }} />}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Step 3 — CR avec attribution */}
          {step === 'cr' && (
            <div>
              <div style={{ padding: '10px 14px', background: '#1D9E7508', border: '1px solid #1D9E7520', borderRadius: 10, marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: '#5DCAA5', margin: 0, lineHeight: 1.5 }}>
                  💡 Pour chaque point, vous pouvez l'attribuer à un membre de l'équipe — il apparaîtra dans son profil.
                </p>
              </div>
              {CR_SECTIONS.map(section => (
                <CRSection
                  key={section.key}
                  section={section}
                  items={crItems[section.key]}
                  colleagues={[...activeColleagues, ...selectedColleagues
                    .filter(id => !activeColleagues.find((c: any) => c.id === id))
                    .map(id => colleagues?.find((c: any) => c.id === id))
                    .filter(Boolean)
                  ]}
                  onChange={items => setCrItems(prev => ({ ...prev, [section.key]: items }))}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 10, flexShrink: 0 }}>
          {step !== 'info' && (
            <button type="button"
              onClick={() => setStep(step === 'cr' ? 'team' : 'info')}
              style={{ padding: '11px 16px', fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, cursor: 'pointer' }}>
              ← Retour
            </button>
          )}

          {step !== 'cr' ? (
            <button type="button"
              onClick={() => setStep(step === 'info' ? 'team' : 'cr')}
              disabled={step === 'info' && !title.trim()}
              style={{ flex: 1, padding: '11px 0', fontSize: 13, fontWeight: 600, color: '#fff', background: '#1D9E75', border: 'none', borderRadius: 10, cursor: 'pointer', opacity: step === 'info' && !title.trim() ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              Suivant →
            </button>
          ) : (
            <button
              type="button" onClick={handleSubmit as any} disabled={submitting || !title.trim()}
              style={{ flex: 1, padding: '11px 0', fontSize: 13, fontWeight: 700, color: '#fff', background: '#1D9E75', border: 'none', borderRadius: 10, cursor: 'pointer', opacity: !title.trim() ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {submitting ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <Check style={{ width: 14, height: 14 }} />}
              {submitting ? 'Création...' : 'Créer la réunion'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
