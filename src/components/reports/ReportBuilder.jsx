import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, FileSpreadsheet, Filter, SortAsc, Mail, Loader2 } from 'lucide-react';

const REPORT_TYPES = {
  shipments: {
    label: 'Shipments',
    columns: [
      'tracking_number',
      'customer_name',
      'service_type',
      'weight_kg',
      'total_amount',
      'profit',
      'status',
      'payment_status',
      'created_date',
    ],
    filters: ['status', 'service_type', 'payment_status', 'date_range'],
  },
  customers: {
    label: 'Customers',
    columns: [
      'name',
      'phone',
      'email',
      'customer_type',
      'total_shipments',
      'total_spent',
      'created_date',
    ],
    filters: ['customer_type', 'value_tier', 'date_range'],
  },
  revenue: {
    label: 'Revenue',
    columns: [
      'date',
      'shipment_revenue',
      'shopping_revenue',
      'total_revenue',
      'expenses',
      'profit',
    ],
    filters: ['date_range', 'service_type'],
  },
  campaigns: {
    label: 'Campaigns',
    columns: [
      'name',
      'campaign_type',
      'target_segment',
      'target_count',
      'sent_count',
      'conversion_count',
      'status',
    ],
    filters: ['status', 'campaign_type', 'date_range'],
  },
  expenses: {
    label: 'Expenses',
    columns: ['title', 'category', 'amount', 'date', 'notes'],
    filters: ['category', 'date_range'],
  },
  pricing: {
    label: 'Pricing',
    columns: [
      'service_type',
      'display_name',
      'cost_per_kg',
      'price_per_kg',
      'min_weight',
      'max_weight',
      'is_active',
    ],
    filters: ['is_active'],
  },
};

const FILTER_OPTIONS = {
  status: ['pending', 'confirmed', 'picked_up', 'in_transit', 'customs', 'delivered', 'cancelled'],
  service_type: [
    'cargo_small',
    'cargo_medium',
    'cargo_large',
    'shopping_small',
    'shopping_fashion',
    'shopping_bulk',
    'express',
    'standard',
  ],
  payment_status: ['unpaid', 'partial', 'paid'],
  customer_type: ['individual', 'online_shopper', 'sme_importer'],
  value_tier: ['vip', 'high', 'medium', 'low'],
  campaign_type: ['discount', 'promotion', 'referral', 'announcement', 'loyalty'],
  category: [
    'registration',
    'legal',
    'marketing',
    'operations',
    'staff',
    'rent',
    'technology',
    'cargo_cost',
    'supplies',
    'other',
  ],
};

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reportSchema } from '@/domains/core/schemas';
import { useErrorHandler } from '@/hooks/useErrorHandler';

