import { z } from 'zod';

export const vendorInviteSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  companyName: z.string().optional(),
});

export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  customer_type: z.enum(['individual', 'online_shopper', 'sme_importer']).optional(),
  address_bangkok: z.string().optional(),
  address_yangon: z.string().optional(),
  notes: z.string().optional(),
  referred_by: z.string().optional(),
  referral_code: z.string().optional(),
});

export const shipmentSchema = z.object({
  customer_id: z.any().optional(), // Can be string or number, strict validation upon usage might be better but minimal for now
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  service_type: z.string().optional(),
  weight_kg: z.preprocess((val) => Number(val), z.number().min(0.1, 'Weight must be at least 0.1')),
  items_description: z.string().min(1, 'Description is required'),
  tracking_number: z.string().optional(),
  price_per_kg: z.number().optional(),
  cost_basis: z.number().optional(),
  total_amount: z.number().optional(),
  profit: z.number().optional(),
  insurance_amount: z.number().optional(),
  status: z.string().optional(),
  payment_status: z.string().optional(),
  estimated_delivery: z.string().optional(),
  pickup_address: z.string().optional(),
  delivery_address: z.string().optional(),
  insurance_opted: z.boolean().optional(),
  packaging_fee: z.number().optional(),
  notes: z.string().optional(),
  vendor_po_id: z.any().optional(),
  vendor_name: z.string().optional(),
  vendor_po_number: z.string().optional(),
});

export const vendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  vendor_type: z.string().min(1, 'Vendor type is required'),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  cost_per_kg: z.preprocess((val) => Number(val), z.number().min(0).optional()),
  cost_per_kg_bulk: z.preprocess((val) => Number(val), z.number().min(0).optional()),
  monthly_capacity_kg: z.preprocess((val) => Number(val), z.number().min(0).optional()),
  is_preferred: z.boolean().optional(),
  status: z.enum(['active', 'inactive', 'blacklisted']).optional(),
});
