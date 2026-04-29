import { supabase } from '../../../api/supabaseClient';
import {
  createCustomerInquiry,
  listCustomerInquiries,
  updateCustomerInquiryStatus,
} from '../api/customerInquiries';
import fs from 'fs';
import path from 'path';

jest.mock('../../../api/supabaseClient', () => ({
  supabase: { from: jest.fn() },
}));

// =============================================================================
// Helpers
// =============================================================================

const VALID_PAYLOAD = {
  customerName: 'Test User',
  contactChannel: 'phone',
  contactValue: '0812345678',
  serviceType: 'air_cargo',
};

// Creates a Supabase list query chain: select → order → limit → [eq]
// The limit() result is both awaitable (has .then) and has .eq() for optional filter.
function createListChain(result = { data: [], error: null }) {
  const basePromise = Promise.resolve(result);
  const eqFn = jest.fn().mockReturnValue(Promise.resolve(result));
  const limitResult = {
    then: (...args) => basePromise.then(...args),
    catch: (...args) => basePromise.catch(...args),
    finally: (...args) => basePromise.finally(...args),
    eq: eqFn,
  };
  const limitFn = jest.fn().mockReturnValue(limitResult);
  const orderFn = jest.fn().mockReturnValue({ limit: limitFn });
  const selectFn = jest.fn().mockReturnValue({ order: orderFn });
  supabase.from.mockReturnValue({ select: selectFn });
  return { selectFn, orderFn, limitFn, eqFn };
}

// =============================================================================
// createCustomerInquiry
// =============================================================================

