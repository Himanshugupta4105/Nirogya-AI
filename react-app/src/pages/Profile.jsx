import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/authContext';

export default function Profile() {
  const { session } = useAuth();
  const user = session?.user;
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!user?.id) return;
      const { data, error: profileError } = await supabase
        .from('user_profiles').select('full_name, username, phone').eq('user_id', user.id).maybeSingle();
      if (!active) return;
      if (profileError) setError('Could not load the profile. Check that the Nirogya care schema is installed.');
      setProfile(data || null);
      setFullName(user.user_metadata?.full_name || data?.full_name || '');
      setLoading(false);
    }
    loadProfile();
    return () => { active = false; };
  }, [user?.id]);

  async function saveProfile(event) {
    event.preventDefault(); setError(''); setNotice('');
    const name = fullName.trim();
    if (name.length < 2) return setError('Enter a name with at least two characters.');
    setBusy(true);
    const { data, error: updateError } = await supabase.auth.updateUser({ data: { full_name: name } });
    if (updateError) setError(updateError.message || 'Could not update your profile.');
    else {
      setProfile(current => ({ ...current, full_name: name }));
      setNotice('Your display name was updated.');
    }
    setBusy(false);
  }

  if (loading) return <div className="app-loading" role="status">Loading your profile…</div>;

  return <section className="account-page">
    <div className="care-hero"><div className="care-hero-copy"><span className="eyebrow">YOUR IDENTITY</span><h1>Profile</h1><p>Review the details connected to your Nirogya AI account.</p></div><div className="care-hero-art" aria-hidden="true">♙</div></div>
    <div className="care-columns">
      <section className="care-panel"><div className="care-panel-heading"><div><span className="eyebrow">PERSONAL DETAILS</span><h2>Account profile</h2></div><span className="care-panel-icon">♙</span></div>
        {error && <div className="notice error-notice" role="alert">{error}</div>}{notice && <div className="notice success-notice" role="status">{notice}</div>}
        <form className="feature-form" onSubmit={saveProfile}>
          <label>Full name<input value={fullName} onChange={event => setFullName(event.target.value)} autoComplete="name" required minLength={2} maxLength={100} /></label>
          <label>Username<input value={profile?.username || user?.user_metadata?.username || 'Not available'} readOnly /></label>
          <label>Email address<input value={user?.email || 'Not available'} readOnly /></label>
          <label>Phone number<input value={profile?.phone || user?.phone || user?.user_metadata?.phone || 'Not available'} readOnly /></label>
          <button className="feature-button" disabled={busy}>{busy ? 'Saving…' : 'Save display name'} <span>→</span></button>
        </form>
        <p className="privacy-footnote">Email, username, and phone are shown as account identifiers. This prototype does not include a verified change flow for those fields.</p>
      </section>
      <aside className="care-aside"><div className="care-aside-card"><span className="eyebrow">ACCOUNT SHORTCUTS</span><h3>Manage your care</h3><p>Review your appointments or open your complete account hub.</p><div className="account-links"><Link className="small-action" to="/my-bookings">My bookings →</Link><Link className="small-action" to="/my-account">My account →</Link><Link className="small-action" to="/reset-password">Password settings →</Link></div></div></aside>
    </div>
  </section>;
}
