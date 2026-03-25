import { useState, useEffect } from 'react'
import { useUpdateMeeting } from './useMeetings'
import { useColleagues } from '../colleagues/useColleagues'
import {
  X, Plus, Check, ChevronDown, Loader2,
  CalendarDays, Clock, Users, FileText,
  ThumbsUp, ThumbsDown, AlertTriangle, Heart, Trash2
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

type CRCategory = 'successes' | 'failures' | 'sensitive_points' | 'relational_points'

const CR_SECTIONS: { key: CRCategory; label: string; color: string; bg: string; border: string; icon: any; placeholder: string }[] = [
  { key: 'successes',          label: 'Succès',           color: '#1D9E75', bg: '#1D9E7508', border: '#1D9E7525', icon: ThumbsUp,      placeholder: 'Ex: Livraison en avance, objectif atteint...' },
  { key: 'failures',           label: 'Défauts',           color: '#E24B4A', bg: '#E24B4A08', border: '#E24B4A25', icon: ThumbsDown,    placeholder: 'Ex: Machine en panne, retard fournisseur...' },
  { key: 'sensitive_points',   label: 'Points sensibles',  color: '#EF9F27', bg: '#EF9F2708', border: '#EF9F2725', icon: AlertTriangle, placeholder: 'Ex: Tension charge de travail...' },
  { key: 'relational_points',  label: 'Points relationnels',color: '#7F77DD', bg: '#7F77DD08', border: '#7F77DD25', icon: Heart,        placeholder: 'Ex: Conflit, bonne cohésion...' },
]

function parseItems(arr: string[]): string[] {
  return (arr || []).map(s => {
    const m = s.match(/^[0-9a-f\-]{36}::(.+)$/i)
    if (m) return m[1].trim()
    if (/^[0-9a-f]{8}-/i.test(s)) return ''
    return s.trim()
  }).filter(Boolean)
}

function ColleagueAvatar({ name, size = 22 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const colors = [
    { bg: '#1D9E7520', color: '#5DCAA5' }, { bg: '#7F77DD20', color: '#AFA9EC' },
    { bg: '#378ADD20', color: '#85B7EB' }, { bg: '#EF9F2720', color: '#FAC775' },
    { bg: '#E24B4A20', color: '#F09595' },
  ]
  const { bg, color } = colors[name.charCodeAt(0) % colors.length]
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 700, color, flexShrink: 0 }}>
      {initials}
    </div>
  )
}

function ListEditor({ items, onChange, placeholder, color }: {
  items: string[]; onChange: (items: string[]) => void; placeholder: string; color: string
}) {
  const update = (idx: number, val: string) => { const n = [...items]; n[idx] = val; onChange(n) }
  const remove = (idx: number) => { const n = items.filter((_, i) => i !== idx); onChange(n.length ? n : ['']) }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 10 }}>
      {items.map((item, idx) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <input value={item} onChange={e => update(idx, e.target.value)} placeholder={placeholder}
            style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#e8eaf0', outline: 'none' }} />
          {items.length > 1 && (
            <button type="button" onClick={() => remove(idx)}
              style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.15)', borderRadius: 6, display: 'flex' }}>
              <Trash2 style={{ width: 12, height: 12 }} />
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ''])}
        style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: color, background: 'none', border: 'none', cursor: 'pointer', marginLeft: 14 }}>
        <Plus style={{ width: 10, height: 10 }} /> Ajouter
      </button>
    </div>
  )
}

