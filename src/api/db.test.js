import { createEntityClient, createReadOnlyEntityClient } from './db';
import { supabase } from './supabaseClient';

// Mock supabase
jest.mock('./supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('createEntityClient', () => {
  let mockSelect;
  let mockOrder;
  let mockLimit;
  let mockQueryBuilder;
  let mockFilterBuilder;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup chainable mocks
    mockLimit = jest.fn().mockReturnThis();
    mockOrder = jest.fn().mockReturnValue({ limit: mockLimit, then: jest.fn() });
    const mockThen = jest.fn((resolve) => resolve({ data: [], error: null }));

    // Definition of the object returned by .select()
    mockFilterBuilder = {
      order: mockOrder,
      limit: mockLimit,
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnValue({ then: mockThen }),
      then: mockThen,
    };

    mockSelect = jest.fn().mockReturnValue(mockFilterBuilder);

    mockQueryBuilder = {
      select: mockSelect,
      insert: jest.fn().mockReturnValue({
        select: jest
          .fn()
          .mockReturnValue({ single: jest.fn().mockReturnValue({ then: mockThen }) }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest
            .fn()
            .mockReturnValue({ single: jest.fn().mockReturnValue({ then: mockThen }) }),
        }),
      }),
      delete: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ then: mockThen }) }),
    };

    supabase.from.mockReturnValue(mockQueryBuilder);
  });

  test('list() selects specific fields when provided', async () => {
    const client = createEntityClient('test_table', 'id, name');
    await client.list();
    expect(mockSelect).toHaveBeenCalledWith('id, name');
  });

  test('list() selects * by default if not provided', async () => {
    const client = createEntityClient('test_table');
    await client.list();
    expect(mockSelect).toHaveBeenCalledWith('*');
  });

  test('get() selects specific fields', async () => {
    const client = createEntityClient('test_table', 'id, email');
    await client.get(1);
    expect(mockSelect).toHaveBeenCalledWith('id, email');
  });

  test('filter() selects specific fields', async () => {
    const client = createEntityClient('test_table', 'field1');
    await client.filter({ field2: 'value' });
    expect(mockSelect).toHaveBeenCalledWith('field1');
    expect(mockFilterBuilder.eq).toHaveBeenCalledWith('field2', 'value');
  });

  test('filter() supports complex operators', async () => {
    const client = createEntityClient('test_table');

    await client.filter({
      name: { operator: 'ilike', value: '%test%' },
      age: { operator: 'gt', value: 18 },
    });

    expect(mockFilterBuilder.ilike).toHaveBeenCalledWith('name', '%test%');
    expect(mockFilterBuilder.gt).toHaveBeenCalledWith('age', 18);
  });

  test('filter() falls back to equality for simple values', async () => {
    const client = createEntityClient('test_table');
    await client.filter({ status: 'active' });
    expect(mockFilterBuilder.eq).toHaveBeenCalledWith('status', 'active');
  });

  test('create() selects specific fields', async () => {
    // Re-setup specific mock for this test or capture it
    const mockInsertSelect = jest.fn().mockReturnValue({
      single: jest.fn().mockReturnValue({ then: jest.fn((r) => r({ data: {}, error: null })) }),
    });
    mockQueryBuilder.insert.mockReturnValue({ select: mockInsertSelect });

    const client = createEntityClient('test_table', 'id, created_at');
    await client.create({ name: 'test' });
    expect(mockInsertSelect).toHaveBeenCalledWith('id, created_at');
  });

  test('update() selects specific fields', async () => {
    const mockUpdateSelect = jest.fn().mockReturnValue({
      single: jest.fn().mockReturnValue({ then: jest.fn((r) => r({ data: {}, error: null })) }),
    });
    // update: .from().update().eq().select().single()
    mockQueryBuilder.update.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: mockUpdateSelect,
      }),
    });

    const client = createEntityClient('test_table', 'id, updated_at');
    await client.update(1, { name: 'updated' });
    expect(mockUpdateSelect).toHaveBeenCalledWith('id, updated_at');
  });
});

describe('createReadOnlyEntityClient', () => {
  test('has list, get, filter methods', () => {
    const client = createReadOnlyEntityClient('test_ro');
    expect(client.list).toBeDefined();
    expect(client.get).toBeDefined();
    expect(client.filter).toBeDefined();
  });

  test('does NOT have create, update, delete methods', () => {
    const client = createReadOnlyEntityClient('test_ro');
    expect(client.create).toBeUndefined();
    expect(client.update).toBeUndefined();
    expect(client.delete).toBeUndefined();
  });
});
