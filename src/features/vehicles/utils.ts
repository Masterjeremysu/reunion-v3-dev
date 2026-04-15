import { differenceInDays } from 'date-fns'
import { Shield, Zap, Wrench, RefreshCw } from 'lucide-react'

export type InspStatus = 'pending' | 'completed' | 'overdue' | 'failed_reinspection'

export function daysUntil(d: string) { return differenceInDays(new Date(d), new Date()) }

export function urgencyLevel(insp: any): 'critical' | 'warn' | 'soon' | 'ok' {
  if (insp.status === 'overdue') return 'critical'
  if (insp.status === 'failed_reinspection') return 'critical'
  const days = daysUntil(insp.due_date)
  if (days < 0) return 'critical'
  if (days <= 15) return 'warn'
  if (days <= 45) return 'soon'
  return 'ok'
}

export function vehicleUrgency(inspections: any[]): 'critical' | 'warn' | 'soon' | 'ok' {
  if (!inspections.length) return 'ok'
  const levels = ['critical', 'warn', 'soon', 'ok']
  return inspections.map(urgencyLevel).sort((a, b) => levels.indexOf(a) - levels.indexOf(b))[0]
}

export const URGENCY = {
  critical: { color: '#E24B4A', bg: '#E24B4A12', border: '#E24B4A30', label: 'Critique', glow: '#E24B4A40' },
  warn:     { color: '#EF9F27', bg: '#EF9F2712', border: '#EF9F2730', label: 'Urgent',   glow: '#EF9F2740' },
  soon:     { color: '#378ADD', bg: '#378ADD12', border: '#378ADD30', label: 'À venir',  glow: '#378ADD40' },
  ok:       { color: '#1D9E75', bg: '#1D9E7512', border: '#1D9E7530', label: 'OK',       glow: '#1D9E7540' },
}

export const INSP_CONF: Record<string, { color: string; icon: any; short: string }> = {
  'Contrôle technique': { color: '#378ADD', icon: Shield,    short: 'CT'  },
  'Contrôle pollution': { color: '#1D9E75', icon: Zap,       short: 'CP'  },
  'VGP':                { color: '#EF9F27', icon: Wrench,    short: 'VGP' },
  'Révision':           { color: '#7F77DD', icon: RefreshCw, short: 'RÉV' },
}
