import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Scale } from 'lucide-react';
import { useProcurementMetrics } from '@/hooks/reports/useProcurementMetrics';
import { OverviewMetricCard } from './MetricCard';
import { MonthlyPerformanceChart } from './MonthlyPerformanceChart';
import { WeightAllocationChart } from './WeightAllocationChart';
import { Package, DollarSign, TrendingUp, BarChart3, Truck } from 'lucide-react';

export function OverviewTabContent({
  filteredPOs,
  monthlyTrends,
  weightAllocationData,
  profitabilityMetrics,
}) {
  const procurementMetrics = useProcurementMetrics(filteredPOs);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <OverviewMetricCard
          icon={Package}
          label="PO Spend"
          value={`฿${procurementMetrics.totalPOSpend.toLocaleString()}`}
          variant="blue"
        />
        <OverviewMetricCard
          icon={DollarSign}
          label="Revenue"
          value={`฿${profitabilityMetrics.totalRevenue.toLocaleString()}`}
          variant="emerald"
        />
        <OverviewMetricCard
          icon={TrendingUp}
          label="Profit"
          value={`฿${profitabilityMetrics.totalProfit.toLocaleString()}`}
          variant="purple"
        />
        <OverviewMetricCard
          icon={BarChart3}
          label="Margin"
          value={`${profitabilityMetrics.profitMargin.toFixed(1)}%`}
          variant="amber"
        />
        <OverviewMetricCard
          icon={Scale}
          label="Weight (kg)"
          value={procurementMetrics.totalWeightPurchased.toLocaleString()}
          variant="cyan"
        />
        <OverviewMetricCard
          icon={Truck}
          label="Vendor Cost"
          value={`฿${profitabilityMetrics.totalVendorCost.toLocaleString()}`}
          variant="rose"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyPerformanceChart data={monthlyTrends} />
        <WeightAllocationChart data={weightAllocationData} />
      </div>

      {/* Allocation Progress */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-600" />
            Overall Weight Allocation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600">Total Allocation Progress</span>
              <span className="font-medium">
                {procurementMetrics.totalWeightAllocated.toLocaleString()} /{' '}
                {procurementMetrics.totalWeightPurchased.toLocaleString()} kg (
                {procurementMetrics.allocationRate.toFixed(1)}%)
              </span>
            </div>
            <Progress value={procurementMetrics.allocationRate} className="h-4" />
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <p className="text-xs text-blue-600 mb-1">Purchased</p>
                <p className="text-lg font-bold text-blue-900">
                  {procurementMetrics.totalWeightPurchased.toLocaleString()} kg
                </p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg text-center">
                <p className="text-xs text-emerald-600 mb-1">Allocated</p>
                <p className="text-lg font-bold text-emerald-900">
                  {procurementMetrics.totalWeightAllocated.toLocaleString()} kg
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg text-center">
                <p className="text-xs text-amber-600 mb-1">Available</p>
                <p className="text-lg font-bold text-amber-900">
                  {procurementMetrics.totalWeightRemaining.toLocaleString()} kg
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
