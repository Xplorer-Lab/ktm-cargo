import React, { useState, useMemo } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import SegmentCard from '@/components/customers/SegmentCard';
import CustomerSegmentTable from '@/components/customers/CustomerSegmentTable';
import CampaignForm from '@/components/customers/CampaignForm';
import SegmentBuilder, { evaluateCustomerCriteria } from '@/components/segments/SegmentBuilder';
import CampaignLauncher from '@/components/segments/CampaignLauncher';
import { segmentCustomers } from '@/components/customers/CustomerSegmentationEngine';
import {
  Users,
  Search,
  Filter,
  Megaphone,
  Plus,
  Target,
  TrendingUp,
  TrendingDown,
  Star,
  Clock,
  UserPlus,
  Mail,
  Send,
  BarChart3,
  Eye,
  CheckCircle,
  Pencil,
  Trash2,
  Zap,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format, subDays, differenceInDays } from 'date-fns';
import { useUser } from '@/components/auth/UserContext';
import { hasPermission } from '@/components/auth/RolePermissions';

export default function CustomerSegments() {
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [showSegmentBuilder, setShowSegmentBuilder] = useState(false);
  const [showCampaignLauncher, setShowCampaignLauncher] = useState(false);
  const [editingSegment, setEditingSegment] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [valueTierFilter, setValueTierFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('segments');
  const [campaignToDelete, setCampaignToDelete] = useState(null);

  const queryClient = useQueryClient();
  const { user } = useUser();

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => db.customers.list('-created_date'),
  });

  const { data: shipments = [], isLoading: shipmentsLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => db.shipments.list('-created_date', 500),
  });

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => db.campaigns.list('-created_date'),
  });

  const { data: customSegments = [] } = useQuery({
    queryKey: ['custom-segments'],
    queryFn: () => db.customSegments.list(),
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data) => {
      // Validate campaign data before creating
      const { campaignSchema } = await import('@/lib/schemas');
      const validatedData = campaignSchema.parse(data);
      return db.campaigns.create(validatedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setShowCampaignForm(false);
      setSelectedCustomers([]);
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: ({ id, data }) => db.campaigns.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: (id) => {
      // Check permission before deleting
      if (!hasPermission(user, 'manage_campaigns')) {
        throw new Error('You do not have permission to delete campaigns');
      }
      return db.campaigns.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setCampaignToDelete(null);
      toast.success('Campaign deleted successfully');
    },
  });

  const createSegmentMutation = useMutation({
    mutationFn: (data) => db.customSegments.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-segments'] });
      setShowSegmentBuilder(false);
      toast.success('Segment created');
    },
  });

  const updateSegmentMutation = useMutation({
    mutationFn: ({ id, data }) => db.customSegments.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-segments'] });
      setShowSegmentBuilder(false);
      setEditingSegment(null);
      toast.success('Segment updated');
    },
  });

  const deleteSegmentMutation = useMutation({
    mutationFn: (id) => db.customSegments.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-segments'] });
      toast.success('Segment deleted');
    },
  });

  const isLoading = customersLoading || shipmentsLoading;

  // Calculate customer metrics using segmentation engine
  const customersWithMetrics = useMemo(() => {
    return segmentCustomers(customers, shipments);
  }, [customers, shipments]);

  // Filter customers based on segment and other filters
  const filteredCustomers = useMemo(() => {
    return customersWithMetrics.filter((c) => {
      // Custom segment filter
      if (selectedSegment && selectedSegment.startsWith('custom_')) {
        const segmentId = selectedSegment.replace('custom_', '');
        const segment = customSegments.find((s) => s.id === segmentId);
        if (segment?.criteria) {
          try {
            const criteria = JSON.parse(segment.criteria);
            return evaluateCustomerCriteria(c, criteria);
          } catch (e) {
            return true;
          }
        }
      }

      // Built-in segment filter
      if (selectedSegment && selectedSegment !== 'all') {
        if (
          selectedSegment === 'high_value' &&
          c.valueTier?.key !== 'high' &&
          c.valueTier?.key !== 'vip'
        )
          return false;
        if (selectedSegment === 'vip' && c.valueTier?.key !== 'vip') return false;
        if (selectedSegment === 'inactive' && c.behavioralSegment?.key !== 'lapsed') return false;
        if (selectedSegment === 'at_risk' && c.behavioralSegment?.key !== 'at_risk') return false;
        if (selectedSegment === 'new_customers' && c.behavioralSegment?.key !== 'new') return false;
        if (selectedSegment === 'loyal' && c.behavioralSegment?.key !== 'loyal') return false;
        if (['individual', 'online_shopper', 'sme_importer'].includes(selectedSegment)) {
          if (c.customer_type !== selectedSegment) return false;
        }
      }

      // Value tier filter
      if (valueTierFilter !== 'all' && c.valueTier?.key !== valueTierFilter) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          c.name?.toLowerCase().includes(query) ||
          c.phone?.includes(query) ||
          c.email?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [customersWithMetrics, selectedSegment, valueTierFilter, searchQuery, customSegments]);

  // Segment stats
  const segmentStats = useMemo(
    () => ({
      individual: customersWithMetrics.filter((c) => c.customer_type === 'individual'),
      online_shopper: customersWithMetrics.filter((c) => c.customer_type === 'online_shopper'),
      sme_importer: customersWithMetrics.filter((c) => c.customer_type === 'sme_importer'),
      high_value: customersWithMetrics.filter(
        (c) => c.valueTier?.key === 'high' || c.valueTier?.key === 'vip'
      ),
      vip: customersWithMetrics.filter((c) => c.valueTier?.key === 'vip'),
      inactive: customersWithMetrics.filter((c) => c.behavioralSegment?.key === 'lapsed'),
      at_risk: customersWithMetrics.filter((c) => c.behavioralSegment?.key === 'at_risk'),
      loyal: customersWithMetrics.filter((c) => c.behavioralSegment?.key === 'loyal'),
      new_customers: customersWithMetrics.filter((c) => c.behavioralSegment?.key === 'new'),
    }),
    [customersWithMetrics]
  );

  // Custom segment customer counts
  const customSegmentCounts = useMemo(() => {
    const counts = {};
    customSegments.forEach((segment) => {
      if (segment.criteria) {
        try {
          const criteria = JSON.parse(segment.criteria);
          counts[segment.id] = customersWithMetrics.filter((c) =>
            evaluateCustomerCriteria(c, criteria)
          ).length;
        } catch (e) {
          counts[segment.id] = 0;
        }
      } else {
        counts[segment.id] = 0;
      }
    });
    return counts;
  }, [customSegments, customersWithMetrics]);

  const handleSegmentSubmit = (data) => {
    if (editingSegment) {
      updateSegmentMutation.mutate({ id: editingSegment.id, data });
    } else {
      createSegmentMutation.mutate(data);
    }
  };

  const handleDeleteCampaign = () => {
    if (campaignToDelete) {
      deleteCampaignMutation.mutate(campaignToDelete.id);
    }
  };

  // Handle customer selection
  const handleSelectCustomer = (customerId, checked) => {
    if (checked) {
      setSelectedCustomers([...selectedCustomers, customerId]);
    } else {
      setSelectedCustomers(selectedCustomers.filter((id) => id !== customerId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedCustomers(filteredCustomers.map((c) => c.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const handleCreateCampaign = (campaignData) => {
    createCampaignMutation.mutate(campaignData);
  };

  const handleLaunchCampaign = (campaign) => {
    updateCampaignMutation.mutate({
      id: campaign.id,
      data: { ...campaign, status: 'active' },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Customer Segments</h1>
            <p className="text-slate-500 mt-1">Analyze and target customer groups</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {selectedCustomers.length > 0 && (
              <Button
                onClick={() => setShowCampaignLauncher(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Megaphone className="w-4 h-4 mr-2" />
                Launch Campaign ({selectedCustomers.length})
              </Button>
            )}
            <Button
              onClick={() => {
                setEditingSegment(null);
                setShowSegmentBuilder(true);
              }}
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Custom Segment
            </Button>
            <Button onClick={() => setShowCampaignForm(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="segments" className="gap-2">
              <Target className="w-4 h-4" />
              Segments
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2">
              <Megaphone className="w-4 h-4" />
              Campaigns
            </TabsTrigger>
          </TabsList>

          <TabsContent value="segments" className="space-y-6 mt-6">
            {/* Segment Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['individual', 'online_shopper', 'sme_importer'].map((segment) => (
                <SegmentCard
                  key={segment}
                  segment={segment}
                  customers={customers}
                  shipments={shipments}
                  onClick={setSelectedSegment}
                  selected={selectedSegment === segment}
                />
              ))}
            </div>

            {/* Behavioral Segments */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card
                className={`border-2 cursor-pointer transition-all hover:shadow-md ${selectedSegment === 'high_value'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-transparent'
                  }`}
                onClick={() => setSelectedSegment('high_value')}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 rounded-xl">
                    <Star className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">High Value</p>
                    <p className="text-sm text-slate-500">
                      {segmentStats.high_value.length} customers
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`border-2 cursor-pointer transition-all hover:shadow-md ${selectedSegment === 'loyal'
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-transparent'
                  }`}
                onClick={() => setSelectedSegment('loyal')}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-amber-100 rounded-xl">
                    <Star className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Loyal</p>
                    <p className="text-sm text-slate-500">{segmentStats.loyal.length} customers</p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`border-2 cursor-pointer transition-all hover:shadow-md ${selectedSegment === 'at_risk'
                    ? 'border-rose-500 bg-rose-50'
                    : 'border-transparent'
                  }`}
                onClick={() => setSelectedSegment('at_risk')}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-rose-100 rounded-xl">
                    <TrendingDown className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">At Risk</p>
                    <p className="text-sm text-slate-500">
                      {segmentStats.at_risk.length} customers
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`border-2 cursor-pointer transition-all hover:shadow-md ${selectedSegment === 'new_customers'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-transparent'
                  }`}
                onClick={() => setSelectedSegment('new_customers')}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <UserPlus className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">New</p>
                    <p className="text-sm text-slate-500">
                      {segmentStats.new_customers.length} customers
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Custom Segments */}
            {customSegments.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-500" />
                    Custom Segments
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customSegments
                    .filter((s) => s.is_active !== false)
                    .map((segment) => (
                      <Card
                        key={segment.id}
                        className={`border-2 cursor-pointer transition-all hover:shadow-md ${selectedSegment === `custom_${segment.id}`
                            ? `border-${segment.color || 'blue'}-500 bg-${segment.color || 'blue'}-50`
                            : 'border-transparent'
                          }`}
                        onClick={() => setSelectedSegment(`custom_${segment.id}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg bg-${segment.color || 'blue'}-100`}>
                                <Users className={`w-5 h-5 text-${segment.color || 'blue'}-600`} />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{segment.name}</p>
                                <p className="text-sm text-slate-500">
                                  {customSegmentCounts[segment.id] || 0} customers
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSegment(segment);
                                  setShowSegmentBuilder(true);
                                }}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-rose-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSegmentMutation.mutate(segment.id);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          {segment.description && (
                            <p className="text-xs text-slate-500 mt-2">{segment.description}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            )}

            {/* Filters & Search */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search customers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={valueTierFilter} onValueChange={setValueTierFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Value Tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="high">High Value</SelectItem>
                      <SelectItem value="medium">Medium Value</SelectItem>
                      <SelectItem value="low">New/Low Value</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedSegment && (
                    <Button variant="ghost" onClick={() => setSelectedSegment(null)}>
                      Clear Filter
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Selected Segment Info */}
            {selectedSegment && (
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    Viewing:{' '}
                    {selectedSegment.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {filteredCustomers.length} customers
                  </Badge>
                </div>
                <Button
                  onClick={() => {
                    setSelectedCustomers(filteredCustomers.map((c) => c.id));
                    setShowCampaignForm(true);
                  }}
                  size="sm"
                  className="bg-blue-600"
                >
                  <Megaphone className="w-4 h-4 mr-2" />
                  Target This Segment
                </Button>
              </div>
            )}

            {/* Customer Table */}
            {isLoading ? (
              <Skeleton className="h-96" />
            ) : (
              <CustomerSegmentTable
                customers={filteredCustomers}
                shipments={shipments}
                selectedCustomers={selectedCustomers}
                onSelectCustomer={handleSelectCustomer}
                onSelectAll={handleSelectAll}
              />
            )}
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6 mt-6">
            {/* Campaign Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-sm text-slate-500">Total Campaigns</p>
                  <p className="text-2xl font-bold text-slate-900">{campaigns.length}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-sm text-slate-500">Active</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {campaigns.filter((c) => c.status === 'active').length}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-sm text-slate-500">Total Sent</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-sm text-slate-500">Conversions</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {campaigns.reduce((sum, c) => sum + (c.conversion_count || 0), 0)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Campaigns List */}
            {campaigns.length > 0 ? (
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id} className="border-0 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div
                            className={`p-3 rounded-xl ${campaign.status === 'active'
                                ? 'bg-emerald-100'
                                : campaign.status === 'completed'
                                  ? 'bg-slate-100'
                                  : 'bg-blue-100'
                              }`}
                          >
                            <Megaphone
                              className={`w-5 h-5 ${campaign.status === 'active'
                                  ? 'text-emerald-600'
                                  : campaign.status === 'completed'
                                    ? 'text-slate-600'
                                    : 'text-blue-600'
                                }`}
                            />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{campaign.name}</h3>
                            <p className="text-sm text-slate-500">{campaign.description}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge variant="outline">
                                {campaign.target_segment?.replace('_', ' ')}
                              </Badge>
                              <Badge variant="outline">{campaign.campaign_type}</Badge>
                              {campaign.discount_percentage > 0 && (
                                <Badge className="bg-emerald-100 text-emerald-800">
                                  {campaign.discount_percentage}% off
                                </Badge>
                              )}
                              <Badge
                                className={
                                  campaign.status === 'active'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : campaign.status === 'completed'
                                      ? 'bg-slate-100 text-slate-800'
                                      : campaign.status === 'draft'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-blue-100 text-blue-800'
                                }
                              >
                                {campaign.status}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-slate-900">
                              {campaign.target_count || 0}
                            </p>
                            <p className="text-xs text-slate-500">Targeted</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600">
                              {campaign.sent_count || 0}
                            </p>
                            <p className="text-xs text-slate-500">Sent</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-emerald-600">
                              {campaign.conversion_count || 0}
                            </p>
                            <p className="text-xs text-slate-500">Converted</p>
                          </div>

                          <div className="flex flex-col gap-2">
                            {campaign.status === 'draft' && (
                              <Button
                                onClick={() => handleLaunchCampaign(campaign)}
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 w-full"
                              >
                                <Send className="w-4 h-4 mr-1" />
                                Launch
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => setCampaignToDelete(campaign)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-16 text-center">
                  <Megaphone className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No campaigns yet</h3>
                  <p className="text-slate-500 mb-6">Create your first marketing campaign</p>
                  <Button onClick={() => setShowCampaignForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Campaign
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Campaign Form Dialog */}
        <Dialog open={showCampaignForm} onOpenChange={setShowCampaignForm}>
          <DialogContent className="max-w-2xl p-0 bg-transparent border-0 shadow-none">
            <CampaignForm
              targetCount={selectedCustomers.length || filteredCustomers.length}
              onSubmit={handleCreateCampaign}
              onCancel={() => setShowCampaignForm(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Segment Builder Dialog */}
        <Dialog
          open={showSegmentBuilder}
          onOpenChange={(v) => {
            setShowSegmentBuilder(v);
            if (!v) setEditingSegment(null);
          }}
        >
          <DialogContent className="max-w-2xl p-0 bg-transparent border-0 shadow-none">
            <SegmentBuilder
              segment={editingSegment}
              onSubmit={handleSegmentSubmit}
              onCancel={() => {
                setShowSegmentBuilder(false);
                setEditingSegment(null);
              }}
              previewCount={editingSegment ? customSegmentCounts[editingSegment.id] : undefined}
            />
          </DialogContent>
        </Dialog>

        {/* Campaign Launcher Dialog */}
        <Dialog open={showCampaignLauncher} onOpenChange={setShowCampaignLauncher}>
          <DialogContent className="max-w-2xl p-0 bg-transparent border-0 shadow-none">
            <CampaignLauncher
              targetCustomers={
                selectedCustomers.length > 0
                  ? customersWithMetrics.filter((c) => selectedCustomers.includes(c.id))
                  : filteredCustomers
              }
              segment={selectedSegment ? { name: selectedSegment.replace('_', ' ') } : null}
              onClose={() => setShowCampaignLauncher(false)}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['campaigns'] });
                setShowCampaignLauncher(false);
                setSelectedCustomers([]);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!campaignToDelete} onOpenChange={() => setCampaignToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the campaign "
                {campaignToDelete?.name}" and remove it from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteCampaign}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
