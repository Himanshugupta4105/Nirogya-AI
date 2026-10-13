import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/authContext';

function displayDate(value) {
    if (!value) return 'Awaiting confirmation';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function MyBooking() {
    const { session } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const loadBookings = useCallback(async () => {
        if (!session?.user?.id) return;
        setLoading(true); setError('');
        const { data, error: queryError } = await supabase.from('appointments')
            .select('id, doctor_id, consultation_type, mode, reason, status, scheduled_for, created_at')
            .eq('patient_id', session.user.id).order('created_at', { ascending: false }).limit(50);
        if (queryError) setError('Could not load bookings. Check that the appointments schema is installed.');
        else setBookings(data || []);
        setLoading(false);
    }, [session?.user?.id]);

    useEffect(() => { loadBookings(); }, [loadBookings]);

    async function cancelBooking(bookingId) {
        setError(''); setNotice(''); setBusyId(bookingId);
        const { error: cancelError } = await supabase.from('appointments').update({ status: 'cancelled' })
            .eq('id', bookingId).eq('patient_id', session.user.id).eq('status', 'pending');
        if (cancelError) setError('Could not cancel this request. Refresh and try again.');
        else { setNotice('Your pending request was cancelled.'); await loadBookings(); }
        setBusyId('');
    }

    return <section className="account-page">
        <div className="care-hero"><div className="care-hero-copy"><span className="eyebrow">YOUR APPOINTMENT HISTORY</span><h1>My bookings</h1><p>Track consultation requests, scheduled visits, and completed appointments.</p></div><div className="care-hero-art" aria-hidden="true">◷</div></div>
        {error && <div className="notice error-notice" role="alert">{error}</div>}{notice && <div className="notice success-notice" role="status">{notice}</div>}
        <section className="requests-section"><div className="requests-heading"><div><span className="eyebrow">CONSULTATIONS</span><h2>Your bookings</h2></div><div className="account-actions"><Link className="quiet-button" to="/women-care">Request care</Link><button className="quiet-button" onClick={loadBookings} disabled={loading}>↻ Refresh</button></div></div>
            {loading ? <div className="empty-card">Loading your bookings…</div> : bookings.length === 0 ? <div className="empty-card">No bookings yet. When you request a consultation, it will appear here.</div> : <div className="request-list">{bookings.map(booking => <article className="request-card" key={booking.id}>
                <div className="request-doctor"><span className="doctor-initial">{booking.consultation_type === 'women_care' ? '♀' : '◉'}</span><div><b>{booking.consultation_type === 'women_care' ? 'Women’s care consultation' : 'Healthcare consultation'}{booking.mode === 'video' ? ' · Video' : ''}</b><small>Requested {displayDate(booking.created_at)} · Visit {displayDate(booking.scheduled_for)}</small></div></div>
                <span className={`appointment-status ${booking.status}`}>{booking.status}</span>
                {booking.status === 'pending' && <button className="small-action cancel-booking" type="button" onClick={() => cancelBooking(booking.id)} disabled={busyId === booking.id}>{busyId === booking.id ? 'Cancelling…' : 'Cancel request'}</button>}
                {booking.status === 'scheduled' && <Link className="small-action" to={`/video-call/${booking.id}`}>Join video call →</Link>}
            </article>)}</div>}
        </section>
    </section>;
}