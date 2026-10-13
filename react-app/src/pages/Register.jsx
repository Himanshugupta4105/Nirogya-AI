import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const internationalPhone = /^\+[1-9]\d{7,14}$/;

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', username: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [stage, setStage] = useState('register');
  const [otp, setOtp] = useState('');
  const [pendingPhone, setPendingPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function update(event) { setForm(current => ({ ...current, [event.target.name]: event.target.value })); }

  async function submitRegistration(event) {
    event.preventDefault(); setError(''); setMessage('');
    const email = form.email.trim().toLowerCase();
    const username = form.username.trim().toLowerCase();
    const phone = form.phone.replace(/[\s()-]/g, '');
    if (!internationalPhone.test(phone)) return setError('Enter your phone number with country code, for example +919876543210.');
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) return setError('Username must be 3–30 characters using letters, numbers, dots, underscores, or hyphens.');
    if (form.password.length < 8) return setError('Use a password with at least 8 characters.');
    if (form.password !== form.confirmPassword) return setError('The passwords do not match.');
    setBusy(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: { username, phone, full_name: form.fullName.trim() }
        }
      });
      if (signUpError) throw signUpError;
      if (!data.session) {
        setStage('email');
        setMessage('Check your email for the confirmation link. After confirming and signing in, Nirogya will help you verify this phone number for phone-and-password login.');
        return;
      }
      await requestPhoneVerification(phone);
    } catch (requestError) {
      setError(requestError.message || 'We could not create the account. Check your details and try again.');
    } finally { setBusy(false); }
  }

  async function requestPhoneVerification(phone) {
    const { error: linkError } = await supabase.auth.updateUser({ phone });
    if (linkError) {
      setStage('done');
      setMessage(`Your email account was created. Phone linking could not start: ${linkError.message}. Sign in with email first and check that phone authentication and SMS delivery are enabled in Supabase.`);
      return;
    }
    setPendingPhone(phone);
    setStage('phone');
    setMessage(`We sent a verification code to ${phone}.`);
  }

  async function verifyPhone(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ phone: pendingPhone, token: otp.trim(), type: 'phone_change' });
      if (verifyError) throw verifyError;
      setStage('done');
      setMessage('Your email and phone are verified. You can now sign in with your username, email, or phone number and password.');
    } catch (requestError) { setError(requestError.message || 'That code could not be verified. Request a new one and try again.'); }
    finally { setBusy(false); }
  }

  async function resendPhoneCode() {
    setError(''); setBusy(true);
    try {
      const { error: resendError } = await supabase.auth.resend({ type: 'phone_change', phone: pendingPhone });
      if (resendError) throw resendError;
      setMessage(`A new verification code was sent to ${pendingPhone}.`);
    } catch (requestError) { setError(requestError.message || 'Could not resend the code.'); }
    finally { setBusy(false); }
  }

  return <section className="auth-layout">
    <aside className="auth-aside"><span className="auth-art">✳</span><p className="eyebrow">A HEALTHIER WAY TO STAY ORGANIZED</p><h1>Your health journey deserves a safe home.</h1><p>Bring your health information together and connect with care on your terms.</p><ul><li>One account for your personal health space</li><li>Private consultations with women clinicians</li><li>Health information stays under your control</li></ul></aside>
    <div className="auth-card">
      <span className="eyebrow">CREATE YOUR ACCOUNT</span>
      <h2>{stage === 'phone' ? 'Verify your phone' : stage === 'done' ? 'You’re all set' : stage === 'email' ? 'Confirm your email' : 'Join Nirogya AI'}</h2>
      <p className="auth-subtitle">{stage === 'register' ? 'Your details help keep your health space personal.' : 'A quick verification helps protect your account.'}</p>
      {message && <div className="notice success-notice" role="status">{message}</div>}
      {error && <div className="notice error-notice" role="alert">{error}</div>}
      {stage === 'register' && <form className="feature-form" onSubmit={submitRegistration}>
        <label>Full name<input name="fullName" value={form.fullName} onChange={update} autoComplete="name" required minLength={2} maxLength={100} /></label>
        <label>Username<input name="username" value={form.username} onChange={update} autoComplete="username" required minLength={3} maxLength={30} pattern="[A-Za-z0-9._-]+" /><small>Used as another way to sign in.</small></label>
        <label>Email address<input name="email" type="email" value={form.email} onChange={update} autoComplete="email" required maxLength={254} /></label>
        <label>Phone number<input name="phone" type="tel" value={form.phone} onChange={update} autoComplete="tel" placeholder="+91 98765 43210" required /><small>Include your country code. Phone sign-in starts after SMS verification.</small></label>
        <div className="form-columns"><label>Password<input name="password" type="password" value={form.password} onChange={update} autoComplete="new-password" required minLength={8} /></label><label>Confirm password<input name="confirmPassword" type="password" value={form.confirmPassword} onChange={update} autoComplete="new-password" required minLength={8} /></label></div>
        <button className="feature-button" disabled={busy}>{busy ? 'Creating account…' : 'Create account'} <span>→</span></button>
      </form>}
      {stage === 'phone' && <form className="feature-form" onSubmit={verifyPhone}><label>6-digit verification code<input value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={6} /></label><button className="feature-button" disabled={busy}>{busy ? 'Verifying…' : 'Verify phone'} <span>→</span></button><button type="button" className="quiet-button" onClick={resendPhoneCode} disabled={busy}>Resend code</button></form>}
      {(stage === 'email' || stage === 'done') && <button className="feature-button" onClick={() => navigate('/login')}>Go to sign in <span>→</span></button>}
      <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      <p className="auth-legal">By creating an account, you agree to use this prototype responsibly. Do not use it for emergencies or as a substitute for medical care.</p>
    </div>
  </section>;
}
