import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Truck, ShoppingBag, Clock } from 'lucide-react';

export default function OrderTypeSelection({ onSelect }) {
  return (
    <Card className="border-0 shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500 rounded-xl text-white">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Create New Order</CardTitle>
            <CardDescription>Choose what you would like to do</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => onSelect('cargo')}
            className="group p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 text-left transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-950/30"
          >
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white w-fit mb-4 group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-shadow">
              <Truck className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              Cargo Shipment
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Send a package from Bangkok to Yangon. Choose service type, enter weight, and track
              delivery.
            </p>
            <div className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
              <Clock className="w-3 h-3" /> 1-5 days delivery
            </div>
          </button>

          <button
            onClick={() => onSelect('shopping')}
            className="group p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-purple-500 text-left transition-all duration-200 hover:bg-purple-50 dark:hover:bg-purple-950/30"
          >
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl text-white w-fit mb-4 group-hover:shadow-lg group-hover:shadow-purple-500/30 transition-shadow">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              Shopping Order
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              We buy products for you in Thailand and ship them to Yangon. Just tell us what you
              want!
            </p>
            <div className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
              <ShoppingBag className="w-3 h-3" /> Buy + Ship
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
