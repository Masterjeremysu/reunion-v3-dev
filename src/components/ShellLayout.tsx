import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { useTheme } from './ThemeProvider'
import {
  LayoutDashboard, Users, CalendarDays, CheckSquare,
  FileText, Car, Heart, Search, Bell, LogOut, Sun, Moon,
  Calendar, Plane, Shield, ShoppingCart, AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import { ROUTES } from '../constants'
import { useGlobalSearch } from "./GlobalSearch"
import { GlobalSearch } from './GlobalSearch'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { supabase } from '../lib/supabase'
import { useQuery } from '@tanstack/react-query'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function useSidebarBadges() {
  const { user, organization } = useAuth()

  // ✅ CORRIGÉ : 'actions' → 'action_items'
  const { data: actions } = useQuery({
    queryKey: ['actions', 'badges', organization?.id],
    queryFn: async () => {
      const { data } = await supabase.from('action_items').select('status, due_date').eq('organization_id', organization?.id)
      return data || []
    },
    enabled: !!organization?.id
  })

  const { data: inspections } = useQuery({
    queryKey: ['inspections', 'badges', organization?.id],
    queryFn: async () => {
      const { data } = await supabase.from('vehicle_inspections').select('status').eq('organization_id', organization?.id)
      return data || []
    },
    enabled: !!organization?.id
  })

  const { data: consumables } = useQuery({
    queryKey: ['consumables', 'badges', organization?.id],
    queryFn: async () => {
      const { data } = await supabase.from('consumable_requests').select('status').eq('organization_id', organization?.id).eq('status', 'pending')
      return data || []
    },
    enabled: !!organization?.id
  })

  return {
    openActions: actions?.filter(a => a.status === 'pending' || a.status === 'in_progress').length || 0,
    lateActions: actions?.filter(a => (a.status === 'pending' || a.status === 'in_progress') && a.due_date && new Date(a.due_date) < new Date()).length || 0,
    expiredInspections: inspections?.filter(i => i.status === 'overdue').length || 0,
    soonInspections: inspections?.filter(i => i.status === 'pending').length || 0,
    pendingConsumables: consumables?.length || 0
  }
}

type BadgeLevel = 'info' | 'warn' | 'critical'

function NavBadge({ count, level = 'info' }: { count: number; level?: BadgeLevel | null }) {
  if (count <= 0) return null
  const colors = {
    info: 'bg-blue-500/10 text-blue-500 ring-blue-500/20',
    warn: 'bg-amber-500/10 text-amber-500 ring-amber-500/20',
    critical: 'bg-red-500/10 text-red-500 ring-red-500/20'
  }
  return (
    <span className={cn(
      "min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold ring-1",
      level ? colors[level] : colors.info
    )}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

function PulsingDot({ level = 'warn' }: { level?: 'warn' | 'critical' }) {
  const bg = level === 'critical' ? 'bg-red-500' : 'bg-amber-500'
  return (
    <span className="relative flex h-2 w-2 ml-1">
      <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", bg)} />
      <span className={cn("relative inline-flex rounded-full h-2 w-2", bg)} />
    </span>
  )
}

export function ShellLayout() {
  const { user, organization, signOut, role } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const badges = useSidebarBadges()
  const { open: searchOpen, setOpen: setSearchOpen } = useGlobalSearch()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const handleSignOut = async () => {
    await signOut()
    navigate(ROUTES.LOGIN)
    toast.success('Déconnexion réussie')
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'GT'
  const hasCritical = badges.lateActions > 0 || badges.expiredInspections > 0

  const getPageTitle = () => {
    const path = location.pathname
    if (path === ROUTES.DASHBOARD) return 'Tableau de bord'
    if (path === ROUTES.MEETINGS) return 'Réunions'
    if (path.startsWith('/meetings/')) return 'Détails Réunion'
    if (path === ROUTES.ACTIONS) return 'Mes Actions'
    if (path === ROUTES.COLLEAGUES) return 'L\'Équipe'
    if (path === ROUTES.NOTES) return 'Notes'
    if (path === ROUTES.CONSUMABLES) return 'Consommables'
    if (path === ROUTES.VEHICLES) return 'Véhicules'
    if (path === ROUTES.SCHEDULE) return 'Planning'
    if (path === ROUTES.LEAVES) return 'Congés'
    if (path === ROUTES.MOOD) return 'Baromètre'
    if (path === ROUTES.ADMIN) return 'Admin'
    return 'Réunions GT'
  }

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  const isEnabled = (key: string) => {
    const features = (organization?.settings as any)?.features
    if (!features) return true
    return features[key] !== false
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}

      {/* Mobile background dim overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Top App Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-[60px] bg-card/80 backdrop-blur-md border-b border-border z-40 flex justify-between items-center px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/20">
            <CalendarDays className="w-4 h-4 text-brand-foreground" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-foreground leading-tight">{getPageTitle()}</h1>
            <p className="text-[10px] text-brand font-semibold uppercase tracking-wider">{organization?.name || 'Réunions GT'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors active:scale-95">
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-[11px] font-bold text-white shadow-sm ring-2 ring-background">
            {initials}
          </div>
        </div>
      </div>

      {/* Desktop Sidebar / Mobile Drawer */}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-50 w-[260px] flex flex-col bg-card border-r border-border transform transition-transform duration-300 ease-in-out md:transform-none shadow-2xl md:shadow-none",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Drawer Header Mobile-only */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex flex-col">
             <span className="text-xs text-muted-foreground font-mono">Connecté en tant que</span>
             <span className="font-semibold text-sm text-foreground truncate max-w-[180px]">{user?.email}</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Desktop Logo */}
        <div className="hidden md:flex flex-col p-5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-brand/20">
              <CalendarDays className="w-5 h-5 text-brand-foreground" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-foreground m-0 leading-none tracking-tight">Réunions GT</p>
              <p className="text-[11px] text-muted-foreground m-0 mt-1 font-mono">{organization?.name || 'v3.0'}</p>
            </div>
          </div>

          <button
            onClick={() => setSearchOpen(true)}
            className="mt-5 w-full flex items-center gap-2 px-3 py-2 bg-input/50 hover:bg-input border border-border rounded-xl cursor-pointer transition-colors group"
          >
            <Search className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            <span className="flex-1 text-left text-[13px] text-muted-foreground group-hover:text-foreground transition-colors">Rechercher...</span>
            <kbd className="text-[10px] text-muted-foreground bg-background border border-border rounded px-1.5 py-0.5 font-mono shadow-sm">⌘K</kbd>
          </button>
        </div>

        {/* Global alert strip */}
        {hasCritical && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-2 shadow-sm">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            <span className="text-[11px] text-destructive font-mono font-semibold tracking-tight">
              {[
                badges.lateActions > 0 && `${badges.lateActions} Action(s)`,
                badges.expiredInspections > 0 && `${badges.expiredInspections} Parc Auto`
              ].filter(Boolean).join(' · ')} Urgent
            </span>
          </div>
        )}

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          <NavSection label="Principal">
            <NavItem to={ROUTES.DASHBOARD} icon={LayoutDashboard} label="Tableau de bord" />
            {isEnabled('meetings') && <NavItem to={ROUTES.MEETINGS} icon={CalendarDays} label="Réunions" />}
            {isEnabled('actions') && (
              <NavItem to={ROUTES.ACTIONS} icon={CheckSquare} label="Mes Actions"
                badge={badges.lateActions > 0 ? badges.lateActions : badges.openActions > 0 ? badges.openActions : 0}
                badgeLevel={badges.lateActions > 0 ? 'critical' : badges.openActions > 0 ? 'warn' : null}
                pulse={badges.lateActions > 0}
              />
            )}
            <NavItem to={ROUTES.COLLEAGUES} icon={Users} label="L'Équipe" />
          </NavSection>

          <NavSection label="Opérations Terrain">
            {isEnabled('notes') && <NavItem to={ROUTES.NOTES} icon={FileText} label="Notes rapides" />}
            {isEnabled('consumables') && (
              <NavItem to={ROUTES.CONSUMABLES} icon={ShoppingCart} label="Consommables"
                badge={badges.pendingConsumables}
                badgeLevel={badges.pendingConsumables > 0 ? 'warn' : null}
              />
            )}
            {isEnabled('vehicles') && (
              <NavItem to={ROUTES.VEHICLES} icon={Car} label="Véhicules"
                badge={badges.expiredInspections > 0 ? badges.expiredInspections : badges.soonInspections > 0 ? badges.soonInspections : 0}
                badgeLevel={badges.expiredInspections > 0 ? 'critical' : badges.soonInspections > 0 ? 'warn' : null}
                pulse={badges.expiredInspections > 0}
              />
            )}
            <NavItem to={ROUTES.SCHEDULE} icon={Calendar} label="Planning Interventions" />
            {isEnabled('leaves') && <NavItem to={ROUTES.LEAVES} icon={Plane} label="Poser un Congé" />}
            {isEnabled('mood') && <NavItem to={ROUTES.MOOD} icon={Heart} label="Baromètre Santé" />}
          </NavSection>

          {role === 'admin' && (
            <NavSection label="Administration">
              <NavItem to={ROUTES.ADMIN} icon={Shield} label="Panel SaaS" />
            </NavSection>
          )}
        </nav>

        {/* Footer (Desktop Menu) */}
        <div className="hidden md:flex flex-col p-4 border-t border-border/50 gap-3 bg-card/50">
          <div className="flex items-center gap-3 w-full">
            <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-[11px] font-bold text-brand shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-foreground truncate">{user?.email}</p>
            </div>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Changer le thème"
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
          <button onClick={handleSignOut} title="Se déconnecter" className="w-full py-2 flex items-center justify-center gap-2 text-destructive hover:bg-destructive/10 rounded-xl transition-colors font-medium text-sm">
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
        {/* Footer (Mobile Menu Form) */}
        <div className="md:hidden mt-auto p-4 border-t border-border bg-card">
          <button onClick={handleSignOut} className="w-full py-3.5 flex items-center justify-center gap-2 bg-destructive/10 text-destructive rounded-xl font-bold text-sm hover:bg-destructive/20 transition-colors">
            <LogOut className="w-5 h-5" /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 md:pb-0 pb-[80px] pt-[60px] md:pt-0 overflow-y-auto bg-background/50">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[72px] bg-card/90 backdrop-blur-xl border-t border-border z-40 flex justify-evenly items-center pb-safe shadow-[0_-4px_25px_rgba(0,0,0,0.05)]">
        <BottomNavItem to={ROUTES.DASHBOARD} icon={LayoutDashboard} label="Accueil" />
        {isEnabled('actions') && (
          <BottomNavItem 
            to={ROUTES.ACTIONS} 
            icon={CheckSquare} 
            label="Actions" 
            badge={badges.lateActions > 0 || badges.openActions > 0 ? (badges.lateActions || badges.openActions) : undefined} 
          />
        )}
        
        {/* Floating Action Menu Toggle */}
        <div className="flex-[0.8] flex justify-center relative z-50">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setSidebarOpen(true)}
            className="w-14 h-14 rounded-2xl bg-brand text-brand-foreground flex items-center justify-center -translate-y-5 shadow-lg shadow-brand/30 ring-4 ring-background"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
               <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </motion.button>
        </div>

        {isEnabled('vehicles') && (
          <BottomNavItem 
            to={ROUTES.VEHICLES} 
            icon={Car} 
            label="Flotte" 
            badge={badges.expiredInspections > 0 ? badges.expiredInspections : undefined} 
          />
        )}
        <BottomNavItem to={ROUTES.SCHEDULE} icon={Calendar} label="Planning" />
      </nav>

    </div>
  )
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="px-5 pb-2 text-[10px] font-bold tracking-widest uppercase text-muted-foreground/80">
        {label}
      </p>
      <div className="space-y-0.5 px-3">
        {children}
      </div>
    </div>
  )
}

