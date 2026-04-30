import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function PriceCalculatorForm({ values, onChange }) {
  return (
    <div className="grid gap-4 rounded-xl border bg-white p-5 shadow-sm">
      <div className="grid gap-2">
        <Label htmlFor="route">Route</Label>
        <select
          id="route"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={values.route}
          onChange={(event) => onChange('route', event.target.value)}
        >
          <option value="TH-MM">Thailand to Myanmar</option>
          <option value="MM-TH">Myanmar to Thailand</option>
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="cargo-mode">Cargo mode</Label>
        <select
          id="cargo-mode"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={values.mode}
          onChange={(event) => onChange('mode', event.target.value)}
        >
          <option value="air">Air cargo</option>
          <option value="land">Land cargo</option>
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="weight-kg">Weight (kg)</Label>
        <Input
          id="weight-kg"
          inputMode="decimal"
          min="0.1"
          step="0.1"
          type="number"
          value={values.weightKg}
          onChange={(event) => onChange('weightKg', event.target.value)}
        />
      </div>
    </div>
  );
}
