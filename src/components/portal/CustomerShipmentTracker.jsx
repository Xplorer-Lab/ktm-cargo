import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  Plane,
  AlertTriangle,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const TRACKING_STEPS = [
  { status: 'pending', label: 'Order Placed', icon: Clock },
  { status: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { status: 'picked_up', label: 'Picked Up', icon: Package },
  { status: 'in_transit', label: 'In Transit', icon: Plane },
  { status: 'customs', label: 'Customs', icon: AlertTriangle },
  { status: 'delivered', label: 'Delivered', icon: CheckCircle },
];

const STATUS_INDEX = {
  pending: 0,
  confirmed: 1,
  picked_up: 2,
  in_transit: 3,
  customs: 4,
  delivered: 5,
  cancelled: -1,
};

export default function CustomerShipmentTracker({ customer }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShipment, setSelectedShipment] = useState(null);

  const { data: shipments = [] } = useQuery({
    queryKey: ['customer-shipments-track', customer?.id, customer?.name],
    queryFn: async () => {
      if (customer?.id) {
        return db.shipments.filter({ customer_id: customer.id }, '-created_date');
      } else if (customer?.name) {
        return db.shipments.filter({ customer_name: customer.name }, '-created_date');
      }
      return [];
    },
    enabled: !!(customer?.id || customer?.name),
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      // Search by tracking number
      const results = await db.shipments.filter({ tracking_number: searchQuery.trim() });
      if (results.length > 0) {
        setSelectedShipment(results[0]);
        toast.success('Shipment found');
      } else {
        // Try partial match in existing shipments
        const found = shipments.find(
          (s) =>
            s.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.id?.includes(searchQuery)
        );
        if (found) {
          setSelectedShipment(found);
          toast.success('Shipment found');
        } else {
          setSelectedShipment(null);
          toast.error('No shipment found with that tracking number');
        }
      }
    } catch (error) {
      console.error('Failed to search shipment:', error);
      toast.error('Failed to search. Please try again.');
    }
  };

  const activeShipments = shipments.filter((s) => !['delivered', 'cancelled'].includes(s.status));

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Track Your Shipment
          </CardTitle>
          <CardDescription>Enter your tracking number to see real-time status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Enter tracking number (e.g., TRK-ABC123)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="text-lg"
            />
            <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700 px-6">
              Track
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Selected Shipment Details */}
      {selectedShipment && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedShipment.tracking_number || `SHP-${selectedShipment.id?.slice(-6)}`}
                </CardTitle>
                <CardDescription>{selectedShipment.items_description || 'Package'}</CardDescription>
              </div>
              <Badge
                className={
                  selectedShipment.status === 'delivered'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-blue-100 text-blue-700'
                }
              >
                {selectedShipment.status?.replace('_', ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Progress Tracker */}
            <div className="relative">
              <div className="flex items-center justify-between mb-8">
                {TRACKING_STEPS.map((step, idx) => {
                  const currentIdx = STATUS_INDEX[selectedShipment.status] || 0;
                  const isComplete = idx <= currentIdx;
                  const isCurrent = idx === currentIdx;
                  const StepIcon = step.icon;

                  return (
                    <div key={step.status} className="flex flex-col items-center relative z-10">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isComplete ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'
                          } ${isCurrent ? 'ring-4 ring-blue-200' : ''}`}
                      >
                        <StepIcon className="w-5 h-5" />
                      </div>
                      <span
                        className={`text-xs mt-2 text-center ${isComplete ? 'text-blue-600 font-medium' : 'text-slate-400'}`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Progress Line */}
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200 -z-0">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${(STATUS_INDEX[selectedShipment.status] / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* Shipment Details */}
            <div className="grid md:grid-cols-2 gap-6 mt-8 pt-6 border-t">
              <div className="space-y-4">
                <h4 className="font-medium text-slate-900">Shipment Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Weight</span>
                    <span className="font-medium">{selectedShipment.weight_kg} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Service</span>
                    <span className="font-medium">
                      {selectedShipment.service_type?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Order Date</span>
                    <span className="font-medium">
                      {selectedShipment.created_date &&
                        format(new Date(selectedShipment.created_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  {selectedShipment.estimated_delivery && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Est. Delivery</span>
                      <span className="font-medium text-blue-600">
                        {format(new Date(selectedShipment.estimated_delivery), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-slate-900">Route</h4>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">Bangkok</span>
                    </div>
                    <p className="text-xs text-slate-500 ml-6">
                      {selectedShipment.pickup_address || 'Pickup location'}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-medium">Yangon</span>
                    </div>
                    <p className="text-xs text-slate-500 ml-6">
                      {selectedShipment.delivery_address || 'Delivery location'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-500">Total Amount</span>
                  <p className="text-2xl font-bold">
                    ฿{selectedShipment.total_amount?.toLocaleString()}
                  </p>
                </div>
                <Badge
                  className={
                    selectedShipment.payment_status === 'paid'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }
                >
                  {selectedShipment.payment_status === 'paid' ? 'Paid' : 'Payment Pending'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Shipments List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Your Active Shipments</CardTitle>
        </CardHeader>
        <CardContent>
          {activeShipments.length > 0 ? (
            <div className="space-y-3">
              {activeShipments.map((shipment) => (
                <button
                  key={shipment.id}
                  onClick={() => setSelectedShipment(shipment)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${selectedShipment?.id === shipment.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-200'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {shipment.tracking_number || `SHP-${shipment.id?.slice(-6)}`}
                      </p>
                      <p className="text-sm text-slate-500">
                        {shipment.items_description?.slice(0, 30) || 'Package'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{shipment.status?.replace('_', ' ')}</Badge>
                    <p className="text-xs text-slate-500 mt-1">{shipment.weight_kg} kg</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Truck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No active shipments to track</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