describe('createCustomerInquiry', () => {
  let insert;

  beforeEach(() => {
    jest.clearAllMocks();
    // insert() returns a plain Promise — no .select() or .single() method available.
    // If implementation tries to chain those, it will throw TypeError, failing the test.
    insert = jest.fn().mockResolvedValue({ data: null, error: null });
    supabase.from.mockReturnValue({ insert });
  });

  test('inserts into customer_inquiries using insert only (no select/single)', async () => {
    const result = await createCustomerInquiry(VALID_PAYLOAD);

    expect(supabase.from).toHaveBeenCalledWith('customer_inquiries');
    expect(insert).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true });
  });

  test('normalizes camelCase to snake_case and trims strings', async () => {
    await createCustomerInquiry({
      customerName: '  Padded Name  ',
      contactChannel: 'phone',
      contactValue: '  0812345678  ',
      serviceType: 'air_cargo',
    });

    const [row] = insert.mock.calls[0];
    expect(row.customer_name).toBe('Padded Name');
    expect(row.contact_value).toBe('0812345678');
    expect(row.customer_name).not.toMatch(/^\s|\s$/);
  });

  test('maps camelCase fields to snake_case DB columns', async () => {
    await createCustomerInquiry({
      customerName: 'Test',
      contactChannel: 'line',
      contactValue: '@lineid',
      serviceType: 'land_cargo',
      route: 'MM-TH',
      weightKg: 2.5,
      itemDescription: 'Electronics',
      notes: 'Handle with care',
    });

    const [row] = insert.mock.calls[0];
    expect(row).toMatchObject({
      customer_name: 'Test',
      contact_channel: 'line',
      contact_value: '@lineid',
      service_type: 'land_cargo',
      route: 'MM-TH',
      weight_kg: 2.5,
      item_description: 'Electronics',
      notes: 'Handle with care',
    });
  });

  test('also accepts snake_case input fields', async () => {
    await createCustomerInquiry({
      customer_name: 'Snake User',
      contact_channel: 'email',
      contact_value: 'snake@example.com',
      service_type: 'shopping_proxy',
    });

    const [row] = insert.mock.calls[0];
    expect(row.customer_name).toBe('Snake User');
    expect(row.contact_channel).toBe('email');
  });

  test('strips staff-controlled fields: id, status, converted_*_id, timestamps', async () => {
    await createCustomerInquiry({
      ...VALID_PAYLOAD,
      id: 'should-be-stripped',
      status: 'converted',
      convertedShipmentId: 'ship-123',
      converted_shipment_id: 'ship-123',
      convertedShoppingOrderId: 'order-456',
      converted_shopping_order_id: 'order-456',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    });

    const [row] = insert.mock.calls[0];
    expect(row).not.toHaveProperty('id');
    expect(row).not.toHaveProperty('status');
    expect(row).not.toHaveProperty('converted_shipment_id');
    expect(row).not.toHaveProperty('converted_shopping_order_id');
    expect(row).not.toHaveProperty('created_at');
    expect(row).not.toHaveProperty('updated_at');
  });

  test('rejects missing required field: customerName', async () => {
    await expect(
      createCustomerInquiry({
        contactChannel: 'phone',
        contactValue: '0812345678',
        serviceType: 'air_cargo',
      })
    ).rejects.toThrow(TypeError);
    expect(insert).not.toHaveBeenCalled();
  });

  test('rejects missing required field: contactChannel', async () => {
    await expect(
      createCustomerInquiry({
        customerName: 'Test',
        contactValue: '0812345678',
        serviceType: 'air_cargo',
      })
    ).rejects.toThrow(TypeError);
    expect(insert).not.toHaveBeenCalled();
  });

  test('rejects missing required field: contactValue', async () => {
    await expect(
      createCustomerInquiry({
        customerName: 'Test',
        contactChannel: 'phone',
        serviceType: 'air_cargo',
      })
    ).rejects.toThrow(TypeError);
    expect(insert).not.toHaveBeenCalled();
  });

  test('rejects missing required field: serviceType', async () => {
    await expect(
      createCustomerInquiry({
        customerName: 'Test',
        contactChannel: 'phone',
        contactValue: '0812345678',
      })
    ).rejects.toThrow(TypeError);
    expect(insert).not.toHaveBeenCalled();
  });

  test('rejects invalid contactChannel enum', async () => {
    await expect(
      createCustomerInquiry({ ...VALID_PAYLOAD, contactChannel: 'whatsapp' })
    ).rejects.toThrow(RangeError);
    expect(insert).not.toHaveBeenCalled();
  });

  test('rejects invalid serviceType enum', async () => {
    await expect(
      createCustomerInquiry({ ...VALID_PAYLOAD, serviceType: 'express' })
    ).rejects.toThrow(RangeError);
    expect(insert).not.toHaveBeenCalled();
  });

  test('rejects invalid route enum', async () => {
    await expect(createCustomerInquiry({ ...VALID_PAYLOAD, route: 'US-UK' })).rejects.toThrow(
      RangeError
    );
    expect(insert).not.toHaveBeenCalled();
  });

  test('surfaces Supabase insert errors as Error with cause', async () => {
    const supabaseError = { message: 'DB constraint violation', code: '23505' };
    insert.mockResolvedValue({ data: null, error: supabaseError });

    let caughtError;
    try {
      await createCustomerInquiry(VALID_PAYLOAD);
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError.message).toMatch(/Failed to create customer inquiry/);
    expect(caughtError.cause).toBe(supabaseError);
  });

  test('only inserts into customer_inquiries, never writes to other tables', async () => {
    await createCustomerInquiry(VALID_PAYLOAD);

    const tableCalls = supabase.from.mock.calls.map(([table]) => table);
    expect(tableCalls).not.toContain('shipments');
    expect(tableCalls).not.toContain('shopping_orders');
    expect(tableCalls).not.toContain('invoices');
    expect(tableCalls).not.toContain('payments');
    expect(tableCalls).not.toContain('customers');
    expect(tableCalls).toEqual(['customer_inquiries']);
  });

  test('blank optional strings become null', async () => {
    await createCustomerInquiry({
      ...VALID_PAYLOAD,
      itemDescription: '   ',
      notes: '',
      pickupAddress: ' ',
    });

    const [row] = insert.mock.calls[0];
    expect(row.item_description).toBeNull();
    expect(row.notes).toBeNull();
    expect(row.pickup_address).toBeNull();
  });

  test('rejects non-finite numeric field NaN', async () => {
    await expect(createCustomerInquiry({ ...VALID_PAYLOAD, weightKg: NaN })).rejects.toThrow();
    expect(insert).not.toHaveBeenCalled();
  });

  test('rejects non-finite numeric field Infinity', async () => {
    await expect(createCustomerInquiry({ ...VALID_PAYLOAD, weightKg: Infinity })).rejects.toThrow();
    expect(insert).not.toHaveBeenCalled();
  });

  test('accepts numeric 0 for optional numeric fields', async () => {
    await createCustomerInquiry({ ...VALID_PAYLOAD, weightKg: 0 });
    const [row] = insert.mock.calls[0];
    expect(row.weight_kg).toBe(0);
  });

  test('accepts numeric fields from pricing output (camelCase)', async () => {
    await createCustomerInquiry({
      ...VALID_PAYLOAD,
      billableWeightKg: 1.5,
      ratePerKg: 300,
      estimatedCargoFee: 450,
      estimatedTotalThb: 450,
    });

    const [row] = insert.mock.calls[0];
    expect(row.billable_weight_kg).toBe(1.5);
    expect(row.rate_per_kg).toBe(300);
    expect(row.estimated_cargo_fee).toBe(450);
    expect(row.estimated_total_thb).toBe(450);
  });
});

