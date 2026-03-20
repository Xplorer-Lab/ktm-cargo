import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FileText,
  Printer,
  Package,
  Search,
  CheckCircle,
  Clock,
  ArrowLeft,
  Filter,
  FileCheck,
  Plane,
  ClipboardList,
  AlertTriangle,
  RefreshCw,
  Truck,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { printDocument } from '@/domains/documents/documentPrinter';
import CommercialInvoiceTemplate from '@/components/documents/templates/CommercialInvoiceTemplate';
import PackingListTemplate from '@/components/documents/templates/PackingListTemplate';
import AWBTemplate from '@/components/documents/templates/AWBTemplate';
import CustomsDeclarationTemplate from '@/components/documents/templates/CustomsDeclarationTemplate';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  picked_up: { label: 'Picked Up', color: 'bg-indigo-100 text-indigo-800', icon: Package },
  in_transit: { label: 'In Transit', color: 'bg-cyan-100 text-cyan-800', icon: Truck },
  customs: { label: 'Customs', color: 'bg-purple-100 text-purple-800', icon: FileCheck },
  delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-800', icon: AlertTriangle },
};

const DOCUMENT_TYPES = [
  {
    id: 'commercial_invoice',
    label: 'Commercial Invoice',
    icon: FileText,
    description: 'Invoice for customs and payment',
  },
  {
    id: 'packing_list',
    label: 'Packing List',
    icon: ClipboardList,
    description: 'List of items and quantities',
  },
  {
    id: 'air_waybill',
    label: 'Air Waybill',
    icon: Plane,
    description: 'Shipping contract document',
  },
  {
    id: 'customs_declaration',
    label: 'Customs Declaration',
    icon: FileCheck,
    description: 'Export/import declaration',
  },
];

import { useErrorHandler } from '@/hooks/useErrorHandler';

