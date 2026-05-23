import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="landing">
      {/* Nav */}
      <nav className="nav">
        <div className="nav-logo">
          <span className="logo-icon">✦</span>
          <span className="logo-text">PlanIQ</span>
        </div>
        <div className="nav-actions">
          <Link href="/login" className="nav-link">Sign In</Link>
          <Link href="/signup" className="nav-cta">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">✦ Early Access — Free to Try</div>
        <h1 className="hero-h1">
          Your AI<br />
          <span className="gradient-text">Schedule Advisor</span>
        </h1>
        <p className="hero-p">
          Smart scheduling, conflict detection, and AI-powered workload analysis.
          Plan better. Work smarter.
        </p>
        <div className="hero-btns">
          <Link href="/signup" className="btn-cta">Start Free →</Link>
          <Link href="/login" className="btn-ghost-dark">Sign In</Link>
        </div>
        <p className="hero-note">No credit card. No setup. Just planning.</p>
      </section>

      {/* Features */}
      <section className="features">
        <p className="section-tag">Why PlanIQ</p>
        <h2 className="section-h2">Everything you need to plan your week</h2>
        <div className="feat-grid">
          {[
            { icon: '📅', title: 'Smart Calendar', desc: 'Visual calendar view with daily and monthly scheduling.' },
            { icon: '✦', title: 'AI Analysis', desc: 'Claude AI analyzes your workload and surfaces issues before they become problems.' },
            { icon: '🔔', title: 'Reminders', desc: 'Tasks, events, and focus blocks — all in one place.' },
            { icon: '📊', title: 'Workload Score', desc: 'Know instantly if your week is balanced or overloaded.' },
            { icon: '🔒', title: 'Private & Secure', desc: 'Your data stays yours. Auth and storage powered by Supabase.' },
            { icon: '📱', title: 'Installable PWA', desc: 'Add to your home screen and use it like a native app — offline too.' },
          ].map((f) => (
            <div key={f.title} className="feat-card">
              <span className="feat-icon">{f.icon}</span>
              <h3 className="feat-title">{f.title}</h3>
              <p className="feat-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2 className="cta-h2">Ready to plan smarter?</h2>
        <p className="cta-p">Join PlanIQ Early Access — free forever for early users.</p>
        <Link href="/signup" className="btn-cta">Create Free Account →</Link>
      </section>

      {/* Footer */}
      <footer className="footer">
        <span className="footer-logo">✦ PlanIQ</span>
        <span className="footer-copy">© 2026 REDCON. All rights reserved.</span>
        <Link href="/privacy-policy" className="footer-link">Privacy Policy</Link>
      </footer>

      <style jsx>{`
        .landing { min-height: 100vh; background: #070611; font-family: 'Sora', sans-serif; color: #fff; }

        /* Nav */
        .nav { display: flex; align-items: center; justify-content: space-between; padding: 20px 28px; max-width: 1100px; margin: 0 auto; }
        .nav-logo { display: flex; align-items: center; gap: 8px; }
        .logo-icon { width: 32px; height: 32px; background: linear-gradient(135deg,#6C5CE7,#A78BFA); border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
        .logo-text { font-size: 20px; font-weight: 800; letter-spacing: -.4px; }
        .nav-actions { display: flex; align-items: center; gap: 12px; }
        .nav-link { font-size: 14px; font-weight: 600; color: rgba(255,255,255,.6); text-decoration: none; }
        .nav-link:hover { color: #fff; }
        .nav-cta { padding: 9px 20px; background: linear-gradient(135deg,#6C5CE7,#A78BFA); border-radius: 10px; font-size: 13px; font-weight: 700; color: #fff; text-decoration: none; }

        /* Hero */
        .hero { text-align: center; padding: 80px 24px 60px; max-width: 680px; margin: 0 auto; }
        .hero-badge { display: inline-block; padding: 6px 16px; background: rgba(108,92,231,.2); border: 1px solid rgba(108,92,231,.4); border-radius: 100px; font-size: 13px; font-weight: 600; color: #A78BFA; margin-bottom: 28px; }
        .hero-h1 { font-size: clamp(42px, 8vw, 68px); font-weight: 800; line-height: 1.05; letter-spacing: -2px; margin-bottom: 20px; }
        .gradient-text { background: linear-gradient(135deg,#6C5CE7,#A78BFA,#5AABF0); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .hero-p { font-size: 17px; color: rgba(255,255,255,.6); line-height: 1.65; margin-bottom: 36px; }
        .hero-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px; }
        .btn-cta { padding: 15px 32px; background: linear-gradient(135deg,#6C5CE7,#A78BFA); border-radius: 14px; font-size: 16px; font-weight: 700; color: #fff; text-decoration: none; box-shadow: 0 8px 28px rgba(108,92,231,.45); transition: transform .15s; display: inline-block; }
        .btn-cta:active { transform: scale(.97); }
        .btn-ghost-dark { padding: 14px 28px; background: rgba(255,255,255,.08); border: 1.5px solid rgba(255,255,255,.14); border-radius: 14px; font-size: 15px; font-weight: 600; color: #fff; text-decoration: none; display: inline-block; }
        .hero-note { font-size: 12px; color: rgba(255,255,255,.3); }

        /* Features */
        .features { padding: 60px 24px; max-width: 1100px; margin: 0 auto; }
        .section-tag { text-align: center; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #A78BFA; margin-bottom: 10px; }
        .section-h2 { text-align: center; font-size: clamp(24px, 4vw, 36px); font-weight: 800; letter-spacing: -.5px; margin-bottom: 40px; }
        .feat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
        .feat-card { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08); border-radius: 20px; padding: 24px; transition: border-color .2s; }
        .feat-card:hover { border-color: rgba(108,92,231,.4); }
        .feat-icon { font-size: 28px; margin-bottom: 12px; display: block; }
        .feat-title { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
        .feat-desc { font-size: 13px; color: rgba(255,255,255,.55); line-height: 1.6; }

        /* CTA section */
        .cta-section { text-align: center; padding: 60px 24px; background: linear-gradient(135deg, rgba(108,92,231,.15) 0%, rgba(90,171,240,.1) 100%); }
        .cta-h2 { font-size: clamp(26px, 4vw, 40px); font-weight: 800; letter-spacing: -.5px; margin-bottom: 12px; }
        .cta-p { font-size: 15px; color: rgba(255,255,255,.55); margin-bottom: 28px; }

        /* Footer */
        .footer { display: flex; align-items: center; justify-content: center; gap: 20px; flex-wrap: wrap; padding: 24px; border-top: 1px solid rgba(255,255,255,.07); font-size: 13px; color: rgba(255,255,255,.35); }
        .footer-logo { font-weight: 700; color: rgba(255,255,255,.5); }
        .footer-link { color: rgba(255,255,255,.4); text-decoration: none; }
        .footer-link:hover { color: rgba(255,255,255,.7); }

        @media (max-width: 480px) {
          .nav { padding: 16px 18px; }
          .hero { padding: 60px 18px 40px; }
          .features, .cta-section { padding: 40px 18px; }
          .footer { gap: 12px; font-size: 11px; }
        }
      `}</style>
    </main>
  );
}
