import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — PlanIQ',
  description: 'How PlanIQ collects, uses, and protects your personal information.',
};

const EFFECTIVE_DATE = 'May 28, 2026';
const CONTACT_EMAIL  = 'privacy@emlabs.ph';
const APP_NAME       = 'PlanIQ';
const COMPANY_NAME   = 'EM Labs';

export default function PrivacyPolicyPage() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0f0f1a',
      color: '#e2e8f0',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: '0 0 60px',
    }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '20px 24px 24px',
        position: 'sticky', top: 0, zIndex: 10,
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <img
              src="/icons/icon-192.png"
              alt="PlanIQ"
              style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }}
            />
            <span style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>{APP_NAME}</span>
          </Link>
          <div style={{ flex: 1 }}/>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
            Effective {EFFECTIVE_DATE}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '36px 24px 0' }}>

        <h1 style={{
          fontSize: 28, fontWeight: 900, color: '#fff',
          margin: '0 0 8px', letterSpacing: '-0.5px',
        }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: '0 0 36px', lineHeight: 1.6 }}>
          Last updated: {EFFECTIVE_DATE}. This policy describes how {COMPANY_NAME} ("{APP_NAME}", "we", "us", or "our")
          collects, uses, and protects information when you use the {APP_NAME} mobile and web application.
        </p>

        <Section title="1. Information We Collect">
          <SubSection title="Information you provide">
            <Li>Email address and password (used for account authentication)</Li>
            <Li>Name and professional designation (displayed on your profile)</Li>
            <Li>Profile photo (uploaded voluntarily)</Li>
            <Li>Country and timezone (used for holiday data and scheduling)</Li>
            <Li>Schedule and task data (titles, times, locations, priorities, recurrence)</Li>
            <Li>Feedback and bug reports (submitted through the in-app feedback form)</Li>
          </SubSection>
          <SubSection title="Information collected automatically">
            <Li>App usage events (e.g., screens visited, buttons tapped, features used)</Li>
            <Li>Session recordings for UX improvement (anonymized, no keystrokes or passwords captured)</Li>
            <Li>Crash reports and error logs (including device type, OS version, and stack traces)</Li>
            <Li>Visit frequency and streak data (stored locally on your device)</Li>
            <Li>Device type, browser, and operating system (for compatibility purposes)</Li>
          </SubSection>
          <SubSection title="Location information">
            <Li>If you grant permission, we access your GPS coordinates solely to auto-fill the location field when creating a schedule. We do not store or transmit your precise location to our servers.</Li>
          </SubSection>
        </Section>

        <Section title="2. How We Use Your Information">
          <Li>To provide, operate, and improve the {APP_NAME} service</Li>
          <Li>To generate personalized AI-powered schedule insights and recommendations</Li>
          <Li>To authenticate your identity and maintain your account session</Li>
          <Li>To display your profile, schedules, and progress data within the app</Li>
          <Li>To send optional push notifications about your upcoming schedules (only if enabled)</Li>
          <Li>To diagnose and fix crashes, bugs, and performance issues</Li>
          <Li>To understand how features are used and improve user experience</Li>
          <Li>To respond to feedback and support requests you submit</Li>
          <Li>We do not sell, rent, or share your personal data with third parties for marketing purposes.</Li>
        </Section>

        <Section title="3. Third-Party Services">
          <p style={bodyText}>
            {APP_NAME} uses the following third-party services to operate. Each has its own privacy policy.
          </p>
          <table style={{
            width: '100%', borderCollapse: 'collapse',
            fontSize: 13, marginTop: 12,
          }}>
            <thead>
              <tr>
                {['Service', 'Purpose', 'Privacy Policy'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '8px 10px',
                    background: 'rgba(255,255,255,0.05)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 11,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Supabase', 'Database, authentication, file storage', 'supabase.com/privacy'],
                ['Anthropic Claude', 'AI schedule analysis and insights', 'anthropic.com/privacy'],
                ['Sentry', 'Crash reporting and error monitoring', 'sentry.io/privacy'],
                ['PostHog', 'Product analytics and session replay', 'posthog.com/privacy'],
                ['Vercel', 'App hosting and edge functions', 'vercel.com/legal/privacy-policy'],
                ['Nager.Date', 'Public holiday data (no personal data sent)', 'date.nager.at'],
              ].map(([name, purpose, url], i) => (
                <tr key={name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '9px 10px', color: '#fff', fontWeight: 600 }}>{name}</td>
                  <td style={{ padding: '9px 10px', color: 'rgba(255,255,255,0.55)' }}>{purpose}</td>
                  <td style={{ padding: '9px 10px' }}>
                    <a href={`https://${url}`} target="_blank" rel="noopener noreferrer"
                      style={{ color: '#6C63FF', fontSize: 11, textDecoration: 'none' }}>
                      {url}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ ...bodyText, marginTop: 14 }}>
            AI analysis prompts sent to Anthropic contain your schedule data (task titles, times, and types) but never your name, email, or authentication credentials.
            PostHog session recordings mask all text inputs by default — typed content is never captured.
          </p>
        </Section>

        <Section title="4. Data Storage and Security">
          <Li>Your account data is stored on Supabase servers hosted in the <strong style={{ color: '#fff' }}>ap-southeast-2 (Sydney, Australia)</strong> region.</Li>
          <Li>Analytics data is processed by PostHog on <strong style={{ color: '#fff' }}>US Cloud</strong> servers.</Li>
          <Li>All data is transmitted over HTTPS/TLS encryption.</Li>
          <Li>Row-Level Security (RLS) policies ensure you can only access your own data — no user can read another user's records.</Li>
          <Li>Your password is never stored in plaintext. Authentication is handled by Supabase Auth using bcrypt hashing.</Li>
          <Li>Visit streak data and app preferences are stored locally on your device using localStorage and are never transmitted to our servers.</Li>
        </Section>

        <Section title="5. Your Rights and Choices">
          <SubSection title="Access and correction">
            <Li>You can view and edit your name, designation, avatar, and country directly in the app under Profile → Edit Profile.</Li>
          </SubSection>
          <SubSection title="Data deletion">
            <Li>You can permanently delete your account and all associated data at any time by going to <strong style={{ color: '#fff' }}>Profile → System Settings → Delete Account</strong>.</Li>
            <Li>Deletion removes: your profile, all schedules and tasks, uploaded avatar, and submitted feedback. Your authentication credentials are also permanently removed.</Li>
            <Li>Deletion is irreversible. Locally stored data (streaks, preferences) is cleared when you confirm deletion.</Li>
          </SubSection>
          <SubSection title="Notifications">
            <Li>Push notifications are opt-in. You can disable them at any time under Profile → System Settings → Notifications, or through your device's system settings.</Li>
          </SubSection>
          <SubSection title="Analytics opt-out">
            <Li>Analytics tracking respects your browser or device Do Not Track setting. You can also contact us to request exclusion from analytics.</Li>
          </SubSection>
        </Section>

        <Section title="6. Data Retention">
          <Li>Your data is retained for as long as your account is active.</Li>
          <Li>When you delete your account, all your data is permanently deleted from our database and storage within 24 hours.</Li>
          <Li>Anonymized crash logs may be retained for up to 90 days for debugging purposes.</Li>
          <Li>Analytics event data is retained according to PostHog's retention policy (1 year on the free tier).</Li>
        </Section>

        <Section title="7. Children's Privacy">
          <p style={bodyText}>
            {APP_NAME} is not directed to children under the age of 13 (or 16 where applicable under local law).
            We do not knowingly collect personal information from children. If you believe a child has provided
            us with personal data, please contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#6C63FF' }}>{CONTACT_EMAIL}</a>{' '}
            and we will promptly delete it.
          </p>
        </Section>

        <Section title="8. Changes to This Policy">
          <p style={bodyText}>
            We may update this Privacy Policy from time to time. When we do, we will update the "Last updated"
            date at the top of this page and, where appropriate, notify you through the app or by email.
            Continued use of {APP_NAME} after changes are posted constitutes your acceptance of the updated policy.
          </p>
        </Section>

        <Section title="9. Contact Us">
          <p style={bodyText}>
            If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:
          </p>
          <div style={{
            background: 'rgba(108,99,255,0.08)',
            border: '1px solid rgba(108,99,255,0.2)',
            borderRadius: 12, padding: '16px 18px',
            marginTop: 12,
          }}>
            <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#fff' }}>{COMPANY_NAME}</p>
            <p style={{ margin: '0 0 4px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              Email:{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#6C63FF', textDecoration: 'none' }}>
                {CONTACT_EMAIL}
              </a>
            </p>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              App: {APP_NAME} — AI-Powered Schedule Manager
            </p>
          </div>
        </Section>

        {/* Footer */}
        <div style={{
          marginTop: 48, paddingTop: 24,
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 8,
        }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
            © {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.
          </span>
          <Link href="/" style={{
            fontSize: 12, color: '#6C63FF', textDecoration: 'none', fontWeight: 600,
          }}>
            ← Back to {APP_NAME}
          </Link>
        </div>

      </div>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{
        fontSize: 16, fontWeight: 800, color: '#fff',
        margin: '0 0 12px', letterSpacing: '-0.2px',
        paddingBottom: 8,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h3 style={{
        fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
        margin: '12px 0 6px', textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        {title}
      </h3>
      <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
        {children}
      </ul>
    </div>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      fontSize: 13, color: 'rgba(255,255,255,0.6)',
      lineHeight: 1.6, padding: '3px 0',
    }}>
      <span style={{ color: '#6C63FF', marginTop: 4, flexShrink: 0, fontSize: 10 }}>●</span>
      <span>{children}</span>
    </li>
  );
}

const bodyText: React.CSSProperties = {
  fontSize: 13,
  color: 'rgba(255,255,255,0.6)',
  lineHeight: 1.7,
  margin: '0 0 8px',
};
