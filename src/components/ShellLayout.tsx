import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, CheckSquare, Users, FileText,
  ShoppingCart, Car, Calendar, LogOut, AlertTriangle, Search, Shield, Sun, Moon, Heart, Plane
} from 'lucide-react'
import { useAuth } from '../features/auth/useAuth'
import { useActions } from '../features/actions/useActions'
import { useAllInspections } from '../features/vehicles/useVehicles'
import { useConsumables } from '../features/consumables/useConsumables'
import { GlobalSearch, useGlobalSearch } from './GlobalSearch'
import { ROUTES } from '../constants'
import { isBefore, addDays } from 'date-fns'
import { toast } from 'sonner'
import { useTheme } from './ThemeProvider'

function isOverdue(d: string) { return isBefore(new Date(d), new Date()) }
function isDueSoon(d: string) { return !isOverdue(d) && isBefore(new Date(d), addDays(new Date(), 30)) }

function useSidebarBadges() {
  const { data: actions } = useActions()
  const { data: inspections } = useAllInspections()
  const { data: consumables } = useConsumables()

  const lateActions = (actions as any[])?.filter((a: any) =>
    a.due_date && isOverdue(a.due_date) && a.status !== 'completed' && a.status !== 'cancelled'
  ).length ?? 0

  const openActions = (actions as any[])?.filter((a: any) =>
    a.status !== 'completed' && a.status !== 'cancelled'
  ).length ?? 0

  const expiredInspections = (inspections as any[])?.filter((i: any) => i.status === 'overdue').length ?? 0
  const soonInspections = (inspections as any[])?.filter((i: any) =>
    i.status !== 'overdue' && i.status !== 'completed' && isDueSoon(i.due_date)
  ).length ?? 0

  const pendingConsumables = (consumables as any[])?.filter((c: any) => c.status === 'pending').length ?? 0

  return { lateActions, openActions, expiredInspections, soonInspections, pendingConsumables }
}

type BadgeLevel = 'critical' | 'warn' | 'info' | null
function NavBadge({ count, level, noDot = false }: { count: number; level: BadgeLevel; noDot?: boolean }) {
  if (!count || !level) return null
  const styles: Record<string, { bg: string; color: string }> = {
    critical: { bg: '#E24B4A20', color: '#F09595' },
    warn:     { bg: '#EF9F2720', color: '#FAC775' },
    info:     { bg: '#1D9E7520', color: '#5DCAA5' },
  }
  const s = styles[level]
  return (
    <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.bg, color: s.color, borderRadius: 20, padding: '0 5px', fontFamily: 'monospace' }}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

