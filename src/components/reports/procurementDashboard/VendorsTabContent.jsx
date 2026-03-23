import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVendorPerformance } from '@/hooks/reports/useVendorPerformance';
import { VendorSpendChart } from './VendorSpendChart';

export function VendorsTabContent({ filteredPOs }) {
  const vendorPerformance = useVendorPerformance(filteredPOs);

  return (
    <div className="space-y-6">
      {/* Vendor Spend Chart */}
      <VendorSpendChart data={vendorPerformance} />

      {/* Vendor Performance Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Vendor Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3">Vendor</th>
                  <th className="text-right p-3">Total Spend</th>
                  <th className="text-right p-3">Total Weight</th>
                  <th className="text-right p-3">Avg Cost/kg</th>
                  <th className="text-right p-3">PO Count</th>
                </tr>
              </thead>
              <tbody>
                {vendorPerformance.map((vendor) => (
                  <tr key={vendor.id} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-medium">{vendor.name}</td>
                    <td className="p-3 text-right font-semibold text-blue-600">
                      ฿{vendor.totalSpend.toLocaleString()}
                    </td>
                    <td className="p-3 text-right">{vendor.totalWeight.toLocaleString()} kg</td>
                    <td className="p-3 text-right">฿{vendor.avgCostPerKg.toFixed(2)}</td>
                    <td className="p-3 text-right">{vendor.poCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
