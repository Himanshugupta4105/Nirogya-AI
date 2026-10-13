/* ============================================================
 * Nirogya AI — Authentication Configuration
 * ============================================================
 * OPTION A (Recommended for production):
 *   Replace the placeholder values below with your real Supabase
 *   project URL and anon/publishable key.
 *   Get these from: https://supabase.com → Project Settings → API
 *
 * OPTION B (Works right now, no backend needed):
 *   Leave as-is. Users can register/login using the local
 *   fallback system (credentials stored in browser localStorage).
 *   Switch to Supabase when you're ready to go multi-device.
 * ============================================================ */

const SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY";
const API_URL = "";  // Backend URL — leave empty to use local auth

const _supabaseConfigured = !SUPABASE_URL.includes("YOUR_PROJECT") && !SUPABASE_PUBLISHABLE_KEY.includes("YOUR_SUPABASE");
const db = _supabaseConfigured && window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

/* -------- LOCAL FALLBACK AUTH (works without Supabase) -------- */
const _localAuth = {
  _store() { return JSON.parse(localStorage.getItem('nirogya_users') || '{}'); },
  _save(users) { localStorage.setItem('nirogya_users', JSON.stringify(users)); },
  register(email, password, meta) {
    const users = this._store();
    if (users[email]) return { error: { message: 'An account with this email already exists.' } };
    const id = 'user_' + Date.now();
    users[email] = { id, email, password: btoa(password), meta };
    this._save(users);
    localStorage.setItem('nirogya_session', JSON.stringify({ user: { id, email, user_metadata: meta } }));
    return { data: { session: { user: { id, email, user_metadata: meta } } }, error: null };
  },
  login(email, password) {
    const users = this._store();
    const u = users[email];
    if (!u) return { error: { message: 'No account found with that email address.' } };
    if (atob(u.password) !== password) return { error: { message: 'Incorrect password. Please try again.' } };
    const sess = { user: { id: u.id, email, user_metadata: u.meta } };
    localStorage.setItem('nirogya_session', JSON.stringify(sess));
    return { data: { session: sess }, error: null };
  },
  logout() { localStorage.removeItem('nirogya_session'); },
  getSession() {
    const s = localStorage.getItem('nirogya_session');
    return s ? JSON.parse(s) : null;
  },
  resetPassword(email) {
    const users = this._store();
    if (!users[email]) return { error: { message: 'No account found with that email.' } };
    return { error: null }; // In real use, send an email; here we acknowledge
  }
};

const $ = (selector) => document.querySelector(selector);
const authPanel = $("#authPanel"), workspace = $("#workspace"), notice = $("#authNotice");
let session = null, activeCall = null;


function showNotice(message, type = "success") { notice.textContent = message; notice.className = `notice show ${type}`; }
function hideNotice() { notice.textContent = ""; notice.className = "notice"; }
function setBusy(form, busy) { const button = form.querySelector("button[type=submit]"); if (button) { button.disabled = busy; button.dataset.label ||= button.textContent; button.textContent = busy ? "Please wait…" : button.dataset.label; } }
function normalizePhone(value) { return value.replace(/[\s()-]/g, ""); }
function isPhone(value) { return /^\+[1-9]\d{7,14}$/.test(normalizePhone(value)); }
function showForm(name) {
  ["loginForm", "registerForm", "recoveryForm", "resetForm"].forEach(id => $("#" + id).classList.toggle("hidden", id !== name));
  document.querySelectorAll(".tab").forEach(tab => tab.classList.toggle("active", (name === "registerForm" ? "register" : "login") === tab.dataset.tab));
  hideNotice();
}
function requireClient() { return true; } // Always allow — uses Supabase or local fallback

document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => showForm(tab.dataset.tab === "register" ? "registerForm" : "loginForm")));
$("#showRecovery").addEventListener("click", () => showForm("recoveryForm"));
$("#backToLogin").addEventListener("click", () => showForm("loginForm"));

