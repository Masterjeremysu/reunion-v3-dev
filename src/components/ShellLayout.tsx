import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, CheckSquare, Users, FileText,
  ShoppingCart, Car, Activity, Calendar, LogOut, AlertTriangle, Search, Shield, Sun, Moon, Heart, Plane, PlaneLanding
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
function NavBadge({ count, level }: { count: number; level: BadgeLevel }) {
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate(ROUTES.LOGIN)
    toast.success('Déconnexion réussie')
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'GT'
  const hasCritical = badges.lateActions > 0 || badges.expiredInspections > 0

  // Close sidebar when navigating on mobile
  const location = useLocation()
  const closeSidebar = () => setSidebarOpen(false)
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  const isEnabled = (key: string) => {
    const features = (organization?.settings as any)?.features
    if (!features) return true
    return features[key] !== false
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--color-bg-app)', overflow: 'hidden' }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
        @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        .nav-item { transition: all 0.12s; }
        .nav-item:hover { background: var(--color-border) !important; }
        .nav-item.active-link { background: rgba(29,158,117,0.08) !important; color: #5DCAA5 !important; }
        .nav-item.active-link .nav-icon { color: #1D9E75 !important; }
        .search-btn:hover { background: var(--color-border) !important; border-color: var(--color-border2) !important; }
        .mobile-hamburger { display: none; }
        .sidebar-overlay { display: none; }
        @media (max-width: 768px) {
          .mobile-hamburger { display: flex !important; }
          .desktop-sidebar { position: fixed !important; z-index: 40 !important; left: 0; top: 0; bottom: 0; transform: translateX(-100%); transition: transform 0.25s ease; }
          .desktop-sidebar.open { transform: translateX(0) !important; animation: slideInLeft 0.25s ease; }
          .sidebar-overlay.open { display: block !important; position: fixed; inset: 0; z-index: 39; background: var(--color-overlay); backdrop-filter: blur(2px); }
        }
      `}</style>

      {/* Global search overlay */}
      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}

      {/* Mobile overlay */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={closeSidebar} />

      {/* Mobile hamburger */}
      <button className="mobile-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{ display: 'none', position: 'fixed', top: 12, left: 12, zIndex: 50, width: 40, height: 40, borderRadius: 10, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px var(--color-shadow)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-main)" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* ── Sidebar ── */}
      <aside className={`desktop-sidebar ${sidebarOpen ? 'open' : ''}`} style={{ width: 220, flexShrink: 0, background: 'var(--color-bg-sidebar)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, background: '#1D9E75', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CalendarDays style={{ width: 15, height: 15, color: 'var(--color-text-main)' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-main)', margin: 0, letterSpacing: '-0.02em' }}>Réunions GT</p>
              <p style={{ fontSize: 10, color: 'var(--color-text-faded)', margin: 0, fontFamily: 'monospace' }}>v3.0</p>
            </div>
          </div>

          {/* Bouton recherche Cmd+K */}
          <button
            className="search-btn"
            onClick={() => setSearchOpen(true)}
            style={{ marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }}>
            <Search style={{ width: 11, height: 11, color: 'var(--color-text-muted)', flexShrink: 0 }} />
            <span style={{ flex: 1, textAlign: 'left', fontSize: 11, color: 'var(--color-text-faded)', fontFamily: 'monospace' }}>Rechercher...</span>
            <kbd style={{ fontSize: 9, color: 'var(--color-text-faded)', background: 'var(--color-bg-input)', border: '1px solid var(--color-border2)', borderRadius: 4, padding: '1px 5px', fontFamily: 'monospace' }}>⌘K</kbd>
          </button>

          {/* Global alert strip */}
          {hasCritical && (
            <div style={{ marginTop: 8, padding: '7px 10px', borderRadius: 8, background: '#E24B4A10', border: '1px solid #E24B4A25', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle style={{ width: 11, height: 11, color: '#F09595', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: '#F09595', fontFamily: 'monospace' }}>
                {[
                  badges.lateActions > 0 && `${badges.lateActions} action${badges.lateActions > 1 ? 's' : ''} en retard`,
                  badges.expiredInspections > 0 && `${badges.expiredInspections} inspection${badges.expiredInspections > 1 ? 's' : ''} expirée${badges.expiredInspections > 1 ? 's' : ''}`,
                ].filter(Boolean).join(' · ')}
              </span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
          <NavSection label="Principal">
            <NavItem to={ROUTES.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
            {isEnabled('meetings') && <NavItem to={ROUTES.MEETINGS} icon={CalendarDays} label="Réunions" />}
            {isEnabled('meetings') && (
              <NavItem to={ROUTES.ACTIONS} icon={CheckSquare} label="Actions"
                badge={badges.lateActions > 0 ? badges.lateActions : badges.openActions > 0 ? badges.openActions : 0}
                badgeLevel={badges.lateActions > 0 ? 'critical' : badges.openActions > 0 ? 'warn' : null}
                pulse={badges.lateActions > 0}
              />
            )}
            <NavItem to={ROUTES.COLLEAGUES} icon={Users} label="Collègues" />
          </NavSection>

          <NavSection label="Opérationnel">
            {isEnabled('notes') && <NavItem to={ROUTES.NOTES} icon={FileText} label="Notes prép." />}
            {isEnabled('consumables') && (
              <NavItem to={ROUTES.CONSUMABLES} icon={ShoppingCart} label="Consommables"
                badge={badges.pendingConsumables}
                badgeLevel={badges.pendingConsumables > 0 ? 'warn' : null}
              />
            )}
            {isEnabled('vehicles') && (
              <NavItem to={ROUTES.VEHICLES} icon={Car} label="Parc auto"
                badge={badges.expiredInspections > 0 ? badges.expiredInspections : badges.soonInspections > 0 ? badges.soonInspections : 0}
                badgeLevel={badges.expiredInspections > 0 ? 'critical' : badges.soonInspections > 0 ? 'warn' : null}
                pulse={badges.expiredInspections > 0}
              />
            )}
            {isEnabled('mood') && <NavItem to={ROUTES.MOOD} icon={Heart} label="Baromètre" />}
            <NavItem to={ROUTES.SCHEDULE} icon={Calendar} label="Planning" />
            {isEnabled('leaves') && <NavItem to={ROUTES.LEAVES} icon={Plane} label="Congés" />}
          </NavSection>

          {role === 'admin' && (
            <NavSection label="Administration">
              <NavItem to={ROUTES.ADMIN} icon={Shield} label="Administration SaaS" />
            </NavSection>
          )}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1D9E7530', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#5DCAA5', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-main)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
          </div>
          
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Changer le thème"
            style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-faded)', borderRadius: 6, display: 'flex', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-main)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-faded)')}>
            {theme === 'dark' ? <Sun style={{ width: 13, height: 13 }} /> : <Moon style={{ width: 13, height: 13 }} />}
          </button>
          
          <button onClick={handleSignOut} title="Se déconnecter"
            style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-faded)', borderRadius: 6, display: 'flex', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#E24B4A')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-faded)')}>
            <LogOut style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', paddingTop: 0 }}
        className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <p style={{ padding: '10px 20px 4px', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-faded)', fontFamily: 'monospace', margin: 0 }}>
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
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '7px 20px', textDecoration: 'none',
        color: isActive ? '#5DCAA5' : 'var(--color-text-muted)',
        borderLeft: `2px solid ${isActive ? '#1D9E75' : 'transparent'}`,
        background: isActive ? 'rgba(29,158,117,0.07)' : 'transparent',
        position: 'relative', transition: 'all 0.12s', fontSize: 13,
      })}
      className="nav-item"
    >
      <Icon className="nav-icon" style={{ width: 14, height: 14, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{label}</span>
      <NavBadge count={badge ?? 0} level={badgeLevel ?? null} />
      {pulse && <PulsingDot level={badgeLevel === 'critical' ? 'critical' : 'warn'} />}
    </NavLink>
  )
}
