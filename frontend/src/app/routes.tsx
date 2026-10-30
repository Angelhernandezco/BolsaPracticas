import AdminCareersPage from '../pages/admin/AdminCareersPage'
import { createBrowserRouter, Navigate, Outlet } from 'react-router'
import { AuthProvider, useAuth } from './AuthContext'
import PublicLayout from '../layouts/PublicLayout'
import DashboardLayout from '../layouts/DashboardLayout'
import {
  HomePage,
  HowItWorksPage,
  OpportunityDetailPage,
} from '../pages/PublicPages'
import {
  CompanyRequestStatusPage,
  destinationFor,
  LoginPage,
  RegisterPage,
  VerifyEmailPage,
  VerifyTokenPage,
} from '../pages/AuthPages'
import {
  StudentApplications,
  StudentCV,
  StudentDashboard,
  StudentExplore,
  StudentProfile,
} from '../pages/StudentPages'
import {
  CandidatesPage,
  CompanyDashboard,
  CompanyProfile,
  ManageOpportunities,
  OpportunityForm,
} from '../pages/CompanyPages'
import {
  AdminCompanies,
  AdminDashboard,
  AdminRequests,
} from '../pages/AdminPages'
import { EmptyState, LoadingState, QueryError } from '../components/ui'
import { LockKeyhole, SearchX } from 'lucide-react'

function RoleGuard({ role }: { role: 'student' | 'company' | 'admin' }) {
  const { user, loading, sessionError, retrySession } = useAuth()
  if (loading) return <LoadingState />
  if (sessionError)
    return (
      <div className="full-state">
        <QueryError message={sessionError} onRetry={retrySession} />
      </div>
    )
  if (!user) return <Navigate to="/iniciar-sesion" replace />
  if (!user.emailVerified) return <Navigate to="/verificar-correo" replace />
  if (user.role === 'company' && user.approvalStatus !== 'approved')
    return <Navigate to="/estado-solicitud" replace />
  if (user.role !== role) return <Navigate to={destinationFor(user)} replace />
  return <Outlet />
}

function AppProviders() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  )
}

function StudentGuard() {
  return <RoleGuard role="student" />
}

function CompanyGuard() {
  return <RoleGuard role="company" />
}

function AdminGuard() {
  return <RoleGuard role="admin" />
}

function AccessResolver() {
  const { user, loading, sessionError, retrySession } = useAuth()
  if (loading) return <LoadingState />
  if (sessionError)
    return (
      <div className="full-state">
        <QueryError message={sessionError} onRetry={retrySession} />
      </div>
    )
  return (
    <Navigate to={user ? destinationFor(user) : '/iniciar-sesion'} replace />
  )
}

function AccessDenied() {
  return (
    <div className="full-state">
      <EmptyState
        icon={<LockKeyhole />}
        title="Acceso restringido"
        text="Tu cuenta no tiene permisos para consultar esta sección."
      />
    </div>
  )
}

function NotFound() {
  return (
    <div className="full-state">
      <EmptyState
        icon={<SearchX />}
        title="Página no encontrada"
        text="La dirección que ingresaste no existe o ya no está disponible."
      />
    </div>
  )
}

export const router = createBrowserRouter([
  {
    Component: AppProviders,
    children: [
      {
        Component: PublicLayout,
        children: [
          { index: true, Component: HomePage },
          { path: 'como-funciona', Component: HowItWorksPage },
        ],
      },
      { path: 'iniciar-sesion', Component: LoginPage },
      { path: 'registro', Component: RegisterPage },
      { path: 'acceso', Component: AccessResolver },
      { path: 'verificar-correo', Component: VerifyEmailPage },
      { path: 'verificar-email', Component: VerifyTokenPage },
      { path: 'estado-solicitud', Component: CompanyRequestStatusPage },
      {
        Component: StudentGuard,
        children: [
          {
            path: 'estudiante',
            Component: DashboardLayout,
            children: [
              { index: true, Component: StudentDashboard },
              { path: 'convocatorias', Component: StudentExplore },
              { path: 'convocatorias/:id', Component: OpportunityDetailPage },
              { path: 'postulaciones', Component: StudentApplications },
              { path: 'curriculum', Component: StudentCV },
              { path: 'perfil', Component: StudentProfile },
            ],
          },
        ],
      },
      {
        Component: CompanyGuard,
        children: [
          {
            path: 'empresa',
            Component: DashboardLayout,
            children: [
              { index: true, Component: CompanyDashboard },
              { path: 'convocatorias', Component: ManageOpportunities },
              { path: 'convocatorias/nueva', Component: OpportunityForm },
              { path: 'convocatorias/:id/editar', Component: OpportunityForm },
              {
                path: 'convocatorias/:id/candidatos',
                Component: CandidatesPage,
              },
              { path: 'perfil', Component: CompanyProfile },
            ],
          },
        ],
      },
      {
        Component: AdminGuard,
        children: [
          {
            path: 'admin',
            Component: DashboardLayout,
            children: [
              { index: true, Component: AdminDashboard },
              { path: 'empresas', Component: AdminCompanies },
              { path: 'carreras', Component: AdminCareersPage },
              { path: 'solicitudes', Component: AdminRequests },
            ],
          },
        ],
      },
      { path: 'acceso-denegado', Component: AccessDenied },
      { path: '*', Component: NotFound },
    ],
  },
])