function PulsingDot({ level }: { level: 'critical' | 'warn' }) {
  const color = level === 'critical' ? '#E24B4A' : '#EF9F27'
  return (
    <span style={{ position: 'absolute', top: 8, right: 14, width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 0 2px ${color}40`, animation: 'pulse 2s ease-in-out infinite' }} />
  )
}

export function ShellLayout() {
  const { user, organization, signOut, role } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const badges = useSidebarBadges()
  const { open: searchOpen, setOpen: setSearchOpen } = useGlobalSearch()
  
  // Sidebar logic (For mobile, this acts as the "Drawer / Bottom Sheet")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate(ROUTES.LOGIN)
    toast.success('Déconnexion réussie')
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'GT'
  const hasCritical = badges.lateActions > 0 || badges.expiredInspections > 0

  const location = useLocation()
  const closeSidebar = () => setSidebarOpen(false)
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  const isEnabled = (key: string) => {
    const features = (organization?.settings as any)?.features
    if (!features) return true
    return features[key] !== false
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--color-bg-app)', overflow: 'hidden', position: 'relative' }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
        @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        
        .nav-item { transition: all 0.12s; }
        .nav-item:hover { background: var(--color-border) !important; }
        .nav-item.active-link { background: rgba(29,158,117,0.08) !important; color: #5DCAA5 !important; }
        .nav-item.active-link .nav-icon { color: #1D9E75 !important; }
        .search-btn:hover { background: var(--color-border) !important; border-color: var(--color-border2) !important; }
        
        .sidebar-overlay { display: none; }
        .mobile-bottom-nav { display: none; }
        .mobile-top-bar { display: none; }

        /* MATERIAL DESIGN 3 / ANDROID PWA RESPONSIVE FIXES */
        @media (max-width: 768px) {
          .main-content { 
            padding-top: 60px !important; 
            padding-bottom: 90px !important; 
            height: 100vh !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch;
          }
          
          .mobile-hamburger { display: none !important; } /* Killed the old hamburger */
          
          .desktop-sidebar { 
            position: fixed !important; z-index: 60 !important; left: 0; top: 0; bottom: 0; 
            transform: translateX(-100%); transition: transform 0.3s cubic-bezier(0.2, 0, 0, 1); 
            border-radius: 0 24px 24px 0; box-shadow: 20px 0 40px rgba(0,0,0,0.15);
          }
          .desktop-sidebar.open { transform: translateX(0) !important; }
          
          .sidebar-overlay.open { 
            display: block !important; position: fixed; inset: 0; z-index: 55; 
            background: rgba(0,0,0,0.4); backdrop-filter: blur(2px); animation: fadeIn 0.3s ease; 
          }

          /* Material 3 Top App Bar */
          .mobile-top-bar {
            display: flex; position: fixed; top: 0; left: 0; right: 0; height: 60px;
            background: var(--color-bg-sidebar); border-bottom: 1px solid var(--color-border);
            z-index: 40; justify-content: space-between; align-items: center; padding: 0 16px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.02);
          }

          /* Material 3 Bottom Navigation */
          .mobile-bottom-nav {
            display: flex; position: fixed; bottom: 0; left: 0; right: 0; height: 72px;
            background: var(--color-bg-sidebar); border-top: 1px solid var(--color-border);
            z-index: 40; justify-content: space-evenly; align-items: center;
            padding-bottom: env(safe-area-inset-bottom);
            box-shadow: 0 -4px 25px rgba(0,0,0,0.06); border-radius: 20px 20px 0 0;
          }

          .bottom-nav-item {
            flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
            color: var(--color-text-faded); transition: all 0.25s cubic-bezier(0.2, 0, 0, 1);
            -webkit-tap-highlight-color: transparent; position: relative;
          }
          .bottom-nav-item.active { color: var(--color-brand); }
          .bottom-nav-item.active .icon-container { 
            background: rgba(29,158,117,0.15); padding: 4px 18px; border-radius: 20px; margin-bottom: 2px; 
          }
          .bottom-nav-item .icon-container { padding: 4px 18px; border-radius: 20px; transition: all 0.25s; }
          
          .fab-container { flex: 0.8; display: flex; justify-content: center; position: relative; z-index: 50; }
          .android-fab {
            width: 52px; height: 52px; border-radius: 18px; background: var(--color-brand); color: white;
            display: flex; align-items: center; justify-content: center; transform: translateY(-16px);
            transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.2s; 
            box-shadow: 0 8px 20px rgba(29,158,117,0.4);
            -webkit-tap-highlight-color: transparent;
          }
          .android-fab:active { transform: translateY(-16px) scale(0.92); box-shadow: 0 4px 10px rgba(29,158,117,0.4); }
        }
      `}</style>

      {/* Global search overlay */}
      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}

      {/* Mobile background dim overlay */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={closeSidebar} />

      {/* ── Mobile Top App Bar (Android 14 style) ── */}
      <div className="mobile-top-bar">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm" style={{ background: 'var(--color-brand)' }}>
            <CalendarDays className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-sm font-extrabold text-[var(--color-text-main)] leading-tight tracking-tight">Réunions GT</h1>
            <p className="text-[9px] text-[var(--color-brand)] font-bold uppercase tracking-wider">Espace Employé</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-input)] rounded-full transition-colors active:scale-90">
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-2 ring-[var(--color-bg-app)]" style={{ background: '#3b82f6' }}>
            {initials}
          </div>
        </div>
      </div>

      {/* ── Desktop Sidebar (Acting as Drawer on Mobile) ── */}
      <aside className={`desktop-sidebar ${sidebarOpen ? 'open' : ''}`} style={{ width: 260, flexShrink: 0, background: 'var(--color-bg-sidebar)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
        
        {/* Drawer Header Mobile-only */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div className="flex flex-col">
             <span className="text-xs text-[var(--color-text-faded)] font-mono">Connecté en tant que</span>
             <span className="font-semibold text-sm text-[var(--color-text-main)] truncate max-w-[180px]">{user?.email}</span>
          </div>
          <button onClick={closeSidebar} className="p-2 bg-[var(--color-bg-input)] rounded-full text-[var(--color-text-muted)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Desktop Logo (Hidden on mobile inside drawer to save space) */}
        <div className="hidden md:block" style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, background: '#1D9E75', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CalendarDays style={{ width: 15, height: 15, color: 'white' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-main)', margin: 0, letterSpacing: '-0.02em' }}>Réunions GT</p>
              <p style={{ fontSize: 10, color: 'var(--color-text-faded)', margin: 0, fontFamily: 'monospace' }}>v3.0</p>
            </div>
          </div>
          {/* Bouton recherche Desktop Cmd+K */}
          <button
            className="search-btn"
            onClick={() => setSearchOpen(true)}
            style={{ marginTop: 16, width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }}>
            <Search style={{ width: 14, height: 14, color: 'var(--color-text-muted)', flexShrink: 0 }} />
            <span style={{ flex: 1, textAlign: 'left', fontSize: 13, color: 'var(--color-text-muted)' }}>Rechercher...</span>
            <kbd style={{ fontSize: 10, color: 'var(--color-text-muted)', background: 'var(--color-bg-card)', border: '1px solid var(--color-border2)', borderRadius: 4, padding: '2px 5px', fontFamily: 'monospace' }}>⌘K</kbd>
          </button>
        </div>

        {/* Global alert strip */}
        {hasCritical && (
          <div style={{ margin: '12px 12px 0', padding: '10px 12px', borderRadius: 10, background: '#E24B4A10', border: '1px solid #E24B4A25', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle style={{ width: 14, height: 14, color: '#F09595', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#F09595', fontFamily: 'monospace', fontWeight: 600 }}>
              {[
                badges.lateActions > 0 && `${badges.lateActions} Action(s)`,
                badges.expiredInspections > 0 && `${badges.expiredInspections} Parc Auto`
              ].filter(Boolean).join(' · ')} Urgent
            </span>
          </div>
        )}

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
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
        <div className="hidden md:flex" style={{ padding: '14px 16px', borderTop: '1px solid var(--color-border)', alignItems: 'center', gap: 10 }}>
          <button onClick={handleSignOut} title="Se déconnecter" className="w-full py-2 flex items-center justify-center gap-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors font-medium text-sm">
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
        {/* Footer (Mobile Menu Form) */}
        <div className="md:hidden mt-auto p-4 border-t border-[var(--color-border)]">
          <button onClick={handleSignOut} className="w-full py-3.5 flex items-center justify-center gap-2 bg-red-500/10 text-red-500 rounded-xl font-bold text-sm">
            <LogOut className="w-5 h-5" /> Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="main-content" style={{ flex: 1, minWidth: 0, paddingBottom: 0 }}>
        <Outlet />
      </main>

      {/* ── Mobile Bottom Navigation Bar (Android M3) ── */}
      <nav className="mobile-bottom-nav">
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
        <div className="fab-container">
          <button onClick={() => setSidebarOpen(true)} className="android-fab">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
               <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
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
    <div style={{ marginBottom: 12 }}>
      <p style={{ padding: '0 20px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-faded)', margin: 0 }}>
        {label}
      </p>
      {children}
    </div>
  )
}

function NavItem({ to, icon: Icon, label, badge, badgeLevel, pulse }: {
  to: string; icon: React.ElementType; label: string
  badge?: number; badgeLevel?: BadgeLevel; pulse?: boolean
}) {
  return (
    <NavLink to={to} end={to === ROUTES.DASHBOARD}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 20px', textDecoration: 'none',
        color: isActive ? '#1D9E75' : 'var(--color-text-main)',
        borderRight: `3px solid ${isActive ? '#1D9E75' : 'transparent'}`,
        background: isActive ? 'rgba(29,158,117,0.08)' : 'transparent',
        position: 'relative', transition: 'all 0.15s', fontSize: 14, fontWeight: isActive ? 600 : 500,
      })}
      className="nav-item"
    >
      <Icon className="nav-icon" style={{ width: 18, height: 18, flexShrink: 0, opacity: 0.8 }} />
      <span style={{ flex: 1 }}>{label}</span>
      <NavBadge count={badge ?? 0} level={badgeLevel ?? null} />
      {pulse && <PulsingDot level={badgeLevel === 'critical' ? 'critical' : 'warn'} />}
    </NavLink>
  )
}

function BottomNavItem({ to, icon: Icon, label, badge }: { to: string; icon: React.ElementType; label: string, badge?: number }) {
  return (
    <NavLink to={to} className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
      <div className="icon-container relative">
        <Icon className="w-5 h-5 mx-auto" />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold px-1 rounded-full ring-2 ring-[var(--color-bg-sidebar)]">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-semibold mt-0.5">{label}</span>
    </NavLink>
  )
}
