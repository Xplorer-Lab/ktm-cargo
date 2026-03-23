import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  ShoppingBag,
  Calculator,
  Truck,
  Percent,
} from 'lucide-react';
import { DEFAULT_SHOPPING_PRICE_PER_KG } from '@/lib/defaults';

export default function StepShoppingConfirmation({ form, calc, isPending, onSubmit, onBack }) {
  return (
    <Card className="border-0 shadow-xl bg-white dark:bg-slate-900 overflow-hidden animate-in slide-in-from-right duration-300">
      <CardHeader className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500 rounded-xl text-white">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Order Summary</CardTitle>
            <CardDescription>Review your shopping order</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Product Summary */}
        <div className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-2xl border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl text-white">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <p className="font-semibold text-slate-900 dark:text-white">Shopping Order</p>
          </div>
          <div className="text-sm space-y-2">
            <div>
              <p className="text-slate-500 text-xs">Product Details</p>
              <p className="font-medium line-clamp-3">{form.product_details}</p>
            </div>
            {form.product_links && (
              <div>
                <p className="text-slate-500 text-xs">Product Links</p>
                <p className="font-medium line-clamp-2 text-blue-600 break-all">
                  {form.product_links}
                </p>
              </div>
            )}
            {form.delivery_address && (
              <div>
                <p className="text-slate-500 text-xs">Delivery To</p>
                <p className="font-medium">{form.delivery_address}</p>
              </div>
            )}
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="space-y-3 p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-slate-500" />
            <span className="font-semibold">Estimated Cost Breakdown</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Product Cost</span>
              <span className="font-medium">฿{calc.productCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">
                <Percent className="w-4 h-4 inline mr-1 text-emerald-500" />
                Service Fee ({calc.commissionRate}%)
              </span>
              <span className="font-medium">฿{calc.commission.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">
                <Truck className="w-4 h-4 inline mr-1 text-blue-500" />
                Shipping ({calc.weight} kg x ฿{DEFAULT_SHOPPING_PRICE_PER_KG})
              </span>
              <span className="font-medium">฿{calc.shippingCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-dashed border-slate-200 dark:border-slate-700 text-lg">
              <span className="font-bold">Estimated Total</span>
              <span className="font-bold text-2xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                ฿{calc.total.toLocaleString()}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Final amount may vary based on actual product cost and weight.
          </p>
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
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg shadow-purple-500/30 min-w-[160px]"
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
