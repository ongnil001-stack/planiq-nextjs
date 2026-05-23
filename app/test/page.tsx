export default function TestPage() {
  return (
    <div style={{ padding: 40, fontFamily: 'monospace', background: '#111', color: '#fff', minHeight: '100vh' }}>
      <h1>Environment Test</h1>
      <p>SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'NOT SET'}</p>
      <p>ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(0, 30) + '...' : 'NOT SET'}</p>
    </div>
  );
}
