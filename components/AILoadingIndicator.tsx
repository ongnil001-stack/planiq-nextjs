'use client';

/**
 * AILoadingIndicator
 * ─────────────────────────────────────────────────────────────────────────────
 * Branded loading state for all PlanIQ AI features.
 * Shows "Loading" with soft animated pulsing dots.
 * Never exposes the underlying model name to users.
 */

interface Props {
  message?:  string;   // default: "Loading"
  sub?:      string;   // optional secondary line
  size?:     'sm' | 'md' | 'lg'; // sm = inline, md = card centre, lg = full-page
  icon?:     boolean;  // show ⚡ icon above (default true for md/lg)
}

export default function AILoadingIndicator({
  message = 'Loading',
  sub,
  size = 'md',
  icon = size !== 'sm',
}: Props) {
  const isSmall = size === 'sm';

  return (
    <>
      <style>{`
        @keyframes aiBounce {
          0%, 80%, 100% { transform: translateY(0);   opacity: .4; }
          40%            { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes aiGlow {
          0%,100% { opacity: .7; transform: scale(1); }
          50%      { opacity: 1;  transform: scale(1.08); }
        }
      `}</style>

      <div style={{
        display: 'flex',
        flexDirection: isSmall ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isSmall ? 8 : 10,
        padding: isSmall ? '0' : size === 'lg' ? '48px 0' : '36px 0',
        textAlign: 'center',
      }}>
        {/* ⚡ icon — md/lg only */}
        {icon && !isSmall && (
          <div style={{
            fontSize: 26,
            marginBottom: 2,
            animation: 'aiGlow 1.8s ease-in-out infinite',
          }}>
            ⚡
          </div>
        )}

        {/* Message */}
        <span style={{
          fontSize: isSmall ? 13 : 14,
          fontWeight: 700,
          color: 'var(--mid)',
          letterSpacing: '.01em',
        }}>
          {message}
        </span>

        {/* Pulsing dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              display: 'inline-block',
              width: isSmall ? 4 : 5,
              height: isSmall ? 4 : 5,
              borderRadius: '50%',
              background: 'var(--purple)',
              animation: `aiBounce 1.2s ease-in-out ${i * 0.18}s infinite`,
            }} />
          ))}
        </div>

        {/* Optional sub-message */}
        {sub && !isSmall && (
          <span style={{
            fontSize: 12,
            color: 'var(--lite)',
            marginTop: -4,
            maxWidth: 220,
            lineHeight: 1.4,
          }}>
            {sub}
          </span>
        )}
      </div>
    </>
  );
}
