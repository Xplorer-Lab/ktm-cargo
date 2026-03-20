import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Building2, Package, MapPin, Percent, Save } from 'lucide-react';

export default function BusinessSettingsTab({
  businessSettings,
  setBusinessSettings,
  handleSaveBusinessSettings,
}) {
  return (
    <div className="space-y-6">
      {/* Company Information */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            Company Information
          </CardTitle>
          <CardDescription>Your business details for invoices and documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tax ID / Registration Number</Label>
              <Input
                value={businessSettings.tax_id}
                onChange={(e) =>
                  setBusinessSettings({ ...businessSettings, tax_id: e.target.value })
                }
                placeholder="e.g., 1234567890123"
              />
            </div>
            <div className="space-y-2">
              <Label>Currency Symbol</Label>
              <Select
                value={businessSettings.currency_symbol}
                onValueChange={(v) =>
                  setBusinessSettings({ ...businessSettings, currency_symbol: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="฿">Thai Baht (฿)</SelectItem>
                  <SelectItem value="$">US Dollar ($)</SelectItem>
                  <SelectItem value="K">Myanmar Kyat (K)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Company Address</Label>
            <Textarea
              value={businessSettings.company_address}
              onChange={(e) =>
                setBusinessSettings({ ...businessSettings, company_address: e.target.value })
              }
              placeholder="Enter your business address for invoices..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Shipping Defaults */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-500" />
            Shipping Defaults
          </CardTitle>
          <CardDescription>Default values for new shipments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Default Service Type</Label>
              <Select
                value={businessSettings.default_service_type}
                onValueChange={(v) =>
                  setBusinessSettings({ ...businessSettings, default_service_type: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cargo_small">Cargo Small</SelectItem>
                  <SelectItem value="cargo_medium">Cargo Medium</SelectItem>
                  <SelectItem value="cargo_large">Cargo Large</SelectItem>
                  <SelectItem value="express">Express</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Weight Unit</Label>
              <Select
                value={businessSettings.weight_unit}
                onValueChange={(v) => setBusinessSettings({ ...businessSettings, weight_unit: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilograms (kg)</SelectItem>
                  <SelectItem value="lb">Pounds (lb)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                Default Pickup City
              </Label>
              <Input
                value={businessSettings.default_pickup_city}
                onChange={(e) =>
                  setBusinessSettings({
                    ...businessSettings,
                    default_pickup_city: e.target.value,
                  })
                }
                placeholder="Bangkok"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                Default Delivery City
              </Label>
              <Input
                value={businessSettings.default_delivery_city}
                onChange={(e) =>
                  setBusinessSettings({
                    ...businessSettings,
                    default_delivery_city: e.target.value,
                  })
                }
                placeholder="Yangon"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rates & Fees */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Percent className="w-5 h-5 text-amber-500" />
            Rates & Fees
          </CardTitle>
          <CardDescription>Default rates for pricing calculations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Default Insurance Rate (%)</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={businessSettings.default_insurance_rate}
                  onChange={(e) =>
                    setBusinessSettings({
                      ...businessSettings,
                      default_insurance_rate: parseFloat(e.target.value) || 0,
                    })
                  }
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Default Commission Rate (%)</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={businessSettings.default_commission_rate}
                  onChange={(e) =>
                    setBusinessSettings({
                      ...businessSettings,
                      default_commission_rate: parseFloat(e.target.value) || 0,
                    })
                  }
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Default Shopping Price per KG (฿)</Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                step="1"
                value={businessSettings.default_shopping_price_per_kg}
                onChange={(e) =>
                  setBusinessSettings({
                    ...businessSettings,
                    default_shopping_price_per_kg: parseFloat(e.target.value) || 0,
                  })
                }
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">฿</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Used when a customer adds a shopping order with an unverified link
            </p>
          </div>
          <div className="pt-4">
            <Button
              onClick={handleSaveBusinessSettings}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
