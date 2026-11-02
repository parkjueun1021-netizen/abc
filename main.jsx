import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import ParticipantInfo from './pages/ParticipantInfo'
import Dilemma from './pages/Dilemma'
import Complete from './pages/Complete'
import AdminLogin from './pages/AdminLogin'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/participant" element={<ParticipantInfo />} />
      <Route path="/dilemma/:step" element={<Dilemma />} />
      <Route path="/complete" element={<Complete />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
