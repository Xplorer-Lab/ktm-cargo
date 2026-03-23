import { ArrowRight, BadgeCheck, Globe, Users } from 'lucide-react';
import { GOLD_TEXT_STYLE, headingStyle, labelStyle, KtmMark, SpeedMark } from './brandTokens';

const NOTICE_ITEMS = [
  { icon: BadgeCheck, t: 'Web order မရှိ', d: 'Online checkout မပါ — inquiry only' },
  { icon: Users, t: 'Staff-led', d: 'KTM team က အဆင့်ဆင့် စီမံ' },
  { icon: Globe, t: 'TH → MM', d: 'Bangkok မှ Yangon door-to-door' },
];

export default function HeroSection() {
  return (
    <section style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 24px 48px' }}>
      <div
        className="hero-in"
        style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}
      >
        <div className="gold-rule" style={{ width: 32 }} />
        <span style={labelStyle}>Thailand → Myanmar Logistics</span>
      </div>

      <div
        style={{
          display: 'grid',
          gap: 40,
          gridTemplateColumns: 'minmax(0,1fr) auto',
          alignItems: 'start',
        }}
      >
        <div>
          <div className="hero-in-2">
            <KtmMark size="lg" />
            <h1
              className="mm"
              style={{
                ...headingStyle,
                fontSize: 'clamp(26px, 4vw, 40px)',
                color: '#1F2937',
                marginTop: 20,
                lineHeight: 1.2,
                fontFamily: "'Oswald', 'Noto Sans Myanmar', sans-serif",
                textTransform: 'none',
                fontWeight: 600,
                letterSpacing: '0.01em',
              }}
            >
              ထိုင်းမှ မြန်မာသို့ <span style={GOLD_TEXT_STYLE}>စိတ်ချယုံကြည်ရသော</span> cargo
              service
            </h1>
            <p
              className="mm"
              style={{
                fontSize: 13,
                lineHeight: 1.9,
                color: '#4B5563',
                marginTop: 14,
                maxWidth: 520,
              }}
            >
              KTM သည် inquiry မှ စ၍ quote, confirm, ဝယ်ယူခြင်း, စုစည်းပို့ဆောင်ခြင်း,
              အရောက်ပို့ခြင်း အထိ staff-led service အဖြစ် စီမံပေးသော logistics team ဖြစ်ပါသည်။
            </p>
            <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <a
                href="https://www.facebook.com/profile.php?id=61584321765274"
                target="_blank"
                rel="noreferrer"
                className="gold-btn"
                style={{ fontFamily: "'Oswald', sans-serif", textDecoration: 'none' }}
              >
                Facebook ဖြင့်မေးမြန်းရန် <ArrowRight size={14} />
              </a>
              <a
                href="#workflow"
                className="outline-btn"
                style={{ fontFamily: "'Oswald', sans-serif", textDecoration: 'none' }}
              >
                လုပ်ငန်းစဉ်ကြည့်ရန်
              </a>
            </div>
          </div>
        </div>

        {/* Notice card */}
        <div
          className="hero-in-3"
          style={{
            width: 240,
            background: '#FAFAFA',
            border: '1px solid rgba(201,168,76,0.18)',
            padding: '20px 18px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <SpeedMark size="sm" />
            <span style={{ ...headingStyle, fontSize: 13, ...GOLD_TEXT_STYLE }}>Notice</span>
          </div>
          {NOTICE_ITEMS.map(({ icon: Icon, t, d }) => (
            <div key={t} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <Icon size={14} style={{ color: '#C9A030', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{t}</p>
                <p
                  className="mm"
                  style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.6, marginTop: 1 }}
                >
                  {d}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
