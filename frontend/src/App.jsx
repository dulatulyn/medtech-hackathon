import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import Landing from './pages/Landing.jsx'
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/match" element={<Match />} />
        <Route path="/anomalies" element={<Anomalies />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/clinic" element={<Clinic />} />
        <Route path="/service" element={<Service />} />
        <Route path="/catalog" element={<Catalog />} />
      </Route>
    </Routes>
  )
}
