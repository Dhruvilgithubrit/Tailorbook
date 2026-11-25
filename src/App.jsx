import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import Layout from './components/layout/Layout'

// Auth Pages
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'

// App Pages
import Dashboard from './pages/Dashboard/Dashboard'
import CustomersList from './pages/Customers/CustomersList'
import CustomerDetail from './pages/Customers/CustomerDetail'
import FabricsList from './pages/Fabrics/FabricsList'
import OrdersList from './pages/Orders/OrdersList'
import NewOrder from './pages/Orders/NewOrder'
import OrderDetail from './pages/Orders/OrderDetail'
import Settings from './pages/Settings/Settings'

/** Wraps protected routes — redirects to /login when not authenticated */
function PrivateRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F7F4]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#4F46E5] border-t-transparent" />
      </div>
    )
  }

  return session ? <Outlet /> : <Navigate to="/login" replace />
}

/** Redirects already-logged-in users away from auth pages to /dashboard */
function PublicRoute() {
  const { session, loading } = useAuth()
  if (loading) return null
  return session ? <Navigate to="/dashboard" replace /> : <Outlet />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public auth routes */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Protected app routes */}
          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/customers" element={<CustomersList />} />
              <Route path="/customers/:id" element={<CustomerDetail />} />
              <Route path="/fabrics" element={<FabricsList />} />
              <Route path="/orders" element={<OrdersList />} />
              <Route path="/orders/new" element={<NewOrder />} />
              <Route path="/orders/:id" element={<OrderDetail />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
