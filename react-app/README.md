# Nirogya AI React features

This is a React/Vite feature app containing the requested account, women’s care, and appointment video-call pages. It is separate from the existing plain HTML/CSS/JS demo in the project root, so use this folder as the Antigravity integration source or run it as a React prototype.

## Included pages

- `src/routes.jsx`: central client-side route map for the React app.
- `src/ProtectedRoute.jsx`: waits for Supabase Auth, then allows private routes or redirects signed-out visitors to `/login`, preserving their intended destination.
- `src/layout.jsx`: shared header, navigation, page wrapper, and footer.
- `src/pages/Dashboard.jsx`: signed-in feature-app landing page.
- `src/UserActivity.jsx`: in-tab idle/activity tracker and hook. It tracks event timing only, never input values, and does not persist activity.
- `src/pages/Profile.jsx`: reads a signed-in user’s profile and updates their display name.
- `src/pages/MyAccount.jsx`: account overview with profile, appointment counts, security shortcut, and current-tab activity.
- `src/pages/MyBooking.jsx`: lists the signed-in patient’s appointments, allows cancellation of pending requests, and links scheduled visits to video calls.
- `src/pages/Register.jsx`: email/password account registration, username, phone contact, and SMS phone verification when signup returns an active session.
- `src/pages/Login.jsx`: email/password and verified phone/password sign-in through Supabase; username/password sign-in through the Node API; email reset links and phone OTP password reset.
- `src/pages/ResetPassword.jsx`: sets a new password after opening a valid email recovery link.
- `src/pages/WomenCare.jsx`: private request to an active female clinician and private appointment/request list. Assigned clinicians can read their requests, choose a date/time, confirm, and open the video room.
- `src/pages/OnlineVideoCalling.jsx`: peer-to-peer browser video/audio call with mic/camera controls and private Supabase Realtime signaling restricted to scheduled appointment participants.

## Setup

### 1. Supabase

1. Create a Supabase project.
2. Run `../backend/supabase-schema.sql` in the Supabase SQL Editor.
3. Run `../backend/supabase-auth-care-schema.sql` in the SQL Editor before creating accounts.
4. Enable email/password and phone authentication. Configure email delivery and an SMS provider. Add `http://localhost:5173/login` and `http://localhost:5173/reset-password` to the allowed redirect URLs.
5. Add each real clinician as an Auth user using a trusted admin process and include the required `full_name`, `username`, and E.164 `phone` user metadata (the SQL trigger creates a private profile). Then insert their clinician profile into `doctor_profiles`. Do not allow public users to create doctor profiles.
6. In Supabase Realtime settings, ensure private Broadcast channels are enabled. The SQL adds read/write authorization policies for scheduled appointment rooms.

Doctor profile example (run as an administrator and replace the UUID):

```sql
insert into public.doctor_profiles
  (user_id, display_name, specialty, clinic_name, years_experience, is_female, accepting_patients)
values
  ('DOCTOR_AUTH_USER_UUID', 'Dr. Asha Rao', 'Women’s health', 'Nirogya Care', 8, true, true);
```

### 2. React app

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Edit `.env` with your Supabase project URL and the **publishable/anon key**. Keep the Supabase service-role/secret key only in `../backend/.env`. Do not commit either `.env` file.

### 3. Node API for username sign-in

The other login modes use Supabase Auth directly. Username lookup uses the server endpoint because Supabase password sign-in accepts email or phone, not usernames.

```powershell
Set-Location ..\backend
Copy-Item .env.example .env
npm install
npm run dev
```

Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `CORS_ORIGINS=http://localhost:5173` in `backend/.env`. The username endpoint is rate-limited and returns a standard Supabase Auth session. The service key must never appear in React/browser code.

## Important behavior

- `/`, `/login`, `/register`, and `/reset-password` are public routes. `/dashboard`, `/profile`, `/my-account`, `/my-bookings`, `/women-care`, and `/video-call/:appointmentId` are protected. After a successful sign-in, the login page returns the user to the private URL they originally requested.
- The React feature app and the root-level vanilla HTML records dashboard are separate prototypes. The React dashboard links to women’s care; it does not embed the records dashboard.

- Email is the primary registration identity. The entered phone number is attached to the Auth account and SMS-verified when Supabase returns a session. If email confirmation is enabled, users confirm by email first; after email/password sign-in, the login page prompts them to link and verify the phone.
- Phone/password sign-in and phone password recovery work only after Supabase Auth has a verified phone number for that user. Phone recovery uses an SMS OTP, then updates the password.
- Email recovery uses Supabase’s email reset link. Configure SMTP for production; Supabase’s default email service is rate-limited.
- Username/password sign-in requires the Node API running and the username profile row created by the SQL trigger.
- Women’s care requests start as `pending`. A signed-in account matching the assigned doctor can see the request, view the patient note, select an appointment time, and confirm it. Only scheduled appointments can join a video room.
- Video uses WebRTC with a public STUN server and Supabase private Broadcast for signaling. Some networks need a TURN relay; configure a reputable TURN service before production. Calls are not recorded by this prototype.
- PDF and image upload are implemented separately under `../backend`; this React app does not currently include the existing records dashboard/upload UI.

This code is a hackathon prototype, not a production medical service. Use fictional data during demos. Before handling real patient information, review privacy, consent, clinical workflows, authentication settings, rate limits, audit logging, data retention, and applicable legal requirements.
