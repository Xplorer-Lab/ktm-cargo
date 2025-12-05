import React, { useMemo, useEffect, useRef } from 'react';
import { db } from '@/api/db';
import { auth } from '@/api/auth';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StatsCard from '@/components/dashboard/StatsCard';
import ShipmentCard from '@/components/shipments/ShipmentCard';
import {
  Package,
  Users,
  TrendingUp,
  DollarSign,
  ArrowRight,
  Plus,
  ShoppingBag,
  Truck,
  AlertCircle,
  Clock,
  Crown,
  Star,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  segmentCustomers,
  getSegmentSummary,
  getMarketingRecommendations,
} from '@/components/customers/CustomerSegmentationEngine';
import { checkSegmentHealth } from '@/components/notifications/NotificationService';

import { startTour } from '@/components/common/TourGuide';

export default function Dashboard() {
  const { data: shipments = [], isLoading: shipmentsLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => db.shipments.list('-created_date', 100),
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => db.customers.list(),
  });

  const { data: shoppingOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['shopping-orders'],
    queryFn: () => db.shoppingOrders.list('-created_date', 50),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => db.expenses.list(),
  });

  const isLoading = shipmentsLoading || customersLoading || ordersLoading;

  // AI-powered customer segmentation
  const analyzedCustomers = useMemo(() => {
    return segmentCustomers(customers, shipments);
  }, [customers, shipments]);

  const segmentSummary = useMemo(() => {
    return getSegmentSummary(analyzedCustomers);
  }, [analyzedCustomers]);

  const recommendations = useMemo(() => {
    return getMarketingRecommendations(segmentSummary);
  }, [segmentSummary]);

  // Check segment health and trigger alerts (once per session)
  const alertsChecked = useRef(false);
  useEffect(() => {
    if (!alertsChecked.current && customers.length > 0) {
      alertsChecked.current = true;
      auth
        .me()
        .then((user) => {
          if (
            user?.email &&
            (segmentSummary.byBehavior.at_risk.count >= 3 ||
              segmentSummary.byBehavior.lapsed.count >= 5)
          ) {
            checkSegmentHealth(segmentSummary, user.email);
          }
        })
        .catch(() => { });
    }
  }, [customers.length, segmentSummary]);

  // Calculate stats
  const totalRevenue = shipments.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalProfit = shipments.reduce((sum, s) => sum + (s.profit || 0), 0);
  const totalWeight = shipments.reduce((sum, s) => sum + (s.weight_kg || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const pendingShipments = shipments.filter((s) =>
    ['pending', 'confirmed', 'picked_up'].includes(s.status)
  );
  const inTransitShipments = shipments.filter((s) => ['in_transit', 'customs'].includes(s.status));
  const deliveredShipments = shipments.filter((s) => s.status === 'delivered');

  const recentShipments = shipments.slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4" id="dashboard-header">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Dashboard</h1>
              <Button variant="ghost" size="icon" onClick={() => startTour('dashboard')} className="text-slate-400 hover:text-blue-600" title="Take a Tour">
                <Sparkles className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-slate-500 mt-1">Bangkok-Yangon Cargo & Shopping Services</p>
          </div>
          <div className="flex gap-3">
            <Link to={createPageUrl('Shipments')}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Shipment
              </Button>
            </Link>
            <Link to={createPageUrl('ShoppingOrders')}>
              <Button variant="outline">
                <ShoppingBag className="w-4 h-4 mr-2" />
                New Order
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-cards">
          {isLoading ? (
            Array(4)
              .fill(0)
              .map((_, i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </Card>
              ))
          ) : (
            <>
              <StatsCard
                title="Total Revenue"
                value={`฿${totalRevenue.toLocaleString()}`}
                icon={DollarSign}
                bgColor="bg-emerald-500"
                trend="+12% this month"
                trendUp
              />
              <StatsCard
                title="Total Shipments"
                value={shipments.length}
                icon={Package}
                bgColor="bg-blue-500"
                trend={`${totalWeight.toFixed(1)} kg shipped`}
                trendUp
              />
              <StatsCard
                title="Active Customers"
                value={customers.length}
                icon={Users}
                bgColor="bg-purple-500"
              />
              <StatsCard
                title="Est. Profit"
                value={`฿${totalProfit.toLocaleString()}`}
                icon={TrendingUp}
                bgColor="bg-amber-500"
              />
            </>
          )}
        </div>

        {/* Customer Segments Overview */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 sm:px-6">
            <CardTitle className="text-base sm:text-lg">Customer Segments</CardTitle>
            <Link to={createPageUrl('CustomerSegments')}>
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                View All <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-purple-50 rounded-xl">
                <div className="flex items-center gap-1 sm:gap-2 mb-1">
                  <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                  <span className="text-[10px] sm:text-xs font-medium text-purple-700">VIP</span>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-purple-900">
                  {segmentSummary.byValueTier.vip.count}
                </p>
                <p className="text-[10px] sm:text-xs text-purple-600 hidden sm:block">
                  ฿{segmentSummary.byValueTier.vip.revenue.toLocaleString()}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-emerald-50 rounded-xl">
                <div className="flex items-center gap-1 sm:gap-2 mb-1">
                  <Star className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600" />
                  <span className="text-[10px] sm:text-xs font-medium text-emerald-700">High</span>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-emerald-900">
                  {segmentSummary.byValueTier.high.count}
                </p>
                <p className="text-[10px] sm:text-xs text-emerald-600 hidden sm:block">
                  ฿{segmentSummary.byValueTier.high.revenue.toLocaleString()}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-amber-50 rounded-xl">
                <div className="flex items-center gap-1 sm:gap-2 mb-1">
                  <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600" />
                  <span className="text-[10px] sm:text-xs font-medium text-amber-700">Loyal</span>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-amber-900">
                  {segmentSummary.byBehavior.loyal.count}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-sky-50 rounded-xl">
                <div className="flex items-center gap-1 sm:gap-2 mb-1">
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-sky-600" />
                  <span className="text-[10px] sm:text-xs font-medium text-sky-700">New</span>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-sky-900">
                  {segmentSummary.byBehavior.new.count}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-rose-50 rounded-xl">
                <div className="flex items-center gap-1 sm:gap-2 mb-1">
                  <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-rose-600" />
                  <span className="text-[10px] sm:text-xs font-medium text-rose-700">At Risk</span>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-rose-900">
                  {segmentSummary.byBehavior.at_risk.count}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-1 sm:gap-2 mb-1">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                  <span className="text-[10px] sm:text-xs font-medium text-gray-700">Lapsed</span>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {segmentSummary.byBehavior.lapsed.count}
                </p>
              </div>
            </div>

            {/* Marketing Recommendations */}
            {recommendations.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-slate-700 mb-2">AI Recommendations</p>
                <div className="space-y-2">
                  {recommendations.slice(0, 2).map((rec, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 bg-blue-50 rounded-lg"
                    >
                      <span className="text-sm text-blue-800">{rec.action}</span>
                      <Link to={createPageUrl('CustomerSegments')}>
                        <Button size="sm" variant="ghost" className="text-blue-600">
                          Create Campaign
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700">Pending</p>
                  <p className="text-3xl font-bold text-amber-900 mt-1">
                    {pendingShipments.length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">In Transit</p>
                  <p className="text-3xl font-bold text-blue-900 mt-1">
                    {inTransitShipments.length}
                  </p>
                </div>
                <Truck className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-700">Delivered</p>
                  <p className="text-3xl font-bold text-emerald-900 mt-1">
                    {deliveredShipments.length}
                  </p>
                </div>
                <Package className="w-8 h-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Shipments */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm" id="recent-activity">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Recent Shipments</CardTitle>
                <Link to={createPageUrl('Shipments')}>
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {Array(3)
                      .fill(0)
                      .map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                  </div>
                ) : recentShipments.length > 0 ? (
                  <div className="space-y-3">
                    {recentShipments.map((shipment) => (
                      <ShipmentCard key={shipment.id} shipment={shipment} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No shipments yet</p>
                    <Link to={createPageUrl('Shipments')}>
                      <Button className="mt-4" size="sm">
                        Create First Shipment
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link to={createPageUrl('Shipments')} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="w-4 h-4 mr-3" />
                    Manage Shipments
                  </Button>
                </Link>
                <Link to={createPageUrl('ShoppingOrders')} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <ShoppingBag className="w-4 h-4 mr-3" />
                    Shopping Orders
                  </Button>
                </Link>
                <Link to={createPageUrl('Customers')} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="w-4 h-4 mr-3" />
                    View Customers
                  </Button>
                </Link>
                <Link to={createPageUrl('Tasks')} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <AlertCircle className="w-4 h-4 mr-3" />
                    Business Tasks
                  </Button>
                </Link>
                <Link to={createPageUrl('Reports')} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="w-4 h-4 mr-3" />
                    Financial Reports
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Revenue</span>
                  <span className="font-semibold text-emerald-600">
                    ฿{totalRevenue.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Expenses</span>
                  <span className="font-semibold text-rose-600">
                    ฿{totalExpenses.toLocaleString()}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="text-slate-700 font-medium">Net Profit</span>
                  <span className="font-bold text-lg text-blue-600">
                    ฿{(totalProfit - totalExpenses).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
