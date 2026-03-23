import { headingStyle, labelStyle } from './brandTokens';

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

export default function FAQSection() {
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
  );
}
