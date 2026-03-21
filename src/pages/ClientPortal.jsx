import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle,
  CircleDollarSign,
  Clock3,
  Globe,
  MessageSquare,
  Package,
  Phone,
  Shield,
  ShoppingBag,
  Truck,
  Users,
} from 'lucide-react';

/* ── brand tokens matching the logo ────────────────────────────────────────
   Logo: bold condensed italic KTM, three left-side speed bars, metallic gold
   Palette derived directly from the logo photograph.
─────────────────────────────────────────────────────────────────────────── */
const GOLD_GRADIENT = 'linear-gradient(160deg, #F7E17A 0%, #D4A63A 48%, #9A6E10 100%)';
const GOLD_TEXT_STYLE = {
  background: GOLD_GRADIENT,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

/* Three speed bars — exact proportions from the logo */
function SpeedMark({ size = 'md' }) {
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
function KtmMark({ size = 'md' }) {
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

const SERVICES = [
  {
    icon: Package,
    title: 'ကုန်ပစ္စည်းပို့ဆောင်ခြင်း',
    description:
      'ထိုင်းမှ မြန်မာသို့ door-to-door ပို့ဆောင်မှုကို KTM team က စီမံပေးပြီး အရောက်ပို့ချိန်အထိ လိုက်ပါဆောင်ရွက်ပေးပါသည်။',
    bullets: ['စုစည်းပို့ဆောင်မှု', 'အဝင်သတင်းပေးပို့မှု', 'အရောက်ပို့ဆောင်မှု'],
    tag: 'CARGO',
  },
  {
    icon: ShoppingBag,
    title: 'ထိုင်းဘက်ဝယ်ယူပေးခြင်း',
    description:
      'ဖောက်သည်က link သို့မဟုတ် photo ပို့လျှင် KTM team က ဝယ်ယူခြင်း၊ စစ်ဆေးခြင်း၊ ထုပ်ပိုးခြင်းနှင့် warehouse လက်ခံခြင်းကို စီမံပေးပါသည်။',
    bullets: ['Staff-led purchasing', 'ပစ္စည်းစစ်ဆေးမှု', 'Warehouse intake'],
    tag: 'SHOPPING',
  },
  {
    icon: Truck,
    title: 'စီးပွားရေးနှင့် bulk shipment',
    description:
      'ကုန်ပမာဏများသော လုပ်ငန်းဆိုင်ရာ shipment များကိုလည်း booking, consolidation, delivery coordination အထိ support ပေးပါသည်။',
    bullets: ['Shipment planning', 'Cargo partner booking', 'After-sales follow-up'],
    tag: 'BULK',
  },
];

const WORKFLOW = [
  {
    step: '01',
    title: 'မေးမြန်းချက်',
    text: 'Facebook မှ message ပို့၍ဖြစ်စေ၊ phone ဖုန်းခေါ်၍ဖြစ်စေ လိုအပ်သည့် ပစ္စည်းအချက်အလက်များကို စတင်ပေးပို့နိုင်ပါသည်။',
  },
  {
    step: '02',
    title: 'ဈေးနှုန်းညှိနှိုင်းချက်',
    text: 'KTM team က ပစ္စည်းတန်ဖိုး၊ Thailand-side ပို့ဆောင်ခ၊ cargo rate နှင့် Myanmar-side ပို့ဆောင်မှုကို စုစည်းတွက်ချက်ပေးပါသည်။',
  },
  {
    step: '03',
    title: 'ဝယ်ယူခြင်း / လက်ခံခြင်း',
    text: 'အတည်ပြုပြီးနောက် ထိုင်းဘက်ရှိ team က ဝယ်ယူခြင်း၊ လက်ခံခြင်း၊ စစ်ဆေးခြင်းနှင့် ထုပ်ပိုးခြင်းကို ဆက်လက်လုပ်ဆောင်ပါသည်။',
  },
  {
    step: '04',
    title: 'ပို့ဆောင်ခြင်း / အရောက်ပေးခြင်း',
    text: 'Cargo partner များနှင့်ချိတ်ဆက်ကာ border ဖြတ်သန်းပြီး Myanmar ဘက်သို့ အရောက်ပို့ဆောင်ပေးပါသည်။',
  },
];

const EXPECTATIONS = [
  {
    icon: MessageSquare,
    title: 'ဘာတွေ ပေးပို့ရမလဲ',
    text: 'ပစ္စည်း link, photo, quantity, address, နှင့် လိုအပ်ပါက special note များကို တစ်ခါတည်း ပေးပို့နိုင်ပါသည်။',
  },
  {
    icon: CircleDollarSign,
    title: 'ဘယ်လိုအတည်ပြုမလဲ',
    text: 'KTM team က စုစည်းတွက်ချက်ပြီး နောက်မှ confirmation ပေးပါမည်။ အတည်ပြုပြီးမှ ဆက်လက်လုပ်ဆောင်ပါသည်။',
  },
  {
    icon: Clock3,
    title: 'အချိန်ကာလ',
    text: 'Shipment အမျိုးအစားနှင့် cargo run အစီအစဉ်ပေါ်မူတည်၍ team က တတ်နိုင်သမျှ လက်တွေ့ကျသော အချိန်ခန့်မှန်းပေးပါသည်။',
  },
  {
    icon: Shield,
    title: 'After-sales',
    text: 'အရောက်ပို့ပြီးနောက် proof of delivery, extra weight, နှင့် ပြန်လည်စစ်ဆေးရန်ရှိသော အချက်များကို team က ဆက်လက်ညှိနှိုင်းပေးပါသည်။',
  },
];

const FAQ_ITEMS = [
  {
    q: 'KTM က web မှာ တိုက်ရိုက် order လက်ခံပါသလား။',
    a: 'မဟုတ်ပါ။ လက်ရှိ public page သည် brochure အဖြစ်သာ အသုံးပြုပြီး inquiry ကို Facebook သို့မဟုတ် ဖုန်းဖြင့် လက်ခံပါသည်။',
  },
  {
    q: 'ထိုင်းဘက်ဝယ်ယူပေးခြင်းလည်း ရပါသလား။',
    a: 'ရပါသည်။ link သို့မဟုတ် photo ပေးပို့ပြီးနောက် KTM team က ဝယ်ယူခြင်း၊ လက်ခံခြင်း၊ ထုပ်ပိုးခြင်းကို စီမံပေးပါသည်။',
  },
  {
    q: 'ပစ္စည်းပို့ဆောင်မှုကို ဘယ်လိုတွက်ချက်ပါသလဲ။',
    a: 'ပစ္စည်းတန်ဖိုး၊ ထိုင်းဘက်ပို့ဆောင်ခ၊ cargo rate နှင့် မြန်မာဘက်အရောက်ပို့ဆောင်ခများကို team က စုစည်းတွက်ချက်ပေးပါသည်။',
  },
  {
    q: 'ပို့ပြီးနောက် ပြန်လည်စစ်ဆေးရန်ရှိပါက ဘယ်လိုဆက်သွယ်ရမလဲ။',
    a: 'Facebook message သို့မဟုတ် ဖုန်းဖြင့် ဆက်သွယ်နိုင်ပြီး proof of delivery, extra weight, နှင့် reconciliation အချက်များကို team က ပြန်လည်စီမံပေးပါသည်။',
  },
];

export default function ClientPortal() {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=DM+Sans:wght@300;400;500&display=swap';
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
    };
  }, []);

  const headingStyle = {
    fontFamily: "'Oswald', 'Bebas Neue', Impact, sans-serif",
    fontWeight: 600,
    letterSpacing: '0.01em',
    textTransform: 'uppercase',
  };

  const labelStyle = {
    fontFamily: "'Oswald', sans-serif",
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: '0.38em',
    textTransform: 'uppercase',
    color: '#9A7A30',
  };

  const bodyStyle = {
    fontFamily: "'DM Sans', 'Noto Sans Myanmar', sans-serif",
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#111827', ...bodyStyle }}>
      <style>{`
        .mm { font-family: 'Noto Sans Myanmar', 'Pyidaungsu', sans-serif; }
        .gold-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 22px; font-size: 13px; font-weight: 500;
          background: linear-gradient(135deg, #E8C968 0%, #C9A030 50%, #9A6E10 100%);
          color: #FFFFFF; letter-spacing: 0.05em; border: none; cursor: pointer;
          clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
          transition: filter 0.15s;
        }
        .gold-btn:hover { filter: brightness(1.12); }
        .outline-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 22px; font-size: 13px; letter-spacing: 0.05em;
          background: transparent; color: #9A8060;
          border: 1px solid rgba(201,168,76,0.25); cursor: pointer;
          clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
          transition: all 0.15s;
        }
        .outline-btn:hover { border-color: rgba(201,168,76,0.6); color: #111827; }
        .service-card { background: #FAFAFA; border: 1px solid rgba(201,168,76,0.1); transition: border-color 0.2s; }
        .service-card:hover { border-color: rgba(201,168,76,0.3); }
        .faq-item summary::-webkit-details-marker { display: none; }
        .faq-item[open] .faq-arrow { transform: rotate(90deg); }
        .faq-arrow { transition: transform 0.2s; }
        .gold-rule { height: 1px; background: linear-gradient(90deg, #D4A63A 0%, rgba(212,166,58,0.08) 100%); }
        .step-num {
          font-family: 'Oswald', sans-serif; font-weight: 700; font-style: italic;
          font-size: 64px; line-height: 1; color: rgba(212,166,58,0.15);
          position: absolute; right: 12px; top: 8px; pointer-events: none; user-select: none;
        }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .hero-in { animation: slideUp 0.55s ease forwards; }
        .hero-in-2 { animation: slideUp 0.55s 0.1s ease both; }
        .hero-in-3 { animation: slideUp 0.55s 0.2s ease both; }
      `}</style>

      {/* ── Header ── */}
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
          <Link to="/" style={{ textDecoration: 'none' }}>
            <KtmMark size="sm" />
          </Link>
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

      {/* ── Hero ── */}
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
            {[
              { icon: BadgeCheck, t: 'Web order မရှိ', d: 'Online checkout မပါ — inquiry only' },
              { icon: Users, t: 'Staff-led', d: 'KTM team က အဆင့်ဆင့် စီမံ' },
              { icon: Globe, t: 'TH → MM', d: 'Bangkok မှ Yangon door-to-door' },
            ].map(({ icon: Icon, t, d }) => (
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

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
        <div className="gold-rule" />
      </div>

      {/* ── Services ── */}
      <section id="services" style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
            paddingBottom: 16,
            borderBottom: '1px solid rgba(201,168,76,0.1)',
          }}
        >
          <div>
            <p style={labelStyle}>ဝန်ဆောင်မှု</p>
            <h2
              style={{
                ...headingStyle,
                fontSize: 22,
                color: '#1F2937',
                marginTop: 6,
                fontFamily: "'Oswald', 'Noto Sans Myanmar', sans-serif",
                textTransform: 'none',
              }}
              className="mm"
            >
              KTM က ဘာတွေ လုပ်ပေးလဲ
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                style={{
                  display: 'block',
                  width: 20,
                  height: 3,
                  background: 'rgba(212,166,58,0.2)',
                  transform: 'skewX(-18deg)',
                }}
              />
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 1,
            background: 'rgba(201,168,76,0.08)',
            border: '1px solid rgba(201,168,76,0.08)',
          }}
        >
          {SERVICES.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="service-card" style={{ padding: '24px 20px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(201,168,76,0.25)',
                      background: 'rgba(201,168,76,0.06)',
                    }}
                  >
                    <Icon size={16} style={{ color: '#C9A030' }} />
                  </div>
                  <span style={{ ...labelStyle, fontSize: 9 }}>{s.tag}</span>
                </div>
                <h3
                  className="mm"
                  style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginBottom: 8 }}
                >
                  {s.title}
                </h3>
                <p className="mm" style={{ fontSize: 12, lineHeight: 1.85, color: '#6B7280' }}>
                  {s.description}
                </p>
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {s.bullets.map((b) => (
                    <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 14,
                          height: 2,
                          background: 'linear-gradient(90deg, #C9A030, transparent)',
                          flexShrink: 0,
                        }}
                      />
                      <span className="mm" style={{ fontSize: 11, color: '#4B5563' }}>
                        {b}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Workflow ── */}
      <section id="workflow" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 48px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
            paddingBottom: 16,
            borderBottom: '1px solid rgba(201,168,76,0.1)',
          }}
        >
          <div>
            <p style={labelStyle}>လုပ်ငန်းစဉ်</p>
            <h2
              style={{
                ...headingStyle,
                fontSize: 22,
                color: '#1F2937',
                marginTop: 6,
                fontFamily: "'Oswald', 'Noto Sans Myanmar', sans-serif",
                textTransform: 'none',
              }}
              className="mm"
            >
              ဘယ်လို အလုပ်လုပ်ပါသလဲ
            </h2>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 1,
            background: 'rgba(201,168,76,0.08)',
            border: '1px solid rgba(201,168,76,0.08)',
          }}
        >
          {WORKFLOW.map((w) => (
            <div
              key={w.step}
              className="service-card"
              style={{ padding: '22px 18px', position: 'relative', overflow: 'hidden' }}
            >
              <span className="step-num">{w.step}</span>
              <p
                style={{
                  ...GOLD_TEXT_STYLE,
                  fontFamily: "'Oswald', sans-serif",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.3em',
                }}
              >
                {w.step}
              </p>
              <h3
                className="mm"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#111827',
                  marginTop: 8,
                  marginBottom: 8,
                }}
              >
                {w.title}
              </h3>
              <p className="mm" style={{ fontSize: 12, lineHeight: 1.85, color: '#6B7280' }}>
                {w.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Expectations ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 48px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 24,
            paddingBottom: 16,
            borderBottom: '1px solid rgba(201,168,76,0.1)',
          }}
        >
          <div>
            <p style={labelStyle}>သိထားသင့်သည်များ</p>
            <h2
              style={{
                ...headingStyle,
                fontSize: 22,
                color: '#1F2937',
                marginTop: 6,
                fontFamily: "'Oswald', 'Noto Sans Myanmar', sans-serif",
                textTransform: 'none',
              }}
              className="mm"
            >
              ကြိုတင်မျှော်မှန်းချက်
            </h2>
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 1,
            background: 'rgba(201,168,76,0.08)',
            border: '1px solid rgba(201,168,76,0.08)',
          }}
        >
          {EXPECTATIONS.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="service-card"
              style={{ display: 'flex', gap: 14, padding: '20px 18px' }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(201,168,76,0.2)',
                }}
              >
                <Icon size={13} style={{ color: '#C9A030' }} />
              </div>
              <div>
                <p className="mm" style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
                  {title}
                </p>
                <p
                  className="mm"
                  style={{ fontSize: 12, lineHeight: 1.85, color: '#6B7280', marginTop: 4 }}
                >
                  {text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 48px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 24,
            paddingBottom: 16,
            borderBottom: '1px solid rgba(201,168,76,0.1)',
          }}
        >
          <div>
            <p style={labelStyle}>FAQ</p>
            <h2
              style={{
                ...headingStyle,
                fontSize: 22,
                color: '#1F2937',
                marginTop: 6,
                fontFamily: "'Oswald', 'Noto Sans Myanmar', sans-serif",
                textTransform: 'none',
              }}
              className="mm"
            >
              မေးလေ့ရှိသောမေးခွန်းများ
            </h2>
          </div>
        </div>
        <div style={{ border: '1px solid rgba(201,168,76,0.1)' }}>
          {FAQ_ITEMS.map(({ q, a }, i) => (
            <details
              key={q}
              className="faq-item"
              style={{ borderTop: i > 0 ? '1px solid rgba(201,168,76,0.08)' : 'none' }}
            >
              <summary
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '16px 18px',
                  cursor: 'pointer',
                  background: '#FAFAFA',
                  listStyle: 'none',
                }}
              >
                <p className="mm" style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
                  {q}
                </p>
                <svg
                  className="faq-arrow"
                  style={{ width: 14, height: 14, flexShrink: 0, marginTop: 3, color: '#C9A030' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </summary>
              <div
                style={{
                  background: '#FFFFFF',
                  padding: '12px 18px 16px',
                  borderTop: '1px solid rgba(201,168,76,0.06)',
                }}
              >
                <p className="mm" style={{ fontSize: 12, lineHeight: 1.9, color: '#6B7280' }}>
                  {a}
                </p>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── Contact ── */}
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
    </div>
  );
}
