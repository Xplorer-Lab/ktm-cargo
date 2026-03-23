import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight, Truck, MapPin, Scale, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StepShoppingShipping({ form, errors, onUpdate, onNext, onBack }) {
  return (
    <Card className="border-0 shadow-xl bg-white dark:bg-slate-900 overflow-hidden animate-in slide-in-from-right duration-300">
      <CardHeader className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500 rounded-xl text-white">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Shipping Details</CardTitle>
            <CardDescription>Where should we deliver?</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-slate-400" />
            Estimated Weight (kg) <span className="text-rose-500">*</span>
          </Label>
          <Input
            type="number"
            step="0.1"
            min="0.1"
            placeholder="e.g. 2.5"
            value={form.estimated_weight}
            onChange={(e) => onUpdate('estimated_weight', e.target.value)}
            className={cn(
              'h-12',
              errors.estimated_weight && 'border-rose-500 focus-visible:ring-rose-500'
            )}
          />
          {errors.estimated_weight && (
            <p className="text-xs text-rose-500 flex items-center gap-1">
              <Info className="w-3 h-3" />
              {errors.estimated_weight}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-500" />
            Delivery Address (Yangon)
          </Label>
          <Textarea
            placeholder="Enter your Yangon delivery address"
            value={form.delivery_address}
            onChange={(e) => onUpdate('delivery_address', e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-700 dark:text-slate-300">Special Instructions</Label>
          <Textarea
            placeholder="Anything we should know..."
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
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg shadow-purple-500/30"
          >
            Review Order
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
