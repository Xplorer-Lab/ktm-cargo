import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Calculator,
  ClipboardCheck,
  FileText,
  Package,
  Plane,
  ShoppingBag,
  Truck,
  Users,
} from 'lucide-react';

const WORKFLOW_STAGES = [
  {
    id: 'inquiry',
    title: '1) Client Inquiry & Quote',
    description: 'Estimate product + cargo + last-mile pricing and align expected timeline.',
    icon: Calculator,
    links: [
      { label: 'Open Calculator', page: 'PriceCalculator' },
      { label: 'View Customers', page: 'Customers' },
    ],
  },
  {
    id: 'confirm',
    title: '2) Payment & Order Confirmation',
    description: 'Track confirmed shopping/cargo requests that are ready for execution.',
    icon: ClipboardCheck,
    links: [{ label: 'Open Shopping Intake', page: 'ShoppingOrders' }],
  },
  {
    id: 'thai',
    title: '3) Thai Buying / Collection',
    description: 'Manage purchasing, receiving, and collection at Thailand-side operations.',
    icon: ShoppingBag,
    links: [
      { label: 'Shopping Orders', page: 'ShoppingOrders' },
      { label: 'Vendors', page: 'Vendors' },
    ],
  },
  {
    id: 'booking',
    title: '4) Consolidation & Booking',
    description: 'Allocate loads, confirm carrier booking, and prepare shipment documents.',
    icon: Package,
    links: [
      { label: 'Procurement', page: 'Procurement' },
      { label: 'Shipment Documents', page: 'ShipmentDocuments' },
    ],
  },
  {
    id: 'transit',
    title: '5) Thailand to Myanmar Transit',
    description: 'Track active cross-border transport and border/customs progression.',
    icon: Plane,
    links: [{ label: 'Shipments', page: 'Shipments' }],
  },
  {
    id: 'delivery',
    title: '6) Myanmar Delivery & Last-mile',
    description: 'Monitor delivery completion and final handoff to end customers.',
    icon: Truck,
    links: [{ label: 'Shipments', page: 'Shipments' }],
  },
  {
    id: 'reconcile',
    title: '7) Accounting & After-sales',
    description: 'Reconcile invoices/payments and monitor post-delivery feedback metrics.',
    icon: FileText,
    links: [
      { label: 'Invoices', page: 'Invoices' },
      { label: 'Feedback Queue', page: 'Feedback' },
      { label: 'Feedback Analytics', page: 'FeedbackAnalytics' },
    ],
  },
];

function countByStatus(items, allowedStatuses) {
  return items.filter((item) => allowedStatuses.includes(item.status)).length;
}

export default function Operations() {
  const { data: shoppingOrders = [] } = useQuery({
    queryKey: ['shopping-orders'],
    queryFn: () => db.shoppingOrders.list('-created_date'),
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => db.shipments.list('-created_date'),
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => db.purchaseOrders.list('-created_date'),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['customer-invoices'],
    queryFn: () => db.customerInvoices.list('-created_date'),
  });

  const { data: feedback = [] } = useQuery({
    queryKey: ['feedback'],
    queryFn: () => db.feedback.list('-created_date'),
  });

  const counters = useMemo(() => {
    const inquiry =
      countByStatus(shoppingOrders, ['pending']) + countByStatus(shipments, ['pending']);

    const confirmed =
      shoppingOrders.filter(
        (order) =>
          ['deposit_paid', 'paid'].includes(order.payment_status) &&
          ['pending', 'purchasing'].includes(order.status)
      ).length + countByStatus(shipments, ['confirmed']);

    const thaiFulfillment = countByStatus(shoppingOrders, ['purchasing', 'purchased', 'received']);
    const booking = countByStatus(purchaseOrders, ['approved', 'sent', 'partial_received']);
    const transit = countByStatus(shipments, ['picked_up', 'in_transit', 'customs']);
    const delivery =
      countByStatus(shipments, ['delivered']) + countByStatus(shoppingOrders, ['delivered']);
    const reconcile =
      invoices.filter((inv) => !['paid', 'void'].includes(inv.status)).length +
      feedback.filter((item) => ['pending', 'submitted'].includes(item.status)).length;

    return {
      inquiry,
      confirmed,
      thaiFulfillment,
      booking,
      transit,
      delivery,
      reconcile,
    };
  }, [feedback, invoices, purchaseOrders, shipments, shoppingOrders]);

  const stageCounts = {
    inquiry: counters.inquiry,
    confirm: counters.confirmed,
    thai: counters.thaiFulfillment,
    booking: counters.booking,
    transit: counters.transit,
    delivery: counters.delivery,
    reconcile: counters.reconcile,
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-blue-700 font-semibold">
              Operations Console
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
              KTM Cargo Workflow Spine
            </h1>
            <p className="text-slate-600 mt-2 max-w-3xl">
              One canonical journey for staff operations: inquiry to reconciliation.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl('ClientPortal')}>
              <Button variant="outline">
                <Users className="w-4 h-4 mr-2" />
                Client Portal
              </Button>
            </Link>
            <Link to={createPageUrl('Dashboard')}>
              <Button>
                Open Legacy Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {WORKFLOW_STAGES.map((stage) => {
            const StageIcon = stage.icon;
            return (
              <Card key={stage.id} className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg text-slate-900">{stage.title}</CardTitle>
                      <CardDescription className="mt-2 text-sm">{stage.description}</CardDescription>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
                      <StageIcon className="w-5 h-5" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Active items</span>
                    <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100">
                      {stageCounts[stage.id] || 0}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {stage.links.map((link) => (
                      <Link key={`${stage.id}-${link.page}`} to={createPageUrl(link.page)}>
                        <Button variant="outline" size="sm">
                          {link.label}
                        </Button>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
