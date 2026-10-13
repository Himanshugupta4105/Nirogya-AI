import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    async function submit(event) {
        event.preventDefault(); setError(''); setMessage('');
        if (password.length < 8) return setError('Use a password with at least 8 characters.');
        if (password !== confirm) return setError('The passwords do not match.');
        setBusy(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Open the password reset link from your email again. The link may have expired.');
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) throw updateError;
            setMessage('Your password has been updated.');
            setTimeout(() => navigate('/women-care', { replace: true }), 800);
        } catch (requestError) { setError(requestError.message || 'Could not update your password.'); }
        finally { setBusy(false); }
    }

    return <section className="single-auth"><div className="auth-card"><span className="eyebrow">ACCOUNT RECOVERY</span><h2>Set a new password</h2><p className="auth-subtitle">Choose a new password for your Nirogya AI account.</p>{message && <div className="notice success-notice">{message}</div>}{error && <div className="notice error-notice" role="alert">{error}</div>}<form className="feature-form" onSubmit={submit}><label>New password<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" required minLength={8} /></label><label>Confirm new password<input type="password" value={confirm} onChange={event => setConfirm(event.target.value)} autoComplete="new-password" required minLength={8} /></label><button className="feature-button" disabled={busy}>{busy ? 'Updating…' : 'Save new password'} <span>→</span></button></form><p className="auth-switch"><Link to="/login">Back to sign in</Link></p></div></section>;
}