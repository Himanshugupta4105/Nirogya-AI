import { Navigate, Route, Routes as RouterRoutes } from 'react-router-dom';
import Layout from '../LAYOUT/LAYOUT';
import ProtectedRoute from './PROTECTEDROUTERS';
import Login from '../PAGES/LOGIN';
import Register from '../PAGES/REGISTER';
import ResetPassword from '../PAGES/RESETPASSWORD';
import OnlineVideoCalling from '../PAGES/ONLINEVIDEOCALL';
import WomenCare from '../PAGES/WOMENCARE';
import Dashboard from '../USER ACCOUNT/MYACCOUNT';

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
                    <Route path="/women-care" element={<WomenCare />} />
                    <Route path="/video-call/:appointmentId" element={<OnlineVideoCalling />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </RouterRoutes>
    );
}