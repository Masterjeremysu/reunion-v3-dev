import { cn } from '../../utils'
import { Loader2 } from 'lucide-react'

// ── Badge ─────────────────────────────────────────────────────────────────────
type BadgeVariant = 'teal' | 'amber' | 'red' | 'blue' | 'purple' | 'gray' | 'green'
const BADGE_STYLES: Record<BadgeVariant, string> = {
  teal:   'bg-teal-500/15 text-teal-400',
  amber:  'bg-amber-500/15 text-amber-400',
  red:    'bg-red-500/15 text-red-400',
  blue:   'bg-blue-500/15 text-blue-400',
  purple: 'bg-purple-500/15 text-purple-400',
  gray:   'bg-slate-500/15 text-slate-400',
  green:  'bg-green-500/15 text-green-400',
}
export function Badge({ variant = 'gray', children, className }: {
  variant?: BadgeVariant; children: React.ReactNode; className?: string
}) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium', BADGE_STYLES[variant], className)}>
      {children}
    </span>
  )
}

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className, onClick }: {
  children: React.ReactNode; className?: string; onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl',
        onClick && 'cursor-pointer hover:border-[var(--color-border2)] transition-colors',
        className
      )}
    >
      {children}
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('w-5 h-5 animate-spin text-teal-500', className)} />
}

// ── PageHeader ────────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }: {
  title: string; subtitle?: string; actions?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-sidebar)]">
      <div>
        <h1 className="text-base font-medium text-[var(--color-text-main)]">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ElementType; title: string; description?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-12 h-12 rounded-xl bg-[var(--color-bg-input)] flex items-center justify-center">
        <Icon className="w-6 h-6 text-slate-500" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-300">{title}</p>
        {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
      </div>
      {action}
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-teal-900 text-teal-300',
  'bg-purple-900 text-purple-300',
  'bg-blue-900 text-blue-300',
  'bg-amber-900 text-amber-300',
  'bg-pink-900 text-pink-300',
]
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const colorIdx = name.charCodeAt(0) % AVATAR_COLORS.length
  const sizeClass = size === 'sm' ? 'w-6 h-6 text-[9px]' : size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-[11px]'
  return (
    <div className={cn('rounded-full flex items-center justify-center font-medium flex-shrink-0', AVATAR_COLORS[colorIdx], sizeClass)}>
      {initials}
    </div>
  )
}

// ── Button ────────────────────────────────────────────────────────────────────
type BtnVariant = 'default' | 'primary' | 'ghost' | 'danger'
const BTN_STYLES: Record<BtnVariant, string> = {
  default: 'bg-transparent border border-[var(--color-border2)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-input)] hover:text-[var(--color-text-main)]',
  primary: 'bg-teal-600 border border-teal-600 text-white hover:bg-teal-700',
  ghost:   'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5',
  danger:  'bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10',
}
export function Button({ variant = 'default', size = 'md', children, className, ...props }: {
  variant?: BtnVariant; size?: 'sm' | 'md'; children: React.ReactNode; className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none',
        size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm',
        BTN_STYLES[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────
export const inputClass = 'w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-faded)] outline-none focus:border-teal-500 transition-colors'

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, 'resize-none', className)} {...props} />
}

// ── Section label ─────────────────────────────────────────────────────────────
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-medium tracking-widest text-slate-500 uppercase mb-2">{children}</p>
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider() {
  return <div className="h-px bg-[var(--color-border)] my-4" />
}
