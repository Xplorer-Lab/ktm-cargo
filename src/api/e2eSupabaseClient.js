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
  vendor_orders: [],
  vendor_payments: [],
  goods_receipts: [],
  vendor_contracts: [],
  approval_rules: [],
  approval_history: [],
  order_journeys: [],
  journey_events: [],
  support_tickets: [],
  proof_of_delivery: [],
  service_pricing: [],
  surcharges: [],
};

const WORKFLOW_TABLES = (() => {
  const staffUserId = 'workflow-staff-user';
  const customerUserId = 'workflow-customer-user';
  const vendorUserId = 'workflow-vendor-user';
  const customerId = 'customer-1';
  const vendorId = 'vendor-1';
  const journeyId = 'journey-1';
  const shoppingOrderId = 'shopping-order-1';
  const shipmentId = 'shipment-1';
  const purchaseOrderId = 'po-1';
  const receiptId = 'receipt-1';
  const shipmentInvoiceId = 'invoice-1';
  const shoppingInvoiceId = 'invoice-2';
  const vendorBillId = 'invoice-3';
  const ticketId = 'ticket-1';

  return {
    ...BASE_TABLES,
    profiles: [
      {
        id: staffUserId,
        email: 'ops.workflow@ktm.test',
        full_name: 'Ops Workflow',
        role: 'admin',
        staff_role: 'operations',
        created_date: DEFAULT_TIMESTAMP,
        updated_date: DEFAULT_TIMESTAMP,
      },
      {
        id: customerUserId,
        email: 'mya.workflow@ktm.test',
        full_name: 'Mya Workflow',
        role: 'customer',
        staff_role: null,
        created_date: DEFAULT_TIMESTAMP,
        updated_date: DEFAULT_TIMESTAMP,
      },
      {
        id: vendorUserId,
        email: 'carrier.workflow@ktm.test',
        full_name: 'Carrier Workflow',
        role: 'customer',
        staff_role: null,
        created_date: DEFAULT_TIMESTAMP,
        updated_date: DEFAULT_TIMESTAMP,
      },
    ],
    customers: [
      {
        id: customerId,
        auth_user_id: customerUserId,
        name: 'Mya Mya',
        phone: '0991234567',
        email: 'mya.workflow@ktm.test',
        customer_type: 'individual',
        address_bangkok: 'Bangkok',
        address_yangon: 'Yangon',
        created_date: DEFAULT_TIMESTAMP,
        updated_date: DEFAULT_TIMESTAMP,
      },
    ],
    vendors: [
      {
        id: vendorId,
        auth_user_id: vendorUserId,
        name: 'Carrier Co',
        vendor_type: 'cargo_carrier',
        contact_name: 'Ops Team',
        phone: '0912345678',
        email: 'carrier.workflow@ktm.test',
        address: 'Bangkok Hub',
        payment_terms: 'net_30',
        bank_name: 'Bangkok Bank',
        bank_account_number: '123-456-7890',
        bank_account_name: 'Carrier Co',
        rating: 4.9,
        on_time_rate: 98,
        status: 'active',
        created_date: DEFAULT_TIMESTAMP,
        updated_date: DEFAULT_TIMESTAMP,
      },
    ],
    shopping_orders: [
      {
        id: shoppingOrderId,
        customer_id: customerId,
        customer_name: 'Mya Mya',
        customer_phone: '0991234567',
        product_name: 'Kitchen appliances',
        product_links: 'https://shop.example/items/kitchen-pack',
        product_details: 'Kitchen appliances bundle',
        quantity: 2,
        estimated_product_cost: 1200,
        actual_product_cost: 1180,
        estimated_weight: 4.5,
        actual_weight: 4.2,
        commission_rate: 10,
        commission_amount: 118,
        shipping_cost: 420,
        total_amount: 1718,
        status: 'delivered',
        payment_status: 'paid',
        order_number: 'SHOP-202603-0001',
        vendor_po_id: purchaseOrderId,
        vendor_po_number: 'PO-202603-0001',
        vendor_id: vendorId,
        vendor_name: 'Carrier Co',
        vendor_cost_per_kg: 90,
        vendor_cost: 378,
        profit: 340,
        margin_percentage: 19.8,
        journey_id: journeyId,
        delivery_address: 'Yangon Downtown',
        created_date: '2026-03-18T02:00:00.000Z',
        updated_date: '2026-03-20T00:00:00.000Z',
      },
      {
        id: 'shopping-order-2',
        customer_id: customerId,
        customer_name: 'Mya Mya',
        customer_phone: '0991234567',
        product_details: 'Hair care package',
        product_links: 'https://shop.example/items/hair-care',
        quantity: 1,
        estimated_product_cost: 600,
        actual_product_cost: 580,
        estimated_weight: 1.2,
        actual_weight: 1.1,
        commission_rate: 10,
        commission_amount: 60,
        shipping_cost: 180,
        total_amount: 840,
        status: 'received',
        payment_status: 'deposit_paid',
        order_number: 'SHOP-202603-0002',
        vendor_po_id: purchaseOrderId,
        vendor_po_number: 'PO-202603-0001',
        vendor_id: vendorId,
        vendor_name: 'Carrier Co',
        vendor_cost_per_kg: 90,
        vendor_cost: 0,
        profit: 180,
        margin_percentage: 21.4,
        journey_id: journeyId,
        delivery_address: 'Yangon Downtown',
        created_date: '2026-03-19T05:00:00.000Z',
        updated_date: DEFAULT_TIMESTAMP,
      },
    ],
    shipments: [
      {
        id: shipmentId,
        customer_id: customerId,
        customer_name: 'Mya Mya',
        customer_phone: '0991234567',
        service_type: 'cargo_medium',
        weight_kg: 4.2,
        items_description: 'Kitchen appliances bundle',
        tracking_number: 'SHP-202603-0001',
        price_per_kg: 120,
        cost_basis: 90,
        total_amount: 504,
        profit: 126,
        insurance_amount: 0,
        status: 'delivered',
        payment_status: 'paid',
        estimated_delivery: '2026-03-21',
        actual_delivery: '2026-03-20',
        pickup_address: 'Bangkok Warehouse',
        delivery_address: 'Yangon Downtown',
        vendor_po_id: purchaseOrderId,
        vendor_id: vendorId,
        vendor_name: 'Carrier Co',
        vendor_po_number: 'PO-202603-0001',
        vendor_cost_per_kg: 90,
        vendor_total_cost: 378,
        margin_percentage: 25,
        journey_id: journeyId,
        origin: 'Bangkok',
        destination: 'Yangon',
        created_date: '2026-03-18T01:00:00.000Z',
        updated_date: '2026-03-20T00:00:00.000Z',
      },
      {
        id: 'shipment-2',
        customer_id: customerId,
        customer_name: 'Mya Mya',
        customer_phone: '0991234567',
        service_type: 'cargo_light',
        weight_kg: 1.4,
        items_description: 'Hair care package',
        tracking_number: 'SHP-202603-0002',
        price_per_kg: 120,
        cost_basis: 90,
        total_amount: 168,
        profit: 42,
        insurance_amount: 0,
        status: 'in_transit',
        payment_status: 'unpaid',
        estimated_delivery: '2026-03-23',
        pickup_address: 'Bangkok Warehouse',
        delivery_address: 'Yangon Downtown',
        vendor_po_id: purchaseOrderId,
        vendor_id: vendorId,
        vendor_name: 'Carrier Co',
        vendor_po_number: 'PO-202603-0001',
        vendor_cost_per_kg: 90,
        vendor_total_cost: 126,
        margin_percentage: 25,
        journey_id: journeyId,
        origin: 'Bangkok',
        destination: 'Yangon',
        created_date: '2026-03-19T04:00:00.000Z',
        updated_date: DEFAULT_TIMESTAMP,
      },
    ],
    purchase_orders: [
      {
        id: purchaseOrderId,
        vendor_id: vendorId,
        vendor_name: 'Carrier Co',
        po_number: 'PO-202603-0001',
        order_date: '2026-03-18',
        expected_delivery: '2026-03-21',
        items: JSON.stringify([
          { name: 'Kitchen appliances bundle', quantity: 1, unit_price: 378 },
          { name: 'Hair care package', quantity: 1, unit_price: 126 },
        ]),
        total_weight_kg: 6,
        allocated_weight_kg: 5.6,
        remaining_weight_kg: 0.4,
        total_amount: 504,
        status: 'approved',
        notes: 'Workflow fixture PO for cross-border cargo',
        created_date: '2026-03-18T00:00:00.000Z',
        updated_date: DEFAULT_TIMESTAMP,
      },
    ],
    goods_receipts: [
      {
        id: receiptId,
        receipt_number: 'GR-202603-0001',
        po_id: purchaseOrderId,
        po_number: 'PO-202603-0001',
        vendor_id: vendorId,
        vendor_name: 'Carrier Co',
        received_by: 'Ops Workflow',
        received_date: '2026-03-20',
        items_received: JSON.stringify([
          {
            item_name: 'Kitchen appliances bundle',
            ordered_qty: 1,
            received_qty: 1,
            condition: 'good',
          },
          { item_name: 'Hair care package', ordered_qty: 1, received_qty: 1, condition: 'good' },
        ]),
        total_value: 504,
        quality_status: 'passed',
        discrepancy_notes: '',
        created_date: DEFAULT_TIMESTAMP,
        updated_date: DEFAULT_TIMESTAMP,
      },
    ],
    customer_invoices: [
      {
        id: shipmentInvoiceId,
        invoice_number: 'INV-202603-0001',
        invoice_type: 'shipment',
        shipment_id: shipmentId,
        tracking_number: 'SHP-202603-0001',
        customer_id: customerId,
        customer_name: 'Mya Mya',
        customer_email: 'mya.workflow@ktm.test',
        customer_phone: '0991234567',
        customer_address: 'Yangon Downtown',
        invoice_date: '2026-03-20',
        due_date: '2026-03-27',
        service_type: 'cargo_medium',
        weight_kg: 4.2,
        price_per_kg: 120,
        shipping_amount: 504,
        insurance_amount: 0,
        packaging_fee: 0,
        product_cost: 0,
        commission_amount: 0,
        subtotal: 504,
        tax_rate: 0,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: 504,
        amount_paid: 504,
        balance_due: 0,
        payment_terms: 'net_7',
        payment_method: 'cash',
        payment_date: '2026-03-20',
        status: 'paid',
        notes: 'Shipment invoice for delivered cargo',
        created_date: '2026-03-20T00:00:00.000Z',
        updated_date: DEFAULT_TIMESTAMP,
      },
      {
        id: shoppingInvoiceId,
        invoice_number: 'INV-202603-0002',
        invoice_type: 'shopping_order',
        order_id: shoppingOrderId,
        order_number: 'SHOP-202603-0001',
        customer_id: customerId,
        customer_name: 'Mya Mya',
        customer_email: 'mya.workflow@ktm.test',
        customer_phone: '0991234567',
        customer_address: 'Yangon Downtown',
        invoice_date: '2026-03-19',
        due_date: '2026-03-26',
        service_type: 'shopping_service',
        weight_kg: 4.2,
        price_per_kg: 120,
        shipping_amount: 420,
        insurance_amount: 0,
        packaging_fee: 0,
        product_cost: 1180,
        commission_amount: 118,
        subtotal: 1718,
        tax_rate: 0,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: 1718,
        amount_paid: 1718,
        balance_due: 0,
        payment_terms: 'net_7',
        payment_method: 'bank_transfer',
        payment_date: '2026-03-19',
        status: 'paid',
        notes: 'Shopping proxy invoice',
        created_date: '2026-03-19T00:00:00.000Z',
        updated_date: DEFAULT_TIMESTAMP,
      },
      {
        id: vendorBillId,
        invoice_number: 'BILL-202603-0001',
        invoice_type: 'vendor_bill',
        po_id: purchaseOrderId,
        po_number: 'PO-202603-0001',
        receipt_id: receiptId,
        receipt_number: 'GR-202603-0001',
        vendor_id: vendorId,
        vendor_name: 'Carrier Co',
        invoice_date: '2026-03-20',
        due_date: '2026-04-19',
        items: JSON.stringify([{ description: 'Thailand to Myanmar cargo handling', amount: 504 }]),
        subtotal: 504,
        tax_rate: 0,
        tax_amount: 0,
        shipping_cost: 0,
        total_amount: 504,
        payment_terms: 'net_30',
        status: 'pending',
        notes: 'Vendor bill generated from goods receipt',
        created_date: '2026-03-20T00:00:00.000Z',
        updated_date: DEFAULT_TIMESTAMP,
      },
    ],
    feedback: [
      {
        id: 'feedback-1',
        shipment_id: shipmentId,
        journey_id: journeyId,
        customer_id: customerId,
        customer_name: 'Mya Mya',
        customer_email: 'mya.workflow@ktm.test',
        service_type: 'cargo_medium',
        feedback_kind: 'delivery_feedback',
        order_reference_type: 'shipment',
        order_reference_id: shipmentId,
        status: 'pending',
        rating: null,
        created_date: DEFAULT_TIMESTAMP,
        updated_date: DEFAULT_TIMESTAMP,
      },
    ],
    notifications: [
      {
        id: 'notification-1',
        recipient_email: 'mya.workflow@ktm.test',
        title: 'Shipment delivered',
        message: 'Your shipment SHP-202603-0001 has been delivered.',
        status: 'unread',
        created_date: DEFAULT_TIMESTAMP,
        updated_date: DEFAULT_TIMESTAMP,
      },
    ],
    vendor_orders: [
      {
        id: 'vendor-order-1',
        vendor_id: vendorId,
        vendor_name: 'Carrier Co',
        order_number: 'VOR-202603-0001',
        status: 'sent',
        total_amount: 504,
        created_date: '2026-03-20T00:00:00.000Z',
        updated_date: DEFAULT_TIMESTAMP,
      },
    ],
    vendor_payments: [
      {
        id: 'vendor-payment-1',
        vendor_id: vendorId,
        reference_number: 'PAY-202603-0001',
        due_date: '2026-04-19',
        payment_date: '2026-04-05',
        total_amount: 504,
        status: 'paid',
        created_date: '2026-04-05T00:00:00.000Z',
        updated_date: DEFAULT_TIMESTAMP,
      },
    ],
    support_tickets: [
      {
        id: ticketId,
        ticket_number: 'TKT-202603-0001',
        customer_id: customerId,
        customer_name: 'Mya Mya',
        customer_email: 'mya.workflow@ktm.test',
        subject: 'Need delivery update',
        category: 'tracking',
        priority: 'medium',
        status: 'pending',
        source: 'portal',
        message: 'Please confirm the latest delivery status.',
        created_date: DEFAULT_TIMESTAMP,
        updated_date: DEFAULT_TIMESTAMP,
      },
    ],
    approval_rules: [
      {
        id: 'approval-rule-1',
        name: 'Default PO rule',
        threshold_amount: 1000,
        approver_name: 'Ops Manager',
        created_date: DEFAULT_TIMESTAMP,
        updated_date: DEFAULT_TIMESTAMP,
      },
    ],
    approval_history: [
      {
        id: 'approval-history-1',
        po_id: purchaseOrderId,
        status: 'approved',
        approver_name: 'Ops Manager',
        approved_at: DEFAULT_TIMESTAMP,
        created_date: DEFAULT_TIMESTAMP,
        updated_date: DEFAULT_TIMESTAMP,
      },
    ],
    order_journeys: [
      {
        id: journeyId,
        journey_number: 'JRNY-202603-0001',
        mode: 'shopping_proxy',
        current_stage: 'delivered',
        payment_status: 'paid',
        customer_id: customerId,
        customer_name: 'Mya Mya',
        customer_email: 'mya.workflow@ktm.test',
        shopping_order_id: shoppingOrderId,
        shipment_id: shipmentId,
        purchase_order_id: purchaseOrderId,
        status: 'active',
        created_date: '2026-03-18T00:00:00.000Z',
        updated_date: DEFAULT_TIMESTAMP,
      },
    ],
    journey_events: [
      {
        id: 'journey-event-1',
        journey_id: journeyId,
        event_type: 'stage_transition',
        stage_from: 'in_transit',
        stage_to: 'delivered',
        entity_type: 'shipment',
        event_status: 'recorded',
        payload: JSON.stringify({ shipment_id: shipmentId }),
        created_date: DEFAULT_TIMESTAMP,
        updated_date: DEFAULT_TIMESTAMP,
      },
    ],
    proof_of_delivery: [
      {
        id: 'pod-1',
        journey_id: journeyId,
        shipment_id: shipmentId,
        customer_id: customerId,
        proof_type: 'photo',
        status: 'captured',
        created_date: DEFAULT_TIMESTAMP,
        updated_date: DEFAULT_TIMESTAMP,
      },
    ],
  };
})();

