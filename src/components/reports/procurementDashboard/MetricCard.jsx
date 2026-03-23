import { Card, CardContent } from '@/components/ui/card';

const VARIANT_STYLES = {
  blue: {
    wrapper: 'bg-gradient-to-br from-blue-50 to-blue-100',
    icon: 'text-blue-600',
    label: 'text-blue-600',
    value: 'text-blue-900',
  },
  emerald: {
    wrapper: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
    icon: 'text-emerald-600',
    label: 'text-emerald-600',
    value: 'text-emerald-900',
  },
  purple: {
    wrapper: 'bg-gradient-to-br from-purple-50 to-purple-100',
    icon: 'text-purple-600',
    label: 'text-purple-600',
    value: 'text-purple-900',
  },
  amber: {
    wrapper: 'bg-gradient-to-br from-amber-50 to-amber-100',
    icon: 'text-amber-600',
    label: 'text-amber-600',
    value: 'text-amber-900',
  },
  cyan: {
    wrapper: 'bg-gradient-to-br from-cyan-50 to-cyan-100',
    icon: 'text-cyan-600',
    label: 'text-cyan-600',
    value: 'text-cyan-900',
  },
  rose: {
    wrapper: 'bg-gradient-to-br from-rose-50 to-rose-100',
    icon: 'text-rose-600',
    label: 'text-rose-600',
    value: 'text-rose-900',
  },
};

export function MetricCard({ icon: Icon, label, value, variant = 'blue' }) {
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.blue;

  return (
    <Card className={`border-0 shadow-sm ${styles.wrapper}`}>
      <CardContent className="p-4">
        <div className={`flex items-center gap-2 mb-1 ${styles.icon}`}>
          {Icon && <Icon className="w-4 h-4" />}
          <span className={`text-xs font-medium ${styles.label}`}>{label}</span>
        </div>
        <p className={`text-xl font-bold ${styles.value}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export function OverviewMetricCard({ icon: Icon, label, value, variant = 'blue' }) {
  return <MetricCard icon={Icon} label={label} value={value} variant={variant} />;
}

export function ProfitabilityMetricCard({ icon: Icon, label, value, variant = 'blue' }) {
  return <MetricCard icon={Icon} label={label} value={value} variant={variant} />;
}
