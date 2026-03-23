import { useEffect } from 'react';
import { PORTAL_CSS } from './portalStyles';
import { bodyStyle } from './brandTokens';
import HeaderSection from './HeaderSection';
import HeroSection from './HeroSection';
import ServicesSection from './ServicesSection';
import WorkflowSection from './WorkflowSection';
import ExpectationsSection from './ExpectationsSection';
import FAQSection from './FAQSection';
import ContactSection from './ContactSection';

export default function PortalPage() {
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

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#111827', ...bodyStyle }}>
      <style>{PORTAL_CSS}</style>

      <HeaderSection />
      <HeroSection />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
        <div className="gold-rule" />
      </div>

      <ServicesSection />
      <WorkflowSection />
      <ExpectationsSection />
      <FAQSection />
      <ContactSection />
    </div>
  );
}
