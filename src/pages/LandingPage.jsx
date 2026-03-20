import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Plane,
  Package,
  ShoppingBag,
  CheckCircle,
  Shield,
  Globe,
  Menu,
  X,
  Truck,
  Star,
  Users,
  ArrowRight,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-600/20">
                <Plane className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">KTM Cargo</h1>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                  Express Logistics
                </p>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#services"
                className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
              >
                Services
              </a>
              <a
                href="#how-it-works"
                className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
              >
                How it Works
              </a>
              <a
                href="#testimonials"
                className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
              >
                Reviews
              </a>
              <a
                href="#faq"
                className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
              >
                FAQ
              </a>
              <div className="flex items-center gap-3 ml-4">
                <Link to="/StaffLogin">
                  <Button
                    variant="outline"
                    className="font-medium border-slate-200 hover:bg-slate-50"
                  >
                    Staff Login
                  </Button>
                </Link>
                <Link to="/ClientPortal">
                  <Button
                    variant="ghost"
                    className="font-medium hover:bg-blue-50 hover:text-blue-600"
                  >
                    View KTM Profile
                  </Button>
                </Link>
                <Link to="/ClientPortal">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 rounded-full px-6 transition-all hover:scale-105 active:scale-95">
                    Business Workflow
                  </Button>
                </Link>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 p-4 space-y-4 shadow-xl absolute w-full animate-in slide-in-from-top-5">
            <a
              href="#services"
              className="block text-sm font-medium text-slate-600 p-2 hover:bg-slate-50 rounded-lg"
              onClick={() => setMobileMenuOpen(false)}
            >
              Services
            </a>
            <a
              href="#how-it-works"
              className="block text-sm font-medium text-slate-600 p-2 hover:bg-slate-50 rounded-lg"
              onClick={() => setMobileMenuOpen(false)}
            >
              How it Works
            </a>
            <a
              href="#testimonials"
              className="block text-sm font-medium text-slate-600 p-2 hover:bg-slate-50 rounded-lg"
              onClick={() => setMobileMenuOpen(false)}
            >
              Reviews
            </a>
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
              <Link to="/StaffLogin" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-center">
                  Staff Login
                </Button>
              </Link>
              <Link to="/ClientPortal" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-center">
                  View KTM Profile
                </Button>
              </Link>
              <Link to="/ClientPortal" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full justify-center bg-blue-600">Business Workflow</Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/50 via-slate-50 to-white"></div>

        {/* Animated Background Elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl animate-pulse-slow delay-1000"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                Now shipping daily from Bangkok to Yangon
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1]">
                Seamless Logistics <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  Across Borders
                </span>
              </h1>
              <p className="text-lg text-slate-600 max-w-xl leading-relaxed">
                The most reliable cargo service connecting Thailand and Myanmar. Clients send
                inquiries through our staff channels, and KTM Cargo handles the quote, collection,
                booking, and delivery work behind the scenes.
              </p>

              <div className="max-w-xl rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/20">
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
                    className="rounded-full bg-cyan-400 px-6 text-slate-950 hover:bg-cyan-300"
                  >
                    <Link to="/ClientPortal">
                      View KTM Profile
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="rounded-full border-white/15 bg-white/5 px-6 text-white hover:bg-white/10"
                  >
                    <a href="#workflow">View Workflow</a>
                  </Button>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-300">
                  There is no self-service checkout or web ordering. All live requests are handled
                  by the KTM team through the operating workflow.
                </p>
              </div>

              <div className="flex items-center gap-6 text-sm text-slate-500 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>Staff-led Quotes</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>Consolidated Cargo</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>Door-to-door Delivery</span>
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative lg:h-[600px] w-full hidden lg:block perspective-1000">
              {/* Main Image Container */}
              <div className="relative w-full h-full transform transition-transform duration-500 hover:rotate-y-2">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[3rem] shadow-2xl overflow-hidden">
                  <img
                    src="/hero-logistics.png"
                    alt="Logistics Network"
                    className="w-full h-full object-cover opacity-90 mix-blend-overlay"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-900/50 to-transparent"></div>
                </div>

                {/* Floating Info Cards */}
                <div className="absolute top-10 right-10 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-white shadow-xl animate-float">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Plane className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-100">Next Flight</p>
                      <p className="font-bold">Today, 18:00</p>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-20 left-10 bg-white p-4 rounded-2xl shadow-xl shadow-slate-900/20 border border-slate-100 max-w-[240px] animate-float delay-700">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Trusted Partner</p>
                      <p className="text-xs text-slate-500">For 500+ Businesses</p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 w-[85%] rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Our Premium Services</h2>
            <p className="text-slate-600 text-lg">
              Tailored logistics solutions designed for individuals and businesses.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Service 1 */}
            <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors duration-300">
                  <Package className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Cargo Shipping</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Door-to-door delivery from Bangkok to Yangon. We handle customs, packaging, and
                  insurance for your peace of mind.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> 3-5 Day Delivery
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> Staff status updates
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> Free Insurance up to ฿5,000
                  </li>
                </ul>
                <Button
                  asChild
                  variant="outline"
                  className="w-full group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200"
                >
                  <a href="#workflow">Read Workflow</a>
                </Button>
              </CardContent>
            </Card>

            {/* Service 2 */}
            <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group">
              <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl z-10">
                POPULAR
              </div>
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-500 transition-colors duration-300">
                  <ShoppingBag className="w-7 h-7 text-orange-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Buy for Me</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Can't shop in Thailand? Send us the links, and we'll buy, inspect, and ship the
                  items directly to you.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> Low Service Fee (10%)
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> Quality Inspection
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> Consolidated Shipping
                  </li>
                </ul>
                <Button
                  asChild
                  className="w-full bg-slate-900 text-white hover:bg-slate-800 group-hover:shadow-lg"
                >
                  <Link to="/ClientPortal">View KTM Profile</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Service 3 */}
            <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-600 transition-colors duration-300">
                  <Truck className="w-7 h-7 text-purple-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">B2B Logistics</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Scalable solutions for businesses. Bulk shipping, warehousing, and inventory
                  management for your supply chain.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> Volume Discounts
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> Priority Handling
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> Dedicated Account Manager
                  </li>
                </ul>
                <Button
                  asChild
                  variant="outline"
                  className="w-full group-hover:bg-purple-50 group-hover:text-purple-600 group-hover:border-purple-200"
                >
                  <a href="#services">View Services</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">How It Works</h2>
            <p className="text-slate-600 text-lg">
              Shipping is staff-led. Customers send inquiries and KTM Cargo handles the rest.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-slate-100 -z-0">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
            </div>

            {[
              {
                icon: Users,
                title: '1. Send Inquiry',
                desc: 'Share links, photos, quantities, and delivery details through our social channels.',
              },
              {
                icon: ShoppingBag,
                title: '2. Quote & Confirm',
                desc: 'Our team calculates product cost, cargo fees, and local delivery before confirming.',
              },
              {
                icon: Package,
                title: '3. We Deliver',
                desc: 'We purchase, consolidate, ship, and deliver the order through the KTM workflow.',
              },
            ].map((step, idx) => (
              <div key={idx} className="relative z-10 text-center group">
                <div className="w-24 h-24 mx-auto bg-white rounded-full border-4 border-slate-50 shadow-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 group-hover:border-blue-50">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white">
                    <step.icon className="w-8 h-8" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-600 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Trusted by Thousands</h2>
            <p className="text-slate-600 text-lg">
              Don't just take our word for it. Here's what our customers say.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Thandar Hlaing',
                role: 'Online Seller',
                text: 'KTM Cargo has been a game changer for my business. Fast shipping and great rates!',
              },
              {
                name: 'Kyaw Zin',
                role: 'Gadget Enthusiast',
                text: "I buy electronics from Thailand all the time. The 'Buy for Me' service is super convenient.",
              },
              {
                name: 'May Myat',
                role: 'Fashion Boutique Owner',
                text: 'Reliable and professional. My stock always arrives on time and in perfect condition.',
              },
            ].map((review, idx) => (
              <Card key={idx} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-8">
                  <div className="flex gap-1 text-amber-400 mb-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-slate-600 mb-6 italic">"{review.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                      {review.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{review.name}</p>
                      <p className="text-xs text-slate-500">{review.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>How long does shipping take?</AccordionTrigger>
              <AccordionContent>
                Our standard shipping from Bangkok to Yangon takes 3-5 business days. We have daily
                departures to ensure the fastest delivery.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>What are your shipping rates?</AccordionTrigger>
              <AccordionContent>
                Rates depend on item type, weight, route, and delivery location. KTM Cargo gives a
                staff quote after we receive your inquiry so the full workflow is clear before
                shipping starts.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Do you offer insurance?</AccordionTrigger>
              <AccordionContent>
                Yes! Every shipment includes basic insurance coverage up to ฿5,000. Additional
                insurance is available for high-value items at a small fee.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>How does 'Buy for Me' work?</AccordionTrigger>
              <AccordionContent>
                Send the product link or photo through Facebook, Line, or Telegram. Our team will
                purchase or collect the item, inspect it, and move it through the KTM Cargo
                workflow.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] p-12 lg:p-24 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>

            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
                Need a quote from KTM Cargo?
              </h2>
              <p className="text-blue-100 text-lg mb-10">
                Send your inquiry through Facebook, Line, or Telegram and our staff will guide the
                shipment from quote to delivery.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/ClientPortal">
                  <Button className="bg-white text-blue-600 hover:bg-blue-50 h-14 px-8 rounded-full text-lg font-bold w-full sm:w-auto shadow-lg">
                    View KTM Profile
                  </Button>
                </Link>
                <Button
                  asChild
                  variant="outline"
                  className="border-blue-400 text-blue-100 hover:bg-blue-700 hover:text-white h-14 px-8 rounded-full text-lg font-medium w-full sm:w-auto"
                >
                  <a href="#workflow">See Workflow</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Plane className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">KTM Cargo</span>
              </div>
              <p className="max-w-sm mb-6 leading-relaxed">
                Connecting Thailand and Myanmar with reliable, fast, and secure logistics solutions.
                Your trusted partner in cross-border trade.
              </p>
              <div className="flex gap-4">
                <a
                  href="#services"
                  className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-blue-600 transition-colors text-white"
                >
                  <Globe className="w-5 h-5" />
                </a>
                <a
                  href="#workflow"
                  className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-blue-600 transition-colors text-white"
                >
                  <Users className="w-5 h-5" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">Services</h4>
              <ul className="space-y-4">
                <li>
                  <a href="#services" className="hover:text-white transition-colors">
                    Cargo Shipping
                  </a>
                </li>
                <li>
                  <a href="#services" className="hover:text-white transition-colors">
                    Buy for Me
                  </a>
                </li>
                <li>
                  <a href="#workflow" className="hover:text-white transition-colors">
                    Warehousing
                  </a>
                </li>
                <li>
                  <a href="#workflow" className="hover:text-white transition-colors">
                    Customs Clearance
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">Company</h4>
              <ul className="space-y-4">
                <li>
                  <a href="#workflow" className="hover:text-white transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#contact" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#workflow" className="hover:text-white transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p>© 2024 KTM Cargo Express. All rights reserved.</p>
            <p className="flex items-center gap-2">
              <Shield className="w-4 h-4" /> Secure Payments
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