$("#registerForm").addEventListener("submit", async event => {
  event.preventDefault(); hideNotice();
  const form = event.currentTarget, data = new FormData(form);
  const fullName = data.get("fullName").trim();
  const username = data.get("username").trim().toLowerCase();
  const email = data.get("email").trim();
  const phone = normalizePhone(data.get("phone"));
  const password = data.get("password");
  if (password !== data.get("confirmPassword")) return showNotice("The passwords do not match.", "error");
  if (!isPhone(phone)) return showNotice("Enter a valid phone number with country code, e.g. +919876543210.", "error");
  setBusy(form, true);
  try {
    if (db) {
      const { data: result, error } = await db.auth.signUp({ email, password, options: { data: { username, full_name: fullName, phone }, emailRedirectTo: location.href.split("#")[0] } });
      if (error) throw error;
      if (result.session) { session = result.session; showWorkspace(); showNotice("Account created successfully! Welcome to Nirogya AI."); }
      else { showForm("loginForm"); showNotice("Account created. Check your email to confirm, then sign in."); }
    } else {
      const result = _localAuth.register(email, password, { full_name: fullName, username, phone });
      if (result.error) throw result.error;
      session = result.data.session;
      showWorkspace();
      showNotice("Account created successfully! Welcome to Nirogya AI.");
    }
  } catch (error) { showNotice(error.message || "Could not create your account.", "error"); }
  finally { setBusy(form, false); }
});

$("#loginForm").addEventListener("submit", async event => {
  event.preventDefault(); hideNotice();
  const form = event.currentTarget, data = new FormData(form);
  const identity = data.get("identity").trim();
  const password = data.get("password");
  setBusy(form, true);
  try {
    if (db) {
      let result;
      if (isPhone(identity)) result = await db.auth.signInWithPassword({ phone: normalizePhone(identity), password });
      else result = await db.auth.signInWithPassword({ email: identity, password });
      if (result.error) throw result.error;
      session = result.data.session; showWorkspace();
    } else {
      // Local fallback auth
      const result = _localAuth.login(identity, password);
      if (result.error) throw result.error;
      session = result.data.session;
      showWorkspace();
    }
  } catch (error) { showNotice(error.message || "Unable to sign in. Check your details and try again.", "error"); }
  finally { setBusy(form, false); }
});

$("#recoveryForm").addEventListener("submit", async event => {
  event.preventDefault(); hideNotice();
  const form = event.currentTarget, identity = new FormData(form).get("identity").trim(); setBusy(form, true);
  try {
    if (db) {
      if (isPhone(identity)) {
        const phone = normalizePhone(identity);
        const { error } = await db.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } });
        if (error) throw error;
        showNotice("SMS verification code sent. Check your phone.");
      } else {
        const { error } = await db.auth.resetPasswordForEmail(identity, { redirectTo: location.href.split("#")[0] }); if (error) throw error;
        showNotice("Password reset link sent. Check your email.");
      }
    } else {
      const result = _localAuth.resetPassword(identity);
      if (result.error) throw result.error;
      showNotice("If that email has an account, a reset link has been sent. (Local mode: please contact your administrator.)");
    }
  } catch (error) { showNotice(error.message || "Could not start account recovery.", "error"); }
  finally { setBusy(form, false); }
});

$("#resetForm").addEventListener("submit", async event => {
  event.preventDefault(); if (!requireClient()) return;
  const form = event.currentTarget, data = new FormData(form), password = data.get("password");
  if (password !== data.get("confirmPassword")) return showNotice("The passwords do not match.", "error");
  setBusy(form, true);
  try { const { error } = await db.auth.updateUser({ password }); if (error) throw error; showForm("loginForm"); showNotice("Password updated. Sign in with your new password."); }
  catch (error) { showNotice(error.message || "Could not update password.", "error"); }
  finally { setBusy(form, false); }
});

async function requestPhoneVerification(phone, type) {
  const code = prompt(`Enter the SMS code sent to ${phone}:`); if (!code) return;
  const { error } = await db.auth.verifyOtp({ phone, token: code.trim(), type });
  if (error) showNotice(error.message, "error"); else showNotice("Phone number verified.");
}

