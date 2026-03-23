/* ── brand tokens matching the logo ────────────────────────────────────────
   Logo: bold condensed italic KTM, three left-side speed bars, metallic gold
   Palette derived directly from the logo photograph.
─────────────────────────────────────────────────────────────────────────── */
import { Link } from 'react-router-dom';

export const GOLD_GRADIENT = 'linear-gradient(160deg, #F7E17A 0%, #D4A63A 48%, #9A6E10 100%)';

export const GOLD_TEXT_STYLE = {
  background: GOLD_GRADIENT,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

export const headingStyle = {
  fontFamily: "'Oswald', 'Bebas Neue', Impact, sans-serif",
  fontWeight: 600,
  letterSpacing: '0.01em',
  textTransform: 'uppercase',
};

export const labelStyle = {
  fontFamily: "'Oswald', sans-serif",
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.38em',
  textTransform: 'uppercase',
  color: '#9A7A30',
};

export const bodyStyle = {
  fontFamily: "'DM Sans', 'Noto Sans Myanmar', sans-serif",
};

/* Three speed bars — exact proportions from the logo */
export function SpeedMark({ size = 'md' }) {
  const bars =
    size === 'sm'
      ? [
          { w: 14, h: 3 },
          { w: 11, h: 3 },
          { w: 8, h: 3 },
        ]
      : [
          { w: 22, h: 4.5 },
          { w: 17, h: 4.5 },
          { w: 12, h: 4.5 },
        ];
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: size === 'sm' ? 3 : 5,
      }}
    >
      {bars.map((b, i) => (
        <span
          key={i}
          style={{
            display: 'block',
            width: b.w,
            height: b.h,
            borderRadius: 2,
            transform: 'skewX(-18deg)',
            background: GOLD_GRADIENT,
            boxShadow: '0 2px 8px rgba(212,166,58,0.35)',
          }}
        />
      ))}
    </div>
  );
}

/* Bold condensed KTM wordmark matching the logo */
export function KtmMark({ size = 'md' }) {
  const fontSize = size === 'sm' ? 22 : size === 'lg' ? 42 : 32;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size === 'sm' ? 6 : 10 }}>
      <SpeedMark size={size} />
      <div>
        <div
          style={{
            fontFamily: "'Oswald', 'Bebas Neue', Impact, sans-serif",
            fontSize,
            fontWeight: 700,
            fontStyle: 'italic',
            letterSpacing: '-0.02em',
            lineHeight: 1,
            ...GOLD_TEXT_STYLE,
          }}
        >
          KTM
        </div>
        <div
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: size === 'sm' ? 7 : 9,
            fontWeight: 500,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: '#9A7A30',
            marginTop: 3,
          }}
        >
          CARGO EXPRESS
        </div>
      </div>
    </div>
  );
}

export function KtmLogoLink() {
  return (
    <Link to="/" style={{ textDecoration: 'none' }}>
      <KtmMark size="sm" />
    </Link>
  );
}
