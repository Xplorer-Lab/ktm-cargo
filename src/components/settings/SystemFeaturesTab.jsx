import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Truck, Users, Calculator, Save } from 'lucide-react';

export default function SystemFeaturesTab({ features, setFeatures, handleSaveFeatures }) {
  return (
    <div className="space-y-6">
      {/* Advanced Logistics */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-500" />
            Advanced Logistics
          </CardTitle>
          <CardDescription>Turn complex supply chain modules on or off</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2 text-base">Inventory System</Label>
              <p className="text-sm text-slate-500">
                Enable product stock tracking and adjustments
              </p>
            </div>
            <Switch
              checked={features.enableInventory}
              onCheckedChange={(v) => setFeatures({ ...features, enableInventory: v })}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2 text-base">Vendor Procurement (PO)</Label>
              <p className="text-sm text-slate-500">
                Enable purchase orders and procurement workflows
              </p>
            </div>
            <Switch
              checked={features.enableProcurement}
              onCheckedChange={(v) => setFeatures({ ...features, enableProcurement: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Business Operations */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            Business Operations
          </CardTitle>
          <CardDescription>Manage internal workflows and team tasks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2 text-base">Business Tasks</Label>
              <p className="text-sm text-slate-500">Enable internal task assignment and tracking</p>
            </div>
            <Switch
              checked={features.enableTasks}
              onCheckedChange={(v) => setFeatures({ ...features, enableTasks: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Calculation Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="w-5 h-5 text-purple-500" />
            Calculation Settings
          </CardTitle>
          <CardDescription>Configure complex cost calculations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2 text-base">
                Advanced Costing (Volumetric & Packing)
              </Label>
              <p className="text-sm text-slate-500">
                Show inputs for LxWxH volumetric weight and packing fees in forms
              </p>
            </div>
            <Switch
              checked={features.enableAdvancedCosting}
              onCheckedChange={(v) => setFeatures({ ...features, enableAdvancedCosting: v })}
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveFeatures} className="bg-blue-600 hover:bg-blue-700 px-8">
              <Save className="w-4 h-4 mr-2" />
              Save Features
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