export default function ReportBuilder({ report, onSubmit, onCancel }) {
  const { handleError, handleValidationError } = useErrorHandler();

  const form = useForm({
    resolver: zodResolver(reportSchema.partial()),
    defaultValues: {
      name: report?.name || '',
      report_type: report?.report_type || 'shipments',
      schedule: report?.schedule || 'none',
      schedule_day: report?.schedule_day || 1,
      recipients: report?.recipients || '',
      format: report?.format || 'csv',
      sort_by: report?.sort_by || 'created_date',
      sort_order: report?.sort_order || 'desc',
      is_active: report?.is_active !== false,
    },
  });

  const [selectedColumns, setSelectedColumns] = useState([]);
  const [filters, setFilters] = useState([]);
  const currentReportType = form.watch('report_type');

  useEffect(() => {
    if (report) {
      if (report.columns) {
        try {
          setSelectedColumns(JSON.parse(report.columns));
        } catch (_e) {
          setSelectedColumns([]);
        }
      }
      if (report.filters) {
        try {
          setFilters(JSON.parse(report.filters));
        } catch (_e) {
          setFilters([]);
        }
      }
    } else {
      setSelectedColumns(REPORT_TYPES.shipments.columns.slice(0, 5));
    }
  }, [report]);

  const handleReportTypeChange = (type) => {
    form.setValue('report_type', type);
    setSelectedColumns(REPORT_TYPES[type].columns.slice(0, 5));
    setFilters([]);
  };

  const toggleColumn = (col) => {
    if (selectedColumns.includes(col)) {
      setSelectedColumns(selectedColumns.filter((c) => c !== col));
    } else {
      setSelectedColumns([...selectedColumns, col]);
    }
  };

  const addFilter = () => {
    const availableFilters = REPORT_TYPES[currentReportType].filters;
    if (availableFilters.length > 0) {
      setFilters([...filters, { field: availableFilters[0], operator: 'eq', value: '' }]);
    }
  };

  const updateFilter = (index, updates) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    setFilters(newFilters);
  };

  const removeFilter = (index) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (data) => {
    try {
      const finalData = {
        ...data,
        columns: JSON.stringify(selectedColumns),
        filters: JSON.stringify(filters),
      };

      await onSubmit(finalData);
    } catch (error) {
      if (error.name === 'ZodError') {
        handleValidationError(error, 'Report');
      } else {
        handleError(error, 'Failed to save report', {
          component: 'ReportBuilder',
          action: 'submit',
        });
      }
    }
  };

  const reportConfig = REPORT_TYPES[currentReportType];
  const watchedSchedule = form.watch('schedule');

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-500" />
          {report ? 'Edit Report' : 'Create Custom Report'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Report Name *</Label>
              <Input {...form.register('name')} placeholder="e.g. Weekly Shipment Summary" />
              {form.formState.errors.name && (
                <p className="text-xs text-rose-600 mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={form.watch('report_type')} onValueChange={handleReportTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REPORT_TYPES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Column Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <SortAsc className="w-4 h-4" /> Select Columns
            </Label>
            <div className="flex flex-wrap gap-2">
              {reportConfig.columns.map((col) => (
                <Badge
                  key={col}
                  variant={selectedColumns.includes(col) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleColumn(col)}
                >
                  {col.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Filter className="w-4 h-4" /> Filters
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={addFilter}>
                <Plus className="w-4 h-4 mr-1" /> Add Filter
              </Button>
            </div>
            {filters.length === 0 ? (
              <p className="text-sm text-slate-500">
                No filters applied. All data will be included.
              </p>
            ) : (
              <div className="space-y-2">
                {filters.map((filter, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    <Select
                      value={filter.field}
                      onValueChange={(v) => updateFilter(index, { field: v, value: '' })}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {reportConfig.filters.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {filter.field === 'date_range' ? (
                      <Select
                        value={filter.value}
                        onValueChange={(v) => updateFilter(index, { value: v })}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7d">Last 7 days</SelectItem>
                          <SelectItem value="30d">Last 30 days</SelectItem>
                          <SelectItem value="90d">Last 90 days</SelectItem>
                          <SelectItem value="this_month">This month</SelectItem>
                          <SelectItem value="last_month">Last month</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : FILTER_OPTIONS[filter.field] ? (
                      <Select
                        value={filter.value}
                        onValueChange={(v) => updateFilter(index, { value: v })}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {FILTER_OPTIONS[filter.field].map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt.replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={filter.value}
                        onChange={(e) => updateFilter(index, { value: e.target.value })}
                        className="w-40"
                        placeholder="Value"
                      />
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFilter(index)}
                      className="text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sorting */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sort By</Label>
              <Select
                value={form.watch('sort_by')}
                onValueChange={(v) => form.setValue('sort_by', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reportConfig.columns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Select
                value={form.watch('sort_order')}
                onValueChange={(v) => form.setValue('sort_order', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
            <Label className="flex items-center gap-2 text-blue-900">
              <Mail className="w-4 h-4" /> Email Schedule (Optional)
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select value={watchedSchedule} onValueChange={(v) => form.setValue('schedule', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Schedule</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>

              {watchedSchedule === 'weekly' && (
                <Select
                  value={String(form.watch('schedule_day'))}
                  onValueChange={(v) => form.setValue('schedule_day', parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="2">Tuesday</SelectItem>
                    <SelectItem value="3">Wednesday</SelectItem>
                    <SelectItem value="4">Thursday</SelectItem>
                    <SelectItem value="5">Friday</SelectItem>
                    <SelectItem value="6">Saturday</SelectItem>
                    <SelectItem value="7">Sunday</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {watchedSchedule === 'monthly' && (
                <Select
                  value={String(form.watch('schedule_day'))}
                  onValueChange={(v) => form.setValue('schedule_day', parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        Day {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select
                value={form.watch('format')}
                onValueChange={(v) => form.setValue('format', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {watchedSchedule !== 'none' && (
              <div className="space-y-2">
                <Label>Recipients (comma-separated emails)</Label>
                <Input
                  {...form.register('recipients')}
                  placeholder="email1@example.com, email2@example.com"
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {report ? 'Update Report' : 'Create Report'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export { REPORT_TYPES, FILTER_OPTIONS };
