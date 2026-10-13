import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './lib/authContext';

/** Blocks private routes until Supabase has resolved the current session. */
export default function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="app-loading" role="status">Opening your private health space…</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
