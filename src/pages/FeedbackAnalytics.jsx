import { useMemo } from 'react';
import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Star,
  Users,
  Package,
  Truck,
  MessageSquare,
  ThumbsUp,
  AlertCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

export default function FeedbackAnalytics() {
  const { data: feedbacks = [] } = useQuery({
    queryKey: ['feedbacks'],
    queryFn: () => db.feedback.list('-created_date', 500),
  });

  const submittedFeedbacks = feedbacks.filter((f) => f.status === 'submitted');

  const stats = useMemo(() => {
    if (submittedFeedbacks.length === 0) return null;

    const avgRating =
      submittedFeedbacks.reduce((s, f) => s + (f.rating || 0), 0) / submittedFeedbacks.length;
    const avgService =
      submittedFeedbacks.filter((f) => f.service_rating).reduce((s, f) => s + f.service_rating, 0) /
      submittedFeedbacks.filter((f) => f.service_rating).length || 0;
    const avgDelivery =
      submittedFeedbacks
        .filter((f) => f.delivery_rating)
        .reduce((s, f) => s + f.delivery_rating, 0) /
      submittedFeedbacks.filter((f) => f.delivery_rating).length || 0;
    const avgComm =
      submittedFeedbacks
        .filter((f) => f.communication_rating)
        .reduce((s, f) => s + f.communication_rating, 0) /
      submittedFeedbacks.filter((f) => f.communication_rating).length || 0;
    const recommendRate =
      (submittedFeedbacks.filter((f) => f.would_recommend).length / submittedFeedbacks.length) *
      100;

    // Rating distribution
    const distribution = [1, 2, 3, 4, 5].map((r) => ({
      rating: `${r} Star`,
      count: submittedFeedbacks.filter((f) => f.rating === r).length,
      color: COLORS[r - 1],
    }));

    // By service type
    const byService = new Map();
    submittedFeedbacks.forEach((f) => {
      const type = f.service_type || 'other';
      if (!byService.has(type)) {
        byService.set(type, { total: 0, count: 0 });
      }
      const existing = byService.get(type);
      byService.set(type, {
        total: existing.total + (f.rating || 0),
        count: existing.count + 1,
      });
    });

    const serviceRatings = Array.from(byService.entries()).map(([name, data]) => ({
      name: name.replace('_', ' '),
      rating: (data.total / data.count).toFixed(1),
      count: data.count,
    }));

    return {
      avgRating,
      avgService,
      avgDelivery,
      avgComm,
      recommendRate,
      distribution,
      serviceRatings,
    };
  }, [submittedFeedbacks]);

  const recentFeedbacks = submittedFeedbacks.slice(0, 10);
  const lowRatings = submittedFeedbacks.filter((f) => f.rating <= 2);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Feedback Analytics</h1>
          <p className="text-slate-500 mt-1">Customer satisfaction insights and trends</p>
        </div>

        {submittedFeedbacks.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <Star className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No feedback yet</h3>
              <p className="text-slate-500">
                Feedback will appear here once customers submit their ratings
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-100 rounded-xl">
                      <Star className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Avg Rating</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {stats?.avgRating.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Service</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {stats?.avgService.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-100 rounded-xl">
                      <Truck className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Delivery</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {stats?.avgDelivery.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 rounded-xl">
                      <MessageSquare className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Communication</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {stats?.avgComm.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-rose-100 rounded-xl">
                      <ThumbsUp className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Recommend</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {stats?.recommendRate.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Rating Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats?.distribution.reverse().map((d) => (
                      <div key={d.rating} className="flex items-center gap-3">
                        <span className="w-16 text-sm text-slate-600">{d.rating}</span>
                        <Progress
                          value={(d.count / submittedFeedbacks.length) * 100}
                          className="flex-1 h-3"
                        />
                        <span className="w-8 text-sm text-slate-900 font-medium">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Ratings by Service Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats?.serviceRatings}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="rating" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent & Issues */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Recent Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {recentFeedbacks.map((f) => (
                      <div key={f.id} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-slate-900">{f.customer_name}</p>
                            <p className="text-xs text-slate-500">
                              {f.service_type?.replace('_', ' ')}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${s <= f.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                              />
                            ))}
                          </div>
                        </div>
                        {f.comment && (
                          <p className="text-sm text-slate-600 line-clamp-2">{f.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                    Areas for Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {lowRatings.length > 0 ? (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {lowRatings.slice(0, 5).map((f) => (
                        <div
                          key={f.id}
                          className="p-3 bg-rose-50 rounded-lg border border-rose-100"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge className="bg-rose-100 text-rose-800">{f.rating} Star</Badge>
                            <span className="text-xs text-slate-500">
                              {f.service_type?.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="font-medium text-slate-900">{f.customer_name}</p>
                          {f.comment && <p className="text-sm text-slate-600 mt-1">{f.comment}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ThumbsUp className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                      <p className="text-slate-500">No low ratings - great job!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Summary */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-6 h-6 text-blue-600" />
                  <h3 className="font-semibold text-slate-900">Feedback Summary</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Total Responses</p>
                    <p className="text-xl font-bold text-slate-900">{submittedFeedbacks.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Pending Requests</p>
                    <p className="text-xl font-bold text-amber-600">
                      {feedbacks.filter((f) => f.status === 'pending').length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">5-Star Ratings</p>
                    <p className="text-xl font-bold text-emerald-600">
                      {submittedFeedbacks.filter((f) => f.rating === 5).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">With Comments</p>
                    <p className="text-xl font-bold text-slate-900">
                      {submittedFeedbacks.filter((f) => f.comment).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