function SectionHeader({ label, icon: Icon, color, open, onToggle, count }: any) {
  return (
    <button type="button" onClick={onToggle}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}12`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon style={{ width: 13, height: 13, color }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: open ? color : 'rgba(255,255,255,0.7)' }}>{label}</span>
      {count > 0 && <span style={{ fontSize: 10, color, background: `${color}15`, borderRadius: 20, padding: '1px 7px', fontFamily: 'monospace', fontWeight: 600 }}>{count}</span>}
      <ChevronDown style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', marginLeft: 'auto' }} />
    </button>
  )
}

export function EditMeetingModal({ meeting, onClose }: { meeting: any; onClose: () => void }) {
  const updateMeeting = useUpdateMeeting()
  const { data: colleagues } = useColleagues()

  const [title,       setTitle]       = useState(meeting.title || '')
  const [description, setDescription] = useState(meeting.description || '')
  const [date,        setDate]        = useState(meeting.date ? meeting.date.slice(0,10) : format(new Date(),'yyyy-MM-dd'))
  const [time,        setTime]        = useState(meeting.date ? meeting.date.slice(11,16) : '09:00')
  const [selColleagues, setSelColleagues] = useState<string[]>(meeting.colleagues_ids || [])
  const [submitting,  setSubmitting]  = useState(false)
  const [openSection, setOpenSection] = useState<string | null>(null)

  const [crState, setCrState] = useState<Record<CRCategory, string[]>>({
    successes:          parseItems(meeting.successes)          .length ? parseItems(meeting.successes)          : [''],
    failures:           parseItems(meeting.failures)           .length ? parseItems(meeting.failures)           : [''],
    sensitive_points:   parseItems(meeting.sensitive_points)   .length ? parseItems(meeting.sensitive_points)   : [''],
    relational_points:  parseItems(meeting.relational_points)  .length ? parseItems(meeting.relational_points)  : [''],
  })

  const activeColleagues = (colleagues || []).filter((c: any) => c.is_active !== false)
  const toggleColleague = (id: string) =>
    setSelColleagues(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Titre requis'); return }
    setSubmitting(true)
    try {
      const clean = (arr: string[]) => arr.map(s => s.trim()).filter(Boolean)
      await updateMeeting.mutateAsync({
        id: meeting.id,
        title: title.trim(),
        description: description.trim() || null,
        date: `${date}T${time}:00`,
        colleagues_ids: selColleagues.length > 0 ? selColleagues : null,
        successes:         clean(crState.successes),
        failures:          clean(crState.failures),
        sensitive_points:  clean(crState.sensitive_points),
        relational_points: clean(crState.relational_points),
      })
      toast.success('Réunion mise à jour')
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const fieldStyle = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#e8eaf0', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.65)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 520, height: '100%', background: '#0d1018', borderLeft: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideIn 0.22s ease' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 10, color: '#EF9F27', fontFamily: 'monospace', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>Modifier la réunion</p>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: '3px 0 0', letterSpacing: '-0.02em' }}>Édition du compte-rendu</h2>
            </div>
            <button onClick={onClose} style={{ padding: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex' }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
          {/* Ligne orange pour différencier de la création */}
          <div style={{ height: 2, background: 'linear-gradient(90deg, #EF9F27, transparent)', borderRadius: 2, marginTop: 14 }} />
        </div>

        {/* Body scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* Titre + date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 2 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', marginBottom: 6 }}>Titre *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} required style={fieldStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', marginBottom: 6 }}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                  style={{ ...fieldStyle, resize: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', marginBottom: 6 }}>Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} style={fieldStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', marginBottom: 6 }}>Heure</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} style={fieldStyle} />
                </div>
              </div>
            </div>

            {/* Participants */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <SectionHeader label={`Participants${selColleagues.length > 0 ? ` (${selColleagues.length})` : ''}`}
                icon={Users} color="#378ADD" open={openSection === 'team'}
                onToggle={() => setOpenSection(openSection === 'team' ? null : 'team')} count={0} />
              {openSection === 'team' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingBottom: 12 }}>
                  {activeColleagues.map((c: any) => {
                    const sel = selColleagues.includes(c.id)
                    return (
                      <button key={c.id} type="button" onClick={() => toggleColleague(c.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: sel ? '#378ADD08' : 'rgba(255,255,255,0.02)', border: `1px solid ${sel ? '#378ADD40' : 'rgba(255,255,255,0.07)'}`, borderRadius: 8, cursor: 'pointer' }}>
                        <ColleagueAvatar name={c.name} size={28} />
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: '#e8eaf0', margin: 0 }}>{c.name}</p>
                          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{c.post}</p>
                        </div>
                        {sel && <Check style={{ width: 13, height: 13, color: '#378ADD', flexShrink: 0 }} />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Sections CR */}
            {CR_SECTIONS.map(sec => {
              const items = crState[sec.key]
              const filled = items.filter(s => s.trim()).length
              return (
                <div key={sec.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <SectionHeader label={sec.label} icon={sec.icon} color={sec.color}
                    open={openSection === sec.key} count={filled}
                    onToggle={() => setOpenSection(openSection === sec.key ? null : sec.key)} />
                  {openSection === sec.key && (
                    <ListEditor items={crState[sec.key]} placeholder={sec.placeholder} color={sec.color}
                      onChange={items => setCrState(prev => ({ ...prev, [sec.key]: items }))} />
                  )}
                </div>
              )
            })}
          </form>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button type="button" onClick={onClose}
            style={{ flex: 1, padding: '11px 0', fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, cursor: 'pointer' }}>
            Annuler
          </button>
          <button type="button" onClick={handleSubmit as any} disabled={submitting || !title.trim()}
            style={{ flex: 1, padding: '11px 0', fontSize: 13, fontWeight: 700, color: '#050709', background: '#EF9F27', border: 'none', borderRadius: 10, cursor: 'pointer', opacity: !title.trim() ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {submitting ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <Check style={{ width: 14, height: 14 }} />}
            {submitting ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
          </button>
        </div>
      </div>
    </div>
  )
}
