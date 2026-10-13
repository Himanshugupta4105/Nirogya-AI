import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiUrl, supabase } from '../lib/supabase';

function isPhone(value) { return /^\+[0-9()\s.-]{8,20}$/.test(value.trim()) && /\d{8,}/.test(value); }
function normalizePhone(value) { return value.trim().replace(/[\s().-]/g, ''); }

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const destination = location.state?.from?.pathname || '/women-care';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [stage, setStage] = useState('login');
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function clearMessages() { setNotice(''); setError(''); }

  async function maybeLinkPhone(user) {
    const phone = user?.user_metadata?.phone;
    if (!phone || user.phone === phone) return false;
    const { error: linkError } = await supabase.auth.updateUser({ phone });
    if (linkError) return false;
    setRecoveryIdentifier(phone);
    setStage('linkPhone');
    setNotice(`Verify ${phone} with the SMS code to enable phone-and-password sign-in.`);
    return true;
  }

  async function submitLogin(event) {
    event.preventDefault(); clearMessages(); setBusy(true);
    const value = identifier.trim();
    try {
      let user;
      if (value.includes('@')) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: value.toLowerCase(), password });
        if (signInError) throw signInError;
        user = data.user;
      } else if (isPhone(value)) {
        const phone = normalizePhone(value);
        if (!phone.startsWith('+')) throw new Error('Enter your phone with country code, for example +919876543210.');
        const { error: signInError } = await supabase.auth.signInWithPassword({ phone, password });
        if (signInError) throw signInError;
      } else {
        const response = await fetch(`${apiUrl}/api/auth/username-login`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: value, password })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'The username or password is incorrect.');
        const { error: sessionError } = await supabase.auth.setSession(result.session);
        if (sessionError) throw sessionError;
        user = result.user;
      }
      const needsPhoneVerification = await maybeLinkPhone(user);
      if (!needsPhoneVerification) navigate(destination, { replace: true });
    } catch (requestError) { setError(requestError.message || 'Could not sign in. Check your details and try again.'); }
    finally { setBusy(false); }
  }

  async function startRecovery(event) {
    event.preventDefault(); clearMessages(); setBusy(true);
    const value = recoveryIdentifier.trim();
    try {
      if (isPhone(value)) {
        const phone = normalizePhone(value);
        if (!phone.startsWith('+')) throw new Error('Enter your phone with country code, for example +919876543210.');
        const { error: otpError } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } });
        if (otpError) throw otpError;
        setRecoveryIdentifier(phone);
        setStage('recoverPhoneOtp');
        setNotice('If this phone is linked to an account, a verification code will arrive by SMS.');
      } else if (value.includes('@')) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(value.toLowerCase(), {
          redirectTo: `${window.location.origin}/reset-password`
        });
        if (resetError) throw resetError;
        setNotice('If an account uses that email, password-reset instructions will be sent. Check your inbox and spam folder.');
      } else {
        throw new Error('For account recovery, enter the email address or verified phone number on the account.');
      }
    } catch (requestError) { setError(requestError.message || 'Could not start account recovery. Try again later.'); }
    finally { setBusy(false); }
  }

  async function verifyRecoveryOtp(event) {
    event.preventDefault(); clearMessages(); setBusy(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ phone: recoveryIdentifier, token: otp, type: 'sms' });
      if (verifyError) throw verifyError;
      setStage('recoverPhonePassword');
      setNotice('Verified. Choose a new password for your account.');
    } catch (requestError) { setError(requestError.message || 'That code could not be verified.'); }
    finally { setBusy(false); }
  }

  async function savePhonePassword(event) {
    event.preventDefault(); clearMessages(); setBusy(true);
    try {
      if (newPassword.length < 8) throw new Error('Use a password with at least 8 characters.');
      const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
      if (passwordError) throw passwordError;
      setNotice('Password updated. You are signed in.');
      setStage('complete');
      setTimeout(() => navigate(destination, { replace: true }), 900);
    } catch (requestError) { setError(requestError.message || 'Could not update the password.'); }
    finally { setBusy(false); }
  }

  async function verifyLinkedPhone(event) {
    event.preventDefault(); clearMessages(); setBusy(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ phone: recoveryIdentifier, token: otp, type: 'phone_change' });
      if (verifyError) throw verifyError;
      navigate(destination, { replace: true });
    } catch (requestError) { setError(requestError.message || 'Phone verification failed.'); }
    finally { setBusy(false); }
  }

  const recoveryMode = stage.startsWith('recover');
  return <section className="auth-layout login-layout">
    <aside className="auth-aside"><span className="auth-art">✧</span><p className="eyebrow">WELCOME BACK</p><h1>Your health space is ready when you are.</h1><p>Sign in to view your records, care requests, and private appointments.</p><div className="trust-box"><span>♧</span><p>Your health information is private to your account and the care providers you choose.</p></div></aside>
    <div className="auth-card">
      <span className="eyebrow">SECURE SIGN IN</span>
      <h2>{recoveryMode ? stage === 'recoverPhonePassword' ? 'Choose a new password' : stage === 'recoverPhoneOtp' ? 'Verify your phone' : 'Recover your account' : stage === 'linkPhone' ? 'Verify your phone' : stage === 'complete' ? 'Password updated' : 'Welcome back'}</h2>
      <p className="auth-subtitle">{recoveryMode ? 'Use the email address or verified phone number on your account.' : 'Use your username, email address, or verified phone number.'}</p>
      {notice && <div className="notice success-notice" role="status">{notice}</div>}{error && <div className="notice error-notice" role="alert">{error}</div>}
      {stage === 'login' && <form className="feature-form" onSubmit={submitLogin}><label>Username, email, or phone<input value={identifier} onChange={event => setIdentifier(event.target.value)} autoComplete="username" required /></label><label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required /></label><button className="forgot-link" type="button" onClick={() => { clearMessages(); setStage('recover'); setRecoveryIdentifier(identifier.includes('@') || isPhone(identifier) ? identifier : ''); }}>Forgot password or login details?</button><button className="feature-button" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <span>→</span></button></form>}
      {stage === 'recover' && <form className="feature-form" onSubmit={startRecovery}><label>Email address or verified phone<input value={recoveryIdentifier} onChange={event => setRecoveryIdentifier(event.target.value)} autoComplete="email tel" required placeholder="you@example.com or +919876543210" /></label><button className="feature-button" disabled={busy}>{busy ? 'Sending…' : 'Continue recovery'} <span>→</span></button><button type="button" className="quiet-button" onClick={() => { clearMessages(); setStage('login'); }}>Back to sign in</button></form>}
      {(stage === 'recoverPhoneOtp' || stage === 'linkPhone') && <form className="feature-form" onSubmit={stage === 'linkPhone' ? verifyLinkedPhone : verifyRecoveryOtp}><label>SMS verification code<input value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={6} /></label><button className="feature-button" disabled={busy}>{busy ? 'Verifying…' : 'Verify code'} <span>→</span></button><button type="button" className="quiet-button" onClick={() => { clearMessages(); setStage(stage === 'linkPhone' ? 'login' : 'recover'); }}>Cancel</button></form>}
      {stage === 'recoverPhonePassword' && <form className="feature-form" onSubmit={savePhonePassword}><label>New password<input type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete="new-password" required minLength={8} /></label><button className="feature-button" disabled={busy}>{busy ? 'Updating…' : 'Update password'} <span>→</span></button></form>}
      {stage === 'complete' && <button className="feature-button" onClick={() => navigate(destination, { replace: true })}>Continue <span>→</span></button>}
      <p className="auth-switch">New to Nirogya AI? <Link to="/register">Create an account</Link></p>
      <p className="auth-legal">For safety, the page gives the same email-recovery confirmation whether or not an account exists.</p>
    </div>
  </section>;
}
