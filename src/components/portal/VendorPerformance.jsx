import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Star, Clock, CheckCircle, Package, Award, Target } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export default function VendorPerformance({ vendor }) {
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['vendor-performance-pos', vendor?.id, vendor?.name],
    queryFn: async () => {
      if (vendor?.id) {
        return db.purchaseOrders.filter({ vendor_id: vendor.id });
      } else if (vendor?.name) {
        return db.purchaseOrders.filter({ vendor_name: vendor.name });
      }
      return [];
    },
    enabled: !!(vendor?.id || vendor?.name),
  });

  const { data: goodsReceipts = [] } = useQuery({
    queryKey: ['vendor-performance-gr', vendor?.id],
    queryFn: async () => {
      if (vendor?.id) {
        return db.goodsReceipts.filter({ vendor_id: vendor.id });
      }
      return [];
    },
    enabled: !!vendor?.id,
  });

  // Calculate metrics
  const totalOrders = purchaseOrders.length;
  const completedOrders = purchaseOrders.filter((po) => po.status === 'received').length;
  const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

  const rating = vendor?.rating || 5;
  const onTimeRate = vendor?.on_time_rate || 100;

  // Quality metrics from goods receipts
  const qualityPassed = goodsReceipts.filter((gr) => gr.quality_status === 'passed').length;
  const qualityRate = goodsReceipts.length > 0 ? (qualityPassed / goodsReceipts.length) * 100 : 100;

  // Monthly performance
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    const monthOrders = purchaseOrders.filter((po) => {
      const poDate = new Date(po.order_date || po.created_date);
      return isWithinInterval(poDate, { start, end });
    });

    const completed = monthOrders.filter((po) => po.status === 'received').length;
    const revenue = monthOrders.reduce((sum, po) => sum + (po.total_amount || 0), 0);

    return {
      month: format(date, 'MMM'),
      orders: monthOrders.length,
      completed,
      revenue: revenue / 1000, // In thousands
    };
  });

  // Performance score
  const performanceScore = Math.round((rating / 5) * 30 + onTimeRate * 0.35 + qualityRate * 0.35);

  return (
    <div className="space-y-6">
      {/* Performance Score */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-2xl">
                <Award className="w-10 h-10" />
              </div>
              <div>
                <p className="text-emerald-100">Overall Performance Score</p>
                <p className="text-5xl font-bold">{performanceScore}</p>
                <p className="text-emerald-100 text-sm">out of 100</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                  <span className="text-2xl font-bold">{rating.toFixed(1)}</span>
                </div>
                <p className="text-xs text-emerald-100">Rating</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{onTimeRate}%</p>
                <p className="text-xs text-emerald-100">On-Time</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{Math.round(qualityRate)}%</p>
                <p className="text-xs text-emerald-100">Quality</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalOrders}</p>
                <p className="text-xs text-slate-500">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedOrders}</p>
                <p className="text-xs text-slate-500">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{onTimeRate}%</p>
                <p className="text-xs text-slate-500">On-Time Delivery</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.round(completionRate)}%</p>
                <p className="text-xs text-slate-500">Completion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bars */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Customer Rating</span>
              <span className="text-sm text-slate-500">{rating.toFixed(1)} / 5.0</span>
            </div>
            <Progress value={rating * 20} className="h-3" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">On-Time Delivery</span>
              <span className="text-sm text-slate-500">{onTimeRate}%</span>
            </div>
            <Progress value={onTimeRate} className="h-3" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Quality Score</span>
              <span className="text-sm text-slate-500">{Math.round(qualityRate)}%</span>
            </div>
            <Progress value={qualityRate} className="h-3" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Order Completion</span>
              <span className="text-sm text-slate-500">{Math.round(completionRate)}%</span>
            </div>
            <Progress value={completionRate} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Monthly Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={last6Months}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Orders" />
                <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Revenue Trend (฿K)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={last6Months}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v) => [`฿${(v * 1000).toLocaleString()}`, 'Revenue']} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tips */}
      <Card className="border-0 shadow-sm border-l-4 border-l-blue-500">
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">Tips to Improve Your Score</h4>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>• Deliver orders on or before the expected date</li>
            <li>• Maintain high quality standards to reduce rejections</li>
            <li>• Respond quickly to order confirmations</li>
            <li>• Keep your profile and banking details up to date</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
