import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeetings } from '../features/meetings/useMeetings'
import { useActions } from '../features/actions/useActions'
import { useColleagues } from '../features/colleagues/useColleagues'
import { useVehicles } from '../features/vehicles/useVehicles'
import { Search, X, CalendarDays, CheckSquare, Users, Car, ArrowRight } from 'lucide-react'

type Result = {
  id: string; type: 'meeting' | 'action' | 'colleague' | 'vehicle'
  title: string; subtitle: string; route: string; color: string; icon: any
}

const TYPE_CONFIG = {
  meeting:   { color: '#1D9E75', icon: CalendarDays, label: 'Réunion'  },
  action:    { color: '#7F77DD', icon: CheckSquare,  label: 'Action'   },
  colleague: { color: '#378ADD', icon: Users,        label: 'Collègue' },
  vehicle:   { color: '#EF9F27', icon: Car,          label: 'Véhicule' },
}

function highlight(text: string, query: string) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return text
  return text.slice(0, idx) +
    `<mark style="background:#1D9E7530;color:#5DCAA5;border-radius:2px;padding:0 1px">` +
    text.slice(idx, idx + query.length) + '</mark>' +
    text.slice(idx + query.length)
}

export function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery]   = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const { data: meetings }   = useMeetings()
  const { data: actions }    = useActions()
  const { data: colleagues } = useColleagues()
  const { data: vehicles }   = useVehicles()

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => s + 1) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(0, s - 1)) }
      if (e.key === 'Enter' && results[selected]) goTo(results[selected])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q || q.length < 2) return []
    const out: Result[] = []

    ;(meetings || []).filter(m => m.title?.toLowerCase().includes(q)).slice(0, 4).forEach(m => {
      out.push({ id: m.id, type: 'meeting', title: m.title, subtitle: m.date?.slice(0,10) || '', route: '/meetings', color: '#1D9E75', icon: CalendarDays })
    })
    ;(actions || []).filter((a: any) => a.description?.toLowerCase().includes(q)).slice(0, 4).forEach((a: any) => {
      out.push({ id: a.id, type: 'action', title: a.description, subtitle: `Statut : ${a.status}`, route: '/actions', color: '#7F77DD', icon: CheckSquare })
    })
    ;(colleagues || []).filter((c: any) => c.name?.toLowerCase().includes(q)).slice(0, 4).forEach((c: any) => {
      out.push({ id: c.id, type: 'colleague', title: c.name, subtitle: c.post || '', route: '/colleagues', color: '#378ADD', icon: Users })
    })
    ;(vehicles || []).filter((v: any) => (v.name + (v.license_plate || '')).toLowerCase().includes(q)).slice(0, 3).forEach((v: any) => {
      out.push({ id: v.id, type: 'vehicle', title: v.name, subtitle: v.license_plate || v.type, route: '/vehicles', color: '#EF9F27', icon: Car })
    })
    return out
  }, [query, meetings, actions, colleagues, vehicles])

  useEffect(() => { setSelected(0) }, [query])

  const goTo = (r: Result) => { navigate(r.route); onClose() }

  const grouped = results.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {} as Record<string, Result[]>)

  const flat = Object.values(grouped).flat()

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh', background: 'var(--color-overlay)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <style>{`@keyframes fadeDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}} mark{background:#1D9E7530!important;color:#5DCAA5!important;border-radius:2px;padding:0 1px}`}</style>

      <div style={{ width: 580, background: '#0d1018', border: '1px solid var(--color-border2)', borderRadius: 16, overflow: 'hidden', animation: 'fadeDown .18s ease', boxShadow: '0 24px 60px var(--color-overlay)' }}>

        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--color-border)' }}>
          <Search style={{ width: 16, height: 16, color: '#1D9E75', flexShrink: 0 }} />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher une réunion, action, collègue, véhicule..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 15, color: 'var(--color-text-main)', fontFamily: 'inherit' }} />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: 2 }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          )}
          <kbd style={{ fontSize: 10, color: 'var(--color-text-faded)', background: 'var(--color-bg-input)', border: '1px solid var(--color-border2)', borderRadius: 5, padding: '2px 7px', fontFamily: 'monospace' }}>Esc</kbd>
        </div>

        {/* Results */}
        {query.length >= 2 && (
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {flat.length === 0 ? (
              <div style={{ padding: '24px 18px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-faded)' }}>
                Aucun résultat pour « {query} »
              </div>
            ) : (
              Object.entries(grouped).map(([type, items]) => {
                const conf = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG]
                return (
                  <div key={type}>
                    <div style={{ padding: '8px 18px 4px', fontSize: 10, fontWeight: 600, color: conf.color, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                      {conf.label}s
                    </div>
                    {items.map(r => {
                      const idx = flat.indexOf(r)
                      const isSelected = idx === selected
                      const Icon = r.icon
                      return (
                        <button key={r.id} onClick={() => goTo(r)}
                          onMouseEnter={() => setSelected(idx)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', background: isSelected ? 'var(--color-border)' : 'transparent', border: 'none', cursor: 'pointer', transition: 'background .1s', borderLeft: isSelected ? `2px solid ${conf.color}` : '2px solid transparent' }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: `${conf.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon style={{ width: 14, height: 14, color: conf.color }} />
                          </div>
                          <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                            <p style={{ fontSize: 13, color: 'var(--color-text-main)', margin: 0, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              dangerouslySetInnerHTML={{ __html: highlight(r.title, query) }} />
                            {r.subtitle && <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '1px 0 0' }}>{r.subtitle}</p>}
                          </div>
                          {isSelected && <ArrowRight style={{ width: 13, height: 13, color: conf.color, flexShrink: 0 }} />}
                        </button>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Footer hints */}
        {query.length < 2 && (
          <div style={{ padding: '14px 18px', display: 'flex', gap: 20 }}>
            {Object.entries(TYPE_CONFIG).map(([type, conf]) => {
              const Icon = conf.icon
              return (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-faded)' }}>
                  <Icon style={{ width: 12, height: 12, color: conf.color }} />
                  {conf.label}s
                </div>
              )
            })}
          </div>
        )}

        <div style={{ padding: '8px 18px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 16, fontSize: 11, color: 'var(--color-text-faded)' }}>
          <span><kbd style={{ fontFamily: 'monospace', background: 'var(--color-bg-input)', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--color-border2)' }}>↑↓</kbd> naviguer</span>
          <span><kbd style={{ fontFamily: 'monospace', background: 'var(--color-bg-input)', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--color-border2)' }}>↵</kbd> ouvrir</span>
          <span><kbd style={{ fontFamily: 'monospace', background: 'var(--color-bg-input)', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--color-border2)' }}>Esc</kbd> fermer</span>
        </div>
      </div>
    </div>
  )
}

export function useGlobalSearch() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  return { open, setOpen }
}
