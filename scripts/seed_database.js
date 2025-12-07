import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple .env parser
function loadEnv() {
  try {
    const envPath = path.resolve(__dirname, '../.env');
    if (!fs.existsSync(envPath)) {
      console.warn('.env file not found, checking process.env');
      return;
    }
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach((line) => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  } catch (e) {
    console.error('Error loading .env:', e);
  }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Missing Supabase credentials. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are in .env'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Mock Data Generators ---

const firstNames = [
  'John',
  'Jane',
  'Michael',
  'Sarah',
  'David',
  'Emily',
  'Robert',
  'Jessica',
  'William',
  'Ashley',
  'James',
  'Linda',
  'George',
  'Mary',
  'Somsak',
  'Nipa',
  'Aung',
  'Kyaw',
  'Su',
  'Myint',
];
const lastNames = [
  'Smith',
  'Johnson',
  'Brown',
  'Davis',
  'Wilson',
  'Taylor',
  'Anderson',
  'Thomas',
  'Jackson',
  'White',
  'Harris',
  'Martin',
  'Thompson',
  'Garcia',
  'Martinez',
  'Robinson',
  'Clark',
  'Rodriguez',
  'Lewis',
  'Lee',
];
const cities = ['Bangkok', 'Yangon', 'Mandalay', 'Chiang Mai', 'Phuket', 'Naypyidaw'];
const streets = [
  'Sukhumvit',
  'Silom',
  'Pyay Road',
  'Kabar Aye Pagoda Road',
  'Nimman',
  'Beach Road',
];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function generatePhone() {
  return `+66${getRandomInt(80000000, 99999999)}`;
}

function generateEmail(name) {
  return `${name.toLowerCase().replace(' ', '.')}@example.com`;
}

// --- Seeding Functions ---

async function seedVendors() {
  console.log('Seeding Vendors...');
  const vendors = [
    {
      name: 'Thai Cargo Express',
      vendor_type: 'cargo_carrier',
      contact_name: 'Somsak C.',
      phone: generatePhone(),
      email: 'contact@thaicargo.com',
      status: 'active',
      cost_per_kg: 45,
      monthly_capacity_kg: 5000,
    },
    {
      name: 'Yangon Logistics',
      vendor_type: 'cargo_carrier',
      contact_name: 'Kyaw M.',
      phone: generatePhone(),
      email: 'info@yangonlogistics.mm',
      status: 'active',
      cost_per_kg: 50,
      monthly_capacity_kg: 3000,
    },
    {
      name: 'BKK Packaging Solutions',
      vendor_type: 'packaging',
      contact_name: 'Nipa T.',
      phone: generatePhone(),
      email: 'sales@bkkpack.com',
      status: 'active',
    },
    {
      name: 'Siam Supplies Co.',
      vendor_type: 'supplier',
      contact_name: 'David W.',
      phone: generatePhone(),
      email: 'david@siamsupplies.com',
      status: 'active',
    },
    {
      name: 'Myanmar Express',
      vendor_type: 'cargo_carrier',
      contact_name: 'Aung K.',
      phone: generatePhone(),
      email: 'aung@myanmarexpress.com',
      status: 'inactive',
      cost_per_kg: 55,
      monthly_capacity_kg: 2000,
    },
    {
      name: 'Global Freight Partners',
      vendor_type: 'cargo_carrier',
      contact_name: 'Sarah J.',
      phone: generatePhone(),
      email: 'sarah@gfp.com',
      status: 'active',
      cost_per_kg: 48,
      monthly_capacity_kg: 10000,
    },
  ];

  // Check for existing vendors by email to avoid duplicates (since email isn't unique in schema)
  const { data: existingVendors } = await supabase.from('vendors').select('email');
  const existingEmails = new Set(existingVendors?.map((v) => v.email) || []);

  const newVendors = vendors.filter((v) => !existingEmails.has(v.email));

  if (newVendors.length > 0) {
    const { data, error } = await supabase.from('vendors').insert(newVendors).select();
    if (error) console.error('Error seeding vendors:', error);
    else console.log(`Seeded ${data.length} new vendors.`);

    // Return all vendors (existing + new) for linking
    const { data: allVendors } = await supabase.from('vendors').select('*');
    return allVendors;
  } else {
    console.log('Vendors already exist, skipping.');
    const { data: allVendors } = await supabase.from('vendors').select('*');
    return allVendors;
  }
}

async function seedCustomers() {
  console.log('Seeding Customers...');
  const customers = [];
  for (let i = 0; i < 15; i++) {
    const firstName = getRandomElement(firstNames);
    const lastName = getRandomElement(lastNames);
    const name = `${firstName} ${lastName}`;
    customers.push({
      name,
      phone: generatePhone(),
      email: generateEmail(name),
      customer_type: getRandomElement(['individual', 'online_shopper', 'sme_importer']),
      address_bangkok: `${getRandomInt(1, 999)} ${getRandomElement(streets)}, Bangkok`,
      address_yangon: `${getRandomInt(1, 999)} ${getRandomElement(streets)}, Yangon`,
      referral_code: `REF-${Date.now().toString().slice(-6)}-${getRandomInt(100, 999)}`,
    });
  }

  // Check for existing customers by email
  const { data: existingCustomers } = await supabase.from('customers').select('email');
  const existingEmails = new Set(existingCustomers?.map((c) => c.email) || []);

  const newCustomers = customers.filter((c) => !existingEmails.has(c.email));

  if (newCustomers.length > 0) {
    const { data, error } = await supabase.from('customers').insert(newCustomers).select();
    if (error) console.error('Error seeding customers:', error);
    else console.log(`Seeded ${data.length} new customers.`);

    const { data: allCustomers } = await supabase.from('customers').select('*');
    return allCustomers;
  } else {
    console.log('Customers already exist, skipping.');
    const { data: allCustomers } = await supabase.from('customers').select('*');
    return allCustomers;
  }
}

async function seedInventory() {
  console.log('Seeding Inventory...');
  const items = [
    { name: 'iPhone 15 Pro Case', sku: 'ACC-001', quantity: 100, unit: 'pcs' },
    { name: 'Samsung Galaxy S24 Charger', sku: 'ACC-002', quantity: 50, unit: 'pcs' },
    { name: 'Nike Air Max 90', sku: 'SHOE-001', quantity: 20, unit: 'pair' },
    { name: 'Adidas Ultraboost', sku: 'SHOE-002', quantity: 15, unit: 'pair' },
    { name: "Levi's 501 Jeans", sku: 'CLOTH-001', quantity: 30, unit: 'pcs' },
    { name: 'Uniqlo T-Shirt', sku: 'CLOTH-002', quantity: 200, unit: 'pcs' },
    { name: 'Cosmetic Set A', sku: 'BEAUTY-001', quantity: 40, unit: 'set' },
    { name: 'Vitamin C Serum', sku: 'BEAUTY-002', quantity: 60, unit: 'bottle' },
  ];

  const { data, error } = await supabase
    .from('inventory_items')
    .upsert(items, { onConflict: 'sku' })
    .select();
  if (error) console.error('Error seeding inventory:', error);
  else console.log(`Seeded ${data.length} inventory items.`);
  return data;
}

async function seedPurchaseOrders(vendors) {
  console.log('Seeding Purchase Orders...');
  const pos = [];
  const cargoVendors = vendors.filter((v) => v.vendor_type === 'cargo_carrier');

  if (cargoVendors.length === 0) return [];

  for (let i = 0; i < 10; i++) {
    const vendor = getRandomElement(cargoVendors);
    const totalWeight = getRandomInt(100, 1000);
    const allocated = getRandomInt(0, totalWeight);
    const status = getRandomElement(['draft', 'pending_approval', 'approved', 'sent', 'received']);

    pos.push({
      po_number: `PO-${new Date().getFullYear()}-${getRandomInt(1000, 9999)}`,
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      status: status,
      total_amount: totalWeight * (vendor.cost_per_kg || 40),
      created_date: new Date(Date.now() - getRandomInt(0, 30) * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  const { data, error } = await supabase
    .from('purchase_orders')
    .upsert(pos, { onConflict: 'po_number' })
    .select();
  if (error) console.error('Error seeding purchase orders:', error);
  else console.log(`Seeded ${data.length} purchase orders.`);
  return data;
}

async function seedShipments(customers) {
  console.log('Seeding Shipments...');
  const shipments = [];

  for (let i = 0; i < 20; i++) {
    const customer = getRandomElement(customers);
    const weight = getRandomFloat(1, 50);
    const pricePerKg = 95;
    const totalAmount = weight * pricePerKg;
    const status = getRandomElement([
      'pending',
      'confirmed',
      'picked_up',
      'in_transit',
      'customs',
      'delivered',
    ]);
    const dateOffset = getRandomInt(0, 60);
    const createdDate = new Date(Date.now() - dateOffset * 24 * 60 * 60 * 1000);

    shipments.push({
      tracking_number: `TRK${getRandomInt(100000, 999999)}`,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      status: status,
      origin: 'Bangkok',
      destination: 'Yangon',
      weight_kg: weight,
      items_description: getRandomElement([
        'Clothes',
        'Electronics',
        'Cosmetics',
        'Spare Parts',
        'Food Supplements',
      ]),
      service_type: getRandomElement(['standard', 'express']),
      price_per_kg: pricePerKg,
      total_amount: totalAmount,
      payment_status: getRandomElement(['unpaid', 'paid']),
      created_date: createdDate.toISOString(),
      pickup_date: status !== 'pending' ? createdDate.toISOString() : null,
      delivery_address: customer.address_yangon,
    });
  }

  const { data, error } = await supabase
    .from('shipments')
    .upsert(shipments, { onConflict: 'tracking_number' })
    .select();
  if (error) console.error('Error seeding shipments:', error);
  else console.log(`Seeded ${data.length} shipments.`);
  return data;
}

async function seedShoppingOrders(customers) {
  console.log('Seeding Shopping Orders...');
  const orders = [];

  for (let i = 0; i < 15; i++) {
    const customer = getRandomElement(customers);
    const amount = getRandomFloat(500, 5000);

    orders.push({
      order_number: `ORD-${getRandomInt(10000, 99999)}`,
      customer_id: customer.id,
      items_count: getRandomInt(1, 5),
      product_details: getRandomElement(['Lazada Order', 'Shopee Order', 'Direct Supplier']),
      estimated_product_cost: amount,
      total_amount: amount * 1.1, // +10% commission
      status: getRandomElement([
        'pending',
        'purchasing',
        'purchased',
        'warehouse_received',
        'shipping',
        'delivered',
      ]),
      payment_status: getRandomElement(['unpaid', 'paid']),
      created_date: new Date(Date.now() - getRandomInt(0, 30) * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  const { data, error } = await supabase
    .from('shopping_orders')
    .upsert(orders, { onConflict: 'order_number' })
    .select();
  if (error) console.error('Error seeding shopping orders:', error);
  else console.log(`Seeded ${data.length} shopping orders.`);
  return data;
}

async function seedInvoices(shipments, shoppingOrders) {
  console.log('Seeding Invoices...');
  const invoices = [];

  // Create invoices for some shipments
  const shippedItems = shipments.filter((s) =>
    ['delivered', 'in_transit', 'customs'].includes(s.status)
  );
  for (const shipment of shippedItems) {
    if (Math.random() > 0.3) {
      // 70% chance to have an invoice
      invoices.push({
        invoice_number: `INV-${shipment.tracking_number}`,
        customer_id: shipment.customer_id,
        customer_name: shipment.customer_name,
        customer_phone: shipment.customer_phone,
        tracking_number: shipment.tracking_number,
        invoice_type: 'shipment',
        total_amount: shipment.total_amount,
        status: shipment.payment_status === 'paid' ? 'paid' : 'issued',
        invoice_date: shipment.created_date,
        due_date: new Date(
          new Date(shipment.created_date).getTime() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        payment_date: shipment.payment_status === 'paid' ? new Date().toISOString() : null,
        payment_method:
          shipment.payment_status === 'paid'
            ? getRandomElement(['bank_transfer', 'cash', 'credit_card'])
            : null,
        weight_kg: shipment.weight_kg,
        price_per_kg: shipment.price_per_kg,
        service_type: shipment.service_type,
      });
    }
  }

  // Create invoices for some shopping orders
  const purchasedOrders = shoppingOrders.filter((o) =>
    ['purchased', 'warehouse_received', 'shipping', 'delivered'].includes(o.status)
  );
  for (const order of purchasedOrders) {
    if (Math.random() > 0.3) {
      invoices.push({
        invoice_number: `INV-${order.order_number}`,
        customer_id: order.customer_id,
        order_number: order.order_number,
        invoice_type: 'shopping_order',
        total_amount: order.total_amount,
        status: order.payment_status === 'paid' ? 'paid' : 'issued',
        invoice_date: order.created_date,
        due_date: new Date(
          new Date(order.created_date).getTime() + 3 * 24 * 60 * 60 * 1000
        ).toISOString(),
        payment_date: order.payment_status === 'paid' ? new Date().toISOString() : null,
        payment_method:
          order.payment_status === 'paid' ? getRandomElement(['bank_transfer', 'cash']) : null,
        product_cost: order.estimated_product_cost,
        // commission_amount: order.total_amount - order.estimated_product_cost, // Column missing in DB
      });
    }
  }

  const { data, error } = await supabase
    .from('customer_invoices')
    .upsert(
      invoices.map((inv) => ({
        invoice_number: inv.invoice_number,
        customer_id: inv.customer_id,
        status: inv.status,
        total_amount: inv.total_amount,
        created_date: inv.invoice_date || new Date().toISOString(),
      })),
      { onConflict: 'invoice_number' }
    )
    .select();
  if (error) console.error('Error seeding invoices:', error);
  else console.log(`Seeded ${data.length} invoices.`);
  return data;
}

async function seedCompanySettings() {
  console.log('Seeding Company Settings...');
  const settings = {
    company_name: 'Bangkok-Yangon Cargo & Shopping Services',
    address: '123 Sukhumvit Road, Bangkok, Thailand',
    contact_email: 'support@bkkygncargo.com',
    contact_phone: '+66 81 234 5678',
    tagline: 'Fast, Reliable, and Affordable Logistics',
  };

  // Check if settings exist
  const { data: existing } = await supabase.from('company_settings').select('*').limit(1);

  if (!existing || existing.length === 0) {
    const { error } = await supabase.from('company_settings').insert(settings);
    if (error) console.error('Error seeding company settings:', error);
    else console.log('Seeded company settings.');
  } else {
    console.log('Company settings already exist.');
  }
}

async function main() {
  console.log('Starting database seed...');

  try {
    const vendors = await seedVendors();
    const customers = await seedCustomers();
    await seedInventory();
    await seedCompanySettings();

    if (vendors && vendors.length > 0) {
      await seedPurchaseOrders(vendors);
    }

    if (customers && customers.length > 0) {
      const shipments = await seedShipments(customers);
      const shoppingOrders = await seedShoppingOrders(customers);

      if (shipments && shoppingOrders) {
        await seedInvoices(shipments, shoppingOrders);
      }
    }

    console.log('Database seeding completed successfully!');
  } catch (err) {
    console.error('Unexpected error during seeding:', err);
  }
}

main();
