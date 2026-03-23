import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProfitabilityMetrics } from '@/hooks/reports/useProfitabilityMetrics';
import { useOrderProfitability } from '@/hooks/reports/useOrderProfitability';

export function ProfitabilityTabContent({ filteredShipments, filteredShoppingOrders }) {
  const metrics = useProfitabilityMetrics(filteredShipments, filteredShoppingOrders);
  const orderProfitability = useOrderProfitability(filteredShipments, filteredShoppingOrders);

  return (
    <div className="space-y-6">
      {/* Profitability Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-emerald-50">
          <CardContent className="p-4">
            <p className="text-sm text-emerald-600">Total Revenue</p>
            <p className="text-2xl font-bold text-emerald-900">
              ฿{metrics.totalRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-rose-50">
          <CardContent className="p-4">
            <p className="text-sm text-rose-600">Vendor Costs</p>
            <p className="text-2xl font-bold text-rose-900">
              ฿{metrics.totalVendorCost.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-purple-50">
          <CardContent className="p-4">
            <p className="text-sm text-purple-600">Net Profit</p>
            <p className="text-2xl font-bold text-purple-900">
              ฿{metrics.totalProfit.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="p-4">
            <p className="text-sm text-blue-600">Profit Margin</p>
            <p className="text-2xl font-bold text-blue-900">{metrics.profitMargin.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Per Order Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500">Avg Revenue/Order</p>
            <p className="text-xl font-bold text-slate-900">
              ฿
              {metrics.avgRevenuePerOrder.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500">Avg Cost/Order</p>
            <p className="text-xl font-bold text-rose-600">
              ฿
              {metrics.avgCostPerOrder.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-500">Avg Profit/Order</p>
            <p className="text-xl font-bold text-emerald-600">
              ฿
              {metrics.avgProfitPerOrder.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Order Profitability Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Order Profitability (Top Performers)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3">Order</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Customer</th>
                  <th className="text-left p-3">Vendor</th>
                  <th className="text-right p-3">Revenue</th>
                  <th className="text-right p-3">Vendor Cost</th>
                  <th className="text-right p-3">Profit</th>
                  <th className="text-right p-3">Margin</th>
                </tr>
              </thead>
              <tbody>
                {orderProfitability.slice(0, 15).map((order) => {
                  const margin = order.revenue > 0 ? (order.profit / order.revenue) * 100 : 0;
                  return (
                    <tr key={order.id} className="border-t hover:bg-slate-50">
                      <td className="p-3 font-medium">{order.orderNumber}</td>
                      <td className="p-3">
                        <Badge
                          className={
                            order.type === 'Shipment'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }
                        >
                          {order.type}
                        </Badge>
                      </td>
                      <td className="p-3">{order.customer || '-'}</td>
                      <td className="p-3">{order.vendor}</td>
                      <td className="p-3 text-right">฿{order.revenue.toLocaleString()}</td>
                      <td className="p-3 text-right text-rose-600">
                        ฿{order.vendorCost.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-medium text-emerald-600">
                        ฿{order.profit.toLocaleString()}
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={
                            margin >= 20
                              ? 'text-emerald-600'
                              : margin >= 10
                                ? 'text-amber-600'
                                : 'text-rose-600'
                          }
                        >
                          {margin.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
