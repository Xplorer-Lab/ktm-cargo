import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import KtmWordmark from '@/components/public/KtmWordmark';
import {
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  Facebook,
  Menu,
  Package,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
} from 'lucide-react';

const CONTACT_NUMBERS = ['0633301746', '0826705571'];
const FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61584321765274';

const SERVICE_CARDS = [
  {
    icon: Package,
    title: 'ကုန်ပစ္စည်းပို့ဆောင်ခြင်း',
    body: 'ထိုင်းဘက်မှ မြန်မာဘက်သို့ cargo ပို့ဆောင်ရာတွင် စုစည်းပို့ခြင်းမှ door-to-door delivery အထိ KTM team က စီမံပေးပါသည်။',
  },
  {
    icon: ShoppingBag,
    title: 'ထိုင်းဘက်ဝယ်ယူပေးခြင်း',
    body: 'ပစ္စည်း link သို့မဟုတ် photo ပို့လိုက်ရုံဖြင့် KTM team က ဝယ်ယူခြင်း၊ စစ်ဆေးခြင်း၊ ထုပ်ပိုးခြင်းများကို ကူညီဆောင်ရွက်ပေးပါသည်။',
  },
  {
    icon: Truck,
    title: 'လုပ်ငန်းသုံး shipment စီမံခြင်း',
    body: 'bulk order, စုစည်းပို့ဆောင်မှု, cargo booking နှင့် reconciliation လိုအပ်သော လုပ်ငန်းသုံး shipment များကို support လုပ်ပေးပါသည်။',
  },
];

const WORKFLOW_STEPS = [
  {
    number: '၁',
    title: 'မေးမြန်းမှုလက်ခံခြင်း',
    body: 'Facebook မှာ link, photo, quantity နဲ့ delivery address ပို့ပြီး KTM ကို မေးမြန်းနိုင်ပါသည်။',
  },
  {
    number: '၂',
    title: 'ဈေးနှုန်းတွက်ချက်ပြီး အတည်ပြုခြင်း',
    body: 'ပစ္စည်းဈေး၊ Thai local delivery, cargo fee, Myanmar delivery စရိတ်များကို KTM team က တွက်ချက်ပေးပါသည်။',
  },
  {
    number: '၃',
    title: 'ထိုင်းဘက်ဝယ်ယူခြင်း သို့မဟုတ် စုဆောင်းခြင်း',
    body: 'ဝယ်ယူပေးရမည့် order များကို KTM က စီမံပြီး cargo only shipment များကိုတော့ ထိုင်းဘက်မှ လက်ခံစစ်ဆေးပါသည်။',
  },
  {
    number: '၄',
    title: 'Cargo booking နှင့် စုစည်းပို့ဆောင်ခြင်း',
    body: 'shipment များကို အလေးချိန်နှင့် package အလိုက် စုစည်းပြီး partner cargo company များနှင့် booking လုပ်ပါသည်။',
  },
  {
    number: '၅',
    title: 'မြန်မာဘက်ပို့ဆောင်ခြင်း',
    body: 'Myanmar side partner များနှင့် ချိတ်ဆက်ပြီး arrival, separation, delivery schedule များကို ဆက်လက်စီမံပါသည်။',
  },
  {
    number: '၆',
    title: 'လက်ခံအတည်ပြုနှင့် after-sales',
    body: 'ပစ္စည်းလက်ခံပြီးနောက် proof of delivery, extra kg, reconcile, issue follow-up များကို KTM မှ ဆက်လက်စောင့်ရှောက်ပေးပါသည်။',
  },
];

const VALUE_STRIPS = [
  'ထိုင်းမှ မြန်မာသို့ အထူးပြုဝန်ဆောင်မှု',
  'door-to-door delivery support',
  'shopping assist + cargo consolidation',
  'KTM team က တိုက်ရိုက်စီမံပေးသော workflow',
];

