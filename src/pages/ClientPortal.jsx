import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  Globe,
  MessageSquare,
  Plane,
  Package,
  Shield,
  ShoppingBag,
  Truck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const SERVICES = [
  {
    icon: Package,
    title: 'Cargo Shipping',
    description:
      'Door-to-door Thailand to Myanmar cargo handled by the KTM operations team from collection through delivery.',
    bullets: ['Cross-border consolidation', 'Arrival updates from staff', 'Delivery coordination'],
  },
  {
    icon: ShoppingBag,
    title: 'Assisted Shopping',
    description:
      'Customers send product links or photos and the team handles buying, packing, and movement on the ground.',
    bullets: ['Staff-led purchasing', 'Item inspection', 'Warehouse receiving'],
  },
  {
    icon: Truck,
    title: 'B2B Logistics',
    description:
      'Support for bulk and business shipments with allocation, booking, and reconciliation managed by KTM Cargo.',
    bullets: ['Shipment planning', 'Consolidation support', 'Post-delivery follow-up'],
  },
];

const WORKFLOW = [
  {
    step: '01',
    title: 'Inquiry',
    text: 'Customers send product links, photos, quantities, and addresses through Facebook, Line, or Telegram.',
  },
  {
    step: '02',
    title: 'Quote & Confirm',
    text: 'The team calculates product cost, Thai delivery, cargo rate, and Myanmar last-mile delivery before confirming the order.',
  },
  {
    step: '03',
    title: 'Collect & Consolidate',
    text: 'Orders are purchased or collected in Thailand, checked, measured, and packed for the next cargo run.',
  },
  {
    step: '04',
    title: 'Transit & Delivery',
    text: 'Shipments move through carrier partners, clear the border, and finish with door-to-door delivery in Myanmar.',
  },
];

const CONTACT_CARDS = [
  {
    icon: MessageSquare,
    title: 'Facebook / Line / Telegram',
    text: 'Primary inquiry channels for quotes, item links, and shipment questions.',
  },
  {
    icon: Plane,
    title: 'Thailand Operations',
    text: 'Buying, collection, warehouse intake, and cargo booking are handled by the KTM team.',
  },
  {
    icon: Shield,
    title: 'Support & Reconciliation',
    text: 'After delivery, the team handles proof of delivery, invoice review, and issue follow-up.',
  },
];

export default function ClientPortal() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.16),transparent_30%),linear-gradient(180deg,rgba(2,6,23,1)_0%,rgba(15,23,42,1)_100%)]" />

      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-500/15 p-3 ring-1 ring-cyan-400/30">
              <Plane className="h-6 w-6 text-cyan-300" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">
                KTM Cargo Express
              </p>
              <h1 className="text-lg font-semibold text-white">Company Profile</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="border-cyan-400/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/10">
              Public brochure
            </Badge>
            <Button
              asChild
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              <Link to="/StaffLogin">Staff Login</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              <Link to="/">Back Home</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Badge className="border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/10">
              Current business workflow only
            </Badge>
            <div className="space-y-4">
              <h2 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
                KTM Cargo is a staff-run logistics service, not a self-service ordering portal.
              </h2>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                Clients send inquiries through our social channels, our team quotes and confirms the
                request, and KTM Cargo handles collection, consolidation, booking, delivery, and
                reconciliation on the back office side.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                variant="outline"
                className="rounded-full border-white/15 bg-white/5 px-6 text-white hover:bg-white/10"
              >
                <Link to="/StaffLogin">Staff Login</Link>
              </Button>
              <Button
                asChild
                className="rounded-full bg-cyan-500 px-6 text-slate-950 hover:bg-cyan-400"
              >
                <a href="#services">
                  View Services
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full border-white/15 bg-white/5 px-6 text-white hover:bg-white/10"
              >
                <a href="#workflow">How it works</a>
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ['Inquiry-led', 'Requests begin on Facebook, Line, or Telegram.'],
                ['Staff quoted', 'Quotes are calculated by the KTM team.'],
                ['Door-to-door', 'Delivery is coordinated after cargo booking.'],
              ].map(([title, text]) => (
                <Card key={title} className="border-white/10 bg-white/5 shadow-none">
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card className="border-white/10 bg-slate-900/70 shadow-2xl shadow-cyan-950/30">
            <CardHeader className="space-y-3">
              <CardTitle className="text-xl text-white">What clients can expect</CardTitle>
              <p className="text-sm leading-6 text-slate-300">
                The portal is informational only. All active shipping work is handled by KTM Cargo
                staff through the operational workflow.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-500/15 p-2 text-emerald-200">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">No self-service ordering</p>
                    <p className="text-sm text-slate-300">
                      Website checkout, account creation, and client-side order creation are not
                      part of the current workflow.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-cyan-500/15 p-2 text-cyan-200">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Staff-led processing</p>
                    <p className="text-sm text-slate-300">
                      Quotation, cargo consolidation, booking, and delivery all happen behind the
                      scenes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-indigo-500/15 p-2 text-indigo-200">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Business presence</p>
                    <p className="text-sm text-slate-300">
                      The public page exists to explain KTM Cargo services and the actual
                      operational flow.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="services" className="mt-16 space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-200/70">Services</p>
              <h3 className="mt-2 text-2xl font-bold text-white">What KTM Cargo handles</h3>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {SERVICES.map((service) => {
              const Icon = service.icon;
              return (
                <Card
                  key={service.title}
                  className="border-white/10 bg-white/5 shadow-none transition-transform duration-200 hover:-translate-y-1 hover:bg-white/10"
                >
                  <CardHeader className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="rounded-2xl bg-cyan-500/15 p-3 text-cyan-200">
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                    <CardTitle className="text-xl text-white">{service.title}</CardTitle>
                    <p className="text-sm leading-6 text-slate-300">{service.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {service.bullets.map((bullet) => (
                      <div key={bullet} className="flex items-center gap-2 text-sm text-slate-200">
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
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
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-200/70">Workflow</p>
            <h3 className="mt-2 text-2xl font-bold text-white">Current business flow</h3>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {WORKFLOW.map((item) => (
              <Card key={item.step} className="border-white/10 bg-slate-900/70 shadow-none">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/70">
                      Step {item.step}
                    </span>
                    <div className="h-2 w-2 rounded-full bg-cyan-300" />
                  </div>
                  <CardTitle className="text-lg text-white">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-slate-300">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="contact" className="mt-16 space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-200/70">Contact</p>
            <h3 className="mt-2 text-2xl font-bold text-white">How inquiries are handled</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {CONTACT_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.title} className="border-white/10 bg-white/5 shadow-none">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-white/10 p-3 text-cyan-200">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{card.title}</h4>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{card.text}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mt-16">
          <Card className="border-cyan-400/20 bg-gradient-to-r from-cyan-500/10 via-slate-900 to-indigo-500/10 shadow-2xl shadow-cyan-950/30">
            <CardContent className="flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl space-y-3">
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/70">Summary</p>
                <h3 className="text-2xl font-bold text-white">
                  The portal now explains KTM Cargo. It no longer sells or books shipments online.
                </h3>
                <p className="text-sm leading-6 text-slate-300">
                  Current operations are staff-led from inquiry to reconciliation, which keeps the
                  workflow aligned with how the business actually runs today.
                </p>
              </div>
              <Button
                asChild
                className="rounded-full bg-cyan-400 px-6 text-slate-950 hover:bg-cyan-300"
              >
                <Link to="/">Back to home</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
