import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Package, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SERVICE_TYPES } from '../pricingMaps';

export default function StepCargoService({ form, onUpdate, onNext, onBack }) {
  return (
    <Card className="border-0 shadow-xl bg-white dark:bg-slate-900 overflow-hidden animate-in slide-in-from-right duration-300">
      <CardHeader className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500 rounded-xl text-white">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Select Service Type</CardTitle>
            <CardDescription>Choose the shipping service that fits your needs</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-5">
        <div className="grid grid-cols-1 gap-3">
          {SERVICE_TYPES.map((service) => {
            const Icon = service.icon;
            const isSelected = form.service_type === service.value;
            return (
              <button
                key={service.value}
                onClick={() => onUpdate('service_type', service.value)}
                className={cn(
                  'relative p-4 rounded-2xl border-2 text-left transition-all duration-200 group overflow-hidden',
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                )}
              >
                {isSelected && (
                  <div
                    className={cn(
                      'absolute top-0 right-0 w-20 h-20 opacity-10 bg-gradient-to-bl rounded-full -translate-y-1/2 translate-x-1/2',
                      service.color
                    )}
                  />
                )}
                <div className="flex items-center gap-4 relative">
                  <div
                    className={cn(
                      'p-3 rounded-xl transition-all',
                      isSelected
                        ? `bg-gradient-to-br ${service.color} text-white shadow-lg`
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white">{service.label}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {service.description}
                    </p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      <Clock className="w-3 h-3 mr-1" />
                      {service.delivery}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        'text-2xl font-bold',
                        isSelected ? 'text-blue-600' : 'text-slate-700 dark:text-slate-300'
                      )}
                    >
                      ฿{service.price}
                    </p>
                    <p className="text-xs text-slate-400">/kg</p>
                  </div>
                  {isSelected && (
                    <CheckCircle className="w-5 h-5 text-blue-500 absolute top-0 right-0" />
                  )}
                </div>
              </button>
            );
          })}
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
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
