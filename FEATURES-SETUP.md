# Nirogya AI account and care features

The vanilla HTML/CSS/JavaScript prototype lives in `features.html`, `features.css`, and `features.js`. The dashboard links to it as **Account & women’s care**.

## Connect Supabase

1. In `features.js`, replace `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` with the project URL and browser-safe publishable (or legacy anon) key from Supabase project settings. Never use a `service_role` key in browser code.
2. Run `backend/supabase-auth-care-schema.sql` in the Supabase SQL editor. The existing health records schema is separate; this adds profiles, clinician directory, appointment policies, and private call signaling authorization.
3. Enable email and phone authentication providers in Supabase. Configure email confirmation and an SMS provider in Supabase Auth. For reliable phone sign-up, configure an SMS provider and verify phone numbers.
4. Add a clinician account to `doctor_profiles` using a trusted admin process. Set `is_female = true` and `accepting_patients = true` for clinicians offered in Women’s Care. Do not allow a public browser client to write clinician profiles.
5. Start the existing backend (`cd backend`, `npm install`, `npm start`) if username/password login is needed. Update `API_URL` in `features.js` when the backend is deployed somewhere other than `http://localhost:4000`.
6. Serve the project over localhost (for example, VS Code Live Server) or HTTPS. Browser camera/microphone access and Supabase Auth redirects require a secure origin. Set the matching local/deployed URL in Supabase Auth redirect URL settings and the backend CORS allowlist.

## Included flows

- Register with full name, username, email, phone (international `+` format), and password.
- Sign in with email/password or phone/password. Username/password sign-in uses the existing backend endpoint.
- Recover through an email reset link or an SMS verification flow. Email reset links return to this page; a valid recovery session shows the new-password form.
- Submit a private Women’s Care request to an active female clinician. Assigned clinicians can schedule a request; the participants can join the scheduled video visit.
- Peer-to-peer WebRTC audio/video with microphone/camera controls. The page does not record calls. STUN alone may not connect users behind restrictive NAT/firewalls; configure a TURN service for production.

## Prototype limits

The frontend intentionally depends on the Supabase schema’s row-level security. Do not remove those policies or expose a service-role key. This is a prototype, not a production telehealth service: production use needs security/privacy review, consent and retention policies, reliable TURN infrastructure, clinician onboarding, scheduling/time-zone rules, and legal/clinical review. Phone recovery uses a browser prompt for the SMS code and a new password; replace it with an in-page verification form before presenting a polished user experience.
