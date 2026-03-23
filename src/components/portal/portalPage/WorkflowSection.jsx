import { headingStyle, labelStyle, GOLD_TEXT_STYLE } from './brandTokens';

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

export default function WorkflowSection() {
  return (
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
  );
}