function NavItem({ to, icon: Icon, label, badge, badgeLevel, pulse }: {
  to: string; icon: React.ElementType; label: string
  badge?: number; badgeLevel?: BadgeLevel; pulse?: boolean
}) {
  return (
    <NavLink to={to} end={to === ROUTES.DASHBOARD}
      className={({ isActive }) => cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 group relative",
        isActive
          ? "bg-brand/10 text-brand font-semibold"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div layoutId="nav-indicator" className="absolute left-0 w-1 h-6 bg-brand rounded-r-full" />
          )}
          <Icon className={cn("w-[18px] h-[18px] shrink-0 transition-colors", isActive ? "text-brand" : "opacity-80 group-hover:opacity-100")} />
          <span className="flex-1 truncate">{label}</span>
          <NavBadge count={badge ?? 0} level={badgeLevel ?? null} />
          {pulse && <PulsingDot level={badgeLevel === 'critical' ? 'critical' : 'warn'} />}
        </>
      )}
    </NavLink>
  )
}

function BottomNavItem({ to, icon: Icon, label, badge }: { to: string; icon: React.ElementType; label: string, badge?: number }) {
  return (
    <NavLink to={to} className={({ isActive }) => cn(
      "flex-1 flex flex-col items-center justify-center relative transition-colors duration-300",
      isActive ? "text-brand" : "text-muted-foreground"
    )}>
      {({ isActive }) => (
        <>
          <div className="relative">
            <motion.div
              className={cn("px-4 py-1 rounded-full transition-colors", isActive ? "bg-brand/15" : "")}
              layoutId={isActive ? "bottom-nav-bg" : undefined}
            >
              <Icon className={cn("w-5 h-5 transition-transform", isActive ? "scale-110" : "")} />
            </motion.div>
            {badge !== undefined && badge > 0 && (
              <span className="absolute -top-0.5 right-1 bg-destructive text-destructive-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-card shadow-sm">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </div>
          <span className={cn("text-[10px] font-semibold mt-1 tracking-tight transition-all", isActive ? "opacity-100" : "opacity-80")}>{label}</span>
        </>
      )}
    </NavLink>
  )
}
