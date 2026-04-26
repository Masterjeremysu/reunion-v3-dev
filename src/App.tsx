import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { queryClient } from './lib/queryClient'
import { ROUTES } from './constants'
import { AuthPage, AuthGuard } from './features/auth/AuthPage'
import { ShellLayout } from './components/ShellLayout'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { MeetingsPage } from './features/meetings/MeetingsPage'
import { ActionsPage } from './features/actions/ActionsPage'
import { ColleaguesPage } from './features/colleagues/ColleaguesPage'
import { NotesPage } from './features/notes/NotesPage'
import { ConsumablesPage } from './features/consumables/ConsumablesPage'
import { VehiclesPage } from './features/vehicles/VehiclesPage'
import { MoodPage } from './features/mood/MoodPage'
import { SchedulePage } from './features/schedule/SchedulePage'
import { LeavePage } from './features/leaves/LeavePage'
import { AdminPage } from './features/admin/AdminPage'

import { AuthProvider } from './features/auth/useAuth'

import { ThemeProvider } from './components/ThemeProvider'

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path={ROUTES.LOGIN} element={<AuthPage />} />
            <Route
              element={
                <AuthGuard>
                  <ShellLayout />
                </AuthGuard>
              }
            >
              <Route path={ROUTES.DASHBOARD}    element={<DashboardPage />} />
              <Route path={ROUTES.MEETINGS}     element={<MeetingsPage />} />
              <Route path={ROUTES.ACTIONS}      element={<ActionsPage />} />
              <Route path={ROUTES.COLLEAGUES}   element={<ColleaguesPage />} />
              <Route path={ROUTES.NOTES}        element={<NotesPage />} />
              <Route path={ROUTES.CONSUMABLES}  element={<ConsumablesPage />} />
              <Route path={ROUTES.VEHICLES}     element={<VehiclesPage />} />
              <Route path={ROUTES.MOOD}         element={<MoodPage />} />
              <Route path={ROUTES.SCHEDULE}     element={<SchedulePage />} />
              <Route path={ROUTES.LEAVES}       element={<LeavePage />} />
              <Route path={ROUTES.ADMIN}        element={<AdminPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-main)',
            },
          }}
        />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
