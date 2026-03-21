import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  DollarSign,
  Star,
  Truck,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  CheckCircle,
  Loader2,
  Package,
  Wind,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const vendorTypes = [
  {
    value: 'cargo_carrier',
    label: 'Cargo Carrier',
    icon: Truck,
    description: 'Land / Air logistics',
  },
  { value: 'supplier', label: 'Supplier', icon: Package, description: 'Thai product supplier' },
];

const statusOptions = [
  { value: 'active', label: 'Active', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'inactive', label: 'Inactive', color: 'bg-slate-100 text-slate-800' },
  { value: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-800' },
];

export default function VendorForm({ vendor, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    vendor_type: 'supplier',
    carrier_mode: null,
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    cost_per_kg: 0,
    is_preferred: false,
    status: 'active',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (vendor) {
      setForm({
        name: vendor.name || '',
        vendor_type: vendor.vendor_type || 'supplier',
        carrier_mode: vendor.carrier_mode || null,
        contact_name: vendor.contact_name || '',
        phone: vendor.phone || '',
        email: vendor.email || '',
        address: vendor.address || '',
        cost_per_kg: vendor.cost_per_kg || 0,
        is_preferred: vendor.is_preferred || false,
        status: vendor.status || 'active',
        notes: vendor.notes || '',
      });
    }
  }, [vendor]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      onSubmit({
        ...form,
        cost_per_kg: parseFloat(form.cost_per_kg) || 0,
      });
      setIsSubmitting(false);
    }, 300);
  };

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const selectedVendorType = vendorTypes.find((t) => t.value === form.vendor_type);
  const VendorTypeIcon = selectedVendorType?.icon || Building2;

  return (
    <Card className="border-0 shadow-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900">
      <CardHeader className="pb-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              <VendorTypeIcon className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl">{vendor ? 'Edit Vendor' : 'Add New Vendor'}</CardTitle>
              <CardDescription>
                {vendor
                  ? 'Update vendor information'
                  : 'Enter vendor details to add to your network'}
              </CardDescription>
            </div>
          </div>
          {form.is_preferred && (
            <Badge className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-0 shadow-lg shadow-amber-500/30">
              <Star className="w-3 h-3 mr-1 fill-white" /> Preferred
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Company Name */}
            <div className="md:col-span-2 space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                Company Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                placeholder="Enter company name"
                className="h-11"
                required
              />
            </div>

            {/* Vendor Type */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-slate-400" />
                Vendor Type
              </Label>
              <Select
                value={form.vendor_type}
                onValueChange={(v) => {
                  updateForm('vendor_type', v);
                  if (v !== 'cargo_carrier') updateForm('carrier_mode', null);
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vendorTypes.map((t) => {
                    const TypeIcon = t.icon;
                    return (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="w-4 h-4 text-slate-500" />
                          <div>
                            <span>{t.label}</span>
                            <span className="text-xs text-slate-400 ml-2">{t.description}</span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Carrier Mode — only for cargo carriers */}
            {form.vendor_type === 'cargo_carrier' && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-slate-400" />
                  Carrier Mode <span className="text-rose-500">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'land', label: '🚛 Land', desc: 'Road transport' },
                    { value: 'air', label: '✈️ Air', desc: 'Air freight' },
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => updateForm('carrier_mode', mode.value)}
                      className={cn(
                        'p-3 rounded-xl border-2 text-left transition-all',
                        form.carrier_mode === mode.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      )}
                    >
                      <div className="font-semibold text-sm">{mode.label}</div>
                      <div className="text-xs text-slate-500">{mode.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Status */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-slate-400" />
                Status
              </Label>
              <Select value={form.status} onValueChange={(v) => updateForm('status', v)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <div className="flex items-center gap-2">
                        <Badge className={cn('text-xs', s.color)}>{s.label}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contact Name */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                Contact Name
              </Label>
              <Input
                value={form.contact_name}
                onChange={(e) => updateForm('contact_name', e.target.value)}
                placeholder="John Doe"
                className="h-11"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                Phone
              </Label>
              <Input
                value={form.phone}
                onChange={(e) => updateForm('phone', e.target.value)}
                placeholder="+66 XX XXX XXXX"
                className="h-11"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                Email
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => updateForm('email', e.target.value)}
                placeholder="vendor@company.com"
                className="h-11"
              />
            </div>

            {/* Cost per kg — only for cargo carriers */}
            {form.vendor_type === 'cargo_carrier' && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-slate-400" />
                  Cost per kg (฿)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost_per_kg}
                  onChange={(e) => updateForm('cost_per_kg', e.target.value)}
                  placeholder="0.00"
                  className="h-11"
                />
              </div>
            )}

            {/* Address */}
            <div className="md:col-span-2 space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                Address
              </Label>
              <Input
                value={form.address}
                onChange={(e) => updateForm('address', e.target.value)}
                placeholder="Full address"
                className="h-11"
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2 space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                Notes
              </Label>
              <Textarea
                value={form.notes}
                onChange={(e) => updateForm('notes', e.target.value)}
                rows={3}
                placeholder="Additional notes about this vendor..."
              />
            </div>

            {/* Preferred Vendor Toggle */}
            <div className="md:col-span-2 flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                  <Star className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <Label className="text-amber-900 dark:text-amber-200 font-medium">
                    Preferred Vendor
                  </Label>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Show first in dropdowns
                  </p>
                </div>
              </div>
              <Switch
                checked={form.is_preferred}
                onCheckedChange={(v) => updateForm('is_preferred', v)}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {vendor ? 'Update Vendor' : 'Add Vendor'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
