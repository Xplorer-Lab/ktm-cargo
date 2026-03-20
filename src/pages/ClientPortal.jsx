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
  Sparkles,
  Truck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const SERVICES = [
  {
    icon: Package,
    title: 'ကုန်ပစ္စည်းပို့ဆောင်ခြင်း',
    description:
      'ထိုင်းမှ မြန်မာသို့ door-to-door ပို့ဆောင်မှုကို KTM team က စီမံပေးပြီး အရောက်ပို့ချိန်အထိ လိုက်ပါဆောင်ရွက်ပေးပါသည်။',
    bullets: ['စုစည်းပို့ဆောင်မှု', 'အဝင်သတင်းပေးပို့မှု', 'အရောက်ပို့ဆောင်မှု'],
  },
  {
    icon: ShoppingBag,
    title: 'ထိုင်းဘက်ဝယ်ယူပေးခြင်း',
    description:
      'ဖောက်သည်က link သို့မဟုတ် photo ပို့လျှင် KTM team က ဝယ်ယူခြင်း၊ စစ်ဆေးခြင်း၊ ထုပ်ပိုးခြင်းနှင့် warehouse လက်ခံခြင်းကို စီမံပေးပါသည်။',
    bullets: ['Staff-led purchasing', 'ပစ္စည်းစစ်ဆေးမှု', 'Warehouse intake'],
  },
  {
    icon: Truck,
    title: 'စီးပွားရေးနှင့် bulk shipment',
    description:
      'ကုန်ပမာဏများသော လုပ်ငန်းဆိုင်ရာ shipment များကိုလည်း booking, consolidation, delivery coordination အထိ support ပေးပါသည်။',
    bullets: ['Shipment planning', 'Cargo partner booking', 'After-sales follow-up'],
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

const CONTACTS = [
  {
    icon: MessageSquare,
    title: 'Facebook',
    text: 'ပထမဦးဆုံး inquiry အတွက် အဓိက ဆက်သွယ်ရန်လမ်းကြောင်း',
    href: 'https://www.facebook.com/profile.php?id=61584321765274',
    label: 'Facebook ဖြင့်မေးမြန်းရန်',
  },
  {
    icon: Phone,
    title: 'ဖုန်း',
    text: '0633301746 / 0826705571',
    href: 'tel:+959633301746',
    label: 'ဖုန်းခေါ်ရန်',
  },
];

export default function ClientPortal() {
  return (
    <div className="min-h-screen bg-[#F6F1E7] text-[#1F1914]">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-0 top-0 h-[28rem] w-[28rem] rounded-full bg-[#D4A63A]/15 blur-3xl" />
        <div className="absolute right-[-6rem] top-20 h-[22rem] w-[22rem] rounded-full bg-[#B6851F]/12 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[18rem] w-[18rem] rounded-full bg-white/60 blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 border-b border-[#D9C8A9]/70 bg-[#F6F1E7]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-[#B6851F] to-[#E3BE62] p-3 shadow-[0_10px_30px_rgba(182,133,31,0.22)]">
              <div className="flex items-center gap-1">
                <span className="block h-6 w-1.5 rounded-full bg-white/75" />
                <span className="block h-6 w-1.5 rounded-full bg-white/55" />
                <span className="block h-6 w-1.5 rounded-full bg-white/40" />
              </div>
            </div>
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-[#8C6A22]">
                KTM Cargo Express
              </p>
              <h1 className="text-lg font-black tracking-tight text-[#1F1914]">ကုမ္ပဏီအကြောင်း</h1>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Badge className="border-[#D4A63A]/30 bg-[#D4A63A]/10 text-[#8C6A22] hover:bg-[#D4A63A]/10">
              Brochure only
            </Badge>
            <Button
              asChild
              variant="outline"
              className="hidden border-[#D9C8A9] bg-white/60 text-[#1F1914] hover:bg-white sm:inline-flex"
            >
              <Link to="/StaffLogin">Staff Login</Link>
            </Button>
            <Button
              asChild
              className="bg-[#1F1914] text-[#F6F1E7] shadow-[0_10px_24px_rgba(31,25,20,0.12)] hover:bg-[#2A221B]"
            >
              <a href="#contact">ဆက်သွယ်ရန်</a>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <section className="grid items-stretch gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative overflow-hidden rounded-[2rem] border border-[#D9C8A9]/80 bg-white/70 p-6 shadow-[0_22px_70px_rgba(31,25,20,0.08)] sm:p-8 lg:p-10">
            <div className="absolute right-6 top-6 h-20 w-20 rounded-full border border-[#D4A63A]/30 bg-[#D4A63A]/10" />
            <div className="absolute bottom-8 right-16 h-12 w-12 rounded-full border border-[#B6851F]/20 bg-white/70" />

            <div className="relative space-y-6">
              <Badge className="border-[#D4A63A]/30 bg-[#D4A63A]/10 text-[#8C6A22] hover:bg-[#D4A63A]/10">
                Premium gold logistics
              </Badge>

              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#8C6A22]">
                  KTM Cargo Express
                </p>
                <h2 className="max-w-3xl text-4xl font-black tracking-tight text-[#1F1914] sm:text-5xl lg:text-6xl">
                  ထိုင်းမှ မြန်မာသို့ စိတ်ချယုံကြည်ရသော cargo service
                </h2>
                <p className="max-w-2xl text-lg leading-8 text-[#4A4035]">
                  KTM သည် inquiry မှ စ၍ quote, confirm, ဝယ်ယူခြင်း, စုစည်းပို့ဆောင်ခြင်း,
                  အရောက်ပို့ခြင်း အထိ staff-led service အဖြစ် စီမံပေးသော logistics team ဖြစ်ပါသည်။
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  asChild
                  className="rounded-full bg-gradient-to-r from-[#B6851F] to-[#D4A63A] px-6 text-[#1F1914] shadow-[0_18px_30px_rgba(214,166,58,0.25)] hover:from-[#A97D1B] hover:to-[#E0BC58]"
                >
                  <a
                    href="https://www.facebook.com/profile.php?id=61584321765274"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Facebook ဖြင့်မေးမြန်းရန်
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-[#CDBB9A] bg-white/60 px-6 text-[#1F1914] hover:bg-white"
                >
                  <a href="#workflow">လုပ်ငန်းစဉ်ကြည့်ရန်</a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-[#CDBB9A] bg-white/60 px-6 text-[#1F1914] hover:bg-white"
                >
                  <a href="#contact">ဖုန်းဖြင့်ဆက်သွယ်ရန်</a>
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ['Inquiry-led', 'Facebook သို့မဟုတ် ဖုန်းဖြင့် စတင်မေးမြန်းနိုင်ပါသည်။'],
                  ['Staff quoted', 'ဈေးနှုန်းနှင့် အစီအစဉ်ကို team က စုစည်းတွက်ချက်ပေးပါသည်။'],
                  ['Door-to-door', 'လက်ခံခြင်းမှ အရောက်ပို့ခြင်းအထိ တစ်ဆက်တည်း စီမံပါသည်။'],
                ].map(([title, text]) => (
                  <Card key={title} className="border-[#D9C8A9]/80 bg-white/75 shadow-none">
                    <CardContent className="p-4">
                      <p className="text-sm font-semibold text-[#1F1914]">{title}</p>
                      <p className="mt-2 text-sm leading-6 text-[#5A4E42]">{text}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <Card className="overflow-hidden border-[#D9C8A9]/80 bg-[#2A221B] text-[#F6F1E7] shadow-[0_22px_70px_rgba(31,25,20,0.12)]">
            <CardHeader className="space-y-4 border-b border-white/10 bg-[linear-gradient(180deg,rgba(212,166,58,0.16),rgba(42,34,27,0.0))] p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <Badge className="border-[#D4A63A]/25 bg-[#D4A63A]/10 text-[#F7E3A4] hover:bg-[#D4A63A]/10">
                  Public service guide
                </Badge>
                <div className="flex items-center gap-2 text-[#D4A63A]">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.28em]">
                    Gold standard
                  </span>
                </div>
              </div>
              <CardTitle className="text-2xl font-black tracking-tight sm:text-3xl">
                KTM က self-service portal မဟုတ်ပါ
              </CardTitle>
              <p className="text-sm leading-7 text-[#E8DDC9]">
                ယခု public page သည် KTM Cargo ၏ ဝန်ဆောင်မှုများ၊ အလုပ်လုပ်ပုံ၊ inquiry
                လမ်းကြောင်းနှင့် ဖုန်း / Facebook ဆက်သွယ်မှုကိုပဲ ရှင်းလင်းစွာပြသပေးရန်
                ရည်ရွယ်ပါသည်။
              </p>
            </CardHeader>

            <CardContent className="space-y-4 p-6 sm:p-8">
              {[
                {
                  icon: BadgeCheck,
                  title: 'Web order မရှိ',
                  text: 'Website ထဲမှ တိုက်ရိုက် checkout, account creation သို့မဟုတ် client-side ordering မပါဝင်ပါ။',
                },
                {
                  icon: Users,
                  title: 'Staff-led process',
                  text: 'Quotation, collection, booking, delivery, after-sales အားလုံးကို KTM team က စီမံပါသည်။',
                },
                {
                  icon: Globe,
                  title: 'လုပ်ငန်းအကြောင်းအရာ',
                  text: 'မြန်မာစာဖြင့် ရှင်းလင်းသည့် brochure-style presentation တစ်ခုအဖြစ်သာ အသုံးပြုပါသည်။',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-3xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="rounded-2xl bg-[#D4A63A]/15 p-3 text-[#F7E3A4] ring-1 ring-[#D4A63A]/20">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="mt-2 text-sm leading-6 text-[#E8DDC9]">{item.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="rounded-3xl border border-[#D4A63A]/20 bg-[#D4A63A]/10 p-4">
                <p className="text-sm font-semibold text-[#F7E3A4]">
                  ယနေ့ရက်အတွက် အခြေခံဆက်သွယ်မှု
                </p>
                <p className="mt-2 text-sm leading-7 text-[#F6F1E7]">
                  Facebook မှ စတင်မေးမြန်းနိုင်ပြီး ဖုန်းဖြင့်လည်း ဆက်သွယ်နိုင်ပါသည်။
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            ['ထိုင်းဘက်ဝယ်ယူပေးခြင်း', 'အမှာစာပစ္စည်းများကို ထိုင်းဘက်တွင် ဝယ်ယူလက်ခံပေးသည်။'],
            [
              'စုစည်းပို့ဆောင်မှု',
              'ပစ္စည်းများကို တစ်နေရာတည်း စုစည်းပြီး cargo run အဖြစ် စီမံသည်။',
            ],
            ['အရောက်ပို့', 'မြန်မာဘက် door-to-door delivery အထိ လုပ်ဆောင်သည်။'],
          ].map(([title, text]) => (
            <Card key={title} className="border-[#D9C8A9]/80 bg-white/75 shadow-none">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[#D4A63A]/12 p-3 text-[#8C6A22] ring-1 ring-[#D4A63A]/20">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1F1914]">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-[#5A4E42]">{text}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section id="services" className="mt-16 space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#8C6A22]">
                ဝန်ဆောင်မှု
              </p>
              <h3 className="mt-2 text-3xl font-black tracking-tight text-[#1F1914]">
                KTM က ဘာတွေ လုပ်ပေးလဲ
              </h3>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {SERVICES.map((service) => {
              const Icon = service.icon;
              return (
                <Card
                  key={service.title}
                  className="overflow-hidden border-[#D9C8A9]/80 bg-white/82 shadow-[0_18px_50px_rgba(31,25,20,0.06)] transition-transform duration-200 hover:-translate-y-1"
                >
                  <CardHeader className="space-y-4 border-b border-[#E8DDC9] bg-[linear-gradient(180deg,rgba(212,166,58,0.12),rgba(255,255,255,0.72))] p-6">
                    <div className="flex items-center justify-between">
                      <div className="rounded-2xl bg-[#D4A63A]/12 p-3 text-[#8C6A22] ring-1 ring-[#D4A63A]/20">
                        <Icon className="h-6 w-6" />
                      </div>
                      <Badge className="border-[#D4A63A]/30 bg-white/70 text-[#8C6A22] hover:bg-white/70">
                        Public guide
                      </Badge>
                    </div>
                    <CardTitle className="text-xl font-black text-[#1F1914]">
                      {service.title}
                    </CardTitle>
                    <p className="text-sm leading-7 text-[#5A4E42]">{service.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-3 p-6">
                    {service.bullets.map((bullet) => (
                      <div key={bullet} className="flex items-center gap-2 text-sm text-[#2A221B]">
                        <CheckCircle className="h-4 w-4 text-[#B6851F]" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section id="workflow" className="mt-16 space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#8C6A22]">
              လုပ်ငန်းစဉ်
            </p>
            <h3 className="mt-2 text-3xl font-black tracking-tight text-[#1F1914]">
              KTM ဘယ်လိုအလုပ်လုပ်သလဲ
            </h3>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {WORKFLOW.map((item) => (
              <Card
                key={item.step}
                className="overflow-hidden border-[#D9C8A9]/80 bg-white/78 shadow-[0_16px_45px_rgba(31,25,20,0.05)]"
              >
                <CardHeader className="space-y-4 bg-[linear-gradient(180deg,rgba(212,166,58,0.12),rgba(255,255,255,0.72))] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-[0.35em] text-[#8C6A22]">
                      အဆင့် {item.step}
                    </span>
                    <div className="h-2.5 w-2.5 rounded-full bg-[#D4A63A]" />
                  </div>
                  <CardTitle className="text-lg font-black text-[#1F1914]">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <p className="text-sm leading-7 text-[#5A4E42]">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <Card className="overflow-hidden border-[#D9C8A9]/80 bg-[#2A221B] text-[#F6F1E7] shadow-[0_18px_50px_rgba(31,25,20,0.12)]">
            <CardHeader className="space-y-4 border-b border-white/10 p-6">
              <Badge className="border-[#D4A63A]/25 bg-[#D4A63A]/10 text-[#F7E3A4] hover:bg-[#D4A63A]/10">
                ယုံကြည်စိတ်ချမှု
              </Badge>
              <CardTitle className="text-2xl font-black tracking-tight">
                ဘာကြောင့် KTM ကို ရွေးသင့်လဲ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {[
                'Team-led workflow ဖြစ်ပြီး inquiry မှ delivery အထိ တာဝန်ယူစီမံသည်။',
                'ထိုင်း-မြန်မာ route အပေါ် အထူးအာရုံစိုက်ပြီး cargo coordination ကို တိကျစွာလုပ်ဆောင်သည်။',
                'Staff update, proof of delivery, and after-sales follow-up ကို သန့်ရှင်းစွာ ထိန်းသိမ်းပေးသည်။',
              ].map((line) => (
                <div
                  key={line}
                  className="flex items-start gap-3 rounded-3xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="mt-1 rounded-full bg-[#D4A63A]/15 p-1.5 text-[#F7E3A4] ring-1 ring-[#D4A63A]/20">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-7 text-[#E8DDC9]">{line}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#8C6A22]">
                ဖောက်သည်ဘက်မှ ပြင်ဆင်ပေးရမည့်အချက်များ
              </p>
              <h3 className="mt-2 text-3xl font-black tracking-tight text-[#1F1914]">
                မေးမြန်းရန် ပို့ပေးရမည့် အချက်အလက်များ
              </h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {EXPECTATIONS.map((item) => {
                const Icon = item.icon;
                return (
                  <Card
                    key={item.title}
                    className="border-[#D9C8A9]/80 bg-white/80 shadow-[0_16px_45px_rgba(31,25,20,0.05)]"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-[#D4A63A]/12 p-3 text-[#8C6A22] ring-1 ring-[#D4A63A]/20">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-[#1F1914]">{item.title}</h4>
                          <p className="mt-2 text-sm leading-7 text-[#5A4E42]">{item.text}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-[#D9C8A9]/80 bg-white/82 shadow-[0_18px_50px_rgba(31,25,20,0.05)]">
            <CardHeader className="space-y-4 border-b border-[#E8DDC9] bg-[linear-gradient(180deg,rgba(212,166,58,0.12),rgba(255,255,255,0.72))] p-6">
              <Badge className="border-[#D4A63A]/30 bg-[#D4A63A]/10 text-[#8C6A22] hover:bg-[#D4A63A]/10">
                FAQ
              </Badge>
              <CardTitle className="text-2xl font-black text-[#1F1914]">
                မကြာခဏ မေးလေ့ရှိသော မေးခွန်းများ
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Accordion type="single" collapsible className="space-y-3">
                {FAQ_ITEMS.map((item, index) => (
                  <AccordionItem
                    key={item.q}
                    value={`faq-${index}`}
                    className="rounded-2xl border border-[#D9C8A9]/80 px-4"
                  >
                    <AccordionTrigger className="py-4 text-left text-sm font-semibold text-[#1F1914] hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 text-sm leading-7 text-[#5A4E42]">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <Card
            id="contact"
            className="overflow-hidden border-[#D9C8A9]/80 bg-[#1F1914] text-[#F6F1E7] shadow-[0_22px_70px_rgba(31,25,20,0.14)]"
          >
            <CardHeader className="space-y-4 border-b border-white/10 p-6">
              <Badge className="border-[#D4A63A]/25 bg-[#D4A63A]/10 text-[#F7E3A4] hover:bg-[#D4A63A]/10">
                ဆက်သွယ်ရန်
              </Badge>
              <CardTitle className="text-2xl font-black tracking-tight">
                Facebook သို့မဟုတ် ဖုန်းဖြင့် တိုက်ရိုက်ဆက်သွယ်ပါ
              </CardTitle>
              <p className="text-sm leading-7 text-[#E8DDC9]">
                လက်ရှိ public release တွင် Facebook page နှင့် ဖုန်းနံပါတ်များကိုသာ အသုံးပြုပါသည်။
                Line, Telegram နှင့် အခြား channel များကို နောက်ပိုင်းတွင် တိုးချဲ့မည်ဖြစ်သည်။
              </p>
            </CardHeader>

            <CardContent className="space-y-4 p-6">
              {CONTACTS.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.title}
                    href={item.href}
                    target={item.href.startsWith('http') ? '_blank' : undefined}
                    rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                    className="block rounded-3xl border border-white/10 bg-white/5 p-5 transition-transform hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    <div className="flex items-start gap-4">
                      <div className="rounded-2xl bg-[#D4A63A]/15 p-3 text-[#F7E3A4] ring-1 ring-[#D4A63A]/20">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{item.title}</p>
                        <p className="mt-2 text-sm leading-7 text-[#E8DDC9]">{item.text}</p>
                        <p className="mt-3 text-sm font-semibold text-[#F7E3A4]">{item.label}</p>
                      </div>
                    </div>
                  </a>
                );
              })}

              <div className="rounded-3xl border border-[#D4A63A]/20 bg-[#D4A63A]/10 p-5">
                <p className="text-sm font-semibold text-[#F7E3A4]">မြန်ဆန်သော inquiry အတွက်</p>
                <div className="mt-3 space-y-2 text-sm leading-7 text-[#F6F1E7]">
                  <p>Facebook: https://www.facebook.com/profile.php?id=61584321765274</p>
                  <p>Phone: 0633301746 / 0826705571</p>
                </div>
              </div>

              <Button
                asChild
                className="w-full rounded-full bg-gradient-to-r from-[#B6851F] to-[#D4A63A] px-6 text-[#1F1914] shadow-[0_18px_30px_rgba(214,166,58,0.25)] hover:from-[#A97D1B] hover:to-[#E0BC58]"
              >
                <a
                  href="https://www.facebook.com/profile.php?id=61584321765274"
                  target="_blank"
                  rel="noreferrer"
                >
                  Facebook page သို့သွားရန်
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="mt-16">
          <Card className="border-[#D9C8A9]/80 bg-white/80 shadow-[0_18px_50px_rgba(31,25,20,0.06)]">
            <CardContent className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#8C6A22]">
                  အကျဉ်းချုပ်
                </p>
                <h3 className="text-2xl font-black tracking-tight text-[#1F1914]">
                  KTM Cargo သည် public brochure တစ်ခုဖြစ်ပြီး inquiry ကို Facebook နှင့် ဖုန်းဖြင့်
                  လက်ခံပါသည်။
                </h3>
                <p className="text-sm leading-7 text-[#5A4E42]">
                  လုပ်ငန်းစဉ်အားလုံးကို staff-led workflow အဖြစ် စီမံထားပြီး ဝယ်ယူခြင်းမှ
                  အရောက်ပို့ခြင်းအထိ KTM team က တာဝန်ယူပါသည်။
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-[#CDBB9A] bg-white/70 px-6 text-[#1F1914] hover:bg-white"
                >
                  <Link to="/StaffLogin">Staff Login</Link>
                </Button>
                <Button
                  asChild
                  className="rounded-full bg-[#1F1914] px-6 text-[#F6F1E7] hover:bg-[#2A221B]"
                >
                  <Link to="/">Back Home</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
