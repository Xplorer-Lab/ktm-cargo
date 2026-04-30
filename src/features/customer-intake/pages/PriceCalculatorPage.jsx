import { useState } from 'react';
import ContactCTA from '../components/ContactCTA.jsx';
import PriceCalculatorForm from '../components/PriceCalculatorForm.jsx';
import QuoteEstimateCard from '../components/QuoteEstimateCard.jsx';
import QuoteRequestForm from '../components/QuoteRequestForm.jsx';
import { createCustomerInquiry } from '../api/customerInquiries.js';
import { useQuoteEstimate } from '../hooks/useQuoteEstimate.js';

const INITIAL_CALCULATOR = Object.freeze({
  route: 'TH-MM',
  mode: 'air',
  weightKg: '1',
});

const INITIAL_FORM = Object.freeze({
  customerName: '',
  contactChannel: 'phone',
  contactValue: '',
  itemDescription: '',
  notes: '',
});

export default function PriceCalculatorPage() {
  const [calculator, setCalculator] = useState(INITIAL_CALCULATOR);
  const [form, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState('idle');
  const estimate = useQuoteEstimate(calculator);

  function updateCalculator(field, value) {
    setCalculator((current) => ({ ...current, [field]: value }));
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitQuoteRequest(event) {
    event.preventDefault();
    if (!estimate.isValid) return;

    setStatus('submitting');
    try {
      await createCustomerInquiry({
        customerName: form.customerName,
        contactChannel: form.contactChannel,
        contactValue: form.contactValue,
        serviceType: estimate.serviceType,
        route: calculator.route,
        weightKg: estimate.weightKg,
        billableWeightKg: estimate.billableWeightKg,
        ratePerKg: estimate.ratePerKg,
        estimatedCargoFee: estimate.cargoFeeThb,
        shoppingCommission: estimate.shoppingCommissionThb,
        estimatedTotalThb: estimate.totalThb,
        itemDescription: form.itemDescription,
        notes: form.notes,
      });
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-5">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-blue-700">KTM Cargo Express</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Price calculator and quote request</h1>
          <p className="mt-3 text-slate-600">
            Estimate Thailand ↔ Myanmar cargo pricing, then submit a lead for staff review.
          </p>
        </div>
        <PriceCalculatorForm values={calculator} onChange={updateCalculator} />
        <QuoteEstimateCard estimate={estimate} />
      </section>

      <section className="space-y-5">
        <QuoteRequestForm
          form={form}
          estimate={estimate}
          status={status}
          onChange={updateForm}
          onSubmit={submitQuoteRequest}
        />
        <ContactCTA />
      </section>
    </main>
  );
}
