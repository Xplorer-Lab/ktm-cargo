import { supabase } from '../../../api/supabaseClient';

export const CUSTOMER_INQUIRY_STATUSES = Object.freeze([
  'new',
  'contacted',
  'quoted',
  'converted',
  'cancelled',
]);

export const CUSTOMER_INQUIRY_CONTACT_CHANNELS = Object.freeze([
  'phone',
  'facebook',
  'line',
  'telegram',
  'email',
  'other',
]);

export const CUSTOMER_INQUIRY_SERVICE_TYPES = Object.freeze([
  'air_cargo',
  'land_cargo',
  'shopping_proxy',
  'hybrid',
]);

export const CUSTOMER_INQUIRY_ROUTES = Object.freeze(['TH-MM', 'MM-TH']);

const CUSTOMER_INQUIRIES_TABLE = 'customer_inquiries';
const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

const STRING_FIELDS = Object.freeze([
  ['customer_name', 'customerName', true],
  ['contact_channel', 'contactChannel', true],
  ['contact_value', 'contactValue', true],
  ['service_type', 'serviceType', true],
  ['route', 'route', false],
  ['item_description', 'itemDescription', false],
  ['pickup_address', 'pickupAddress', false],
  ['delivery_address', 'deliveryAddress', false],
  ['notes', 'notes', false],
]);

const NUMERIC_FIELDS = Object.freeze([
  ['weight_kg', 'weightKg'],
  ['billable_weight_kg', 'billableWeightKg'],
  ['rate_per_kg', 'ratePerKg'],
  ['estimated_cargo_fee', 'estimatedCargoFee'],
  ['product_cost_thb', 'productCostThb'],
  ['shopping_commission', 'shoppingCommission'],
  ['estimated_total_thb', 'estimatedTotalThb'],
]);

function getValue(payload, snakeKey, camelKey) {
  if (Object.prototype.hasOwnProperty.call(payload, snakeKey)) {
    return payload[snakeKey];
  }
  if (Object.prototype.hasOwnProperty.call(payload, camelKey)) {
    return payload[camelKey];
  }
  return undefined;
}

function normalizeRequiredString(value, fieldName) {
  if (typeof value !== 'string') {
    throw new TypeError(`${fieldName} is required`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new TypeError(`${fieldName} is required`);
  }

  return trimmed;
}

function normalizeOptionalString(value, fieldName) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new TypeError(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalNumber(value, fieldName) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    throw new TypeError(`${fieldName} must be a finite number`);
  }
  if (numberValue < 0) {
    throw new RangeError(`${fieldName} must be greater than or equal to 0`);
  }

  return numberValue;
}

function assertAllowed(value, allowedValues, fieldName) {
  if (!allowedValues.includes(value)) {
    throw new RangeError(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }
}

function wrapSupabaseError(error, action) {
  if (!error) return;

  const noun = action === 'list' ? 'customer inquiries' : 'customer inquiry';
  const wrapped = new Error(`Failed to ${action} ${noun}`);
  wrapped.cause = error;
  throw wrapped;
}

function normalizeCreatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new TypeError('payload is required');
  }

  const row = {};

  STRING_FIELDS.forEach(([snakeKey, camelKey, required]) => {
    const rawValue = getValue(payload, snakeKey, camelKey);
    if (required) {
      row[snakeKey] = normalizeRequiredString(rawValue, snakeKey);
    } else {
      const normalizedValue = normalizeOptionalString(rawValue, snakeKey);
      if (normalizedValue !== undefined) {
        row[snakeKey] = normalizedValue;
      }
    }
  });

  if (!row.route) {
    row.route = 'TH-MM';
  }

  assertAllowed(row.contact_channel, CUSTOMER_INQUIRY_CONTACT_CHANNELS, 'contact_channel');
  assertAllowed(row.service_type, CUSTOMER_INQUIRY_SERVICE_TYPES, 'service_type');
  assertAllowed(row.route, CUSTOMER_INQUIRY_ROUTES, 'route');

  NUMERIC_FIELDS.forEach(([snakeKey, camelKey]) => {
    const normalizedValue = normalizeOptionalNumber(
      getValue(payload, snakeKey, camelKey),
      snakeKey
    );
    if (normalizedValue !== undefined) {
      row[snakeKey] = normalizedValue;
    }
  });

  return row;
}

function normalizeListLimit(limit) {
  const normalized = Number(limit);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return DEFAULT_LIST_LIMIT;
  }

  return Math.min(Math.floor(normalized), MAX_LIST_LIMIT);
}

function assertStatus(status) {
  if (status === undefined || status === null || status === '') {
    throw new TypeError('status is required');
  }
  assertAllowed(status, CUSTOMER_INQUIRY_STATUSES, 'status');
}

function assertInquiryId(id) {
  if (typeof id !== 'string' || !id.trim()) {
    throw new TypeError('id is required');
  }
}

function normalizeOptionalId(value, fieldName) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${fieldName} must be a non-empty string`);
  }
  return value.trim();
}

export async function createCustomerInquiry(payload) {
  const row = normalizeCreatePayload(payload);
  const { error } = await supabase.from(CUSTOMER_INQUIRIES_TABLE).insert(row);

  wrapSupabaseError(error, 'create');
  return { success: true };
}

export async function listCustomerInquiries({ status, limit = DEFAULT_LIST_LIMIT } = {}) {
  if (status !== undefined) {
    assertStatus(status);
  }

  let query = supabase
    .from(CUSTOMER_INQUIRIES_TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(normalizeListLimit(limit));

  if (status !== undefined) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  wrapSupabaseError(error, 'list');

  return data || [];
}

export async function updateCustomerInquiryStatus(id, status, options = {}) {
  assertInquiryId(id);
  assertStatus(status);

  const normalizedOptions = options || {};
  const convertedShipmentId = normalizeOptionalId(
    normalizedOptions.convertedShipmentId,
    'convertedShipmentId'
  );
  const convertedShoppingOrderId = normalizeOptionalId(
    normalizedOptions.convertedShoppingOrderId,
    'convertedShoppingOrderId'
  );

  const updatePayload = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (convertedShipmentId) {
    updatePayload.converted_shipment_id = convertedShipmentId;
  }

  if (convertedShoppingOrderId) {
    updatePayload.converted_shopping_order_id = convertedShoppingOrderId;
  }

  const { data, error } = await supabase
    .from(CUSTOMER_INQUIRIES_TABLE)
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single();

  wrapSupabaseError(error, 'update');
  return data;
}