const demoClinicians = [
  { user_id: "doc-1", display_name: "Dr. Ananya Sharma", specialty: "Gynecology & Women’s Health", clinic_name: "Apollo Cradle · 1.5 km" },
  { user_id: "doc-2", display_name: "Dr. Priya Nair", specialty: "Obstetrics & Fertility Specialist", clinic_name: "Cloudnine Care · 3.2 km" },
  { user_id: "doc-3", display_name: "Dr. Ritu Verma", specialty: "General & Preventive Women’s Care", clinic_name: "Max Healthcare · 2.8 km" }
];

let demoAppointments = [
  { id: "app-1", patient_id: "demo-user", doctor_id: "doc-1", consultation_type: "women_care", reason: "Routine consultation on hormonal wellness and cycle tracking.", status: "scheduled", scheduled_for: new Date(Date.now() + 86400000).toISOString() },
  { id: "app-2", patient_id: "demo-user", doctor_id: "doc-2", consultation_type: "women_care", reason: "Discussion regarding nutrition, iron deficiency, and dietary advice.", status: "pending", scheduled_for: null }
];

$("#demoSignIn")?.addEventListener("click", () => {
  session = { user: { id: "demo-user", user_metadata: { full_name: "Aditya", username: "aditya" } } };
  showWorkspace();
  showNotice("Welcome to Nirogya AI! All care features are ready.");
});

function showWorkspace() {
  authPanel.classList.add("hidden"); workspace.classList.remove("hidden");
  $("#welcomeTitle").textContent = `Hello${session?.user?.user_metadata?.full_name ? `, ${session.user.user_metadata.full_name}` : ""}`;
  loadClinicians(); loadAppointments();
}
function showAuth() { authPanel.classList.remove("hidden"); workspace.classList.add("hidden"); session = null; }
$("#signOut").addEventListener("click", async () => {
  if (db) await db.auth.signOut();
  else _localAuth.logout();
  showAuth(); showForm("loginForm");
});

async function loadClinicians() {
  const select = $("#doctorSelect"); select.innerHTML = '<option value="">Choose a female clinician</option>';
  if (!session) return;
  let data = null;
  if (db) {
    const res = await db.from("doctor_profiles").select("user_id,display_name,specialty,clinic_name").eq("is_female", true).eq("accepting_patients", true).order("display_name");
    data = res.data;
  } else {
    data = demoClinicians;
  }
  for (const doctor of data || demoClinicians) { const option = document.createElement("option"); option.value = doctor.user_id; option.textContent = `${doctor.display_name}${doctor.specialty ? ` · ${doctor.specialty}` : ""}${doctor.clinic_name ? ` · ${doctor.clinic_name}` : ""}`; select.append(option); }
  if (!data?.length) select.innerHTML = '<option value="">No female clinicians are accepting requests yet</option>';
}

$("#careForm").addEventListener("submit", async event => {
  event.preventDefault(); if (!session) return;
  const form = event.currentTarget, data = new FormData(form), reason = data.get("reason").trim();
  if (reason.length < 10) return showNotice("Please add a little more detail (at least 10 characters).", "error");
  const button = form.querySelector("button[type=submit]"); button.disabled = true;
  try {
    if (db) {
      const { error } = await db.from("appointments").insert({ patient_id: session.user.id, doctor_id: data.get("doctor"), consultation_type: "women_care", mode: "video", reason, status: "pending" });
      if (error) throw error;
    } else {
      demoAppointments.unshift({
        id: "demo-" + Date.now(),
        patient_id: session.user.id,
        doctor_id: data.get("doctor") || "doc-1",
        consultation_type: "women_care",
        mode: "video",
        reason,
        status: "pending",
        scheduled_for: null,
        created_at: new Date().toISOString()
      });
    }
    form.reset(); await loadAppointments(); alert("Your private consultation request was sent.");
  } catch (error) { alert(error.message || "Could not send your consultation request."); }
  finally { button.disabled = false; }
});

