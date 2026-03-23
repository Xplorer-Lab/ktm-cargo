import { Package, ShoppingBag, Truck } from 'lucide-react';
import { headingStyle, labelStyle } from './brandTokens';

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

export default function ServicesSection() {
  return (
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
  );
}
