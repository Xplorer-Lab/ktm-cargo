import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProcurementMetrics } from '@/hooks/reports/useProcurementMetrics';

export function ProcurementTabContent({ filteredPOs }) {
  const metrics = useProcurementMetrics(filteredPOs);

  return (
    <div className="space-y-6">
      {/* PO Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total POs</p>
            <p className="text-2xl font-bold">{metrics.totalPOs}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Spend</p>
            <p className="text-2xl font-bold text-blue-600">
              ฿{metrics.totalPOSpend.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Avg Cost/kg</p>
            <p className="text-2xl font-bold text-amber-600">฿{metrics.avgCostPerKg.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Allocation Rate</p>
            <p className="text-2xl font-bold text-emerald-600">
              {metrics.allocationRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* PO List Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3">PO Number</th>
                  <th className="text-left p-3">Vendor</th>
                  <th className="text-right p-3">Amount</th>
                  <th className="text-right p-3">Weight</th>
                  <th className="text-right p-3">Cost/kg</th>
                  <th className="text-right p-3">Allocated</th>
                  <th className="text-center p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPOs.slice(0, 20).map((po) => (
                  <tr key={po.id} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-medium">{po.po_number || po.id.substring(0, 8)}</td>
                    <td className="p-3">{po.vendor_name || '-'}</td>
                    <td className="p-3 text-right">฿{(po.total_amount || 0).toLocaleString()}</td>
                    <td className="p-3 text-right">{po.total_weight_kg || 0} kg</td>
                    <td className="p-3 text-right">฿{po.cost_per_kg || 0}</td>
                    <td className="p-3 text-right">
                      <span
                        className={
                          po.allocated_weight_kg >= po.total_weight_kg
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                        }
                      >
                        {po.allocated_weight_kg || 0} / {po.total_weight_kg || 0} kg
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        className={
                          po.status === 'approved' || po.status === 'received'
                            ? 'bg-emerald-100 text-emerald-800'
                            : po.status === 'pending_approval'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-800'
                        }
                      >
                        {po.status}
                      </Badge>
                    </td>
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
