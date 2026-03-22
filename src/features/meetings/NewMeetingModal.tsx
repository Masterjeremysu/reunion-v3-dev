import { useState, useEffect } from 'react'
import { useMeetings, useCreateMeeting } from './useMeetings'
import { useColleagues } from '../colleagues/useColleagues'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  X, Check, Plus, ChevronRight, ChevronLeft,
  ThumbsUp, ThumbsDown, AlertCircle, Heart,
  Users, CalendarDays, Clock, FileText, Loader2, Trash2
} from 'lucide-react'
import { Avatar } from '../../components/ui'
import { toast } from 'sonner'

function useNextMeetingTitle() {
  return `Réunion GT Hebdo — ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}`
}

// ─── Step 1 : Infos ───────────────────────────────────────────────────────────
function StepInfo({ title, setTitle, description, setDescription, date, setDate, time, setTime }: {
  title: string; setTitle: (v: string) => void
  description: string; setDescription: (v: string) => void
  date: string; setDate: (v: string) => void
  time: string; setTime: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-7">
      <div>
        <label style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
          Titre de la réunion
        </label>
        <input
          value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Ex: Réunion GT Hebdo — 22/03/2026"
          autoFocus
          style={{ width: '100%', background: 'transparent', borderBottom: '2px solid #1D9E75', paddingBottom: 8, fontSize: 18, color: '#fff', outline: 'none', fontFamily: "'DM Mono',monospace" }}
        />
      </div>
      <div>
        <label style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
          Description / ordre du jour
        </label>
        <textarea
          value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Contexte, objectifs, points à aborder..."
          rows={3}
          style={{ width: '100%', background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8, fontSize: 13, color: 'rgba(255,255,255,0.7)', outline: 'none', resize: 'none', fontFamily: "'DM Mono',monospace" }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <label style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Date
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8 }}>
            <CalendarDays style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', fontSize: 13, color: '#fff', outline: 'none', fontFamily: "'DM Mono',monospace" }} />
          </div>
        </div>
        <div>
          <label style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Heure
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8 }}>
            <Clock style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', fontSize: 13, color: '#fff', outline: 'none', fontFamily: "'DM Mono',monospace" }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Step 2 : Participants ────────────────────────────────────────────────────
