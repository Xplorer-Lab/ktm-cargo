import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { FileCheck, Calculator, Receipt } from 'lucide-react';

export default function DocumentSettingsTab({ businessSettings, setBusinessSettings }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-purple-500" />
          Documents & Automation
        </CardTitle>
        <CardDescription>Configure document generation and automation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Invoice Number Prefix</Label>
            <Input
              value={businessSettings.invoice_prefix}
              onChange={(e) =>
                setBusinessSettings({
                  ...businessSettings,
                  invoice_prefix: e.target.value.toUpperCase(),
                })
              }
              placeholder="INV"
              maxLength={5}
            />
            <p className="text-xs text-slate-500">
              e.g., {businessSettings.invoice_prefix}-2024-0001
            </p>
          </div>
          <div className="space-y-2">
            <Label>Tracking Number Prefix</Label>
            <Input
              value={businessSettings.tracking_prefix}
              onChange={(e) =>
                setBusinessSettings({
                  ...businessSettings,
                  tracking_prefix: e.target.value.toUpperCase(),
                })
              }
              placeholder="BKK"
              maxLength={5}
            />
            <p className="text-xs text-slate-500">
              e.g., {businessSettings.tracking_prefix}1234567890
            </p>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-slate-400" />
                Auto-generate Tracking Numbers
              </Label>
              <p className="text-sm text-slate-500">
                Automatically create tracking IDs for new shipments
              </p>
            </div>
            <Switch
              checked={businessSettings.auto_generate_tracking}
              onCheckedChange={(v) =>
                setBusinessSettings({ ...businessSettings, auto_generate_tracking: v })
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-400" />
                Auto-send Receipts
              </Label>
              <p className="text-sm text-slate-500">
                Email receipts to customers when payment is received
              </p>
            </div>
            <Switch
              checked={businessSettings.auto_send_receipts}
              onCheckedChange={(v) =>
                setBusinessSettings({ ...businessSettings, auto_send_receipts: v })
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-slate-400" />
                Require Delivery Signature
              </Label>
              <p className="text-sm text-slate-500">
                Require customer signature on delivery confirmation
              </p>
            </div>
            <Switch
              checked={businessSettings.require_signature}
              onCheckedChange={(v) =>
                setBusinessSettings({ ...businessSettings, require_signature: v })
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