function createWorkflowFixture(sessionUserId, email, fullName) {
  return {
    session: {
      access_token: `${sessionUserId}-access-token`,
      user: {
        id: sessionUserId,
        email,
        user_metadata: { full_name: fullName },
      },
    },
    user: {
      id: sessionUserId,
      email,
      user_metadata: { full_name: fullName },
    },
    tables: WORKFLOW_TABLES,
    rpc: {
      next_invoice_number: 'INV-202603-0001',
      my_customer_id: 'customer-1',
      my_vendor_id: 'vendor-1',
    },
  };
}

const WORKFLOW_STAFF = createWorkflowFixture(
  'workflow-staff-user',
  'ops.workflow@ktm.test',
  'Ops Workflow'
);

const WORKFLOW_CUSTOMER = createWorkflowFixture(
  'workflow-customer-user',
  'mya.workflow@ktm.test',
  'Mya Workflow'
);

const WORKFLOW_VENDOR = createWorkflowFixture(
  'workflow-vendor-user',
  'carrier.workflow@ktm.test',
  'Carrier Workflow'
);

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
  'staff-login': {
    ...WORKFLOW_STAFF,
    initialSession: null,
  },
  'customer-login': {
    ...WORKFLOW_CUSTOMER,
    initialSession: null,
  },
  'workflow-staff': WORKFLOW_STAFF,
  'workflow-customer': WORKFLOW_CUSTOMER,
  'workflow-vendor': WORKFLOW_VENDOR,
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
  let session = fixture.initialSession !== undefined ? fixture.initialSession : fixture.session;

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
    rpc(name) {
      const rpcValue = fixture.rpc?.[name];
      if (rpcValue === undefined) {
        return Promise.resolve({
          data: null,
          error: { message: 'Mock RPC not implemented for this fixture.' },
        });
      }

      return Promise.resolve({
        data:
          typeof rpcValue === 'function' ? rpcValue({ session, tables: fixture.tables }) : rpcValue,
        error: null,
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
