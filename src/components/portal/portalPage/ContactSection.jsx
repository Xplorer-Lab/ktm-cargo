import { ArrowRight, MessageSquare, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { headingStyle, labelStyle, GOLD_TEXT_STYLE, SpeedMark, KtmMark } from './brandTokens';

export default function ContactSection() {
  return (
    <>
      <section id="contact" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 56px' }}>
        <div style={{ border: '1px solid rgba(201,168,76,0.2)', background: '#FAFAFA' }}>
          {/* Contact header */}
          <div
            style={{
              padding: '24px 24px 20px',
              borderBottom: '1px solid rgba(201,168,76,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <SpeedMark />
            <div>
              <p style={labelStyle}>ဆက်သွယ်ရန်</p>
              <h2
                style={{
                  ...headingStyle,
                  fontSize: 20,
                  marginTop: 4,
                  fontFamily: "'Oswald', 'Noto Sans Myanmar', sans-serif",
                  textTransform: 'none',
                  color: '#1F2937',
                }}
                className="mm"
              >
                ယနေ့ပင် မေးမြန်းနိုင်ပါသည်
              </h2>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {/* Facebook */}
            <a
              href="https://www.facebook.com/profile.php?id=61584321765274"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                padding: '22px 24px',
                borderRight: '1px solid rgba(201,168,76,0.1)',
                textDecoration: 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(201,168,76,0.04)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(201,168,76,0.25)',
                  background: 'rgba(201,168,76,0.08)',
                }}
              >
                <MessageSquare size={16} style={{ color: '#C9A030' }} />
              </div>
              <div>
                <p style={{ ...labelStyle, color: '#6B5E40' }}>Facebook</p>
                <p
                  className="mm"
                  style={{ fontSize: 13, color: '#374151', marginTop: 4, lineHeight: 1.6 }}
                >
                  ပထမဦးဆုံး inquiry အတွက် အဓိက ဆက်သွယ်ရန်လမ်းကြောင်း
                </p>
                <p
                  style={{
                    ...GOLD_TEXT_STYLE,
                    fontFamily: "'Oswald', sans-serif",
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: '0.15em',
                    marginTop: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  MESSAGE ပေးပို့ရန် <ArrowRight size={11} />
                </p>
              </div>
            </a>

            {/* Phone */}
            <a
              href="tel:+959633301746"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                padding: '22px 24px',
                textDecoration: 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(201,168,76,0.04)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(201,168,76,0.25)',
                  background: 'rgba(201,168,76,0.08)',
                }}
              >
                <Phone size={16} style={{ color: '#C9A030' }} />
              </div>
              <div>
                <p style={{ ...labelStyle, color: '#6B5E40' }}>ဖုန်း</p>
                <p
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 15,
                    fontWeight: 500,
                    color: '#374151',
                    marginTop: 4,
                    letterSpacing: '0.08em',
                  }}
                >
                  0633 301 746
                </p>
                <p
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 14,
                    color: '#8A7A60',
                    letterSpacing: '0.08em',
                  }}
                >
                  0826 705 571
                </p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(201,168,76,0.1)' }}>
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <KtmMark size="sm" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link
              to="/StaffLogin"
              style={{
                ...labelStyle,
                textDecoration: 'none',
                fontSize: 9,
                color: '#6B7280',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.target.style.color = '#6B5E40')}
              onMouseLeave={(e) => (e.target.style.color = '#6B7280')}
            >
              Staff Login
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
