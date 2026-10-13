import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/authContext';
import '../care-extra.css';

function formatDate(value) {
    if (!value) return 'Awaiting clinician confirmation';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
function localDateTimeMin() {
    const date = new Date(Date.now() + 60_000);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function WomenCare() {
    const { session } = useAuth();
    const [doctors, setDoctors] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [slots, setSlots] = useState({});
    const [doctorId, setDoctorId] = useState('');
    const [reason, setReason] = useState('');
    const [consent, setConsent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const loadCare = useCallback(async () => {
        if (!session?.user?.id) return;
        setLoading(true); setError('');
        const [doctorResult, appointmentResult] = await Promise.all([
            supabase.from('doctor_profiles').select('user_id, display_name, specialty, clinic_name, years_experience')
                .eq('accepting_patients', true).eq('is_female', true).order('display_name'),
            supabase.from('appointments').select('id, doctor_id, reason, status, scheduled_for, created_at')
                .or(`patient_id.eq.${session.user.id},doctor_id.eq.${session.user.id}`).eq('consultation_type', 'women_care').order('created_at', { ascending: false }).limit(20)
        ]);
        if (doctorResult.error) setError('Could not load clinicians. Apply the care schema and add clinician profiles in Supabase.');
        else {
            setDoctors(doctorResult.data || []);
            if (!doctorId && doctorResult.data?.length) setDoctorId(doctorResult.data[0].user_id);
        }
        if (appointmentResult.error) setError('Could not load your care requests. Check that the appointments schema is installed.');
        else setAppointments(appointmentResult.data || []);
        setLoading(false);
    }, [session?.user?.id, doctorId]);

    useEffect(() => { loadCare(); }, [loadCare]);

    async function requestConsultation(event) {
        event.preventDefault(); setError(''); setNotice('');
        if (!doctorId) return setError('Select an available women clinician first.');
        if (reason.trim().length < 10) return setError('Please add a little more detail so the clinician understands your request.');
        if (!consent) return setError('Confirm that you want to share this note with the selected clinician.');
        setBusy(true);
        try {
            const { error: insertError } = await supabase.from('appointments').insert({
                patient_id: session.user.id,
                doctor_id: doctorId,
                consultation_type: 'women_care',
                mode: 'video',
                reason: reason.trim(),
                status: 'pending'
            });
            if (insertError) throw insertError;
            setReason(''); setConsent(false);
            setNotice('Your confidential request has been sent. The clinician must confirm an appointment before a video room becomes available.');
            await loadCare();
        } catch (requestError) { setError(requestError.message || 'Could not send your request. Please try again.'); }
        finally { setBusy(false); }
    }

    async function confirmAppointment(appointmentId) {
        setError(''); setNotice('');
        const value = slots[appointmentId];
        if (!value || Number.isNaN(new Date(value).getTime()) || new Date(value) <= new Date()) {
            setError('Choose a future date and time before confirming this video visit.');
            return;
        }
        setBusy(true);
        const { error: updateError } = await supabase.from('appointments')
            .update({ status: 'scheduled', scheduled_for: new Date(value).toISOString() })
            .eq('id', appointmentId).eq('doctor_id', session.user.id).eq('status', 'pending');
        if (updateError) setError('Could not confirm this appointment. Check that you are the assigned clinician.');
        else { setNotice('Appointment confirmed. Both participants can now join its private video room.'); await loadCare(); }
        setBusy(false);
    }

    const doctorById = Object.fromEntries(doctors.map(doctor => [doctor.user_id, doctor]));
    return <div className="care-page">
        <section className="care-hero"><div className="care-hero-copy"><span className="eyebrow">PRIVATE, RESPECTFUL, WOMEN-CENTERED</span><h1>Care that listens to women.</h1><p>Share a health concern with a female clinician and request a private video consultation.</p><div className="care-points"><span>♧ Confidential request</span><span>♡ Choose a female clinician</span><span>◉ Video appointment after confirmation</span></div></div><div className="care-hero-art"><span>♀</span><i>✦</i></div></section>
        <div className="care-columns">
            <section className="care-panel"><div className="care-panel-heading"><div><span className="eyebrow">TELL US WHAT YOU NEED</span><h2>Request women’s care</h2><p>Your note is shared only with you and the chosen clinician under the configured database access rules.</p></div><span className="care-panel-icon">♡</span></div>
                {error && <div className="notice error-notice" role="alert">{error}</div>}{notice && <div className="notice success-notice" role="status">{notice}</div>}
                <form className="feature-form care-form" onSubmit={requestConsultation}>
                    <label>Choose a female clinician<select value={doctorId} onChange={event => setDoctorId(event.target.value)} required disabled={loading || !doctors.length}><option value="">{loading ? 'Loading clinicians…' : doctors.length ? 'Select a clinician' : 'No clinicians available yet'}</option>{doctors.map(doctor => <option key={doctor.user_id} value={doctor.user_id}>{doctor.display_name} · {doctor.specialty}</option>)}</select></label>