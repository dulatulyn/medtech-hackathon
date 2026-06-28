import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import { useAuth } from './auth.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Upload from './pages/Upload.jsx'
import Documents from './pages/Documents.jsx'
import Verify from './pages/Verify.jsx'
import Match from './pages/Match.jsx'
import Anomalies from './pages/Anomalies.jsx'
import SearchPage from './pages/Search.jsx'
import Clinic from './pages/Clinic.jsx'
import Service from './pages/Service.jsx'
import Catalog from './pages/Catalog.jsx'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <div className="auth-loading">Загрузка…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/match" element={<Match />} />
        <Route path="/anomalies" element={<Anomalies />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/clinic" element={<Clinic />} />
        <Route path="/clinic/:id" element={<Clinic />} />
        <Route path="/service" element={<Service />} />
        <Route path="/service/:id" element={<Service />} />
        <Route path="/catalog" element={<Catalog />} />
      </Route>
    </Routes>
  )
}
