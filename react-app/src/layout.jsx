import { Link, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuth } from './lib/authContext';
import UserActivity from './UserActivity';

/** Shared frame for the React pages: brand/header, navigation, content, and footer. */
export default function Layout() {
  const { session } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) return;
    navigate('/login', { replace: true });
  }

  return (
    <div className="feature-shell">
      <header className="feature-header">
        <Link to={session ? '/dashboard' : '/login'} className="feature-brand" aria-label="Nirogya AI home">
          <span>✳</span><b>Nirogya <i>AI</i></b>
        </Link>
        <nav aria-label="Main navigation">
          {session ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/women-care">Women’s care</Link>
              <Link to="/my-bookings">My bookings</Link>
              <Link to="/my-account">My account</Link>
              <UserActivity />
              <button type="button" onClick={handleSignOut}>Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register" className="nav-cta">Create account</Link>
            </>
          )}
        </nav>
      </header>
      <main className="feature-main"><Outlet /></main>
      <footer className="feature-footer">Your health information is private. This prototype is not for emergencies or medical decisions.</footer>
    </div>
  );
}
