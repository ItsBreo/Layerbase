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
import { Route, Routes } from 'react-router-dom'
import { AdminRoute, GuestRoute, ProtectedRoute } from '@/auth/guards'
import Login from '@/Login/Login'
import Register from '@/Register/Register'
import ForgotPassword from '@/auth/ForgotPassword'
import ResetPassword from '@/auth/ResetPassword'
import OAuthCallback from '@/auth/OAuthCallback'
import Home from '@/pages/Home'
import Dashboard from '@/pages/Dashboard'
import AdminPanel from '@/pages/AdminPanel'
import NotFound from '@/pages/NotFound'

export default function App() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/" element={<Home />} />
      <Route path="/auth/callback" element={<OAuthCallback />} />

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
      </Route>

      {/* Solo administradores */}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminPanel />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
