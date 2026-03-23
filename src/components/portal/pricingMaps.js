import { Package, Zap, Truck } from 'lucide-react';
import { SERVICE_TYPE_DEFAULTS } from '@/lib/defaults';

// Derive cargo service types from centralised defaults
export const ICON_MAP = {
  cargo_small: Package,
  cargo_medium: Package,
  cargo_large: Package,
  express: Zap,
  standard: Truck,
};

export const COLOR_MAP = {
  cargo_small: 'from-blue-500 to-blue-600',
  cargo_medium: 'from-indigo-500 to-indigo-600',
  cargo_large: 'from-purple-500 to-purple-600',
  express: 'from-amber-500 to-orange-500',
  standard: 'from-emerald-500 to-emerald-600',
};

export const DELIVERY_MAP = {
  cargo_small: '3-5 days',
  cargo_medium: '3-5 days',
  cargo_large: '3-5 days',
  express: '1-2 days',
  standard: '3-5 days',
};

export const DESC_MAP = {
  cargo_small: 'Small packages and documents',
  cargo_medium: 'Medium boxes and parcels',
  cargo_large: 'Large cargo shipments',
  express: 'Priority handling & fast delivery',
  standard: 'Reliable standard shipping',
};

export const SERVICE_TYPES = SERVICE_TYPE_DEFAULTS.filter(
  (s) => !s.value.startsWith('shopping_')
).map((s) => ({
  value: s.value,
  label: s.label,
  price: s.price,
  icon: ICON_MAP[s.value] || Package,
  delivery: DELIVERY_MAP[s.value] || '3-5 days',
  description: DESC_MAP[s.value] || s.label,
  color: COLOR_MAP[s.value] || 'from-slate-500 to-slate-600',
}));

export const PACKAGING_OPTIONS = [
  {
    value: '0',
    label: 'No packaging needed',
    description: 'Customer provides packaging',
  },
  {
    value: '50',
    label: 'Basic (฿50)',
    description: 'Standard bubble wrap',
  },
  {
    value: '100',
    label: 'Standard (฿100)',
    description: 'Bubble wrap + box',
  },
  {
    value: '200',
    label: 'Premium (฿200)',
    description: 'Double protection + fragile care',
  },
];

export const CARGO_STEPS = [
  { id: 1, name: 'Service', icon: Package },
  { id: 2, name: 'Details', icon: Truck },
  { id: 3, name: 'Confirm', icon: Package },
];

export const SHOPPING_STEPS = [
  { id: 1, name: 'Product', icon: Package },
  { id: 2, name: 'Shipping', icon: Truck },
  { id: 3, name: 'Confirm', icon: Package },
];
