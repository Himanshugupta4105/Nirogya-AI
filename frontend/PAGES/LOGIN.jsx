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