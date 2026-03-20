import React, { useState } from 'react';
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
import { Building2, User, FileText, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { db } from '@/api/db';
import { toast } from 'sonner';
import { AuditActions } from '@/components/audit/AuditService';

const STEPS = [
  { id: 1, title: 'Basic Info', icon: Building2 },
  { id: 2, title: 'Contact', icon: User },
  { id: 3, title: 'Services', icon: FileText },
  { id: 4, title: 'Terms', icon: CheckCircle },
];

export default function VendorOnboarding({ onComplete, onCancel }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    vendor_type: 'supplier',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    services: '',
    payment_terms: 'net_30',
    contract_start: new Date().toISOString().split('T')[0],
    contract_end: '',
    notes: '',
    status: 'pending',
  });

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const vendor = await db.vendors.create({
      ...formData,
      onboarding_source: 'manual',
    });
    AuditActions.vendorCreated(vendor);
    toast.success('Vendor onboarded successfully!');
    onComplete?.(vendor);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name && formData.vendor_type;
      case 2:
        return formData.contact_name && formData.phone;
      case 3:
        return formData.services;
      case 4:
        return formData.payment_terms;
      default:
        return true;
    }
  };

  return (
    <Card className="border-0 shadow-lg max-w-2xl mx-auto">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Vendor Onboarding
        </CardTitle>
        <CardDescription>Add a new vendor to your procurement network</CardDescription>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mt-6">
          {STEPS.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    currentStep > step.id
                      ? 'bg-emerald-500 text-white'
                      : currentStep === step.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {currentStep > step.id ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`text-xs mt-1 ${currentStep >= step.id ? 'text-slate-900' : 'text-slate-400'}`}
                >
                  {step.title}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 rounded ${currentStep > step.id ? 'bg-emerald-500' : 'bg-slate-200'}`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Enter vendor company name"
              />
            </div>
            <div className="space-y-2">
              <Label>Vendor Type *</Label>
              <Select
                value={formData.vendor_type}
                onValueChange={(v) => updateField('vendor_type', v)}
              >
                <SelectTrigger>
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
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="Full business address"
                rows={2}
              />
            </div>
          </div>
        )}

        {/* Step 2: Contact */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Contact Person *</Label>
              <Input
                value={formData.contact_name}
                onChange={(e) => updateField('contact_name', e.target.value)}
                placeholder="Primary contact name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+66..."
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="email@company.com"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Services */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Services Provided *</Label>
              <Textarea
                value={formData.services}
                onChange={(e) => updateField('services', e.target.value)}
                placeholder="Describe the services this vendor provides..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Any special requirements or notes..."
                rows={2}
              />
            </div>
          </div>
        )}

        {/* Step 4: Terms */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Select
                value={formData.payment_terms}
                onValueChange={(v) => updateField('payment_terms', v)}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contract Start</Label>
                <Input
                  type="date"
                  value={formData.contract_start}
                  onChange={(e) => updateField('contract_start', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Contract End</Label>
                <Input
                  type="date"
                  value={formData.contract_end}
                  onChange={(e) => updateField('contract_end', e.target.value)}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium mb-3">Vendor Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-500">Company:</span>
                <span className="font-medium">{formData.name}</span>
                <span className="text-slate-500">Type:</span>
                <span className="font-medium capitalize">
                  {formData.vendor_type.replace('_', ' ')}
                </span>
                <span className="text-slate-500">Contact:</span>
                <span className="font-medium">{formData.contact_name}</span>
                <span className="text-slate-500">Payment:</span>
                <span className="font-medium">{formData.payment_terms.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => (currentStep === 1 ? onCancel?.() : setCurrentStep((s) => s - 1))}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>

          {currentStep < 4 ? (
            <Button
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={!canProceed()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete Onboarding
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
