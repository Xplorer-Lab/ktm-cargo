const DEFAULT_TIMESTAMP = '2026-03-20T00:00:00.000Z';

const BASE_TABLES = {
  profiles: [],
  company_settings: [
    {
      id: 'company-1',
      company_name: 'KTM Cargo Express',
      tagline: 'Express Logistics',
      logo_url: null,
      created_date: DEFAULT_TIMESTAMP,
      updated_date: DEFAULT_TIMESTAMP,
    },
  ],
  shopping_orders: [],
  shipments: [],
  purchase_orders: [],
  customer_invoices: [],
  feedback: [],
  notifications: [],
  customers: [],
  vendors: [],
  service_pricing: [],
  surcharges: [],
};

const FIXTURES = {
  public: {
    session: null,
    user: null,
    tables: BASE_TABLES,
  },
  'staff-admin': {
    session: {
      access_token: 'e2e-access-token',
      user: {
        id: 'staff-admin-user',
        email: 'ops-admin@ktm.test',
        user_metadata: { full_name: 'Ops Admin' },
      },
    },
    user: {
      id: 'staff-admin-user',
      email: 'ops-admin@ktm.test',
      user_metadata: { full_name: 'Ops Admin' },
    },
    tables: {
      ...BASE_TABLES,
      profiles: [
        {
          id: 'staff-admin-user',
          email: 'ops-admin@ktm.test',
          full_name: 'Ops Admin',
          role: 'admin',
          staff_role: null,
          created_date: DEFAULT_TIMESTAMP,
          updated_date: DEFAULT_TIMESTAMP,
        },
      ],
    },
  },
  'staff-misconfigured': {
    session: {
      access_token: 'e2e-misconfigured-token',
      user: {
        id: 'staff-misconfigured-user',
        email: 'ops-staff@ktm.test',
        user_metadata: { full_name: 'Ops Staff' },
      },
    },
    user: {
      id: 'staff-misconfigured-user',
      email: 'ops-staff@ktm.test',
      user_metadata: { full_name: 'Ops Staff' },
    },
    tables: {
      ...BASE_TABLES,
      profiles: [
        {
          id: 'staff-misconfigured-user',
          email: 'ops-staff@ktm.test',
          full_name: 'Ops Staff',
          role: 'staff',
          staff_role: null,
          created_date: DEFAULT_TIMESTAMP,
          updated_date: DEFAULT_TIMESTAMP,
        },
      ],
    },
  },
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getFixture(fixtureName) {
  return deepClone(FIXTURES[fixtureName] || FIXTURES.public);
}

function sortRows(rows, orderBy) {
  if (!orderBy?.column) return rows;

  return [...rows].sort((left, right) => {
    const leftValue = left?.[orderBy.column];
    const rightValue = right?.[orderBy.column];

    if (leftValue === rightValue) return 0;
    if (leftValue == null) return orderBy.ascending ? -1 : 1;
    if (rightValue == null) return orderBy.ascending ? 1 : -1;

    if (leftValue > rightValue) return orderBy.ascending ? 1 : -1;
    return orderBy.ascending ? -1 : 1;
  });
}

function createMutationResult(data) {
  return {
    select() {
      return {
        single: async () => ({ data: Array.isArray(data) ? data[0] || null : data, error: null }),
        then(resolve, reject) {
          return Promise.resolve({
            data: Array.isArray(data) ? data : [data],
            error: null,
          }).then(resolve, reject);
        },
      };
    },
  };
}

function createUpdateDeleteBuilder(state, tableName, mode, payload = null) {
  const filters = [];

  const matches = (row) => filters.every((filter) => row?.[filter.column] === filter.value);

  const execute = () => {
    const existingRows = [...(state.tables[tableName] || [])];
    const matchedRows = existingRows.filter(matches);

    if (mode === 'update') {
      state.tables[tableName] = existingRows.map((row) =>
        matches(row) ? { ...row, ...payload, updated_date: DEFAULT_TIMESTAMP } : row
      );
      return matchedRows.map((row) => ({ ...row, ...payload, updated_date: DEFAULT_TIMESTAMP }));
    }

    state.tables[tableName] = existingRows.filter((row) => !matches(row));
    return matchedRows;
  };

  const builder = {
    eq(column, value) {
      filters.push({ column, value });
      return builder;
    },
    select() {
      return {
        single: async () => ({ data: execute()[0] || null, error: null }),
        then(resolve, reject) {
          return Promise.resolve({ data: execute(), error: null }).then(resolve, reject);
        },
      };
    },
    single: async () => ({ data: execute()[0] || null, error: null }),
    then(resolve, reject) {
      return Promise.resolve({ data: execute(), error: null }).then(resolve, reject);
    },
  };

  return builder;
}

function createTableClient(state, tableName) {
  const queryState = {
    filters: [],
    orderBy: null,
    limit: null,
  };

  const executeQuery = () => {
    let rows = [...(state.tables[tableName] || [])];

    for (const filter of queryState.filters) {
      rows = rows.filter((row) => row?.[filter.column] === filter.value);
    }

    rows = sortRows(rows, queryState.orderBy);

    if (typeof queryState.limit === 'number') {
      rows = rows.slice(0, queryState.limit);
    }

    return rows;
  };

  const builder = {
    select() {
      return builder;
    },
    eq(column, value) {
      queryState.filters.push({ column, value });
      return builder;
    },
    order(column, { ascending = true } = {}) {
      queryState.orderBy = { column, ascending };
      return builder;
    },
    limit(value) {
      queryState.limit = value;
      return builder;
    },
    single: async () => ({ data: executeQuery()[0] || null, error: null }),
    insert(payload) {
      const rows = (Array.isArray(payload) ? payload : [payload]).map((row, index) => ({
        id: row.id || `${tableName}-${Date.now()}-${index}`,
        created_date: row.created_date || DEFAULT_TIMESTAMP,
        updated_date: row.updated_date || DEFAULT_TIMESTAMP,
        ...row,
      }));
      state.tables[tableName] = [...(state.tables[tableName] || []), ...rows];
      return createMutationResult(rows);
    },
    update(payload) {
      return createUpdateDeleteBuilder(state, tableName, 'update', payload);
    },
    delete() {
      return createUpdateDeleteBuilder(state, tableName, 'delete');
    },
    then(resolve, reject) {
      return Promise.resolve({ data: executeQuery(), error: null }).then(resolve, reject);
    },
  };

  return builder;
}

export function getE2EFixtureFromLocation() {
  if (typeof window === 'undefined') return '';

  try {
    const url = new URL(window.location.href);
    return (url.searchParams.get('__e2e') || '').trim();
  } catch {
    return '';
  }
}

export function createE2ESupabaseClient(fixtureName) {
  const fixture = getFixture(fixtureName);
  const listeners = new Set();
  let session = fixture.session;

  const emitAuthChange = (event) => {
    for (const listener of listeners) {
      listener(event, session);
    }
  };

  return {
    auth: {
      async getSession() {
        return { data: { session }, error: null };
      },
      async getUser() {
        return { data: { user: session?.user || null }, error: null };
      },
      onAuthStateChange(callback) {
        listeners.add(callback);
        return {
          data: {
            subscription: {
              unsubscribe() {
                listeners.delete(callback);
              },
            },
          },
        };
      },
      async signInWithPassword() {
        if (!fixture.user) {
          return {
            data: { user: null, session: null },
            error: new Error('Invalid fixture sign-in'),
          };
        }

        session = fixture.session;
        emitAuthChange('SIGNED_IN');
        return { data: { user: fixture.user, session }, error: null };
      },
      async signOut() {
        session = null;
        emitAuthChange('SIGNED_OUT');
        return { error: null };
      },
    },
    from(tableName) {
      return createTableClient(fixture, tableName);
    },
    rpc() {
      return Promise.resolve({
        data: null,
        error: { message: 'Mock RPC not implemented for this fixture.' },
      });
    },
    channel() {
      return {
        on() {
          return this;
        },
        subscribe() {
          return this;
        },
        unsubscribe() {},
      };
    },
    removeChannel() {},
  };
}
