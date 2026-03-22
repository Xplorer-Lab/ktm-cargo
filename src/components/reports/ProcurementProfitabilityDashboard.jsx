import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  Package,
  TrendingUp,
  Scale,
  Truck,
  BarChart3,
  Filter,
  Download,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  ComposedChart,
  Line,
} from 'recharts';
import {
  format,
  parseISO,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  subMonths,
  eachMonthOfInterval,
} from 'date-fns';

const COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#ef4444',
  '#84cc16',
];

export default function ProcurementProfitabilityDashboard({
  purchaseOrders = [],
  shipments = [],
  shoppingOrders = [],
  vendors = [],
  customers = [],
  dateRange,
}) {
  const [vendorFilter, setVendorFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeSubTab, setActiveSubTab] = useState('overview');

  // Filter data by date range
  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (!po.created_date) return true;
      const date = parseISO(po.created_date);
      if (dateRange?.from && dateRange?.to) {
        if (!isWithinInterval(date, { start: dateRange.from, end: dateRange.to })) return false;
      }
      if (vendorFilter !== 'all' && po.vendor_id !== vendorFilter) return false;
      if (statusFilter !== 'all' && po.status !== statusFilter) return false;
      return true;
    });
  }, [purchaseOrders, dateRange, vendorFilter, statusFilter]);

  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      if (!s.created_date) return true;
      const date = parseISO(s.created_date);
      if (dateRange?.from && dateRange?.to) {
        if (!isWithinInterval(date, { start: dateRange.from, end: dateRange.to })) return false;
      }
      if (vendorFilter !== 'all' && s.vendor_id !== vendorFilter) return false;
      if (customerFilter !== 'all' && s.customer_id !== customerFilter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      return true;
    });
  }, [shipments, dateRange, vendorFilter, customerFilter, statusFilter]);

  const filteredShoppingOrders = useMemo(() => {
    return shoppingOrders.filter((o) => {
      if (!o.created_date) return true;
      const date = parseISO(o.created_date);
      if (dateRange?.from && dateRange?.to) {
        if (!isWithinInterval(date, { start: dateRange.from, end: dateRange.to })) return false;
      }
      if (vendorFilter !== 'all' && o.vendor_id !== vendorFilter) return false;
      if (customerFilter !== 'all' && o.customer_id !== customerFilter) return false;
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      return true;
    });
  }, [shoppingOrders, dateRange, vendorFilter, customerFilter, statusFilter]);

  // Procurement Metrics
  const procurementMetrics = useMemo(() => {
    const totalPOSpend = filteredPOs.reduce((sum, po) => sum + (po.total_amount || 0), 0);
    const totalWeightPurchased = filteredPOs.reduce(
      (sum, po) => sum + (po.total_weight_kg || 0),
      0
    );
    const totalWeightAllocated = filteredPOs.reduce(
      (sum, po) => sum + (po.allocated_weight_kg || 0),
      0
    );
    const totalWeightRemaining = filteredPOs.reduce(
      (sum, po) => sum + (po.remaining_weight_kg || 0),
      0
    );
    const avgCostPerKg =
      filteredPOs.length > 0
        ? filteredPOs.reduce((sum, po) => sum + (po.cost_per_kg || 0), 0) / filteredPOs.length
        : 0;
    const pendingPOs = filteredPOs.filter((po) =>
      ['draft', 'pending_approval'].includes(po.status)
    ).length;
    const approvedPOs = filteredPOs.filter((po) =>
      ['approved', 'sent', 'received'].includes(po.status)
    ).length;
    const allocationRate =
      totalWeightPurchased > 0 ? (totalWeightAllocated / totalWeightPurchased) * 100 : 0;

    return {
      totalPOSpend,
      totalWeightPurchased,
      totalWeightAllocated,
      totalWeightRemaining,
      avgCostPerKg,
      pendingPOs,
      approvedPOs,
      allocationRate,
      totalPOs: filteredPOs.length,
    };
  }, [filteredPOs]);

  // Profitability Metrics
  const profitabilityMetrics = useMemo(() => {
    // Shipment profitability
    const shipmentRevenue = filteredShipments.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const shipmentVendorCost = filteredShipments.reduce(
      (sum, s) => sum + (s.vendor_total_cost || 0),
      0
    );
    const shipmentProfit = filteredShipments.reduce((sum, s) => sum + (s.profit || 0), 0);

    // Shopping order profitability
    const shoppingRevenue = filteredShoppingOrders.reduce(
      (sum, o) => sum + (o.total_amount || 0),
      0
    );
    const shoppingVendorCost = filteredShoppingOrders.reduce(
      (sum, o) => sum + (o.vendor_cost || 0),
      0
    );
    const shoppingProfit = filteredShoppingOrders.reduce(
      (sum, o) =>
        sum + (o.commission_amount || 0) + ((o.shipping_cost || 0) - (o.vendor_cost || 0)),
      0
    );

    const totalRevenue = shipmentRevenue + shoppingRevenue;
    const totalVendorCost = shipmentVendorCost + shoppingVendorCost;
    const totalProfit = shipmentProfit + shoppingProfit;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Per order averages
    const totalOrders = filteredShipments.length + filteredShoppingOrders.length;
    const avgRevenuePerOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const avgProfitPerOrder = totalOrders > 0 ? totalProfit / totalOrders : 0;
    const avgCostPerOrder = totalOrders > 0 ? totalVendorCost / totalOrders : 0;

    return {
      shipmentRevenue,
      shipmentVendorCost,
      shipmentProfit,
      shoppingRevenue,
      shoppingVendorCost,
      shoppingProfit,
      totalRevenue,
      totalVendorCost,
      totalProfit,
      profitMargin,
      totalOrders,
      avgRevenuePerOrder,
      avgProfitPerOrder,
      avgCostPerOrder,
    };
  }, [filteredShipments, filteredShoppingOrders]);

  // Vendor Performance
  const vendorPerformance = useMemo(() => {
    const vendorStats = {};

    filteredPOs.forEach((po) => {
      if (!po.vendor_id) return;
      if (!vendorStats[po.vendor_id]) {
        vendorStats[po.vendor_id] = {
          id: po.vendor_id,
          name: po.vendor_name || 'Unknown',
          totalSpend: 0,
          totalWeight: 0,
          poCount: 0,
          avgCostPerKg: 0,
        };
      }
      vendorStats[po.vendor_id].totalSpend += po.total_amount || 0;
      vendorStats[po.vendor_id].totalWeight += po.total_weight_kg || 0;
      vendorStats[po.vendor_id].poCount += 1;
    });

    // Calculate avg cost per kg
    Object.values(vendorStats).forEach((v) => {
      v.avgCostPerKg = v.totalWeight > 0 ? v.totalSpend / v.totalWeight : 0;
    });

    return Object.values(vendorStats).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [filteredPOs]);

  // Order Profitability Details
  const orderProfitability = useMemo(() => {
    const orders = [
      ...filteredShipments.map((s) => ({
        id: s.id,
        orderNumber: s.tracking_number,
        type: 'Shipment',
        customer: s.customer_name,
        vendor: s.vendor_name || '-',
        revenue: s.total_amount || 0,
        vendorCost: s.vendor_total_cost || 0,
        profit: s.profit || 0,
        weight: s.weight_kg || 0,
        status: s.status,
        date: s.created_date,
      })),
      ...filteredShoppingOrders.map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        type: 'Shopping',
        customer: o.customer_name,
        vendor: o.vendor_name || '-',
        revenue: o.total_amount || 0,
        vendorCost: o.vendor_cost || 0,
        profit: (o.commission_amount || 0) + ((o.shipping_cost || 0) - (o.vendor_cost || 0)),
        weight: o.actual_weight || o.estimated_weight || 0,
        status: o.status,
        date: o.created_date,
      })),
    ];

    return orders.sort((a, b) => b.profit - a.profit);
  }, [filteredShipments, filteredShoppingOrders]);

  // Monthly Trend Data
  const monthlyTrends = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date(),
    });

    return months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthPOs = purchaseOrders.filter((po) => {
        if (!po.created_date) return false;
        return isWithinInterval(parseISO(po.created_date), { start: monthStart, end: monthEnd });
      });

      const monthShipments = shipments.filter((s) => {
        if (!s.created_date) return false;
        return isWithinInterval(parseISO(s.created_date), { start: monthStart, end: monthEnd });
      });

      const monthShopping = shoppingOrders.filter((o) => {
        if (!o.created_date) return false;
        return isWithinInterval(parseISO(o.created_date), { start: monthStart, end: monthEnd });
      });

      const poSpend = monthPOs.reduce((sum, po) => sum + (po.total_amount || 0), 0);
      const revenue =
        monthShipments.reduce((sum, s) => sum + (s.total_amount || 0), 0) +
        monthShopping.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const profit =
        monthShipments.reduce((sum, s) => sum + (s.profit || 0), 0) +
        monthShopping.reduce(
          (sum, o) =>
            sum + (o.commission_amount || 0) + ((o.shipping_cost || 0) - (o.vendor_cost || 0)),
          0
        );

      return {
        month: format(month, 'MMM'),
        fullMonth: format(month, 'MMMM yyyy'),
        poSpend,
        revenue,
        profit,
        margin: revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0,
      };
    });
  }, [purchaseOrders, shipments, shoppingOrders]);

  // Weight Allocation by PO
  const weightAllocationData = useMemo(() => {
    return filteredPOs
      .filter((po) => po.total_weight_kg > 0)
      .map((po) => ({
        name: po.po_number || po.id.substring(0, 8),
        allocated: po.allocated_weight_kg || 0,
        remaining: po.remaining_weight_kg || 0,
        total: po.total_weight_kg || 0,
      }))
      .slice(0, 10);
  }, [filteredPOs]);

  // Export handler
  const handleExport = (type) => {
    let csv, filename;

    if (type === 'procurement') {
      csv = ['PO Number,Vendor,Total Amount,Weight (kg),Cost/kg,Status,Date'];
      filteredPOs.forEach((po) => {
        csv.push(
          `${po.po_number},${po.vendor_name || ''},${po.total_amount || 0},${po.total_weight_kg || 0},${po.cost_per_kg || 0},${po.status},${po.created_date || ''}`
        );
      });
      filename = 'procurement_report.csv';
    } else if (type === 'profitability') {
      csv = ['Order Number,Type,Customer,Vendor,Revenue,Vendor Cost,Profit,Margin %,Date'];
      orderProfitability.forEach((o) => {
        const margin = o.revenue > 0 ? ((o.profit / o.revenue) * 100).toFixed(1) : 0;
        csv.push(
          `${o.orderNumber},${o.type},${o.customer},${o.vendor},${o.revenue},${o.vendorCost},${o.profit},${margin}%,${o.date || ''}`
        );
      });
      filename = 'profitability_report.csv';
    }

    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Filters:</span>
            </div>
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Vendors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers.slice(0, 50).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExport('procurement')}>
                <Download className="w-4 h-4 mr-1" /> Procurement
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('profitability')}>
                <Download className="w-4 h-4 mr-1" /> Profitability
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub Tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="procurement">Procurement</TabsTrigger>
          <TabsTrigger value="profitability">Profitability</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-blue-600 font-medium">PO Spend</span>
                </div>
                <p className="text-xl font-bold text-blue-900">
                  ฿{procurementMetrics.totalPOSpend.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs text-emerald-600 font-medium">Revenue</span>
                </div>
                <p className="text-xl font-bold text-emerald-900">
                  ฿{profitabilityMetrics.totalRevenue.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <span className="text-xs text-purple-600 font-medium">Profit</span>
                </div>
                <p className="text-xl font-bold text-purple-900">
                  ฿{profitabilityMetrics.totalProfit.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-amber-600" />
                  <span className="text-xs text-amber-600 font-medium">Margin</span>
                </div>
                <p className="text-xl font-bold text-amber-900">
                  {profitabilityMetrics.profitMargin.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-cyan-50 to-cyan-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Scale className="w-4 h-4 text-cyan-600" />
                  <span className="text-xs text-cyan-600 font-medium">Weight (kg)</span>
                </div>
                <p className="text-xl font-bold text-cyan-900">
                  {procurementMetrics.totalWeightPurchased.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-50 to-rose-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Truck className="w-4 h-4 text-rose-600" />
                  <span className="text-xs text-rose-600 font-medium">Vendor Cost</span>
                </div>
                <p className="text-xl font-bold text-rose-900">
                  ฿{profitabilityMetrics.totalVendorCost.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue vs Cost vs Profit Trend */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Monthly Performance Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value, name) =>
                          name === 'margin' ? `${value}%` : `฿${value?.toLocaleString()}`
                        }
                      />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="revenue"
                        name="Revenue"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="poSpend"
                        name="PO Spend"
                        fill="#f59e0b"
                        radius={[4, 4, 0, 0]}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="profit"
                        name="Profit"
                        stroke="#10b981"
                        strokeWidth={2}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Weight Allocation */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Weight Allocation by PO</CardTitle>
                <CardDescription>Allocated vs Remaining weight per Purchase Order</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weightAllocationData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                      <Tooltip formatter={(value) => `${value} kg`} />
                      <Legend />
                      <Bar dataKey="allocated" name="Allocated" stackId="a" fill="#10b981" />
                      <Bar dataKey="remaining" name="Remaining" stackId="a" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
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
        </TabsContent>

        {/* Procurement Tab */}
        <TabsContent value="procurement" className="space-y-6 mt-6">
          {/* PO Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Total POs</p>
                <p className="text-2xl font-bold">{procurementMetrics.totalPOs}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Total Spend</p>
                <p className="text-2xl font-bold text-blue-600">
                  ฿{procurementMetrics.totalPOSpend.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Avg Cost/kg</p>
                <p className="text-2xl font-bold text-amber-600">
                  ฿{procurementMetrics.avgCostPerKg.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Allocation Rate</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {procurementMetrics.allocationRate.toFixed(1)}%
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
                        <td className="p-3 text-right">
                          ฿{(po.total_amount || 0).toLocaleString()}
                        </td>
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
        </TabsContent>

        {/* Profitability Tab */}
        <TabsContent value="profitability" className="space-y-6 mt-6">
          {/* Profitability Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm bg-emerald-50">
              <CardContent className="p-4">
                <p className="text-sm text-emerald-600">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-900">
                  ฿{profitabilityMetrics.totalRevenue.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-rose-50">
              <CardContent className="p-4">
                <p className="text-sm text-rose-600">Vendor Costs</p>
                <p className="text-2xl font-bold text-rose-900">
                  ฿{profitabilityMetrics.totalVendorCost.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-purple-50">
              <CardContent className="p-4">
                <p className="text-sm text-purple-600">Net Profit</p>
                <p className="text-2xl font-bold text-purple-900">
                  ฿{profitabilityMetrics.totalProfit.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-blue-50">
              <CardContent className="p-4">
                <p className="text-sm text-blue-600">Profit Margin</p>
                <p className="text-2xl font-bold text-blue-900">
                  {profitabilityMetrics.profitMargin.toFixed(1)}%
                </p>
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
                  {profitabilityMetrics.avgRevenuePerOrder.toLocaleString(undefined, {
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
                  {profitabilityMetrics.avgCostPerOrder.toLocaleString(undefined, {
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
                  {profitabilityMetrics.avgProfitPerOrder.toLocaleString(undefined, {
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
        </TabsContent>

        {/* Vendors Tab */}
        <TabsContent value="vendors" className="space-y-6 mt-6">
          {/* Vendor Spend Chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Vendor Spend Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={vendorPerformance.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="totalSpend"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {vendorPerformance.slice(0, 6).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `฿${value.toLocaleString()}`} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

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
                    {vendorPerformance.map((vendor, i) => (
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
