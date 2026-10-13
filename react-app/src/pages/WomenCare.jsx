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
          {doctorId && doctorById[doctorId] && <div className="selected-doctor"><span className="doctor-initial">{doctorById[doctorId].display_name.split(' ').filter(Boolean).slice(-1)[0]?.[0] || 'D'}</span><div><b>{doctorById[doctorId].display_name}</b><small>{doctorById[doctorId].specialty} · {doctorById[doctorId].years_experience} years experience{doctorById[doctorId].clinic_name ? ` · ${doctorById[doctorId].clinic_name}` : ''}</small></div></div>}
          <label>What would you like help with?<textarea value={reason} onChange={event => setReason(event.target.value)} minLength={10} maxLength={2000} rows={5} placeholder="Share only what you are comfortable discussing with your selected clinician…" required /></label>
          <label className="consent-check"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><span>I agree to share this note with the clinician I selected for this care request.</span></label>
          <button className="feature-button" disabled={busy || loading || !doctors.length}>{busy ? 'Sending request…' : 'Request a private video visit'} <span>→</span></button>
        </form><p className="privacy-footnote">This form is not monitored for emergencies. Do not include information you do not want stored in your health account.</p>
      </section>
      <aside className="care-aside"><div className="care-aside-card"><span className="care-aside-symbol">♧</span><h3>Your privacy matters</h3><p>Your note is stored in the private appointments table. The included SQL policies allow access to you and the doctor assigned to your request.</p><div className="privacy-divider"></div><b>For urgent or severe symptoms</b><p>Contact local emergency services or go to the nearest emergency department. This page is not an urgent-care service.</p></div><div className="care-aside-card muted-card"><span className="eyebrow">HOW IT WORKS</span><ol><li>Choose a female clinician from the directory.</li><li>Share a short note and request a visit.</li><li>After the clinician confirms, join the private video call.</li></ol></div></aside>
    </div>
    <section className="requests-section"><div className="requests-heading"><div><span className="eyebrow">YOUR PRIVATE CARE</span><h2>Requests and appointments</h2></div><button className="quiet-button" onClick={loadCare} disabled={loading}>↻ Refresh</button></div>
      {loading ? <div className="empty-card">Loading your care requests…</div> : appointments.length === 0 ? <div className="empty-card">No women’s care requests yet. Your requests will appear here.</div> : <div className="request-list">{appointments.map(appointment => { const isClinician = appointment.doctor_id === session.user.id; return <article className="request-card" key={appointment.id}><div className="request-doctor"><span className="doctor-initial">{isClinician ? '♀' : doctorById[appointment.doctor_id]?.display_name?.split(' ').filter(Boolean).slice(-1)[0]?.[0] || 'D'}</span><div><b>{isClinician ? 'Women’s care request' : doctorById[appointment.doctor_id]?.display_name || 'Women’s care clinician'}</b><small>{isClinician ? 'Assigned to you' : doctorById[appointment.doctor_id]?.specialty || 'Women’s health'} · {formatDate(appointment.scheduled_for)}</small></div></div><span className={`appointment-status ${appointment.status}`}>{appointment.status}</span>{isClinician && <p className="request-reason"><b>Patient note:</b> {appointment.reason}</p>}{isClinician && appointment.status === 'pending' && <div className="schedule-controls"><label>Proposed time<input type="datetime-local" value={slots[appointment.id] || ''} onChange={event => setSlots(current => ({ ...current, [appointment.id]: event.target.value }))} min={localDateTimeMin()} /></label><button className="small-action" onClick={() => confirmAppointment(appointment.id)} disabled={busy}>Confirm visit</button></div>}{appointment.status === 'scheduled' && <Link className="small-action" to={`/video-call/${appointment.id}`}>Join video call →</Link>}</article>; })}</div>}
    </section>
  </div>;
}