// =============================================================================
// listCustomerInquiries
// =============================================================================

describe('listCustomerInquiries', () => {
  let selectFn, orderFn, limitFn, eqFn;

  beforeEach(() => {
    jest.clearAllMocks();
    ({ selectFn, orderFn, limitFn, eqFn } = createListChain({ data: [], error: null }));
  });

  test('selects from customer_inquiries ordered by created_at desc with default limit 50', async () => {
    await listCustomerInquiries();

    expect(supabase.from).toHaveBeenCalledWith('customer_inquiries');
    expect(selectFn).toHaveBeenCalledWith('*');
    expect(orderFn).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(limitFn).toHaveBeenCalledWith(50);
  });

  test('returns empty array when data is null', async () => {
    createListChain({ data: null, error: null });
    const result = await listCustomerInquiries();
    expect(result).toEqual([]);
  });

  test('applies status filter when valid status provided', async () => {
    await listCustomerInquiries({ status: 'new' });
    expect(eqFn).toHaveBeenCalledWith('status', 'new');
  });

  test('does not apply status filter when no status provided', async () => {
    await listCustomerInquiries();
    expect(eqFn).not.toHaveBeenCalled();
  });

  test('rejects invalid status before making Supabase call', async () => {
    await expect(listCustomerInquiries({ status: 'invalid_status' })).rejects.toThrow(RangeError);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('surfaces Supabase errors as Error with cause', async () => {
    const supabaseError = { message: 'Select failed', code: '42P01' };
    createListChain({ data: null, error: supabaseError });

    let caughtError;
    try {
      await listCustomerInquiries();
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError.message).toMatch(/Failed to list customer inquiries/);
    expect(caughtError.cause).toBe(supabaseError);
  });

  test('returns data array on success', async () => {
    const mockData = [{ id: '1', customer_name: 'Test', status: 'new' }];
    createListChain({ data: mockData, error: null });

    const result = await listCustomerInquiries();
    expect(result).toEqual(mockData);
  });

  test('accepts all valid status values as filter', async () => {
    const statuses = ['new', 'contacted', 'quoted', 'converted', 'cancelled'];
    for (const status of statuses) {
      jest.clearAllMocks();
      ({ eqFn } = createListChain({ data: [], error: null }));
      await listCustomerInquiries({ status });
      expect(eqFn).toHaveBeenCalledWith('status', status);
    }
  });
});

// =============================================================================
// updateCustomerInquiryStatus
// =============================================================================

describe('updateCustomerInquiryStatus', () => {
  let update, eqFn, selectAfterEq, single;

  beforeEach(() => {
    jest.clearAllMocks();

    const mockRecord = {
      id: 'uuid-123',
      status: 'contacted',
      updated_at: new Date().toISOString(),
    };
    single = jest.fn().mockResolvedValue({ data: mockRecord, error: null });
    selectAfterEq = jest.fn().mockReturnValue({ single });
    eqFn = jest.fn().mockReturnValue({ select: selectAfterEq });
    update = jest.fn().mockReturnValue({ eq: eqFn });

    supabase.from.mockReturnValue({ update });
  });

  test('validates id is required (null)', async () => {
    await expect(updateCustomerInquiryStatus(null, 'contacted')).rejects.toThrow(TypeError);
    expect(update).not.toHaveBeenCalled();
  });

  test('validates id is required (undefined)', async () => {
    await expect(updateCustomerInquiryStatus(undefined, 'contacted')).rejects.toThrow(TypeError);
    expect(update).not.toHaveBeenCalled();
  });

  test('validates id is required (empty string)', async () => {
    await expect(updateCustomerInquiryStatus('', 'contacted')).rejects.toThrow(TypeError);
    expect(update).not.toHaveBeenCalled();
  });

  test('validates status is required', async () => {
    await expect(updateCustomerInquiryStatus('uuid-123', null)).rejects.toThrow(TypeError);
    expect(update).not.toHaveBeenCalled();
  });

  test('validates status enum', async () => {
    await expect(updateCustomerInquiryStatus('uuid-123', 'invalid')).rejects.toThrow(RangeError);
    expect(update).not.toHaveBeenCalled();
  });

  test('updates status and updated_at, chains eq/select/single', async () => {
    await updateCustomerInquiryStatus('uuid-123', 'contacted');

    expect(supabase.from).toHaveBeenCalledWith('customer_inquiries');
    expect(update).toHaveBeenCalledTimes(1);

    const [updatePayload] = update.mock.calls[0];
    expect(updatePayload.status).toBe('contacted');
    expect(typeof updatePayload.updated_at).toBe('string');
    expect(new Date(updatePayload.updated_at).toISOString()).toBe(updatePayload.updated_at);

    expect(eqFn).toHaveBeenCalledWith('id', 'uuid-123');
    expect(selectAfterEq).toHaveBeenCalled();
    expect(single).toHaveBeenCalled();
  });

  test('only updates status + updated_at + optional conversion IDs (no other fields)', async () => {
    await updateCustomerInquiryStatus('uuid-123', 'new');

    const [updatePayload] = update.mock.calls[0];
    const allowedKeys = [
      'status',
      'updated_at',
      'converted_shipment_id',
      'converted_shopping_order_id',
    ];
    Object.keys(updatePayload).forEach((key) => {
      expect(allowedKeys).toContain(key);
    });
  });

  test('includes convertedShipmentId when provided', async () => {
    await updateCustomerInquiryStatus('uuid-123', 'converted', {
      convertedShipmentId: 'ship-456',
    });

    const [updatePayload] = update.mock.calls[0];
    expect(updatePayload.converted_shipment_id).toBe('ship-456');
  });

  test('includes convertedShoppingOrderId when provided', async () => {
    await updateCustomerInquiryStatus('uuid-123', 'converted', {
      convertedShoppingOrderId: 'order-789',
    });

    const [updatePayload] = update.mock.calls[0];
    expect(updatePayload.converted_shopping_order_id).toBe('order-789');
  });

  test('surfaces Supabase errors as Error with cause', async () => {
    const supabaseError = { message: 'Update failed', code: '23503' };
    single.mockResolvedValue({ data: null, error: supabaseError });

    let caughtError;
    try {
      await updateCustomerInquiryStatus('uuid-123', 'contacted');
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError.message).toMatch(/Failed to update customer inquiry/);
    expect(caughtError.cause).toBe(supabaseError);
  });

  test('returns the updated record on success', async () => {
    const mockRecord = {
      id: 'uuid-123',
      status: 'contacted',
      updated_at: new Date().toISOString(),
    };
    single.mockResolvedValue({ data: mockRecord, error: null });

    const result = await updateCustomerInquiryStatus('uuid-123', 'contacted');
    expect(result).toEqual(mockRecord);
  });

  test('accepts all valid status values', async () => {
    const statuses = ['new', 'contacted', 'quoted', 'converted', 'cancelled'];
    for (const status of statuses) {
      jest.clearAllMocks();
      single = jest.fn().mockResolvedValue({ data: { id: 'x', status }, error: null });
      selectAfterEq = jest.fn().mockReturnValue({ single });
      eqFn = jest.fn().mockReturnValue({ select: selectAfterEq });
      update = jest.fn().mockReturnValue({ eq: eqFn });
      supabase.from.mockReturnValue({ update });

      await expect(updateCustomerInquiryStatus('uuid-123', status)).resolves.toBeDefined();
    }
  });
});

// =============================================================================
// Module exports
// =============================================================================

describe('module exports', () => {
  test('does not export a delete helper', async () => {
    const module = await import('../api/customerInquiries.js');
    const deleteExports = Object.keys(module).filter((k) => k.toLowerCase().includes('delete'));
    expect(deleteExports).toHaveLength(0);
    expect(module.deleteCustomerInquiry).toBeUndefined();
    expect(module.deleteInquiry).toBeUndefined();
    expect(module.removeCustomerInquiry).toBeUndefined();
  });
});

// =============================================================================
// Static migration tests
// =============================================================================

describe('migration: 20260429000001_add_customer_inquiries.sql', () => {
  let sql;

  beforeAll(() => {
    const migrationPath = path.resolve(
      process.cwd(),
      'supabase/migrations/20260429000001_add_customer_inquiries.sql'
    );
    sql = fs.readFileSync(migrationPath, 'utf8');
  });

  test('creates customer_inquiries table', () => {
    expect(sql).toMatch(/create table if not exists\s+(?:public\.)?customer_inquiries/is);
  });

  test('enables RLS on customer_inquiries', () => {
    expect(sql).toMatch(
      /alter table\s+(?:public\.)?customer_inquiries\s+enable row level security/is
    );
  });

  test('has a FOR INSERT policy', () => {
    expect(sql).toMatch(/for insert/i);
  });

  test('public insert policy restricts status to new and converted ids to null', () => {
    expect(sql).toMatch(/with check/i);
    expect(sql).toMatch(/status\s*=\s*'new'/i);
    expect(sql).toMatch(/converted_shipment_id\s+is\s+null/i);
    expect(sql).toMatch(/converted_shopping_order_id\s+is\s+null/i);
  });

  test('does not contain broad using true policies', () => {
    expect(sql).not.toMatch(/using\s*\(\s*true\s*\)/i);
  });

  test('does not grant all privileges on customer_inquiries', () => {
    expect(sql).not.toMatch(/grant\s+all\s+on\s+(?:public\.)?customer_inquiries/i);
  });

  test('does not grant broad SELECT to anon', () => {
    // Anon should not have SELECT on the table
    const grantSelectAnon = /grant\s+(?:[^;]*\s)?select\s+(?:[^;]*\s)?to\s+anon/i;
    expect(sql).not.toMatch(grantSelectAnon);
  });

  test('does not grant UPDATE to anon', () => {
    expect(sql).not.toMatch(/grant\s+(?:[^;]*\s)?update\s+(?:[^;]*\s)?to\s+anon/i);
  });

  test('does not have a FOR DELETE policy', () => {
    expect(sql).not.toMatch(/for delete/i);
  });

  test('does not grant DELETE privilege', () => {
    expect(sql).not.toMatch(/grant\s+(?:[^;]*\s)?delete/i);
  });

  test('staff SELECT policy uses public.can_view_shipments()', () => {
    expect(sql).toMatch(/for select/i);
    expect(sql).toMatch(/can_view_shipments/i);
  });

  test('staff UPDATE policy uses public.can_view_shipments()', () => {
    expect(sql).toMatch(/for update/i);
    expect(sql).toMatch(/can_view_shipments/i);
  });

  test('does not INSERT INTO shipments, shopping_orders, invoices, or payments', () => {
    expect(sql).not.toMatch(/insert\s+into\s+(?:public\.)?shipments/i);
    expect(sql).not.toMatch(/insert\s+into\s+(?:public\.)?shopping_orders/i);
    expect(sql).not.toMatch(/insert\s+into\s+(?:public\.)?invoices/i);
    expect(sql).not.toMatch(/insert\s+into\s+(?:public\.)?payments/i);
  });

  test('has required columns: id, customer_name, contact_channel, contact_value, service_type', () => {
    expect(sql).toMatch(/\bid\b/);
    expect(sql).toMatch(/\bcustomer_name\b/);
    expect(sql).toMatch(/\bcontact_channel\b/);
    expect(sql).toMatch(/\bcontact_value\b/);
    expect(sql).toMatch(/\bservice_type\b/);
  });

  test('has status column with default new', () => {
    expect(sql).toMatch(/\bstatus\b/);
    expect(sql).toMatch(/default\s+'new'/i);
  });

  test('has converted_shipment_id and converted_shopping_order_id columns', () => {
    expect(sql).toMatch(/\bconverted_shipment_id\b/);
    expect(sql).toMatch(/\bconverted_shopping_order_id\b/);
  });

  test('references shipments and shopping_orders via foreign keys (not inserts)', () => {
    expect(sql).toMatch(/references\s+(?:public\.)?shipments/i);
    expect(sql).toMatch(/references\s+(?:public\.)?shopping_orders/i);
  });

  test('has updated_at trigger', () => {
    expect(sql).toMatch(/trigger/i);
    expect(sql).toMatch(/\bupdated_at\b/);
  });

  test('has indexes for query performance', () => {
    expect(sql).toMatch(/create index/i);
  });
});
