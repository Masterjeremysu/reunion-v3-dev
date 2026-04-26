import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isBefore, addDays, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const fDate = (d: string | Date, fmt = 'dd MMM yyyy') =>
  format(new Date(d), fmt, { locale: fr })

export const fDateTime = (d: string | Date) =>
  format(new Date(d), "dd MMM yyyy '·' HH:mm", { locale: fr })

export const fRelative = (d: string | Date) =>
  formatDistanceToNow(new Date(d), { addSuffix: true, locale: fr })

export const isOverdue = (d: string | Date) => isBefore(new Date(d), new Date())

export const isDueSoon = (d: string | Date, days = 30) => {
  const now = new Date()
  const target = new Date(d)
  return !isBefore(target, now) && isBefore(target, addDays(now, days))
}

export const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

export const getWeekStart = (d = new Date()) =>
  startOfWeek(d, { weekStartsOn: 1 })

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