const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    title: 'Team-handled service',
    body: 'Website မှာ self-service order မတင်ဘဲ KTM team ကို တိုက်ရိုက်မေးမြန်းပြီး ဝန်ဆောင်မှုရယူရပါသည်။',
  },
  {
    icon: CircleDollarSign,
    title: 'Cargo workflow အပြည့်စုံ',
    body: 'quotation မှစ၍ Thailand-side collection, booking, transit, delivery အထိ KTM workflow တစ်ကြောင်းတည်းဖြင့် စီမံပေးပါသည်။',
  },
  {
    icon: BadgeCheck,
    title: 'After-sales follow-up',
    body: 'delivery ပြီးနောက် proof of delivery, additional charges, reconcile နှင့် customer follow-up များကို ဆက်လက်ကူညီပေးပါသည်။',
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div
      className="min-h-screen bg-white text-[#1F1914] selection:bg-[#D4A63A]/25 selection:text-[#1F1914]"
      style={{ fontFamily: "'Noto Sans Myanmar', 'Pyidaungsu', sans-serif" }}
    >
      <div className="fixed inset-x-0 top-0 z-50 border-b border-[#d8ccb8] bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <button
            className="text-left"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            type="button"
          >
            <KtmWordmark compact />
          </button>

          <div className="hidden items-center gap-6 lg:flex">
            <a
              className="text-sm font-semibold text-[#4F463D] transition hover:text-[#B6851F]"
              href="#services"
            >
              ဝန်ဆောင်မှုများ
            </a>
            <a
              className="text-sm font-semibold text-[#4F463D] transition hover:text-[#B6851F]"
              href="#workflow"
            >
              လုပ်ငန်းစဉ်
            </a>
            <a
              className="text-sm font-semibold text-[#4F463D] transition hover:text-[#B6851F]"
              href="#contact"
            >
              ဆက်သွယ်ရန်
            </a>
            <Link
              to="/ClientPortal"
              className="text-sm font-semibold text-[#4F463D] transition hover:text-[#B6851F]"
            >
              ကုမ္ပဏီအကြောင်း
            </Link>
            <Button
              asChild
              variant="outline"
              className="rounded-full border-[#cdbfa9] bg-white/70 text-[#2A221B] hover:border-[#D4A63A] hover:bg-white"
            >
              <Link to="/StaffLogin">Staff Login</Link>
            </Button>
            <Button
              asChild
              className="rounded-full bg-[#1F1914] px-6 text-[#F6F1E7] hover:bg-[#2A221B]"
            >
              <a href={FACEBOOK_URL} rel="noreferrer" target="_blank">
                ဆက်သွယ်မေးမြန်းရန်
              </a>
            </Button>
          </div>

          <button
            className="rounded-full border border-[#d8ccb8] p-2 text-[#5B5147] lg:hidden"
            onClick={() => setMobileMenuOpen((value) => !value)}
            type="button"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-[#d8ccb8] bg-white px-4 py-4 lg:hidden">
            <div className="flex flex-col gap-3">
              <a
                className="rounded-2xl px-4 py-3 text-sm font-semibold text-[#4F463D] hover:bg-white/70"
                href="#services"
                onClick={() => setMobileMenuOpen(false)}
              >
                ဝန်ဆောင်မှုများ
              </a>
              <a
                className="rounded-2xl px-4 py-3 text-sm font-semibold text-[#4F463D] hover:bg-white/70"
                href="#workflow"
                onClick={() => setMobileMenuOpen(false)}
              >
                လုပ်ငန်းစဉ်
              </a>
              <a
                className="rounded-2xl px-4 py-3 text-sm font-semibold text-[#4F463D] hover:bg-white/70"
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
              >
                ဆက်သွယ်ရန်
              </a>
              <Link
                className="rounded-2xl px-4 py-3 text-sm font-semibold text-[#4F463D] hover:bg-white/70"
                onClick={() => setMobileMenuOpen(false)}
                to="/ClientPortal"
              >
                ကုမ္ပဏီအကြောင်း
              </Link>
              <Link onClick={() => setMobileMenuOpen(false)} to="/StaffLogin">
                <Button
                  variant="outline"
                  className="w-full rounded-full border-[#cdbfa9] bg-white/70 text-[#2A221B] hover:border-[#D4A63A] hover:bg-white"
                >
                  Staff Login
                </Button>
              </Link>
              <a href={FACEBOOK_URL} rel="noreferrer" target="_blank">
                <Button className="w-full rounded-full bg-[#1F1914] text-[#F6F1E7] hover:bg-[#2A221B]">
                  ဆက်သွယ်မေးမြန်းရန်
                </Button>
              </a>
            </div>
          </div>
        )}
      </div>

      <main>
        <section className="relative overflow-hidden px-4 pb-16 pt-32 sm:px-6 lg:px-8 lg:pb-24 lg:pt-40">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_rgba(212,166,58,0.24),transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(31,25,20,0.10),transparent_32%)]" />
          <div className="absolute left-[6%] top-28 hidden h-40 w-40 rounded-full border border-[#D4A63A]/20 lg:block" />
          <div className="absolute right-[10%] top-20 hidden h-60 w-60 rounded-full bg-[#E6DDCF]/60 blur-3xl lg:block" />

          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-3 rounded-full border border-[#D4A63A]/30 bg-white/75 px-4 py-2 text-xs font-semibold tracking-[0.24em] text-[#8B6A23] shadow-[0_10px_30px_rgba(212,166,58,0.12)]">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#D4A63A]" />
                Thailand to Myanmar Cargo
              </div>

              <div className="space-y-5">
                <h1
                  className="max-w-4xl text-5xl font-black leading-[1.04] tracking-tight text-[#1F1914] sm:text-6xl lg:text-7xl"
                  style={{ fontFamily: "'Oswald', 'Bebas Neue', sans-serif" }}
                >
                  ထိုင်းမှ မြန်မာသို့
                  <br />
                  စိတ်ချယုံကြည်စွာ
                  <br />
                  ပို့ဆောင်ပေးနေသော
                  <br />
                  KTM ဝန်ဆောင်မှု
                </h1>
                <p className="max-w-2xl text-base leading-8 text-[#5B5147] sm:text-lg">
                  ပစ္စည်း link, photo, quantity နှင့် delivery address ပို့လိုက်ရုံဖြင့် KTM team က
                  quotation မှစ၍ ဝယ်ယူခြင်း၊ collection, cargo booking, door-to-door delivery နှင့်
                  after-sales follow-up အထိ တစ်ဆက်တည်း စီမံပေးပါသည်။
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Button
                  asChild
                  className="rounded-full bg-[#D4A63A] px-8 py-6 text-base font-bold text-[#1F1914] shadow-[0_18px_40px_rgba(182,133,31,0.25)] hover:bg-[#E2B652]"
                >
                  <a href={FACEBOOK_URL} rel="noreferrer" target="_blank">
                    Facebook မှ ဆက်သွယ်မေးမြန်းရန်
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-[#cdbfa9] bg-white/70 px-8 py-6 text-base font-bold text-[#2A221B] hover:border-[#D4A63A] hover:bg-white"
                >
                  <a href="#workflow">လုပ်ငန်းစဉ်ကြည့်ရန်</a>
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ['Staff-led Quote', 'KTM team က ဈေးနှုန်းတွက်ချက်ပေးပါသည်'],
                  ['Cargo Consolidation', 'စုစည်းပို့ဆောင်မှုနှင့် booking ကို KTM က စီမံပါသည်'],
                  ['Door-to-door', 'Myanmar side delivery အထိ ဆက်လက်ချိတ်ဆက်ပေးပါသည်'],
                ].map(([title, text]) => (
                  <div
                    key={title}
                    className="rounded-3xl border border-[#d8ccb8] bg-white/70 p-4 shadow-[0_20px_40px_rgba(94,74,39,0.06)]"
                  >
                    <p className="text-sm font-bold text-[#1F1914]">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-[#5B5147]">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -right-6 top-10 hidden h-24 w-24 rounded-full bg-[#D4A63A]/20 blur-2xl lg:block" />
              <div className="overflow-hidden rounded-[2rem] border border-[#cfbfaa] bg-[#1F1914] p-4 shadow-[0_35px_70px_rgba(31,25,20,0.24)]">
                <div className="rounded-[1.6rem] border border-white/10 bg-gradient-to-br from-[#2A221B] via-[#1F1914] to-[#17120E] p-5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <KtmWordmark
                      compact
                      tone="dark"
                      subtitle="ထိုင်းမှ မြန်မာသို့ စိတ်ချရသော ပို့ဆောင်ရေးဝန်ဆောင်မှု"
                    />
                    <div className="rounded-full border border-[#D4A63A]/25 bg-[#D4A63A]/10 px-3 py-1 text-xs font-semibold text-[#F3D470]">
                      premium logistics
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4">
                    <div className="rounded-[1.6rem] bg-gradient-to-br from-[#D4A63A] via-[#C59227] to-[#9B6D17] p-5 text-[#1F1914]">
                      <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#4D360F]">
                        KTM Workflow
                      </p>
                      <p className="mt-3 text-2xl font-black leading-tight">
                        မေးမြန်းမှုမှ delivery အထိ
                        <br />
                        KTM team က စီမံပေးပါသည်
                      </p>
                    </div>

                    <img
                      src="/hero-logistics.png"
                      alt="KTM logistics"
                      className="h-[300px] w-full rounded-[1.5rem] object-cover opacity-90"
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4 text-white">
                        <p className="text-xs uppercase tracking-[0.25em] text-[#D4A63A]">
                          Route Focus
                        </p>
                        <p className="mt-2 text-lg font-bold">Bangkok → Yangon</p>
                        <p className="mt-2 text-sm leading-6 text-[#D8CCBC]">
                          Cargo booking, consolidation နှင့် arrival coordination ကို KTM team က
                          လက်တွေ့စီမံပါသည်။
                        </p>
                      </div>
                      <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4 text-white">
                        <p className="text-xs uppercase tracking-[0.25em] text-[#D4A63A]">
                          Contact First
                        </p>
                        <div className="mt-2 space-y-1 text-sm leading-6 text-[#D8CCBC]">
                          {CONTACT_NUMBERS.map((phone) => (
                            <p key={phone}>{phone}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#d8ccb8] bg-[#ECE3D4] px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-3 md:grid-cols-4">
            {VALUE_STRIPS.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-[#d0c2ad] bg-[#F8F4EC] px-4 py-4 text-sm font-semibold text-[#4F463D]"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section id="services" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.34em] text-[#B6851F]">
                ဝန်ဆောင်မှုများ
              </p>
              <h2
                className="mt-3 text-4xl font-black leading-tight text-[#1F1914] sm:text-5xl"
                style={{ fontFamily: "'Oswald', 'Bebas Neue', sans-serif" }}
              >
                KTM က ဘာတွေကို
                <br />
                လက်တွေ့ကူညီပေးပါသလဲ
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[#5B5147]">
                cargo shipping, assisted shopping, business shipment coordination စသော
                လုပ်ငန်းစဉ်များကို KTM team က client များအစား တက်ကြွစွာစီမံပေးပါသည်။
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {SERVICE_CARDS.map((service) => {
                const Icon = service.icon;
                return (
                  <Card
                    key={service.title}
                    className="overflow-hidden rounded-[2rem] border border-[#d7c9b4] bg-[#FBF8F3] shadow-[0_24px_60px_rgba(86,66,35,0.08)]"
                  >
                    <CardContent className="p-7">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1F1914] text-[#D4A63A]">
                        <Icon className="h-7 w-7" />
                      </div>
                      <h3 className="mt-6 text-2xl font-black text-[#1F1914]">{service.title}</h3>
                      <p className="mt-4 text-sm leading-7 text-[#5B5147]">{service.body}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section id="workflow" className="bg-[#1F1914] px-4 py-20 text-[#F6F1E7] sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.34em] text-[#D4A63A]">
                လုပ်ငန်းစဉ်
              </p>
              <h2
                className="mt-3 text-4xl font-black leading-tight sm:text-5xl"
                style={{ fontFamily: "'Oswald', 'Bebas Neue', sans-serif" }}
              >
                KTM Cargo ရဲ့
                <br />
                အလုပ်လုပ်ပုံ တစ်ဆင့်ချင်း
              </h2>
              <p className="mt-4 text-base leading-8 text-[#D8CCBC]">
                website မှ တိုက်ရိုက် order တင်မယ့် flow မဟုတ်ဘဲ inquiry-led workflow
                အပေါ်အခြေခံပြီး KTM team က တစ်ဆင့်ချင်းစီ ဆောင်ရွက်ပေးပါသည်။
              </p>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-2">
              {WORKFLOW_STEPS.map((step) => (
                <div
                  key={step.number}
                  className="rounded-[1.8rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.18)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#D4A63A]/40 bg-[#D4A63A]/12 text-xl font-black text-[#F3D470]">
                      {step.number}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">{step.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-[#D8CCBC]">{step.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[2rem] border border-[#d9ccb8] bg-[#FBF8F3] p-8 shadow-[0_24px_60px_rgba(86,66,35,0.08)]">
              <p className="text-sm font-bold uppercase tracking-[0.34em] text-[#B6851F]">
                KTM ကိုရွေးသင့်တဲ့အကြောင်း
              </p>
              <h2
                className="mt-4 text-4xl font-black leading-tight text-[#1F1914]"
                style={{ fontFamily: "'Oswald', 'Bebas Neue', sans-serif" }}
              >
                Cargo service တစ်ခုထက်ပိုတဲ့
                <br />
                လုပ်ငန်းစဉ်အပြည့်စုံ
              </h2>
              <p className="mt-4 text-base leading-8 text-[#5B5147]">
                KTM သည် ပို့ဆောင်ရေးတစ်ခုတည်းမဟုတ်ဘဲ quotation, collection, booking, delivery,
                follow-up အထိ customer journey တစ်ခုလုံးကို စီမံပေးသော service model ဖြစ်ပါသည်။
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {TRUST_POINTS.map((point) => {
                const Icon = point.icon;
                return (
                  <div
                    key={point.title}
                    className="rounded-[1.8rem] border border-[#d9ccb8] bg-white/75 p-6 shadow-[0_20px_50px_rgba(86,66,35,0.08)]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1F1914] text-[#D4A63A]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-xl font-black text-[#1F1914]">{point.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#5B5147]">{point.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="contact" className="bg-[#2A221B] px-4 py-20 text-[#F6F1E7] sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.34em] text-[#D4A63A]">
                  ဆက်သွယ်ရန်
                </p>
                <h2
                  className="mt-3 text-4xl font-black leading-tight sm:text-5xl"
                  style={{ fontFamily: "'Oswald', 'Bebas Neue', sans-serif" }}
                >
                  မေးမြန်းလိုပါက
                  <br />
                  KTM ကို တိုက်ရိုက်ဆက်သွယ်ပါ
                </h2>
                <p className="mt-4 max-w-xl text-base leading-8 text-[#D8CCBC]">
                  Facebook page မှာ inquiry ပို့နိုင်သလို phone နံပါတ်များမှလည်း
                  တိုက်ရိုက်ဆက်သွယ်နိုင်ပါသည်။ နောက်ပိုင်း channel များကို လိုအပ်သလို
                  ဆက်လက်တိုးချဲ့သွားပါမည်။
                </p>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <Button
                    asChild
                    className="rounded-full bg-[#D4A63A] px-8 py-6 text-base font-bold text-[#1F1914] hover:bg-[#E2B652]"
                  >
                    <a href={FACEBOOK_URL} rel="noreferrer" target="_blank">
                      Facebook Page သို့သွားရန်
                      <Facebook className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="rounded-full border-white/15 bg-white/5 px-8 py-6 text-base font-bold text-[#F6F1E7] hover:bg-white/10"
                  >
                    <Link to="/ClientPortal">ကုမ္ပဏီအကြောင်းဖတ်ရန်</Link>
                  </Button>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-[1.8rem] border border-white/10 bg-white/5 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D4A63A]/16 text-[#F3D470]">
                    <Facebook className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-black">Facebook Inquiry</h3>
                  <p className="mt-3 text-sm leading-7 text-[#D8CCBC]">
                    product link, photo, quantity, address များနှင့်အတူ Facebook page မှာ
                    တိုက်ရိုက်မေးမြန်းနိုင်ပါသည်။
                  </p>
                  <a
                    className="mt-5 inline-flex items-center text-sm font-bold text-[#F3D470]"
                    href={FACEBOOK_URL}
                    rel="noreferrer"
                    target="_blank"
                  >
                    page သို့သွားရန် <ArrowRight className="ml-1 h-4 w-4" />
                  </a>
                </div>

                <div className="rounded-[1.8rem] border border-white/10 bg-white/5 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D4A63A]/16 text-[#F3D470]">
                    <Phone className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-black">ဖုန်းဆက်သွယ်ရန်</h3>
                  <div className="mt-4 space-y-3">
                    {CONTACT_NUMBERS.map((phone) => (
                      <a
                        key={phone}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm font-semibold text-[#F6F1E7]"
                        href={`tel:${phone}`}
                      >
                        <span>{phone}</span>
                        <Phone className="h-4 w-4 text-[#F3D470]" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#d8ccb8] bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <KtmWordmark compact />
          <div className="flex flex-col gap-3 text-sm text-[#5B5147] sm:flex-row sm:items-center sm:gap-6">
            <Link className="font-semibold hover:text-[#B6851F]" to="/ClientPortal">
              ကုမ္ပဏီအကြောင်း
            </Link>
            <a className="font-semibold hover:text-[#B6851F]" href="#workflow">
              လုပ်ငန်းစဉ်
            </a>
            <a
              className="font-semibold hover:text-[#B6851F]"
              href={FACEBOOK_URL}
              rel="noreferrer"
              target="_blank"
            >
              Facebook
            </a>
            <span>0633301746 / 0826705571</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
