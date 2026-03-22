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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1e2333',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#e8eaf0',
          },
        }}
      />
    </QueryClientProvider>
  )
}
