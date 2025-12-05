import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  Plus,
  Pencil,
  Trash2,
  Eye,
  FileText,
  Truck,
  Package,
  CheckCircle,
  CreditCard,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DEFAULT_TEMPLATES,
  processTemplate,
} from '@/components/notifications/ShippingNotificationService';

const TEMPLATE_TYPES = [
  {
    value: 'shopping_shipping',
    label: 'Shopping Order - Shipping',
    icon: Truck,
    color: 'bg-blue-100 text-blue-800',
  },
  {
    value: 'shopping_delivered',
    label: 'Shopping Order - Delivered',
    icon: CheckCircle,
    color: 'bg-emerald-100 text-emerald-800',
  },
  {
    value: 'shipment_shipped',
    label: 'Cargo Shipment - In Transit',
    icon: Package,
    color: 'bg-purple-100 text-purple-800',
  },
  {
    value: 'shipment_delivered',
    label: 'Cargo Shipment - Delivered',
    icon: CheckCircle,
    color: 'bg-emerald-100 text-emerald-800',
  },
  {
    value: 'order_confirmed',
    label: 'Order Confirmed',
    icon: FileText,
    color: 'bg-amber-100 text-amber-800',
  },
  {
    value: 'payment_received',
    label: 'Payment Received',
    icon: CreditCard,
    color: 'bg-green-100 text-green-800',
  },
];

const PLACEHOLDERS = [
  { key: '{{customer_name}}', description: 'Customer full name' },
  { key: '{{order_number}}', description: 'Order/tracking number' },
  { key: '{{tracking_number}}', description: 'Shipment tracking number' },
  { key: '{{delivery_address}}', description: 'Delivery address' },
  { key: '{{status}}', description: 'Current order status' },
  { key: '{{items}}', description: 'Item descriptions' },
];

export default function NotificationTemplateManager() {
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    template_type: '',
    subject: '',
    body: '',
    is_active: true,
  });

  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: () => db.notificationTemplates.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.notificationTemplates.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      setShowForm(false);
      resetForm();
      toast.success('Template created');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.notificationTemplates.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      setShowForm(false);
      resetForm();
      toast.success('Template updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.notificationTemplates.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      setTemplateToDelete(null);
      toast.success('Template deleted');
    },
  });

  const resetForm = () => {
    setFormData({ name: '', template_type: '', subject: '', body: '', is_active: true });
    setEditingTemplate(null);
  };

  const openForm = (template = null) => {
    if (template) {
      setFormData({
        name: template.name,
        template_type: template.template_type,
        subject: template.subject,
        body: template.body,
        is_active: template.is_active,
      });
      setEditingTemplate(template);
    } else {
      resetForm();
    }
    setShowForm(true);
  };

  const loadDefaultTemplate = (type) => {
    const defaultTemplate = DEFAULT_TEMPLATES[type];
    if (defaultTemplate) {
      setFormData({
        ...formData,
        template_type: type,
        subject: defaultTemplate.subject,
        body: defaultTemplate.body,
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.template_type || !formData.subject || !formData.body) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDeleteTemplate = () => {
    if (templateToDelete) {
      deleteMutation.mutate(templateToDelete.id);
    }
  };

  const handlePreview = () => {
    const sampleData = {
      customer_name: 'John Doe',
      order_number: 'ORD-12345',
      tracking_number: 'TRK-67890',
      delivery_address: '123 Main St, Bangkok, Thailand',
      status: 'shipping',
      items: 'Electronics, Clothing',
    };

    setPreviewData({
      subject: processTemplate(formData.subject, sampleData),
      body: processTemplate(formData.body, sampleData),
    });
    setShowPreview(true);
  };

  const getTypeConfig = (type) => TEMPLATE_TYPES.find((t) => t.value === type) || {};

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Notification Templates
            </CardTitle>
            <CardDescription>Configure email templates for shipping notifications</CardDescription>
          </div>
          <Button onClick={() => openForm()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> New Template
          </Button>
        </CardHeader>
        <CardContent>
          {templates.length > 0 ? (
            <div className="space-y-3">
              {templates.map((template) => {
                const typeConfig = getTypeConfig(template.template_type);
                const TypeIcon = typeConfig.icon || FileText;
                return (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:border-blue-200 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2 rounded-lg ${typeConfig.color?.split(' ')[0] || 'bg-slate-100'}`}
                      >
                        <TypeIcon
                          className={`w-5 h-5 ${typeConfig.color?.split(' ')[1] || 'text-slate-600'}`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{template.name}</h3>
                          {!template.is_active && (
                            <Badge variant="outline" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">
                          {typeConfig.label || template.template_type}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">Subject: {template.subject}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openForm(template)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 hover:bg-rose-50"
                        onClick={() => setTemplateToDelete(template)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 mb-2">No custom templates yet</p>
              <p className="text-sm text-slate-400 mb-4">
                Default templates will be used for notifications
              </p>
              <Button onClick={() => openForm()}>
                <Plus className="w-4 h-4 mr-2" /> Create Template
              </Button>
            </div>
          )}

          {/* Default Templates Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800">Default Templates</h4>
                <p className="text-sm text-blue-700 mt-1">
                  If no custom template is configured for a notification type, the system will use
                  built-in default templates. Create custom templates to personalize your customer
                  communications.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'New Template'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Shipping Confirmation"
                />
              </div>
              <div className="space-y-2">
                <Label>Notification Type *</Label>
                <Select
                  value={formData.template_type}
                  onValueChange={(v) => {
                    setFormData({ ...formData, template_type: v });
                    if (!formData.subject && !formData.body) {
                      loadDefaultTemplate(v);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email Subject *</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Your Order {{order_number}} is On Its Way!"
              />
            </div>

            <div className="space-y-2">
              <Label>Email Body (HTML) *</Label>
              <Textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Enter email body with HTML formatting..."
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            {/* Placeholders Reference */}
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs font-medium text-slate-600 mb-2">Available Placeholders:</p>
              <div className="flex flex-wrap gap-2">
                {PLACEHOLDERS.map((p) => (
                  <Badge
                    key={p.key}
                    variant="outline"
                    className="cursor-pointer hover:bg-slate-100"
                    onClick={() => setFormData({ ...formData, body: formData.body + ' ' + p.key })}
                    title={p.description}
                  >
                    {p.key}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-slate-500">Enable this template for notifications</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handlePreview}
                disabled={!formData.subject || !formData.body}
              >
                <Eye className="w-4 h-4 mr-2" /> Preview
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                {editingTemplate ? 'Update' : 'Create'} Template
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          {previewData && (
            <div className="mt-4 space-y-4">
              <div className="p-3 bg-slate-100 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Subject:</p>
                <p className="font-medium">{previewData.subject}</p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-2">Body:</p>
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewData.body) }}
                />
              </div>
              <Button variant="outline" onClick={() => setShowPreview(false)} className="w-full">
                Close Preview
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the notification template "
              {templateToDelete?.name}" and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
