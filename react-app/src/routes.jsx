import { Navigate, Route, Routes as RouterRoutes } from 'react-router-dom';
import Layout from './layout';
import ProtectedRoute from './ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import OnlineVideoCalling from './pages/OnlineVideoCalling';
import WomenCare from './pages/WomenCare';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import MyAccount from './pages/MyAccount';
import MyBooking from './pages/MyBooking';

/** Central URL-to-page map for the Nirogya AI React feature app. */
export default function Routes() {
  return (
    <RouterRoutes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public pages */}
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Private pages: ProtectedRoute redirects signed-out users to /login. */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/my-account" element={<MyAccount />} />
          <Route path="/my-bookings" element={<MyBooking />} />
          <Route path="/women-care" element={<WomenCare />} />
          <Route path="/video-call/:appointmentId" element={<OnlineVideoCalling />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </RouterRoutes>
  );
}
