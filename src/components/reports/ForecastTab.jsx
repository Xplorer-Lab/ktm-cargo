import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { generateForecast, analyzeServiceTrends } from '@/components/reports/ShipmentForecasting';

export default function ForecastTab({ shipments, shoppingOrders }) {
  const forecast = useMemo(() => {
    return generateForecast(shipments, shoppingOrders, 6);
  }, [shipments, shoppingOrders]);

  const serviceTrends = useMemo(() => {
    return analyzeServiceTrends(shipments);
  }, [shipments]);

  const forecastChartData = [
    ...forecast.historicalData.slice(-6).map((d) => ({ ...d, type: 'historical' })),
    ...forecast.forecasts.map((f) => ({
      month: f.shortMonth,
      revenue: f.predictedRevenue,
      revenueMin: f.revenueMin,
      revenueMax: f.revenueMax,
      type: 'forecast',
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Forecast Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5" />
              <span className="text-blue-100">6-Month Revenue Forecast</span>
            </div>
            <p className="text-3xl font-bold">
              ฿{forecast.summary.totalPredictedRevenue.toLocaleString()}
            </p>
            <p className="text-blue-200 text-sm mt-1">{forecast.summary.confidence}% confidence</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Predicted Shipments</p>
            <p className="text-2xl font-bold text-slate-900">
              {forecast.summary.totalPredictedVolume}
            </p>
            <p className="text-sm text-slate-500">Next 6 months</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Monthly Growth</p>
            <p
              className={`text-2xl font-bold ${forecast.summary.avgMonthlyGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
            >
              {forecast.summary.avgMonthlyGrowth >= 0 ? '+' : ''}
              {forecast.summary.avgMonthlyGrowth}%
            </p>
            <p className="text-sm text-slate-500">Avg per month</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Trend</p>
            <div className="flex items-center gap-2">
              {forecast.summary.growthTrend === 'growing' && (
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              )}
              {forecast.summary.growthTrend === 'declining' && (
                <TrendingDown className="w-6 h-6 text-rose-500" />
              )}
              {forecast.summary.growthTrend === 'stable' && (
                <BarChart3 className="w-6 h-6 text-blue-500" />
              )}
              <span className="text-xl font-bold capitalize">{forecast.summary.growthTrend}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              Revenue Forecast (Next 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastChartData}>
                  <defs>
                    <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => `฿${value?.toLocaleString()}`} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8b5cf6"
                    fill="url(#colorForecast)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-4 justify-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-slate-400 rounded"></div>
                <span className="text-slate-600">Historical</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                <span className="text-slate-600">Forecast</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Volume Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecast.forecasts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="shortMonth" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar
                    dataKey="predictedVolume"
                    name="Shipments"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Forecast Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Monthly Forecast Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3">Month</th>
                  <th className="text-right p-3">Predicted Volume</th>
                  <th className="text-right p-3">Predicted Revenue</th>
                  <th className="text-right p-3">Revenue Range</th>
                  <th className="text-center p-3">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {forecast.forecasts.map((f, i) => (
                  <tr key={f.month || i} className="border-t">
                    <td className="p-3 font-medium">{f.month}</td>
                    <td className="p-3 text-right">{f.predictedVolume} shipments</td>
                    <td className="p-3 text-right font-semibold text-blue-600">
                      ฿{f.predictedRevenue.toLocaleString()}
                    </td>
                    <td className="p-3 text-right text-slate-500">
                      ฿{f.revenueMin.toLocaleString()} - ฿{f.revenueMax.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        className={
                          f.confidence >= 80
                            ? 'bg-emerald-100 text-emerald-800'
                            : f.confidence >= 60
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-800'
                        }
                      >
                        {f.confidence}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Service Trends */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Service Type Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {serviceTrends.slice(0, 4).map((service, i) => (
              <div key={service.type || i} className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium capitalize">{service.type}</span>
                  <Badge>{service.percentage}%</Badge>
                </div>
                <p className="text-2xl font-bold text-slate-900">{service.count}</p>
                <p className="text-sm text-slate-500">Avg: {service.avgWeight} kg</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