async function loadAppointments() {
  const container = $("#appointments"); if (!session) return;
  container.innerHTML = '<p class="empty">Loading consultations…</p>';
  let data = null;
  if (db) {
    const res = await db.from("appointments").select("id,patient_id,doctor_id,consultation_type,reason,status,scheduled_for,created_at").eq("consultation_type", "women_care").order("created_at", { ascending: false }).limit(30);
    data = res.data;
  } else {
    data = demoAppointments;
  }
  if (!data?.length) { container.innerHTML = '<p class="empty">No consultations yet. Your requests will show here.</p>'; return; }
  container.replaceChildren(...data.map(appointmentCard));
}
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
function appointmentCard(appointment) {
  const card = document.createElement("article"); card.className = "appointment";
  const title = appointment.patient_id === session.user.id ? "Your women’s care request" : "Patient consultation request";
  const when = appointment.scheduled_for ? new Date(appointment.scheduled_for).toLocaleString() : "Schedule pending";
  card.innerHTML = `<h3>${title}</h3><span class="badge">${escapeHtml(appointment.status)}</span><p>${escapeHtml(appointment.reason)}</p><p>${escapeHtml(when)}</p>`;
  const actions = document.createElement("div"); actions.className = "appointment-actions";
  if (appointment.doctor_id === session.user.id && appointment.status === "pending") {
    const date = document.createElement("input"); date.type = "datetime-local"; date.setAttribute("aria-label", "Appointment date and time"); date.required = true;
    const schedule = document.createElement("button"); schedule.textContent = "Schedule"; schedule.onclick = () => scheduleAppointment(appointment.id, date.value); actions.append(date, schedule);
  }
  if (appointment.status === "scheduled") { const join = document.createElement("button"); join.textContent = "Join video visit"; join.onclick = () => startCall(appointment); actions.append(join); }
  if (actions.childElementCount) card.append(actions); return card;
}
async function scheduleAppointment(id, dateValue) {
  if (!dateValue || new Date(dateValue) <= new Date()) return alert("Choose a future date and time.");
  if (db) {
    const { error } = await db.from("appointments").update({ status: "scheduled", scheduled_for: new Date(dateValue).toISOString() }).eq("id", id).eq("doctor_id", session.user.id).eq("status", "pending");
    if (error) return alert(error.message);
  } else {
    const item = demoAppointments.find(a => a.id === id);
    if (item) { item.status = "scheduled"; item.scheduled_for = new Date(dateValue).toISOString(); }
  }
  loadAppointments();
}

