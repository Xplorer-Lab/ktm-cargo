import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  Link2,
  FileText,
  DollarSign,
  Scale,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StepShoppingProduct({ form, errors, onUpdate, onNext, onBack }) {
  return (
    <Card className="border-0 shadow-xl bg-white dark:bg-slate-900 overflow-hidden animate-in slide-in-from-right duration-300">
      <CardHeader className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl text-white">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg">What would you like us to buy?</CardTitle>
            <CardDescription>Tell us about the products you want</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-slate-400" />
            Product Links (optional)
          </Label>
          <Textarea
            placeholder="Paste product links here (one per line)..."
            value={form.product_links}
            onChange={(e) => onUpdate('product_links', e.target.value)}
            rows={3}
          />
          <p className="text-xs text-slate-400">Shopee, Lazada, or any Thai store links</p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            Product Details <span className="text-rose-500">*</span>
          </Label>
          <Textarea
            placeholder="Size, color, quantity, specifications..."
            value={form.product_details}
            onChange={(e) => onUpdate('product_details', e.target.value)}
            rows={3}
            className={cn(errors.product_details && 'border-rose-500 focus-visible:ring-rose-500')}
          />
          {errors.product_details && (
            <p className="text-xs text-rose-500 flex items-center gap-1">
              <Info className="w-3 h-3" />
              {errors.product_details}
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-400" />
              Estimated Product Cost (THB) <span className="text-rose-500">*</span>
            </Label>
            <Input
              type="number"
              step="1"
              min="1"
              placeholder="e.g. 1500"
              value={form.estimated_product_cost}
              onChange={(e) => onUpdate('estimated_product_cost', e.target.value)}
              className={cn(
                'h-12',
                errors.estimated_product_cost && 'border-rose-500 focus-visible:ring-rose-500'
              )}
            />
            {errors.estimated_product_cost && (
              <p className="text-xs text-rose-500 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {errors.estimated_product_cost}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-slate-400" />
              Estimated Weight (kg)
            </Label>
            <Input
              type="number"
              step="0.1"
              min="0.1"
              placeholder="e.g. 2.5"
              value={form.estimated_weight}
              onChange={(e) => onUpdate('estimated_weight', e.target.value)}
              className="h-12"
            />
            <p className="text-xs text-slate-400">Approximate is fine — we'll weigh it later</p>
          </div>
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
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
