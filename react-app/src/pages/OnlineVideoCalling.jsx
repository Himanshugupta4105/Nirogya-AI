import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/authContext';
import '../video.css';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

export default function OnlineVideoCalling({ appointmentId: suppliedAppointmentId, onEnd }) {
  const { appointmentId: routeAppointmentId } = useParams();
  const appointmentId = suppliedAppointmentId || routeAppointmentId;
  const { session } = useAuth();
  const navigate = useNavigate();
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const streamRef = useRef(null);
  const pendingCandidates = useRef([]);
  const makingOffer = useRef(false);
  const [appointment, setAppointment] = useState(null);
  const [doctorName, setDoctorName] = useState('Your clinician');
  const [status, setStatus] = useState('Checking appointment…');
  const [error, setError] = useState('');
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [connected, setConnected] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);

  useEffect(() => {
    let alive = true;
    let peer;
    let channel;
    let stream;
    let currentUserId;
    let isPatient = false;

    async function sendSignal(kind, value = {}) {
      if (!channel || !currentUserId) return;
      const sendStatus = await channel.send({
        type: 'broadcast', event: 'signal', payload: { kind, from: currentUserId, ...value }
      });
      if (sendStatus !== 'ok') throw new Error('Private call signaling could not be sent.');
    }

    async function drainCandidates() {
      if (!peer.remoteDescription) return;
      while (pendingCandidates.current.length) {
        const candidate = pendingCandidates.current.shift();
        try { await peer.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* Ignore stale ICE during reconnect. */ }
      }
    }

    async function handleSignal({ payload }) {
      if (!alive || !payload || payload.from === currentUserId) return;
      try {
        if (payload.kind === 'ready' && isPatient && !peer.localDescription && !makingOffer.current) {
          makingOffer.current = true;
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          await sendSignal('offer', { description: peer.localDescription });
          setStatus('Calling the clinician…');
          makingOffer.current = false;
        } else if (payload.kind === 'offer' && !isPatient && payload.description) {
          await peer.setRemoteDescription(new RTCSessionDescription(payload.description));
          await drainCandidates();
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          await sendSignal('answer', { description: peer.localDescription });
          setStatus('Connecting your video…');
        } else if (payload.kind === 'answer' && isPatient && payload.description && !peer.remoteDescription) {
          await peer.setRemoteDescription(new RTCSessionDescription(payload.description));
          await drainCandidates();
          setStatus('Connecting your video…');
        } else if (payload.kind === 'ice' && payload.candidate) {
          if (peer.remoteDescription) await peer.addIceCandidate(new RTCIceCandidate(payload.candidate));
          else pendingCandidates.current.push(payload.candidate);
        } else if (payload.kind === 'hangup') {
          setStatus('The other participant left the call.');
          setConnected(false);
        }
      } catch (signalError) {
        if (alive) setError(signalError.message || 'The video connection could not be established.');
      }
    }

    async function startCall() {
      if (!appointmentId || !session?.user?.id) return;
      setRemoteReady(false);
      if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
        throw new Error('This browser does not support video calling. Open the site in a current browser over HTTPS.');
      }
      const { data: appointmentData, error: appointmentError } = await supabase.from('appointments')
        .select('id, patient_id, doctor_id, consultation_type, status, scheduled_for')
        .eq('id', appointmentId).maybeSingle();
      if (appointmentError || !appointmentData) throw new Error('This appointment was not found or you are not allowed to join it.');
      if (appointmentData.status !== 'scheduled') throw new Error('This video visit is not confirmed yet.');
      currentUserId = session.user.id;
      isPatient = appointmentData.patient_id === currentUserId;
      if (!isPatient && appointmentData.doctor_id !== currentUserId) throw new Error('You are not a participant in this appointment.');
      if (!alive) return;
      setAppointment(appointmentData);
      const { data: doctor } = await supabase.from('doctor_profiles').select('display_name').eq('user_id', appointmentData.doctor_id).maybeSingle();
      if (alive && doctor?.display_name) setDoctorName(doctor.display_name);

      setStatus('Waiting for camera and microphone permission…');
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
      if (!alive) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      if (localVideo.current) localVideo.current.srcObject = stream;

      peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerRef.current = peer;
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
      peer.ontrack = event => { if (remoteVideo.current) remoteVideo.current.srcObject = event.streams[0]; setRemoteReady(true); };
      peer.onicecandidate = event => {
        if (event.candidate) sendSignal('ice', { candidate: event.candidate.toJSON() }).catch(() => {});
      };
      peer.onconnectionstatechange = () => {
        if (!alive) return;
        setConnected(peer.connectionState === 'connected');
        if (peer.connectionState === 'connected') setStatus('Connected securely peer-to-peer');
        else if (peer.connectionState === 'disconnected') setStatus('Connection paused. Trying to reconnect…');
        else if (peer.connectionState === 'failed') setError('The network could not connect this call. A TURN relay may be needed for this network.');
      };

      channel = supabase.channel(`call:${appointmentId}`, { config: { private: true, broadcast: { self: false } } })
        .on('broadcast', { event: 'signal' }, handleSignal);
      channelRef.current = channel;
      channel.subscribe(async channelStatus => {
        if (!alive) return;
        if (channelStatus === 'SUBSCRIBED') {
          setStatus('Waiting for the other participant to join…');
          try { await sendSignal('ready'); } catch (sendError) { setError(sendError.message || 'Could not join the private video room.'); }
        } else if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT') {
          setError('Could not join the private appointment room. Check the Realtime policies and your connection.');
        }
      });
    }

    startCall().catch(callError => { if (alive) setError(callError.message || 'Could not start the video call.'); });
    return () => {
      alive = false;
      stream?.getTracks().forEach(track => track.stop());
      peer?.close();
      if (channel) supabase.removeChannel(channel);
      streamRef.current = null; peerRef.current = null; channelRef.current = null;
    };
  }, [appointmentId, session?.user?.id]);

  function toggleTrack(kind) {
    const tracks = kind === 'audio' ? streamRef.current?.getAudioTracks() : streamRef.current?.getVideoTracks();
    if (!tracks?.length) return;
    const next = !tracks[0].enabled;
    tracks.forEach(track => { track.enabled = next; });
    if (kind === 'audio') setMicOn(next); else setCameraOn(next);
  }

  async function leaveCall() {
    try { await channelRef.current?.send({ type: 'broadcast', event: 'signal', payload: { kind: 'hangup', from: session.user.id } }); } catch { /* The local call still ends if signaling has closed. */ }
    streamRef.current?.getTracks().forEach(track => track.stop());
    peerRef.current?.close();
    if (channelRef.current) await supabase.removeChannel(channelRef.current);
    if (onEnd) onEnd(); else navigate('/women-care');
  }

  return <section className="video-page">
    <div className="video-heading"><div><span className="eyebrow">PRIVATE APPOINTMENT ROOM</span><h1>Video consultation</h1><p>{doctorName}{appointment?.scheduled_for ? ` · ${new Date(appointment.scheduled_for).toLocaleString()}` : ''}</p></div><span className={`call-state ${connected ? 'connected' : ''}`}><i></i>{connected ? 'Connected' : 'Private room'}</span></div>
    {error && <div className="notice error-notice" role="alert">{error}</div>}
    <div className="video-stage"><div className={`remote-video-wrap ${remoteReady ? 'has-remote' : ''}`}><video ref={remoteVideo} autoPlay playsInline aria-label="Clinician video"/><div className="video-placeholder"><span>◉</span><b>{status}</b><small>Allow camera and microphone access to continue.</small></div><div className="video-label">{doctorName}</div></div><div className="local-video-wrap"><video ref={localVideo} autoPlay muted playsInline aria-label="Your video"/><span>You</span></div></div>
    <div className="call-toolbar"><button className={`call-control ${!micOn ? 'off' : ''}`} onClick={() => toggleTrack('audio')} aria-label={micOn ? 'Mute microphone' : 'Turn microphone on'}>{micOn ? '♬' : '×'}<small>{micOn ? 'Mute' : 'Unmute'}</small></button><button className={`call-control ${!cameraOn ? 'off' : ''}`} onClick={() => toggleTrack('video')} aria-label={cameraOn ? 'Turn camera off' : 'Turn camera on'}>{cameraOn ? '▣' : '×'}<small>{cameraOn ? 'Camera' : 'Camera off'}</small></button><button className="end-call" onClick={leaveCall}>End call <span>☎</span></button></div>
    <div className="video-safety"><span>♧</span><p>Do not record this call without everyone’s consent. If the connection fails, contact the clinic using its verified contact details. This prototype does not record video or audio.</p></div>
    <Link className="back-link" to="/women-care">← Back to women’s care</Link>
  </section>;
}
