/**
 * Árbol de rutas de la SPA.
 *
 * - Públicas: Home.
 * - Solo invitados (GuestRoute): login, registro, recuperación.
 * - Autenticadas (ProtectedRoute): dashboard.
 * - Solo admin (AdminRoute): panel de administración.
 *
 * El callback de OAuth es público porque procesa el token antes de existir la
 * sesión.
 */
import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AdminRoute, GuestRoute, ProtectedRoute } from '@/auth/guards'
import Login from '@/Login/Login'
import Register from '@/Register/Register'
import ForgotPassword from '@/auth/ForgotPassword'
import ResetPassword from '@/auth/ResetPassword'
import OAuthCallback from '@/auth/OAuthCallback'
import VerifyEmail from '@/auth/VerifyEmail'
import PublicProfile from '@/profile/PublicProfile'
import { BillingPage, CookiesPage, PrivacyPage, TermsPage } from '@/legal/pages'
import { BestPracticesPage, DocsPage, PublishingPage } from '@/resources/pages'
import Home from '@/pages/Home'
import Dashboard from '@/pages/Dashboard'
import AdminPanel from '@/pages/AdminPanel'
import AdminUsers from '@/pages/AdminUsers'
import AdminMetrics from '@/pages/AdminMetrics'
import NotFound from '@/pages/NotFound'
import Explore from '@/studio/Explore'
import ComponentDetail from '@/studio/ComponentDetail'
import MyComponents from '@/studio/MyComponents'
import MyComponentDetail from '@/studio/MyComponentDetail'

// El formulario (Monaco) y el preview (Sandpack) cargan editores pesados que
// solo hacen falta en el studio: se cargan bajo demanda para no lastrar el
// arranque de la app.
const ComponentForm = lazy(() => import('@/studio/ComponentForm'))
const ComponentPreview = lazy(() => import('@/studio/ComponentPreview'))

/** Spinner de carga para las rutas diferidas. */
function RouteFallback() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-bg">
      <div className="size-8 animate-spin rounded-full border-2 border-border border-t-accent" />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/" element={<Home />} />
      <Route path="/components" element={<Explore />} />
      <Route path="/components/:slug" element={<ComponentDetail />} />
      <Route path="/users/:id" element={<PublicProfile />} />

      {/* Recursos: cómo funciona la plataforma y cómo publicar en ella. */}
      <Route path="/resources/docs" element={<DocsPage />} />
      <Route path="/resources/publishing" element={<PublishingPage />} />
      <Route path="/resources/best-practices" element={<BestPracticesPage />} />

      {/* Legales. Estructura montada; el texto jurídico está sin redactar y
          cada sección lo avisa en pantalla. */}
      <Route path="/legal/terms" element={<TermsPage />} />
      <Route path="/legal/privacy" element={<PrivacyPage />} />
      <Route path="/legal/billing" element={<BillingPage />} />
      <Route path="/legal/cookies" element={<CookiesPage />} />
      <Route path="/auth/callback" element={<OAuthCallback />} />
      {/* Destino del enlace del correo: el backend verifica y redirige aquí
          con ?status=. Pública porque se abre desde el cliente de correo. */}
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Solo invitados */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      {/* Requieren sesión */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Studio del autor — CRUD de componentes (Módulo 3). */}
        <Route path="/studio" element={<MyComponents />} />
        <Route
          path="/studio/new"
          element={
            <Suspense fallback={<RouteFallback />}>
              <ComponentForm mode="create" />
            </Suspense>
          }
        />
        <Route
          path="/studio/preview"
          element={
            <Suspense fallback={<RouteFallback />}>
              <ComponentPreview />
            </Suspense>
          }
        />
        <Route
          path="/studio/:slug/edit"
          element={
            <Suspense fallback={<RouteFallback />}>
              <ComponentForm mode="edit" />
            </Suspense>
          }
        />
        <Route
          path="/studio/:slug/preview"
          element={
            <Suspense fallback={<RouteFallback />}>
              <ComponentPreview />
            </Suspense>
          }
        />
        <Route path="/studio/:slug" element={<MyComponentDetail />} />
      </Route>

      {/* Solo administradores */}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/metrics" element={<AdminMetrics />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