function StepPeople({ colleagues, selected, onToggle }: {
  colleagues: any[]; selected: string[]; onToggle: (id: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {colleagues.length === 0 && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', textAlign: 'center', paddingTop: 32 }}>Aucun collègue enregistré</p>}
      {colleagues.map(c => {
        const isSelected = selected.includes(c.id)
        return (
          <button key={c.id} type="button" onClick={() => onToggle(c.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px',
              borderRadius: 12, border: `1px solid ${isSelected ? '#1D9E7560' : 'rgba(255,255,255,0.06)'}`,
              background: isSelected ? '#1D9E7510' : 'transparent',
              cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
            }}>
            <Avatar name={c.name} size="md" />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#fff', margin: 0 }}>{c.name}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0, fontFamily: "'DM Mono',monospace" }}>{c.post}</p>
            </div>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', border: `2px solid ${isSelected ? '#1D9E75' : 'rgba(255,255,255,0.15)'}`,
              background: isSelected ? '#1D9E75' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s',
            }}>
              {isSelected && <Check style={{ width: 11, height: 11, color: '#fff' }} />}
            </div>
          </button>
        )
      })}
      {selected.length > 0 && (
        <p style={{ fontSize: 10, textAlign: 'center', marginTop: 4, color: '#1D9E75', fontFamily: "'DM Mono',monospace" }}>
          {selected.length} participant{selected.length > 1 ? 's' : ''} sélectionné{selected.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

// ─── Step 3 : Compte-rendu (tout en même temps) ───────────────────────────────
const CR_SECTIONS = [
  { key: 'successes',  label: 'Succès',            icon: ThumbsUp,    color: '#1D9E75', border: '#1D9E7530', bg: '#1D9E7508', placeholder: 'Un point positif...' },
  { key: 'failures',   label: 'Défauts',            icon: ThumbsDown,  color: '#E24B4A', border: '#E24B4A30', bg: '#E24B4A08', placeholder: 'Un point à améliorer...' },
  { key: 'sensitive',  label: 'Points sensibles',   icon: AlertCircle, color: '#EF9F27', border: '#EF9F2730', bg: '#EF9F2708', placeholder: 'Un point de vigilance...' },
  { key: 'relational', label: 'Points relationnels',icon: Heart,       color: '#7F77DD', border: '#7F77DD30', bg: '#7F77DD08', placeholder: 'Un point relationnel...' },
]

function CRSection({ section, items, onChange }: {
  section: typeof CR_SECTIONS[0]
  items: string[]
  onChange: (items: string[]) => void
}) {
  const Icon = section.icon

  const update = (i: number, val: string) => {
    const next = [...items]; next[i] = val; onChange(next)
  }
  const add = () => onChange([...items, ''])
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))

  const validCount = items.filter(s => s.trim()).length

  return (
    <div style={{
      border: `1px solid ${section.border}`,
      borderRadius: 14,
      background: section.bg,
      overflow: 'hidden',
    }}>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px',
        borderBottom: `1px solid ${section.border}`,
        background: section.bg,
      }}>
        <Icon style={{ width: 13, height: 13, color: section.color, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 500, color: section.color, fontFamily: "'DM Mono',monospace", letterSpacing: '0.06em' }}>
          {section.label}
        </span>
        {validCount > 0 && (
          <span style={{
            marginLeft: 'auto', fontSize: 10, color: section.color,
            background: section.border, borderRadius: 20, padding: '1px 7px',
            fontFamily: "'DM Mono',monospace",
          }}>
            {validCount}
          </span>
        )}
      </div>

      {/* Items */}
      <div style={{ padding: '8px 14px 10px' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}
            className="group">
            <div style={{ width: 3, height: 3, borderRadius: '50%', background: item.trim() ? section.color : 'rgba(255,255,255,0.15)', flexShrink: 0, marginTop: 1 }} />
            <input
              value={item}
              onChange={e => update(i, e.target.value)}
              placeholder={section.placeholder}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); add() }
                if (e.key === 'Backspace' && !item && items.length > 1) { e.preventDefault(); remove(i) }
              }}
              style={{
                flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)',
                padding: '5px 0', fontSize: 13, color: '#e8eaf0', outline: 'none',
                fontFamily: "'DM Mono',monospace",
              }}
            />
            {items.length > 1 && item.trim() === '' && (
              <button type="button" onClick={() => remove(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.15)', padding: 2 }}>
                <X style={{ width: 10, height: 10 }} />
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={add}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: section.color, opacity: 0.6, fontFamily: "'DM Mono',monospace",
            padding: 0, transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
        >
          <div style={{ width: 14, height: 14, border: `1px solid ${section.color}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus style={{ width: 9, height: 9 }} />
          </div>
          Ajouter
        </button>
      </div>
    </div>
  )
}

function StepCR({ successes, setSuccesses, failures, setFailures, sensitive, setSensitive, relational, setRelational }: {
  successes: string[]; setSuccesses: (v: string[]) => void
  failures: string[]; setFailures: (v: string[]) => void
  sensitive: string[]; setSensitive: (v: string[]) => void
  relational: string[]; setRelational: (v: string[]) => void
}) {
  const data = [
    { section: CR_SECTIONS[0], items: successes, onChange: setSuccesses },
    { section: CR_SECTIONS[1], items: failures,  onChange: setFailures  },
    { section: CR_SECTIONS[2], items: sensitive,  onChange: setSensitive },
    { section: CR_SECTIONS[3], items: relational, onChange: setRelational },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map(d => (
        <CRSection key={d.section.key} section={d.section} items={d.items} onChange={d.onChange} />
      ))}
    </div>
  )
}

// ─── Progress stepper (3 steps now) ──────────────────────────────────────────
const STEPS = [
  { id: 'info',    label: 'Infos',    icon: FileText, color: '#1D9E75' },
  { id: 'people',  label: 'Équipe',   icon: Users,    color: '#378ADD' },
  { id: 'cr',      label: 'Compte-rendu', icon: FileText, color: '#7F77DD' },
]

// ─── Main modal ───────────────────────────────────────────────────────────────
export function NewMeetingModal({ onClose }: { onClose: () => void }) {
  const { data: meetings } = useMeetings()
  const { data: colleagues } = useColleagues()
  const createMeeting = useCreateMeeting()
  const defaultTitle = useNextMeetingTitle()

  const [step, setStep] = useState(0)
  const [title, setTitle] = useState(defaultTitle)
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [time, setTime] = useState('09:00')
  const [selectedColleagues, setSelectedColleagues] = useState<string[]>([])
  const [successes, setSuccesses] = useState([''])
  const [failures, setFailures] = useState([''])
  const [sensitive, setSensitive] = useState([''])
  const [relational, setRelational] = useState([''])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const toggleColleague = (id: string) =>
    setSelectedColleagues(p => p.includes(id) ? p.filter(c => c !== id) : [...p, id])

  const clean = (arr: string[]) => arr.map(s => s.trim()).filter(Boolean)

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('Le titre est obligatoire'); setStep(0); return }
    await createMeeting.mutateAsync({
      title: title.trim(),
      description: description || null,
      date: `${date}T${time}:00`,
      colleagues_ids: selectedColleagues.length > 0 ? selectedColleagues : null,
      successes: clean(successes),
      failures: clean(failures),
      sensitive_points: clean(sensitive),
      relational_points: clean(relational),
      created_by_user_id: null,
    })
    onClose()
  }

  const currentStep = STEPS[step]
  const accentColor = currentStep.color
  const progress = (step / (STEPS.length - 1)) * 100

  const stepTitles = ['Informations générales', 'Participants présents', 'Compte-rendu complet']

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <div style={{ height: '100%', width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0d1018', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Header */}
        <div style={{ flexShrink: 0, padding: '28px 32px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4, color: accentColor, fontFamily: "'DM Mono',monospace" }}>
                Nouvelle réunion · étape {step + 1}/{STEPS.length}
              </p>
              <h2 style={{ fontSize: 22, fontWeight: 500, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>{stepTitles[step]}</h2>
            </div>
            <button onClick={onClose} style={{ padding: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {/* Progress */}
          <div style={{ marginTop: 24, position: 'relative' }}>
            <div style={{ height: 1, width: '100%', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, height: 1, width: `${progress}%`, background: accentColor, transition: 'width 0.4s ease, background 0.3s ease' }} />
          </div>

          {/* Step dots */}
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 12, paddingBottom: 24 }}>
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const done = i < step
              const active = i === step
              return (
                <button key={s.id} type="button" onClick={() => i < step && setStep(i)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: i < step ? 'pointer' : 'default', padding: 0 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                    background: done ? s.color : active ? s.color + '20' : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${done || active ? s.color : 'rgba(255,255,255,0.1)'}`,
                  }}>
                    {done
                      ? <Check style={{ width: 13, height: 13, color: '#fff' }} />
                      : <Icon style={{ width: 13, height: 13, color: active ? s.color : 'rgba(255,255,255,0.2)' }} />
                    }
                  </div>
                  <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", letterSpacing: '0.05em', color: active ? s.color : done ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.18)' }}>
                    {s.label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Separator */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginLeft: -32, marginRight: -32 }} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          {step === 0 && (
            <StepInfo
              title={title} setTitle={setTitle}
              description={description} setDescription={setDescription}
              date={date} setDate={setDate}
              time={time} setTime={setTime}
            />
          )}
          {step === 1 && (
            <StepPeople
              colleagues={colleagues ?? []}
              selected={selectedColleagues}
              onToggle={toggleColleague}
            />
          )}
          {step === 2 && (
            <StepCR
              successes={successes} setSuccesses={setSuccesses}
              failures={failures} setFailures={setFailures}
              sensitive={sensitive} setSensitive={setSensitive}
              relational={relational} setRelational={setRelational}
            />
          )}
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0, padding: '16px 32px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 12 }}>
          {step > 0 && (
            <button type="button" onClick={() => setStep(s => s - 1)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', fontSize: 13, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}>
              <ChevronLeft style={{ width: 14, height: 14 }} /> Retour
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step === 2 && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: "'DM Mono',monospace" }}>
              Entrée pour ajouter une ligne
            </span>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={() => setStep(s => s + 1)}
              disabled={step === 0 && !title.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', fontSize: 13, fontWeight: 500, color: '#fff', background: accentColor, border: 'none', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s', opacity: step === 0 && !title.trim() ? 0.3 : 1 }}>
              Suivant <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={createMeeting.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', fontSize: 13, fontWeight: 500, color: '#fff', background: accentColor, border: 'none', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s', opacity: createMeeting.isPending ? 0.6 : 1 }}>
              {createMeeting.isPending
                ? <><Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Création...</>
                : <><Check style={{ width: 14, height: 14 }} /> Créer la réunion</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
