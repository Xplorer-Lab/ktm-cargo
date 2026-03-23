import { useMemo } from 'react';
import { db } from '@/api/db';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  ArrowUpRight,
  BarChart3,
  Calendar as CalendarIcon,
  Receipt,
  Download,
  FileSpreadsheet,
  Megaphone,
  Crown,
  Star,
  Sparkles,
  AlertTriangle,
  Clock,
  Scale,
  ShoppingBag,
} from 'lucide-react';
import {
  AreaChart,
  Area,
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
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import {
  segmentCustomers,
  getSegmentSummary,
  getMarketingRecommendations,
} from '@/components/customers/CustomerSegmentationEngine';
import { useReportData, useFilteredData, useReportMetrics } from '@/hooks/reports/useReportMetrics';
import { useChartData } from '@/hooks/reports/useChartData';
import { useReportsFilters, useReportMutations } from '@/hooks/reports/useReportsFilters';
import { useExportCSV } from '@/hooks/reports/useExportCSV';
import ForecastTab from '@/components/reports/ForecastTab';
import ReportBuilder from '@/components/reports/ReportBuilder';
import ReportsList from '@/components/reports/ReportsList';
import { exportReport, sendReportEmail } from '@/components/reports/ReportExporter';
import ProcurementProfitabilityDashboard from '@/components/reports/ProcurementProfitabilityDashboard';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

export default function Reports() {
  const queryClient = useQueryClient();

  // Filters & state
  const {
    dateRange,
    setDateRange,
    activeTab,
    setActiveTab,
    expenseForm,
    setExpenseForm,
    showExpenseForm,
    setShowExpenseForm,
    showReportBuilder,
    setShowReportBuilder,
    editingReport,
    setEditingReport,
    runningReportId,
    setRunningReportId,
    sendingReportId,
    setSendingReportId,
  } = useReportsFilters();

  // Mutations
  const {
    createExpenseMutation,
    createReportMutation,
    updateReportMutation,
    deleteReportMutation,
  } = useReportMutations();

  // Data fetching
  const rawData = useReportData();
  const {
    shipments,
    shoppingOrders,
    customers,
    expenses,
    campaigns,
    customReports,
    servicePricing,
    purchaseOrders,
    vendors,
  } = rawData;

  // Filtered data
  const filteredData = useFilteredData(rawData, dateRange);
  const { filteredShipments, filteredOrders, filteredExpenses } = filteredData;

  // Metrics
  const metrics = useReportMetrics(rawData, filteredData);
  const {
    shoppingOrdersTotalRevenue,
    shoppingOrdersTotalVendorCost,
    shoppingOrdersTotalCargoCost,
    shoppingOrdersTrueProfit,
    totalRevenue,
    totalProfit,
    totalExpensesAmount,
    netProfit,
    totalWeight,
    avgOrderValue,
  } = metrics;

  // Chart data
  const chartData = useChartData(rawData, filteredData, dateRange);
  const {
    serviceChartData,
    dailyRevenue,
    monthlyComparison,
    campaignPerformance,
    expenseChartData,
  } = chartData;

  // CSV export
  const { exportToCSV, exportQuickCSV } = useExportCSV();

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

  // Reset expense form helper
  const resetExpenseForm = () => {
    setExpenseForm({
      title: '',
      category: 'other',
      amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
  };

  // Expense mutation with form reset
  const handleCreateExpense = (data) => {
    createExpenseMutation.mutate(data, {
      onSuccess: () => {
        setShowExpenseForm(false);
        resetExpenseForm();
      },
    });
  };

  // Get data for a specific report type
  const getReportData = (reportType) => {
    switch (reportType) {
      case 'shipments':
        return shipments;
      case 'customers':
        return customers;
      case 'campaigns':
        return campaigns;
      case 'expenses':
        return expenses;
      case 'pricing':
        return servicePricing;
      default:
        return [];
    }
  };

  const handleRunReport = async (report) => {
    setRunningReportId(report.id);
    try {
      const data = getReportData(report.report_type);
      const count = await exportReport(report, data);
      toast.success(`Exported ${count} records`);
    } catch {
      toast.error('Failed to export report');
    } finally {
      setRunningReportId(null);
    }
  };

  const handleSendReport = async (report) => {
    if (!report.recipients) {
      toast.error('No recipients configured');
      return;
    }
    setSendingReportId(report.id);
    try {
      const data = getReportData(report.report_type);
      const count = await sendReportEmail(report, data, report.recipients);
      await db.scheduledReports.update(report.id, { last_sent: new Date().toISOString() });
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      toast.success(`Report sent to ${count} recipient(s)`);
    } catch {
      toast.error('Failed to send report');
    } finally {
      setSendingReportId(null);
    }
  };

  const handleReportSubmit = (data) => {
    if (editingReport) {
      updateReportMutation.mutate({ id: editingReport.id, data });
    } else {
      createReportMutation.mutate(data);
    }
    setShowReportBuilder(false);
    setEditingReport(null);
  };

  const categoryLabels = {
    registration: 'Registration',
    legal: 'Legal',
    marketing: 'Marketing',
    operations: 'Operations',
    staff: 'Staff',
    rent: 'Rent',
    technology: 'Technology',
    cargo_cost: 'Cargo Cost',
    supplies: 'Supplies',
    other: 'Other',
  };

  // Quick export handler
  const handleQuickExport = (type) => {
    if (['customers', 'campaigns', 'pricing'].includes(type)) {
      exportQuickCSV(type, { customers, campaigns, servicePricing });
    } else {
      exportToCSV(type, { filteredShipments, dailyRevenue, filteredExpenses });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">
              Business Reports
            </h1>
            <p className="text-sm text-slate-500 mt-1">Comprehensive analytics and insights</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-1 sm:gap-2 text-xs sm:text-sm w-full sm:w-auto"
                >
                  <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">
                    {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
                  </span>
                  <span className="sm:hidden">Date Range</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => range && setDateRange(range)}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            <Select
              onValueChange={(v) => {
                const today = new Date();
                switch (v) {
                  case '7d':
                    setDateRange({ from: subDays(today, 7), to: today });
                    break;
                  case '30d':
                    setDateRange({ from: subDays(today, 30), to: today });
                    break;
                  case '90d':
                    setDateRange({ from: subDays(today, 90), to: today });
                    break;
                  case 'month':
                    setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
                    break;
                }
              }}
            >
              <SelectTrigger className="w-24 sm:w-32 text-xs sm:text-sm">
                <SelectValue placeholder="Quick" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={handleQuickExport}>
              <SelectTrigger className="w-28 sm:w-36 text-xs sm:text-sm">
                <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <SelectValue placeholder="Export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shipments">Shipments</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="expenses">Expenses</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => setShowExpenseForm(true)}
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Add </span>Expense
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto p-1 gap-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              Overview
            </TabsTrigger>
            <TabsTrigger value="forecast" className="gap-1 text-xs sm:text-sm">
              <Sparkles className="w-3 h-3" /> <span className="hidden sm:inline">Forecast</span>
              <span className="sm:hidden">AI</span>
            </TabsTrigger>
            <TabsTrigger value="revenue" className="text-xs sm:text-sm">
              Revenue
            </TabsTrigger>
            <TabsTrigger value="procurement" className="gap-1 text-xs sm:text-sm">
              <Scale className="w-3 h-3" /> <span className="hidden sm:inline">Procurement</span>
              <span className="sm:hidden">Proc</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Customers</span>
              <span className="sm:hidden">Cust</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Campaigns</span>
              <span className="sm:hidden">Camp</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Expenses</span>
              <span className="sm:hidden">Exp</span>
            </TabsTrigger>
            <TabsTrigger value="custom" className="gap-1 text-xs sm:text-sm">
              <FileSpreadsheet className="w-3 h-3" />{' '}
              <span className="hidden sm:inline">Custom</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-sm text-slate-500">Revenue</p>
                      <p className="text-lg sm:text-2xl font-bold text-slate-900">
                        ฿{totalRevenue.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 bg-emerald-100 rounded-xl">
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm col-span-2 sm:col-span-1">
                <CardContent className="p-3 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-sm text-slate-500">Shopping Revenue</p>
                      <p className="text-lg sm:text-2xl font-bold text-slate-900">
                        ฿{shoppingOrdersTotalRevenue.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 bg-purple-100 rounded-xl">
                      <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-slate-500 space-y-1 border-t pt-2">
                    <div className="flex justify-between">
                      <span>Vendor Paid:</span>
                      <span className="text-rose-600">
                        ฿{shoppingOrdersTotalVendorCost.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cargo Paid:</span>
                      <span className="text-rose-600">
                        ฿{shoppingOrdersTotalCargoCost.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>True Profit:</span>
                      <span className="text-emerald-600">
                        ฿{shoppingOrdersTrueProfit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-sm text-slate-500">Shipments</p>
                      <p className="text-lg sm:text-2xl font-bold text-slate-900">
                        {filteredShipments.length}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 bg-blue-100 rounded-xl">
                      <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-sm text-slate-500">Avg Order</p>
                      <p className="text-lg sm:text-2xl font-bold text-slate-900">
                        ฿{avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 bg-purple-100 rounded-xl">
                      <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-sm text-slate-500">Expenses</p>
                      <p className="text-lg sm:text-2xl font-bold text-rose-600">
                        ฿{totalExpensesAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 bg-rose-100 rounded-xl">
                      <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm col-span-2 sm:col-span-1">
                <CardContent className="p-3 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-sm text-slate-500">Net Profit</p>
                      <p
                        className={`text-lg sm:text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                      >
                        ฿{netProfit.toLocaleString()}
                      </p>
                    </div>
                    <div
                      className={`p-2 sm:p-3 rounded-xl ${netProfit >= 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}
                    >
                      <DollarSign
                        className={`w-4 h-4 sm:w-5 sm:h-5 ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyRevenue}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <Tooltip formatter={(value) => `฿${value.toLocaleString()}`} />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#3b82f6"
                          fillOpacity={1}
                          fill="url(#colorRevenue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Revenue by Service Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={serviceChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {serviceChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `฿${value.toLocaleString()}`} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">6-Month Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyComparison}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="revenue"
                        name="Revenue (฿)"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="shipments"
                        name="Shipments"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Forecast Tab */}
          <TabsContent value="forecast" className="space-y-6">
            <ForecastTab shipments={shipments} shoppingOrders={shoppingOrders} />
          </TabsContent>

          {/* Procurement Tab */}
          <TabsContent value="procurement" className="space-y-6">
            <ProcurementProfitabilityDashboard
              purchaseOrders={purchaseOrders}
              shipments={shipments}
              shoppingOrders={shoppingOrders}
              vendors={vendors}
              customers={customers}
              dateRange={dateRange}
            />
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="border-0 shadow-sm lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Revenue Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <Tooltip formatter={(value) => `฿${value.toLocaleString()}`} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="shipments"
                          name="Cargo"
                          stroke="#3b82f6"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="shopping"
                          name="Shopping"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <p className="text-sm text-blue-600">Cargo Revenue</p>
                    <p className="text-2xl font-bold text-blue-900">
                      ฿
                      {filteredShipments
                        .reduce((s, x) => s + (x.total_amount || 0), 0)
                        .toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-xl">
                    <p className="text-sm text-purple-600">Shopping Revenue</p>
                    <p className="text-2xl font-bold text-purple-900">
                      ฿
                      {filteredOrders
                        .reduce((s, x) => s + (x.total_amount || 0), 0)
                        .toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-xl">
                    <p className="text-sm text-emerald-600">Total Weight Shipped</p>
                    <p className="text-2xl font-bold text-emerald-900">
                      {totalWeight.toFixed(1)} kg
                    </p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-xl">
                    <p className="text-sm text-amber-600">Profit Margin</p>
                    <p className="text-2xl font-bold text-amber-900">
                      {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card className="border-0 shadow-sm bg-purple-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Crown className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-700">VIP Customers</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {segmentSummary.byValueTier.vip.count}
                      </p>
                      <p className="text-xs text-purple-600">
                        ฿{segmentSummary.byValueTier.vip.revenue.toLocaleString()} revenue
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-emerald-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <Star className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-emerald-700">High Value</p>
                      <p className="text-2xl font-bold text-emerald-900">
                        {segmentSummary.byValueTier.high.count}
                      </p>
                      <p className="text-xs text-emerald-600">
                        ฿{segmentSummary.byValueTier.high.revenue.toLocaleString()} revenue
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">Medium Value</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {segmentSummary.byValueTier.medium.count}
                      </p>
                      <p className="text-xs text-blue-600">
                        ฿{segmentSummary.byValueTier.medium.revenue.toLocaleString()} revenue
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-slate-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <Users className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-700">New/Low Value</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {segmentSummary.byValueTier.low.count}
                      </p>
                      <p className="text-xs text-slate-600">
                        ฿{segmentSummary.byValueTier.low.revenue.toLocaleString()} revenue
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Behavioral Segments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { icon: Crown, label: 'Loyal', key: 'loyal', color: 'amber' },
                    { icon: Sparkles, label: 'New', key: 'new', color: 'sky' },
                    { icon: ArrowUpRight, label: 'Returning', key: 'returning', color: 'green' },
                    { icon: AlertTriangle, label: 'At Risk', key: 'at_risk', color: 'rose' },
                    { icon: Clock, label: 'Lapsed', key: 'lapsed', color: 'gray' },
                  ].map(({ icon: Icon, label, key, color }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 text-${color}-500`} />
                        <span>{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-${color}-500`}
                            style={{
                              width: `${(segmentSummary.byBehavior[key].count / customers.length) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="font-bold w-8">
                          {segmentSummary.byBehavior[key].count}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-500" /> AI Marketing Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recommendations.length > 0 ? (
                    <div className="space-y-3">
                      {recommendations.map((rec, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg ${rec.priority === 'high' ? 'bg-rose-50 border border-rose-100' : 'bg-blue-50 border border-blue-100'}`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <Badge
                                className={
                                  rec.priority === 'high'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-blue-100 text-blue-800'
                                }
                              >
                                {rec.priority === 'high' ? 'High Priority' : rec.segment}
                              </Badge>
                              <p className="text-sm mt-1 text-slate-700">{rec.action}</p>
                            </div>
                            <span className="text-lg font-bold text-slate-900">
                              {rec.targetCount}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-slate-500 py-8">No recommendations available</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Customer Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={[
                            {
                              name: 'Individual',
                              value: segmentSummary.byType.individual.count,
                              color: '#3b82f6',
                            },
                            {
                              name: 'Online Shopper',
                              value: segmentSummary.byType.online_shopper.count,
                              color: '#8b5cf6',
                            },
                            {
                              name: 'SME Importer',
                              value: segmentSummary.byType.sme_importer.count,
                              color: '#f59e0b',
                            },
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          <Cell fill="#3b82f6" />
                          <Cell fill="#8b5cf6" />
                          <Cell fill="#f59e0b" />
                        </Pie>
                        <Tooltip />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Customer Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <span className="font-medium">Total Customers</span>
                      <span className="text-xl font-bold">{customers.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <span className="font-medium">Average Score</span>
                      <span className="text-xl font-bold text-blue-600">
                        {segmentSummary.totals.avgScore}/100
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <span className="font-medium">Avg Customer Value</span>
                      <span className="text-xl font-bold text-emerald-600">
                        ฿
                        {customers.length > 0
                          ? Math.round(
                              segmentSummary.totals.totalRevenue / customers.length
                            ).toLocaleString()
                          : 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-rose-50 rounded-xl">
                      <span className="font-medium">Customers Needing Attention</span>
                      <span className="text-xl font-bold text-rose-600">
                        {segmentSummary.byBehavior.at_risk.count +
                          segmentSummary.byBehavior.lapsed.count}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="border-0 shadow-sm lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Campaign Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {campaignPerformance.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={campaignPerformance} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 11 }}
                            width={100}
                          />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="sent" name="Sent" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                          <Bar
                            dataKey="conversions"
                            name="Conversions"
                            fill="#10b981"
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <Megaphone className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>No campaigns created yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Campaign Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <p className="text-sm text-blue-600">Total Campaigns</p>
                    <p className="text-2xl font-bold text-blue-900">{campaigns.length}</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-xl">
                    <p className="text-sm text-emerald-600">Active Campaigns</p>
                    <p className="text-2xl font-bold text-emerald-900">
                      {campaigns.filter((c) => c.status === 'active').length}
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-xl">
                    <p className="text-sm text-purple-600">Total Sent</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {campaigns.reduce((s, c) => s + (c.sent_count || 0), 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-xl">
                    <p className="text-sm text-amber-600">Total Conversions</p>
                    <p className="text-2xl font-bold text-amber-900">
                      {campaigns.reduce((s, c) => s + (c.conversion_count || 0), 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Expenses by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={expenseChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <Tooltip formatter={(value) => `฿${value.toLocaleString()}`} />
                        <Bar dataKey="value" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Recent Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredExpenses.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {filteredExpenses.slice(0, 8).map((expense) => (
                        <div
                          key={expense.id}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-slate-900">{expense.title}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {categoryLabels[expense.category] || expense.category}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {expense.date && format(new Date(expense.date), 'MMM d')}
                              </span>
                            </div>
                          </div>
                          <p className="font-semibold text-rose-600">
                            -฿{expense.amount?.toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <Receipt className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>No expenses in this period</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Custom Reports Tab */}
          <TabsContent value="custom" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Custom Reports</h2>
                <p className="text-sm text-slate-500">
                  Create and schedule custom reports with advanced filters
                </p>
              </div>
              <Button
                onClick={() => {
                  setEditingReport(null);
                  setShowReportBuilder(true);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Report
              </Button>
            </div>

            <ReportsList
              reports={customReports}
              onEdit={(report) => {
                setEditingReport(report);
                setShowReportBuilder(true);
              }}
              onDelete={(id) => deleteReportMutation.mutate(id)}
              onRun={handleRunReport}
              onSendNow={handleSendReport}
              runningReportId={runningReportId}
              sendingReportId={sendingReportId}
            />

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Quick Export</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <Button
                    variant="outline"
                    onClick={() =>
                      exportToCSV('shipments', {
                        filteredShipments,
                        dailyRevenue,
                        filteredExpenses,
                      })
                    }
                    className="flex-col h-auto py-4"
                  >
                    <Package className="w-5 h-5 mb-2" />
                    <span className="text-xs">Shipments</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      exportToCSV('revenue', { filteredShipments, dailyRevenue, filteredExpenses })
                    }
                    className="flex-col h-auto py-4"
                  >
                    <DollarSign className="w-5 h-5 mb-2" />
                    <span className="text-xs">Revenue</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      exportToCSV('expenses', { filteredShipments, dailyRevenue, filteredExpenses })
                    }
                    className="flex-col h-auto py-4"
                  >
                    <Receipt className="w-5 h-5 mb-2" />
                    <span className="text-xs">Expenses</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      exportQuickCSV('customers', { customers, campaigns, servicePricing })
                    }
                    className="flex-col h-auto py-4"
                  >
                    <Users className="w-5 h-5 mb-2" />
                    <span className="text-xs">Customers</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      exportQuickCSV('campaigns', { customers, campaigns, servicePricing })
                    }
                    className="flex-col h-auto py-4"
                  >
                    <Megaphone className="w-5 h-5 mb-2" />
                    <span className="text-xs">Campaigns</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      exportQuickCSV('pricing', { customers, campaigns, servicePricing })
                    }
                    className="flex-col h-auto py-4"
                  >
                    <FileSpreadsheet className="w-5 h-5 mb-2" />
                    <span className="text-xs">Pricing</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Expense Form Dialog */}
        <Dialog open={showExpenseForm} onOpenChange={setShowExpenseForm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Expense</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateExpense(expenseForm);
              }}
              className="space-y-4 mt-4"
            >
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={expenseForm.category}
                    onValueChange={(v) => setExpenseForm({ ...expenseForm, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (THB) *</Label>
                  <Input
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowExpenseForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Add Expense
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Report Builder Dialog */}
        <Dialog
          open={showReportBuilder}
          onOpenChange={(v) => {
            setShowReportBuilder(v);
            if (!v) setEditingReport(null);
          }}
        >
          <DialogContent className="max-w-2xl p-0 bg-transparent border-0 shadow-none">
            <ReportBuilder
              report={editingReport}
              onSubmit={handleReportSubmit}
              onCancel={() => {
                setShowReportBuilder(false);
                setEditingReport(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
