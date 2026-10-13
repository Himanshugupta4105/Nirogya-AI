import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/authContext';
import { useUserActivity } from './USERACTIVITY';

function formatDate(value) {
    return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not available';
}

export default function MyAccount() {
    const { session } = useAuth();
    const { isIdle, lastActiveAt } = useUserActivity();
    const [profile, setProfile] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadAccount = useCallback(async () => {
        if (!session?.user?.id) return;
        setLoading(true); setError('');
        const [profileResult, bookingsResult] = await Promise.all([
            supabase.from('user_profiles').select('full_name, username, phone').eq('user_id', session.user.id).maybeSingle(),
            supabase.from('appointments').select('id, status, scheduled_for, created_at').eq('patient_id', session.user.id)
                .order('created_at', { ascending: false }).limit(50)
        ]);
        if (profileResult.error || bookingsResult.error) setError('Some account details could not load. Check your Supabase care schema and access policies.');
        setProfile(profileResult.data || null);
        setBookings(bookingsResult.data || []);
        setLoading(false);
    }, [session?.user?.id]);

    useEffect(() => { loadAccount(); }, [loadAccount]);

    const upcoming = bookings.filter(item => item.status === 'scheduled' && item.scheduled_for && new Date(item.scheduled_for) >= new Date());
    const pending = bookings.filter(item => item.status === 'pending');
    const name = session?.user?.user_metadata?.full_name || profile?.full_name || 'Nirogya member';

    return <section className="account-page">
        <div className="care-hero"><div className="care-hero-copy"><span className="eyebrow">ACCOUNT OVERVIEW</span><h1>My account</h1><p>Your profile, appointment activity, and account security in one place.</p></div><div className="care-hero-art" aria-hidden="true">✳</div></div>
        {error && <div className="notice error-notice" role="alert">{error}</div>}
        <section className="care-columns account-summary">
            <article className="care-panel"><div className="care-panel-heading"><div><span className="eyebrow">PROFILE</span><h2>{name}</h2></div><span className="care-panel-icon">♙</span></div><p><b>Email</b><br />{session?.user?.email || 'Not available'}</p><p><b>Username</b><br />{profile?.username || session?.user?.user_metadata?.username || 'Not available'}</p><Link className="small-action" to="/profile">View or edit profile →</Link></article>
            <article className="care-panel"><div className="care-panel-heading"><div><span className="eyebrow">APPOINTMENTS</span><h2>{loading ? 'Loading…' : `${upcoming.length} upcoming`}</h2></div><span className="care-panel-icon">◷</span></div><p>{loading ? 'Checking your appointment history…' : `${pending.length} request${pending.length === 1 ? '' : 's'} waiting for confirmation`}</p><Link className="small-action" to="/my-bookings">Manage my bookings →</Link></article>
            <article className="care-panel"><div className="care-panel-heading"><div><span className="eyebrow">SECURITY</span><h2>Account access</h2></div><span className="care-panel-icon">♧</span></div><p>Signed in with Supabase Auth. Password reset uses the configured email or verified phone flow.</p><Link className="small-action" to="/reset-password">Password settings →</Link></article>
            <article className="care-panel"><div className="care-panel-heading"><div><span className="eyebrow">THIS TAB</span><h2>{isIdle ? 'Away' : 'Active'}</h2></div><span className="care-panel-icon">⌁</span></div><p>Last activity {formatDate(lastActiveAt)}. Activity is monitored in this tab only and is not saved to your account.</p><Link className="small-action" to="/profile">Personal details →</Link></article>
        </section>
    </section>;
}