import { useState, useEffect } from 'react';
import { db } from '@/api/db';
import { sendMessengerNotification } from '@/api/integrations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  User,
  FileText,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Plane,
} from 'lucide-react';
import { toast } from 'sonner';
import { AuditActions } from '@/components/audit/AuditService';

const STEPS = [
  { id: 'company', title: 'Company Info', icon: Building2 },
  { id: 'contact', title: 'Contact Details', icon: User },
  { id: 'banking', title: 'Banking Info', icon: CreditCard },
  { id: 'services', title: 'Services', icon: FileText },
];

export default function VendorRegistration() {
  const [step, setStep] = useState(0);
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    name: '',
    vendor_type: 'supplier',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    tax_id: '',
    bank_name: '',
    bank_account_number: '',
    bank_account_name: '',
    services: '',
    payment_terms: 'net_30',
    notes: '',
  });

  useEffect(() => {
    loadInvitation();
  }, []);

  const loadInvitation = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    try {
      const invitations = await db.vendorInvitations.filter({ token });

      if (invitations.length === 0) {
        setError('Invitation not found');
        setLoading(false);
        return;
      }

      const inv = invitations[0];

      if (inv.status === 'completed') {
        setError('This invitation has already been used');
        setLoading(false);
        return;
      }

      if (inv.status === 'expired' || new Date(inv.expires_at) < new Date()) {
        setError('This invitation has expired');
        setLoading(false);
        return;
      }

      setInvitation(inv);
      setForm((prev) => ({
        ...prev,
        name: inv.company_name || '',
        email: inv.email || '',
      }));
    } catch (_e) {
      setError('Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const validateStep = () => {
    const newErrors = new Map();

    if (step === 0) {
      if (!form.name.trim()) newErrors.set('name', 'Company name is required');
      if (!form.vendor_type) newErrors.set('vendor_type', 'Vendor type is required');
    } else if (step === 1) {
      if (!form.contact_name.trim()) newErrors.set('contact_name', 'Contact name is required');
      if (!form.phone.trim()) newErrors.set('phone', 'Phone is required');
      if (!form.email.trim()) newErrors.set('email', 'Email is required');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        newErrors.set('email', 'Invalid email format');
    } else if (step === 2) {
      if (!form.tax_id.trim()) newErrors.set('tax_id', 'Tax ID is required');
      if (!form.bank_name.trim()) newErrors.set('bank_name', 'Bank name is required');
      if (!form.bank_account_number.trim())
        newErrors.set('bank_account_number', 'Account number is required');
      if (!form.bank_account_name.trim())
        newErrors.set('bank_account_name', 'Account name is required');
    }

    setErrors(newErrors);
    return newErrors.size === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setSubmitting(true);
    try {
      // Create vendor
      const vendor = await db.vendors.create({
        ...form,
        status: 'pending',
        onboarding_source: 'invitation',
        invitation_id: invitation.id,
      });

      // Update invitation
      await db.vendorInvitations.update(invitation.id, {
        status: 'completed',
        completed_vendor_id: vendor.id,
      });

      // Log audit
      AuditActions.vendorCreated(vendor);

      // Notify admin
      try {
        await sendMessengerNotification({
          to: invitation.invited_by,
          message: `New Vendor Registration: ${form.name}\n\nVendor ${form.name} (${form.vendor_type}) has completed registration.\nContact: ${form.contact_name} (${form.email})`,
          platform: 'Telegram',
        });
      } catch (_e) {
        console.error('Failed to notify admin', _e);
      }

      setCompleted(true);
      toast.success('Registration completed successfully!');
    } catch (_e) {
      console.error(_e);
      toast.error('Failed to complete registration');
    } finally {
      setSubmitting(false);
    }
  };

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    const errorMap = errors instanceof Map ? errors : new Map();
    if (errorMap.has(field)) {
      const nextErrors = new Map(errorMap);
      nextErrors.delete(field);
      setErrors(nextErrors);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Invalid Invitation</h2>
            <p className="text-slate-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Registration Complete!</h2>
            <p className="text-slate-500 mb-4">
              Thank you for registering. Your application is pending review and you will be notified
              once approved.
            </p>
            <Badge className="bg-amber-100 text-amber-800">Pending Approval</Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 p-3 bg-blue-600 rounded-xl mb-4">
            <Plane className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Vendor Registration</h1>
          <p className="text-slate-500 mt-1">Complete your profile to become a registered vendor</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = idx === step;
            const isComplete = idx < step;
            return (
              <div key={s.id} className="flex items-center">
                <div className={`flex items-center gap-2 ${idx > 0 ? 'ml-4' : ''}`}>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isComplete
                        ? 'bg-emerald-500 text-white'
                        : isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={`hidden md:block text-sm font-medium ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
                  >
                    {s.title}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`w-12 h-1 mx-2 rounded ${isComplete ? 'bg-emerald-500' : 'bg-slate-200'}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Form Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            {/* eslint-disable-next-line security/detect-object-injection */}
            <CardTitle>{STEPS[step].title}</CardTitle>
            <CardDescription>
              {step === 0 && 'Enter your company information'}
              {step === 1 && 'Provide contact details for communication'}
              {step === 2 && 'Banking details for payment processing'}
              {step === 3 && 'Describe your services and terms'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 0: Company Info */}
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label>Company Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    placeholder="Your Company Ltd."
                    className={errors instanceof Map && errors.has('name') ? 'border-rose-500' : ''}
                  />
                  {errors instanceof Map && errors.has('name') && (
                    <p className="text-xs text-rose-500">{errors.get('name')}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Vendor Type *</Label>
                  <Select
                    value={form.vendor_type}
                    onValueChange={(v) => updateForm('vendor_type', v)}
                  >
                    <SelectTrigger
                      className={
                        errors instanceof Map && errors.has('vendor_type') ? 'border-rose-500' : ''
                      }
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cargo_carrier">Cargo Carrier</SelectItem>
                      <SelectItem value="supplier">Supplier</SelectItem>
                      <SelectItem value="packaging">Packaging</SelectItem>
                      <SelectItem value="customs_broker">Customs Broker</SelectItem>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Business Address</Label>
                  <Textarea
                    value={form.address}
                    onChange={(e) => updateForm('address', e.target.value)}
                    placeholder="Full business address"
                    rows={2}
                  />
                </div>
              </>
            )}

            {/* Step 1: Contact Details */}
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Contact Person Name *</Label>
                  <Input
                    value={form.contact_name}
                    onChange={(e) => updateForm('contact_name', e.target.value)}
                    placeholder="John Doe"
                    className={
                      errors instanceof Map && errors.has('contact_name') ? 'border-rose-500' : ''
                    }
                  />
                  {errors instanceof Map && errors.has('contact_name') && (
                    <p className="text-xs text-rose-500">{errors.get('contact_name')}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone Number *</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => updateForm('phone', e.target.value)}
                      placeholder="+66 xxx xxx xxxx"
                      className={
                        errors instanceof Map && errors.has('phone') ? 'border-rose-500' : ''
                      }
                    />
                    {errors instanceof Map && errors.has('phone') && (
                      <p className="text-xs text-rose-500">{errors.get('phone')}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => updateForm('email', e.target.value)}
                      placeholder="contact@company.com"
                      className={
                        errors instanceof Map && errors.has('email') ? 'border-rose-500' : ''
                      }
                    />
                    {errors instanceof Map && errors.has('email') && (
                      <p className="text-xs text-rose-500">{errors.get('email')}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Banking Info */}
            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label>Tax ID / Registration Number *</Label>
                  <Input
                    value={form.tax_id}
                    onChange={(e) => updateForm('tax_id', e.target.value)}
                    placeholder="1234567890123"
                    className={
                      errors instanceof Map && errors.has('tax_id') ? 'border-rose-500' : ''
                    }
                  />
                  {errors instanceof Map && errors.has('tax_id') && (
                    <p className="text-xs text-rose-500">{errors.get('tax_id')}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Bank Name *</Label>
                  <Input
                    value={form.bank_name}
                    onChange={(e) => updateForm('bank_name', e.target.value)}
                    placeholder="Bangkok Bank"
                    className={
                      errors instanceof Map && errors.has('bank_name') ? 'border-rose-500' : ''
                    }
                  />
                  {errors instanceof Map && errors.has('bank_name') && (
                    <p className="text-xs text-rose-500">{errors.get('bank_name')}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Number *</Label>
                    <Input
                      value={form.bank_account_number}
                      onChange={(e) => updateForm('bank_account_number', e.target.value)}
                      placeholder="xxx-x-xxxxx-x"
                      className={
                        errors instanceof Map && errors.has('bank_account_number')
                          ? 'border-rose-500'
                          : ''
                      }
                    />
                    {errors instanceof Map && errors.has('bank_account_number') && (
                      <p className="text-xs text-rose-500">{errors.get('bank_account_number')}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Account Name *</Label>
                    <Input
                      value={form.bank_account_name}
                      onChange={(e) => updateForm('bank_account_name', e.target.value)}
                      placeholder="Company Name Co., Ltd."
                      className={
                        errors instanceof Map && errors.has('bank_account_name')
                          ? 'border-rose-500'
                          : ''
                      }
                    />
                    {errors instanceof Map && errors.has('bank_account_name') && (
                      <p className="text-xs text-rose-500">{errors.get('bank_account_name')}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Services */}
            {step === 3 && (
              <>
                <div className="space-y-2">
                  <Label>Services Provided</Label>
                  <Textarea
                    value={form.services}
                    onChange={(e) => updateForm('services', e.target.value)}
                    placeholder="Describe the services you provide..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preferred Payment Terms</Label>
                  <Select
                    value={form.payment_terms}
                    onValueChange={(v) => updateForm('payment_terms', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate (COD)</SelectItem>
                      <SelectItem value="net_15">Net 15 Days</SelectItem>
                      <SelectItem value="net_30">Net 30 Days</SelectItem>
                      <SelectItem value="net_60">Net 60 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Additional Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => updateForm('notes', e.target.value)}
                    placeholder="Any additional information..."
                    rows={2}
                  />
                </div>
              </>
            )}

            {/* Navigation */}
            <div className="flex gap-3 pt-4">
              {step > 0 && (
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  Back
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button onClick={handleNext} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Complete Registration
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
