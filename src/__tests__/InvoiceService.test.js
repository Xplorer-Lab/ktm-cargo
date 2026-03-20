/**
 * Unit tests for InvoiceService — critical path coverage.
 *
 * Tests getNextInvoiceNumber (RPC + fallback), createCustomerInvoice (data shape),
 * calculateDueDate, and createInvoiceFromShipment deduplication.
 *
 * Supabase is mocked so tests run without a database.
 */

// ── Mocks ────────────────────────────────────────────────────────────────

// Supabase mock
const mockRpc = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/api/supabaseClient', () => ({
  supabase: {
    rpc: (...args) => mockRpc(...args),
    from: (...args) => mockFrom(...args),
  },
}));

jest.mock('@/api/db', () => {
  const createMock = jest.fn();
  const filterMock = jest.fn();
  const getMock = jest.fn();
  const updateMock = jest.fn().mockImplementation((id, data) => Promise.resolve({ id, ...data }));
  return {
    db: {
      customerInvoices: {
        create: createMock,
        filter: filterMock,
        get: getMock,
        list: jest.fn().mockResolvedValue([]),
        update: updateMock,
      },
    },
    __mocks: { createMock, filterMock, getMock, updateMock },
  };
});

jest.mock('@sentry/react', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
}));

// ── Imports (after mocks) ────────────────────────────────────────────────

import {
  getNextInvoiceNumber,
  generateInvoiceNumberFallback,
  calculateDueDate,
  createCustomerInvoice,
  createInvoiceFromShipment,
  recordPayment,
} from '@/components/invoices/InvoiceService';

import { __mocks } from '@/api/db';

// ── Tests ────────────────────────────────────────────────────────────────

describe('getNextInvoiceNumber', () => {
  afterEach(() => jest.clearAllMocks());

  test('returns RPC result when successful', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'INV-202602-0001', error: null });

    const result = await getNextInvoiceNumber();
    expect(result).toBe('INV-202602-0001');
    expect(mockRpc).toHaveBeenCalledWith('next_invoice_number');
  });

  test('falls back to in-memory number when RPC fails', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'function not found' } });

    const result = await getNextInvoiceNumber();
    expect(result).toMatch(/^INV-\d{6}-\d{4}$/);
  });

  test('fallback increments on each call', () => {
    const a = generateInvoiceNumberFallback();
    const b = generateInvoiceNumberFallback();

    // Both should match the format
    expect(a).toMatch(/^INV-\d{6}-\d{4}$/);
    expect(b).toMatch(/^INV-\d{6}-\d{4}$/);

    // Sequence should increment
    const seqA = parseInt(a.split('-')[2], 10);
    const seqB = parseInt(b.split('-')[2], 10);
    expect(seqB).toBe(seqA + 1);
  });
});

describe('calculateDueDate', () => {
  test('net_7 adds 7 days', () => {
    const result = calculateDueDate('2025-01-01', 'net_7');
    expect(result).toBe('2025-01-08');
  });

  test('net_30 adds 30 days', () => {
    const result = calculateDueDate('2025-01-01', 'net_30');
    expect(result).toBe('2025-01-31');
  });

  test('immediate means same day', () => {
    const result = calculateDueDate('2025-06-15', 'immediate');
    expect(result).toBe('2025-06-15');
  });

  test('defaults to net_7 for unknown term', () => {
    const result = calculateDueDate('2025-03-01', 'unknown_term');
    expect(result).toBe('2025-03-08');
  });
});

describe('createCustomerInvoice', () => {
  afterEach(() => jest.clearAllMocks());

  test('creates draft invoice with correct shape', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'INV-202602-0042', error: null });
    __mocks.createMock.mockResolvedValueOnce({
      id: 'uuid-1',
      invoice_number: 'INV-202602-0042',
      status: 'draft',
    });

    await createCustomerInvoice({
      customer_name: 'Test Customer',
      customer_id: 'cust-1',
      total_amount: 500,
      service_type: 'cargo_medium',
    });

    expect(__mocks.createMock).toHaveBeenCalledTimes(1);
    const arg = __mocks.createMock.mock.calls[0][0];
    expect(arg.invoice_number).toBe('INV-202602-0042');
    expect(arg.status).toBe('draft');
    expect(arg.customer_name).toBe('Test Customer');
    expect(arg.total_amount).toBe(500);
  });

  test('always uses RPC-generated invoice number for creates', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'INV-202602-0043', error: null });
    __mocks.createMock.mockResolvedValueOnce({
      id: 'uuid-2',
      invoice_number: 'INV-202602-0043',
      status: 'draft',
    });

    await createCustomerInvoice({
      invoice_number: 'CUSTOM-001',
      customer_name: 'Custom',
    });

    const arg = __mocks.createMock.mock.calls[0][0];
    expect(arg.invoice_number).toBe('INV-202602-0043');
    expect(mockRpc).toHaveBeenCalledWith('next_invoice_number');
  });
});

