import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, CheckSquare, Users, FileText,
  ShoppingCart, Car, Activity, Calendar, LogOut, ChevronRight,
} from 'lucide-react'
import { useAuth } from '../features/auth/useAuth'
import { ROUTES } from '../constants'
import { cn } from '../utils'
import { toast } from 'sonner'

const NAV = [
  {
    section: 'Principal',
    items: [
      { to: ROUTES.DASHBOARD,  icon: LayoutDashboard, label: 'Dashboard' },
      { to: ROUTES.MEETINGS,   icon: CalendarDays,    label: 'Réunions' },
      { to: ROUTES.ACTIONS,    icon: CheckSquare,     label: "Points d'action" },
      { to: ROUTES.COLLEAGUES, icon: Users,           label: 'Collègues' },
    ],
  },
  {
    section: 'Opérationnel',
    items: [
      { to: ROUTES.NOTES,       icon: FileText,      label: 'Notes prép.' },
      { to: ROUTES.CONSUMABLES, icon: ShoppingCart,  label: 'Consommables' },
      { to: ROUTES.VEHICLES,    icon: Car,           label: 'Parc auto' },
      { to: ROUTES.MOOD,        icon: Activity,      label: 'Baromètre' },
      { to: ROUTES.SCHEDULE,    icon: Calendar,      label: 'Planning' },
    ],
  },
]

export function ShellLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate(ROUTES.LOGIN)
    toast.success('Déconnexion réussie')
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'GT'

  return (
    <div className="flex h-screen bg-[#0f1117] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[220px] flex-shrink-0 bg-[#181c27] border-r border-white/[0.07] flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white leading-none">Réunions GT</p>
              <p className="text-[10px] text-slate-500 mt-0.5">v2.0 · 2026</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV.map(group => (
            <div key={group.section} className="mb-2">
              <p className="px-5 py-2 text-[10px] font-medium tracking-widest text-slate-600 uppercase">
                {group.section}
              </p>
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === ROUTES.DASHBOARD}
                  className={({ isActive }) => cn(
                    'relative flex items-center gap-2.5 px-5 py-2 text-[13px] transition-colors',
                    isActive
                      ? 'text-teal-400 bg-[#1e2333]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#1c2030]'
                  )}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-teal-500 rounded-r-full" />
                      )}
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-teal-900 flex items-center justify-center text-[10px] font-medium text-teal-300 flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-300 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded"
              title="Se déconnecter"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
