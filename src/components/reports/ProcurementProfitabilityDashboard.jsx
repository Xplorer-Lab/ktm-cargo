import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Filter, Download } from 'lucide-react';
import {
  parseISO,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  subMonths,
  eachMonthOfInterval,
  format,
} from 'date-fns';
import {
  useProcurementMetrics,
  useProfitabilityMetrics,
  useVendorPerformance,
  useOrderProfitability,
  useWeightAllocation,
} from '@/hooks/reports';
import { OverviewTabContent } from './procurementDashboard/OverviewTabContent';
import { ProcurementTabContent } from './procurementDashboard/ProcurementTabContent';
import { ProfitabilityTabContent } from './procurementDashboard/ProfitabilityTabContent';
import { VendorsTabContent } from './procurementDashboard/VendorsTabContent';

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

  // Filtered datasets
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

  // Hooks
  const procurementMetrics = useProcurementMetrics(filteredPOs);
  const profitabilityMetrics = useProfitabilityMetrics(filteredShipments, filteredShoppingOrders);
  const orderProfitability = useOrderProfitability(filteredShipments, filteredShoppingOrders);
  const weightAllocationData = useWeightAllocation(filteredPOs);

  // Monthly trend — uses raw data for consistency across filters
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
        return isWithinInterval(parseISO(po.created_date), {
          start: monthStart,
          end: monthEnd,
        });
      });

      const monthShipments = shipments.filter((s) => {
        if (!s.created_date) return false;
        return isWithinInterval(parseISO(s.created_date), {
          start: monthStart,
          end: monthEnd,
        });
      });

      const monthShopping = shoppingOrders.filter((o) => {
        if (!o.created_date) return false;
        return isWithinInterval(parseISO(o.created_date), {
          start: monthStart,
          end: monthEnd,
        });
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

  // Export handler
  const handleExport = (type) => {
    let csv, filename;

    if (type === 'procurement') {
      csv = [
        'PO Number,Vendor,Total Amount,Weight (kg),Cost/kg,Status,Date',
        ...filteredPOs.map(
          (po) =>
            `${po.po_number},${po.vendor_name || ''},${po.total_amount || 0},${po.total_weight_kg || 0},${po.cost_per_kg || 0},${po.status},${po.created_date || ''}`
        ),
      ];
      filename = 'procurement_report.csv';
    } else if (type === 'profitability') {
      csv = [
        'Order Number,Type,Customer,Vendor,Revenue,Vendor Cost,Profit,Margin %,Date',
        ...orderProfitability.map((o) => {
          const margin = o.revenue > 0 ? ((o.profit / o.revenue) * 100).toFixed(1) : 0;
          return `${o.orderNumber},${o.type},${o.customer},${o.vendor},${o.revenue},${o.vendorCost},${o.profit},${margin}%,${o.date || ''}`;
        }),
      ];
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

        <TabsContent value="overview" className="mt-6">
          <OverviewTabContent
            filteredPOs={filteredPOs}
            monthlyTrends={monthlyTrends}
            weightAllocationData={weightAllocationData}
            profitabilityMetrics={profitabilityMetrics}
          />
        </TabsContent>

        <TabsContent value="procurement" className="mt-6">
          <ProcurementTabContent filteredPOs={filteredPOs} />
        </TabsContent>

        <TabsContent value="profitability" className="mt-6">
          <ProfitabilityTabContent
            filteredShipments={filteredShipments}
            filteredShoppingOrders={filteredShoppingOrders}
          />
        </TabsContent>

        <TabsContent value="vendors" className="mt-6">
          <VendorsTabContent filteredPOs={filteredPOs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