describe('createInvoiceFromShipment', () => {
  afterEach(() => jest.clearAllMocks());

  test('returns existing invoice if one exists for shipment', async () => {
    const existingInvoice = { id: 'inv-existing', shipment_id: 'ship-1' };
    __mocks.filterMock.mockResolvedValueOnce([existingInvoice]);

    const result = await createInvoiceFromShipment(
      {
        id: 'ship-1',
        tracking_number: 'T-001',
        customer_name: 'A',
        weight_kg: 5,
        price_per_kg: 100,
      },
      { id: 'cust-1', email: 'a@test.com' }
    );

    expect(result.isNew).toBe(false);
    expect(result.invoice).toBe(existingInvoice);
    expect(result.message).toBe('Invoice already exists');
    expect(__mocks.createMock).not.toHaveBeenCalled();
  });

  test('creates new invoice when none exists for shipment', async () => {
    __mocks.filterMock.mockResolvedValueOnce([]);
    mockRpc.mockResolvedValueOnce({ data: 'INV-202602-0099', error: null });
    __mocks.createMock.mockResolvedValueOnce({
      id: 'inv-new',
      shipment_id: 'ship-2',
      status: 'draft',
    });

    const result = await createInvoiceFromShipment(
      {
        id: 'ship-2',
        tracking_number: 'T-002',
        customer_name: 'B',
        weight_kg: '10',
        price_per_kg: '95',
        insurance_amount: '50',
        packaging_fee: '100',
      },
      { id: 'cust-2', email: 'b@test.com' }
    );

    expect(result.isNew).toBe(true);
    expect(__mocks.createMock).toHaveBeenCalledTimes(1);

    const arg = __mocks.createMock.mock.calls[0][0];
    expect(arg.shipping_amount).toBe(950); // 10 * 95
    expect(arg.insurance_amount).toBe(50);
    expect(arg.packaging_fee).toBe(100);
    expect(arg.subtotal).toBe(1100); // 950 + 50 + 100
  });
});

describe('recordPayment', () => {
  afterEach(() => jest.clearAllMocks());

  test('rejects payment for draft invoices', async () => {
    __mocks.getMock.mockResolvedValueOnce({
      id: 'inv-draft',
      status: 'draft',
      total_amount: 100,
    });

    await expect(recordPayment('inv-draft')).rejects.toThrow(
      'Payment can only be recorded for issued, sent, or partially paid invoices'
    );
  });

  test('records partial payment and keeps invoice partially paid', async () => {
    __mocks.getMock.mockResolvedValueOnce({
      id: 'inv-partial',
      status: 'sent',
      total_amount: 100,
    });
    __mocks.updateMock.mockResolvedValueOnce({
      id: 'inv-partial',
      status: 'partially_paid',
      amount_paid: 50,
      balance_due: 50,
    });

    const result = await recordPayment('inv-partial', { amount: 50 });

    expect(__mocks.updateMock).toHaveBeenCalledWith(
      'inv-partial',
      expect.objectContaining({
        status: 'partially_paid',
        amount_paid: 50,
        balance_due: 50,
      })
    );
    expect(result.status).toBe('partially_paid');
  });

  test('records full payment and marks invoice paid', async () => {
    __mocks.getMock.mockResolvedValueOnce({
      id: 'inv-issued',
      status: 'issued',
      total_amount: 100,
    });
    __mocks.updateMock.mockResolvedValueOnce({
      id: 'inv-issued',
      status: 'paid',
    });

    const result = await recordPayment('inv-issued', {
      payment_method: 'cash',
      reference: 'PAY-123',
    });

    expect(__mocks.updateMock).toHaveBeenCalledWith(
      'inv-issued',
      expect.objectContaining({
        status: 'paid',
        payment_method: 'cash',
        payment_reference: 'PAY-123',
      })
    );
    expect(result.status).toBe('paid');
  });
});