export default function ShipmentDocuments() {
  const [selectedShipmentId, setSelectedShipmentId] = useState(null);
  const [activeDoc, setActiveDoc] = useState('commercial_invoice');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedShipments, setSelectedShipments] = useState([]);
  const [generatedDocs, setGeneratedDocs] = useState(new Map());

  const { handleError } = useErrorHandler();

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => db.shipments.list('-created_date', 200),
    onError: (err) => handleError(err, 'Failed to fetch shipments'),
  });

  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const list = await db.companySettings.list();
      return list[0] || null;
    },
    onError: (err) => handleError(err, 'Failed to fetch company settings'),
  });

  // Filter eligible shipments
  const eligibleShipments = useMemo(() => {
    return shipments.filter((s) => {
      // Must be confirmed or later
      if (!['confirmed', 'picked_up', 'in_transit', 'customs', 'delivered'].includes(s.status)) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          s.tracking_number?.toLowerCase().includes(query) ||
          s.customer_name?.toLowerCase().includes(query) ||
          s.items_description?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [shipments, statusFilter, searchQuery]);

  const selectedShipment = shipments.find((s) => s.id === selectedShipmentId);

  // Stats
  const stats = useMemo(() => {
    const total = eligibleShipments.length;
    const needsDocs = eligibleShipments.filter(
      (s) => !generatedDocs.get(s.id) || generatedDocs.get(s.id).size < 4
    ).length;
    const inTransit = eligibleShipments.filter((s) => s.status === 'in_transit').length;
    const customs = eligibleShipments.filter((s) => s.status === 'customs').length;
    return { total, needsDocs, inTransit, customs };
  }, [eligibleShipments, generatedDocs]);

  const handlePrintDocument = (docType, shipment) => {
    const templates = new Map([
      ['commercial_invoice', CommercialInvoiceTemplate],
      ['packing_list', PackingListTemplate],
      ['air_waybill', AWBTemplate],
      ['customs_declaration', CustomsDeclarationTemplate],
    ]);

    const Component = templates.get(docType);
    if (Component) {
      printDocument(Component, {
        data: { shipment },
        settings: companySettings,
      });
    } else {
      toast.error('Document template not found');
    }
  };

  const handleGenerateDoc = (shipmentId, docType) => {
    setGeneratedDocs((prev) => {
      const nextMap = new Map(prev);
      const currentDocs = nextMap.get(shipmentId) || new Set();
      nextMap.set(shipmentId, new Set([...currentDocs, docType]));
      return nextMap;
    });
    toast.success(`${DOCUMENT_TYPES.find((d) => d.id === docType)?.label} generated`);
  };

  const handleGenerateAllDocs = (shipmentId) => {
    const allDocs = new Set(DOCUMENT_TYPES.map((doc) => doc.id));
    setGeneratedDocs((prev) => {
      const nextMap = new Map(prev);
      nextMap.set(shipmentId, allDocs);
      return nextMap;
    });
    toast.success('All documents generated');
  };

  const handleBatchPrint = () => {
    if (selectedShipments.length === 0) {
      toast.error('Select shipments to print');
      return;
    }
    selectedShipments.forEach((id) => {
      const shipment = shipments.find((s) => s.id === id);
      if (shipment) {
        handlePrintDocument(activeDoc, shipment);
      }
    });
    toast.success(`Printing ${selectedShipments.length} documents`);
  };

  const toggleShipmentSelection = (id) => {
    setSelectedShipments((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllShipments = () => {
    if (selectedShipments.length === eligibleShipments.length) {
      setSelectedShipments([]);
    } else {
      setSelectedShipments(eligibleShipments.map((s) => s.id));
    }
  };

  const getDocStatus = (shipmentId) => {
    const docs = generatedDocs.get(shipmentId);
    const count = docs ? docs.size : 0;
    if (count === 0) return { label: 'Not Generated', color: 'bg-slate-100 text-slate-600' };
    if (count < 4) return { label: `${count}/4 Docs`, color: 'bg-amber-100 text-amber-800' };
    return { label: 'Complete', color: 'bg-emerald-100 text-emerald-800' };
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Shipments')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Shipping Documents</h1>
              <p className="text-slate-500 mt-1">
                Generate, preview and print shipping documentation
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {selectedShipments.length > 0 && (
              <Button onClick={handleBatchPrint} className="bg-blue-600 hover:bg-blue-700">
                <Printer className="w-4 h-4 mr-2" />
                Print Selected ({selectedShipments.length})
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Eligible Shipments</p>
                  <p className="text-xl font-bold text-slate-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Need Documents</p>
                  <p className="text-xl font-bold text-amber-600">{stats.needsDocs}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <Truck className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">In Transit</p>
                  <p className="text-xl font-bold text-cyan-600">{stats.inTransit}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileCheck className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">At Customs</p>
                  <p className="text-xl font-bold text-purple-600">{stats.customs}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Shipment Selection */}
          <div className="space-y-4">
            {/* Search and Filters */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search tracking, customer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="picked_up">Picked Up</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="customs">At Customs</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={
                        selectedShipments.length === eligibleShipments.length &&
                        eligibleShipments.length > 0
                      }
                      onCheckedChange={selectAllShipments}
                    />
                    <span className="text-sm text-slate-600">Select All</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {eligibleShipments.length} shipments
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Shipment List */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Select Shipment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-8 text-slate-500">Loading...</div>
                ) : eligibleShipments.length > 0 ? (
                  eligibleShipments.map((shipment) => {
                    const statusConfig = STATUS_CONFIG[shipment.status] || STATUS_CONFIG.pending;
                    const docStatus = getDocStatus(shipment.id);
                    const isSelected = selectedShipmentId === shipment.id;
                    const isChecked = selectedShipments.includes(shipment.id);

                    return (
                      <div
                        key={shipment.id}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-blue-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleShipmentSelection(shipment.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div
                            className="flex-1 min-w-0"
                            onClick={() => setSelectedShipmentId(shipment.id)}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-slate-900 truncate">
                                {shipment.tracking_number || 'Pending'}
                              </span>
                              <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                            </div>
                            <p className="text-sm text-slate-600 truncate">
                              {shipment.customer_name}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-slate-500">
                                {shipment.weight_kg} kg • ฿{shipment.total_amount?.toLocaleString()}
                              </span>
                              <Badge className={docStatus.color} variant="outline">
                                {docStatus.label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No shipments found</p>
                    <p className="text-xs mt-1">Adjust your filters or search</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Document Preview */}
          <div className="lg:col-span-2 space-y-4">
            {selectedShipment ? (
              <>
                {/* Shipment Summary */}
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-xl">
                          <Package className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h2 className="font-bold text-lg">{selectedShipment.tracking_number}</h2>
                          <p className="text-slate-500">{selectedShipment.customer_name}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>
                            {selectedShipment.created_date
                              ? format(new Date(selectedShipment.created_date), 'MMM d, yyyy')
                              : '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="w-4 h-4 text-slate-400" />
                          <span>{selectedShipment.weight_kg} kg</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-slate-400" />
                          <span>฿{selectedShipment.total_amount?.toLocaleString()}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleGenerateAllDocs(selectedShipment.id)}
                        variant="outline"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Generate All Docs
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Document Types Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {DOCUMENT_TYPES.map((doc) => {
                    const Icon = doc.icon;
                    const shipmentDocs = generatedDocs.get(selectedShipment.id);
                    const isGenerated = shipmentDocs ? shipmentDocs.has(doc.id) : false;
                    const isActive = activeDoc === doc.id;

                    return (
                      <Card
                        key={doc.id}
                        className={`border-2 cursor-pointer transition-all ${
                          isActive
                            ? 'border-blue-500 bg-blue-50'
                            : isGenerated
                              ? 'border-emerald-300 bg-emerald-50'
                              : 'border-slate-200 hover:border-blue-200'
                        }`}
                        onClick={() => setActiveDoc(doc.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon
                              className={`w-4 h-4 ${isActive ? 'text-blue-600' : isGenerated ? 'text-emerald-600' : 'text-slate-500'}`}
                            />
                            {isGenerated && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                          </div>
                          <p className="font-medium text-sm">{doc.label}</p>
                          <p className="text-xs text-slate-500 mt-1">{doc.description}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Document Preview */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between border-b">
                    <div>
                      <CardTitle className="text-lg">
                        {DOCUMENT_TYPES.find((d) => d.id === activeDoc)?.label}
                      </CardTitle>
                      <CardDescription>Preview and print document</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleGenerateDoc(selectedShipment.id, activeDoc)}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Generate
                      </Button>
                      <Button
                        onClick={() => handlePrintDocument(activeDoc, selectedShipment)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        Print
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="bg-white border-t min-h-[600px] overflow-auto">
                      <div className="p-6">
                        <DocumentPreview
                          type={activeDoc}
                          shipment={selectedShipment}
                          companySettings={companySettings}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-24 text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">Select a Shipment</h3>
                  <p className="text-slate-500">
                    Choose a shipment from the list to preview and generate documents
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentPreview({ type, shipment, companySettings }) {
  const props = { data: { shipment }, settings: companySettings };

  // We wrap the template in a scale-down container for preview
  const PreviewWrapper = ({ children }) => (
    <div className="origin-top scale-[0.6] md:scale-[0.7] lg:scale-[0.8] transform-gpu bg-white shadow-lg">
      {children}
    </div>
  );

  switch (type) {
    case 'commercial_invoice':
      return (
        <PreviewWrapper>
          <CommercialInvoiceTemplate {...props} />
        </PreviewWrapper>
      );
    case 'packing_list':
      return (
        <PreviewWrapper>
          <PackingListTemplate {...props} />
        </PreviewWrapper>
      );
    case 'air_waybill':
      return (
        <PreviewWrapper>
          <AWBTemplate {...props} />
        </PreviewWrapper>
      );
    case 'customs_declaration':
      return (
        <PreviewWrapper>
          <CustomsDeclarationTemplate {...props} />
        </PreviewWrapper>
      );
    default:
      return null;
  }
}
