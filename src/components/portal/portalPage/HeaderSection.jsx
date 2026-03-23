import { KtmLogoLink, labelStyle } from './brandTokens';

export default function HeaderSection() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: '1px solid rgba(201,168,76,0.25)',
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <KtmLogoLink />
        <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a
            href="#services"
            style={{ ...labelStyle, textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={(e) => (e.target.style.color = '#D4A63A')}
            onMouseLeave={(e) => (e.target.style.color = '#9A7A30')}
          >
            ဝန်ဆောင်မှု
          </a>
          <a
            href="#workflow"
            style={{ ...labelStyle, textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={(e) => (e.target.style.color = '#D4A63A')}
            onMouseLeave={(e) => (e.target.style.color = '#9A7A30')}
          >
            လုပ်ငန်းစဉ်
          </a>
          <a
            href="#contact"
            className="gold-btn"
            style={{
              fontFamily: "'Oswald', sans-serif",
              textDecoration: 'none',
              padding: '8px 18px',
              fontSize: 11,
            }}
          >
            ဆက်သွယ်ရန်
          </a>
        </nav>
      </div>
    </header>
  );
}
