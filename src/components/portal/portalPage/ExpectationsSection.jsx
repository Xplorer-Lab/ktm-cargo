import { CircleDollarSign, Clock3, MessageSquare, Shield } from 'lucide-react';
import { headingStyle, labelStyle } from './brandTokens';

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

export default function ExpectationsSection() {
  return (
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
  );
}
