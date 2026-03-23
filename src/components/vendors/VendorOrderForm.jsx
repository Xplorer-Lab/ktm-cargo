import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
export default function VendorOrderForm({
  vendors,
  shipments,
  inventoryItems,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState({
    vendor_id: '',
    order_type: 'shipment',
    reference_id: '',
    amount: 0,
    expected_date: '',
    notes: '',
  });

  const selectedVendor = vendors.find((v) => v.id === form.vendor_id);

  const referenceOptions =
    form.order_type === 'shipment'
      ? shipments.map((s) => ({
          id: s.id,
          name: s.tracking_number || `Shipment - ${s.customer_name}`,
        }))
      : form.order_type === 'restock'
        ? inventoryItems.map((i) => ({ id: i.id, name: i.name }))
        : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    const reference = referenceOptions.find((r) => r.id === form.reference_id);
    onSubmit({
      ...form,
      vendor_name: selectedVendor?.name,
      reference_name: reference?.name,
      status: 'pending',
    });
  };

  return (
    <DialogContent className="max-w-md" aria-describedby={undefined}>
      <DialogHeader>
        <DialogTitle>Assign to Vendor</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label>Vendor *</Label>
          <Select value={form.vendor_id} onValueChange={(v) => setForm({ ...form, vendor_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select vendor" />
            </SelectTrigger>
            <SelectContent>
              {vendors
                .filter((v) => v.status === 'active')
                .map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Order Type</Label>
          <Select
            value={form.order_type}
            onValueChange={(v) => setForm({ ...form, order_type: v, reference_id: '' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shipment">Shipment</SelectItem>
              <SelectItem value="restock">Inventory Restock</SelectItem>
              <SelectItem value="service">Service</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {referenceOptions.length > 0 && (
          <div className="space-y-2">
            <Label>Reference</Label>
            <Select
              value={form.reference_id}
              onValueChange={(v) => setForm({ ...form, reference_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reference" />
              </SelectTrigger>
              <SelectContent>
                {referenceOptions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Amount (฿)</Label>
            <Input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: +e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Expected Date</Label>
            <Input
              type="date"
              value={form.expected_date}
              onChange={(e) => setForm({ ...form, expected_date: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
          />
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" className="flex-1 bg-blue-600" disabled={!form.vendor_id}>
            Assign
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
