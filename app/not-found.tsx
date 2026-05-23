import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg, #0F0E17)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Sora', system-ui, sans-serif",
      color: 'var(--dark, #F0EEFF)',
      padding: '32px 24px',
      textAlign: 'center',
    }}>
      <div style={{
        width: 72, height: 72,
        background: 'linear-gradient(135deg, #181726, #201F30)',
        borderRadius: 22,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 24px',
        border: '1.5px solid rgba(139,124,246,.2)',
        fontSize: 32,
      }}>📭</div>

      <div style={{ fontSize: 64, fontWeight: 900, color: 'rgba(139,124,246,.15)', lineHeight: 1, marginBottom: 8 }}>
        404
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.4px', marginBottom: 8 }}>
        Page Not Found
      </h1>
      <p style={{ fontSize: 14, color: 'rgba(240,238,255,.4)', lineHeight: 1.6, maxWidth: 260, margin: '0 auto 32px' }}>
        This page doesn&apos;t exist or has been moved.
      </p>

      <Link href="/dashboard" style={{
        display: 'inline-block',
        padding: '14px 32px',
        background: 'linear-gradient(135deg, #8B7CF6, #2DD4BF)',
        borderRadius: 14,
        color: '#fff',
        fontFamily: 'inherit',
        fontSize: 15,
        fontWeight: 700,
        textDecoration: 'none',
      }}>
        Go to Dashboard
      </Link>
    </div>
  );
}
