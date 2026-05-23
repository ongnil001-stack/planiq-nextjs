import BottomNav from '@/components/layout/BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}>
      {children}
      <BottomNav />
    </div>
  );
}