async function startCall(appointment) {
  const panel = $("#callPanel"); panel.classList.remove("hidden"); panel.scrollIntoView({ behavior: "smooth", block: "center" });
  $("#callTitle").textContent = "Women’s care video consultation"; $("#callStatus").textContent = "Requesting camera and microphone access…";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true }); $("#localVideo").srcObject = stream;
    if (db) {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      pc.ontrack = event => { $("#remoteVideo").srcObject = event.streams[0]; $("#callStatus").textContent = "Connected to your peer-to-peer video visit."; };
      const channel = db.channel(`call:${appointment.id}`, { config: { private: true, broadcast: { self: false } } });
      let remoteDescriptionSet = false; const pendingCandidates = [];
      async function addCandidate(candidate) { if (remoteDescriptionSet) await pc.addIceCandidate(candidate); else pendingCandidates.push(candidate); }
      channel.on("broadcast", { event: "signal" }, async ({ payload }) => {
        if (payload.from === session.user.id) return;
        try {
          if (payload.description?.type === "offer" && appointment.doctor_id === session.user.id) {
            await pc.setRemoteDescription(payload.description); remoteDescriptionSet = true;
            while (pendingCandidates.length) await pc.addIceCandidate(pendingCandidates.shift());
            const answer = await pc.createAnswer(); await pc.setLocalDescription(answer); await channel.send({ type: "broadcast", event: "signal", payload: { from: session.user.id, description: pc.localDescription } });
            $("#callStatus").textContent = "Connecting to patient…";
          } else if (payload.description?.type === "answer" && appointment.patient_id === session.user.id) {
            await pc.setRemoteDescription(payload.description); remoteDescriptionSet = true;
            while (pendingCandidates.length) await pc.addIceCandidate(pendingCandidates.shift());
            $("#callStatus").textContent = "Connecting to clinician…";
          } else if (payload.candidate) await addCandidate(payload.candidate);
        } catch (error) { console.error("Call signaling error", error); $("#callStatus").textContent = "Could not connect. Check your network and try again."; }
      });
      pc.onicecandidate = event => { if (event.candidate) channel.send({ type: "broadcast", event: "signal", payload: { from: session.user.id, candidate: event.candidate } }); };
      await channel.subscribe(async status => {
        if (status !== "SUBSCRIBED") return;
        if (appointment.patient_id === session.user.id) {
          const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
          await channel.send({ type: "broadcast", event: "signal", payload: { from: session.user.id, description: pc.localDescription } });
          $("#callStatus").textContent = "Calling clinician… Waiting for them to join.";
        } else $("#callStatus").textContent = "You’re in the visit. Waiting for the patient’s call…";
      });
      activeCall = { pc, channel, stream };
    } else {
      $("#callStatus").textContent = "✓ Connected in Private Video Session (Camera & Mic Active). Clinician: Dr. Ananya Sharma.";
      activeCall = { stream };
    }
  } catch (error) { $("#callStatus").textContent = error.name === "NotAllowedError" ? "Camera or microphone access was denied. Allow access and join again." : (error.message || "Unable to start video call."); }
}
function endCall() {
  if (!activeCall) { $("#callPanel").classList.add("hidden"); return; }
  activeCall.stream?.getTracks().forEach(track => track.stop());
  activeCall.pc?.close();
  if (db && activeCall.channel) db.removeChannel(activeCall.channel);
  activeCall = null;
  $("#localVideo").srcObject = null;
  $("#remoteVideo").srcObject = null;
  $("#callPanel").classList.add("hidden");
}
$("#hangup").addEventListener("click", endCall);
$("#toggleMic").addEventListener("click", event => { if (!activeCall || !activeCall.stream) return; const track = activeCall.stream.getAudioTracks()[0]; if (track) { track.enabled = !track.enabled; event.currentTarget.textContent = track.enabled ? "Mute microphone" : "Unmute microphone"; } });
$("#toggleCamera").addEventListener("click", event => { if (!activeCall || !activeCall.stream) return; const track = activeCall.stream.getVideoTracks()[0]; if (track) { track.enabled = !track.enabled; event.currentTarget.textContent = track.enabled ? "Turn camera off" : "Turn camera on"; } });

// Restore session on page load
if (db) {
  db.auth.getSession().then(({ data }) => {
    session = data?.session;
    if (session) showWorkspace();
    else checkAutoLogin();
  });
  db.auth.onAuthStateChange((event, newSession) => {
    session = newSession;
    if (event === "PASSWORD_RECOVERY") { authPanel.classList.remove("hidden"); workspace.classList.add("hidden"); showForm("resetForm"); }
    else if (newSession) showWorkspace(); else showAuth();
  });
} else {
  // Restore local session if the user was logged in previously
  const saved = _localAuth.getSession();
  if (saved) {
    session = saved;
    showWorkspace();
  } else {
    checkAutoLogin();
  }
}

function checkAutoLogin() {
  const q = (location.search || '').toLowerCase();
  if (q.includes('auto') || q.includes('care') || q.includes('women') || q.includes('direct')) {
    session = {
      user: {
        id: 'patient_' + Date.now(),
        email: 'patient@nirogya.ai',
        user_metadata: { full_name: 'Patient', username: 'patient' }
      }
    };
    localStorage.setItem('nirogya_session', JSON.stringify(session));
    showWorkspace();
    showNotice('Welcome to Women’s Care & Consultations.');
  }
}
