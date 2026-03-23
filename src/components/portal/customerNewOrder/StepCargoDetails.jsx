import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Scale, MapPin, Box, Shield, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PACKAGING_OPTIONS } from '../pricingMaps';

export default function StepCargoDetails({ form, errors, onUpdate, onNext, onBack }) {
  return (
    <Card className="border-0 shadow-xl bg-white dark:bg-slate-900 overflow-hidden animate-in slide-in-from-right duration-300">
      <CardHeader className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500 rounded-xl text-white">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Shipment Details</CardTitle>
            <CardDescription>Provide information about your package</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Scale className="w-4 h-4 text-slate-400" />
              Weight (kg) <span className="text-rose-500">*</span>
            </Label>
            <Input
              type="number"
              step="0.1"
              min="0.1"
              placeholder="Enter weight"
              value={form.weight_kg}
              onChange={(e) => onUpdate('weight_kg', e.target.value)}
              className={cn(
                'h-12 text-lg',
                errors.weight_kg && 'border-rose-500 focus-visible:ring-rose-500'
              )}
            />
            {errors.weight_kg && (
              <p className="text-xs text-rose-500 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {errors.weight_kg}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Box className="w-4 h-4 text-slate-400" />
              Packaging
            </Label>
            <Select
              value={form.packaging_fee.toString()}
              onValueChange={(v) => onUpdate('packaging_fee', parseInt(v))}
            >
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PACKAGING_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex flex-col">
                      <span>{opt.label}</span>
                      <span className="text-xs text-slate-500">{opt.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-slate-700 dark:text-slate-300">
            Item Description <span className="text-rose-500">*</span>
          </Label>
          <Textarea
            placeholder="Describe your items (e.g., Electronics, Clothing, Documents)"
            value={form.items_description}
            onChange={(e) => onUpdate('items_description', e.target.value)}
            rows={2}
            className={cn(
              errors.items_description && 'border-rose-500 focus-visible:ring-rose-500'
            )}
          />
          {errors.items_description && (
            <p className="text-xs text-rose-500 flex items-center gap-1">
              <Info className="w-3 h-3" />
              {errors.items_description}
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <MapPin className="w-4 h-4 text-blue-500" />
              Pickup Address (Bangkok)
            </Label>
            <Textarea
              placeholder="Enter pickup address"
              value={form.pickup_address}
              onChange={(e) => onUpdate('pickup_address', e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <MapPin className="w-4 h-4 text-emerald-500" />
              Delivery Address (Yangon)
            </Label>
            <Textarea
              placeholder="Enter delivery address"
              value={form.delivery_address}
              onChange={(e) => onUpdate('delivery_address', e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-100 dark:border-blue-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Shipment Insurance</p>
              <p className="text-sm text-slate-500">3% of shipping cost</p>
            </div>
          </div>
          <Switch
            checked={form.insurance_opted}
            onCheckedChange={(v) => onUpdate('insurance_opted', v)}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-700 dark:text-slate-300">Special Instructions</Label>
          <Textarea
            placeholder="Any special handling instructions..."
            value={form.notes}
            onChange={(e) => onUpdate('notes', e.target.value)}
            rows={2}
          />
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack} size="lg">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={onNext}
            size="lg"
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/30"
          >
            Review Order
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
