import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function QuoteRequestForm({ form, estimate, status, onChange, onSubmit }) {
  const disabled = status === 'submitting' || !estimate.isValid;

  return (
    <form className="grid gap-4 rounded-xl border bg-white p-5 shadow-sm" onSubmit={onSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="customer-name">Customer name</Label>
        <Input
          id="customer-name"
          value={form.customerName}
          onChange={(event) => onChange('customerName', event.target.value)}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="contact-channel">Preferred contact</Label>
        <select
          id="contact-channel"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={form.contactChannel}
          onChange={(event) => onChange('contactChannel', event.target.value)}
        >
          <option value="phone">Phone</option>
          <option value="facebook">Facebook</option>
          <option value="line">LINE</option>
          <option value="telegram">Telegram</option>
          <option value="email">Email</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="contact-value">Contact detail</Label>
        <Input
          id="contact-value"
          value={form.contactValue}
          onChange={(event) => onChange('contactValue', event.target.value)}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="item-description">Item description</Label>
        <Textarea
          id="item-description"
          value={form.itemDescription}
          onChange={(event) => onChange('itemDescription', event.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" value={form.notes} onChange={(event) => onChange('notes', event.target.value)} />
      </div>

      {status === 'success' && <p className="text-sm font-medium text-green-700">Quote request received.</p>}
      {status === 'error' && <p className="text-sm font-medium text-red-700">Could not send quote request. Please try again.</p>}

      <Button type="submit" disabled={disabled}>
        {status === 'submitting' ? 'Sending...' : 'Request quote'}
      </Button>
    </form>
  );
}
