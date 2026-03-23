import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, Loader2, Clock, Calculator, Shield, Box } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { SERVICE_TYPES } from '../pricingMaps';

export default function StepCargoConfirmation({ form, calc, isPending, onSubmit, onBack }) {
  const selectedService = SERVICE_TYPES.find((s) => s.value === form.service_type);

  return (
    <Card className="border-0 shadow-xl bg-white dark:bg-slate-900 overflow-hidden animate-in slide-in-from-right duration-300">
      <CardHeader className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500 rounded-xl text-white">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Order Summary</CardTitle>
            <CardDescription>Review your shipment before submitting</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Order Summary Card */}
        <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-4">
            {selectedService && (
              <div
                className={cn('p-3 rounded-xl bg-gradient-to-br text-white', selectedService.color)}
              >
                <selectedService.icon className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1">
              <p className="font-semibold text-slate-900 dark:text-white">
                {selectedService?.label}
              </p>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Clock className="w-4 h-4" />
                <span>Est. delivery: {format(calc.estimatedDelivery, 'MMM dd, yyyy')}</span>
              </div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800">{selectedService?.delivery}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-slate-500">Weight</p>
              <p className="font-semibold">{form.weight_kg} kg</p>
            </div>
            <div>
              <p className="text-slate-500">Items</p>
              <p className="font-semibold line-clamp-1">{form.items_description}</p>
            </div>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="space-y-3 p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-slate-500" />
            <span className="font-semibold">Price Breakdown</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">
                Shipping ({calc.weight} kg x ฿{selectedService?.price})
              </span>
              <span className="font-medium">฿{calc.shippingCost.toLocaleString()}</span>
            </div>
            {form.insurance_opted && (
              <div className="flex justify-between">
                <span className="text-slate-500">
                  <Shield className="w-4 h-4 inline mr-1 text-blue-500" />
                  Insurance (3%)
                </span>
                <span className="font-medium">฿{calc.insuranceFee.toLocaleString()}</span>
              </div>
            )}
            {calc.packagingFee > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">
                  <Box className="w-4 h-4 inline mr-1 text-purple-500" />
                  Packaging
                </span>
                <span className="font-medium">฿{calc.packagingFee.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t border-dashed border-slate-200 dark:border-slate-700 text-lg">
              <span className="font-bold">Total</span>
              <span className="font-bold text-2xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                ฿{calc.totalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack} size="lg">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isPending}
            size="lg"
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30 min-w-[160px]"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Place Order
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
