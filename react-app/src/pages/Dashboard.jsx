import { Link } from 'react-router-dom';
import { useAuth } from '../lib/authContext';

export default function Dashboard() {
  const { session } = useAuth();
  const name = session?.user?.user_metadata?.full_name?.trim().split(/\s+/)[0] || 'there';

  return (
    <section className="care-page">
      <div className="care-hero">
        <div className="care-hero-copy">
          <span className="eyebrow">YOUR PRIVATE CARE SPACE</span>
          <h1>Welcome, {name}.</h1>
          <p>Choose a care option or continue to your health records.</p>
          <div className="care-points">
            <Link className="feature-button" to="/women-care">Open women’s care <span>→</span></Link>
          </div>
        </div>
        <div className="care-hero-art" aria-hidden="true">✳</div>
      </div>
      <div className="care-columns">
        <article className="care-panel">
          <span className="care-panel-icon">♡</span>
          <h2>Women’s care</h2>
          <p>Request a private consultation with an available female clinician and follow appointment updates.</p>
          <Link className="small-action" to="/women-care">View care requests →</Link>
        </article>
        <article className="care-panel">
          <span className="care-panel-icon">◉</span>
          <h2>Video visits</h2>
          <p>Join a video call from a scheduled appointment. Calls require camera and microphone access.</p>
          <Link className="small-action" to="/women-care">Go to appointments →</Link>
        </article>
      </div>
    </section>
  );
}
