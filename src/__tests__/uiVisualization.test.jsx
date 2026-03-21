/**
 * UI Visualization Tests
 *
 * Renders key pages and components and asserts they display expected structure
 * (headings, nav, main content). Catches regressions in layout and visibility.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock utils (TS) so App/Layout can load under Jest
jest.mock('@/utils', () => ({
  createPageUrl: (name) => `/${name}`,
}));

// Mock Supabase (no real network)
const mockChain = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  then: jest.fn((fn) => fn({ data: [], error: null })),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
};
jest.mock('@/api/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => mockChain),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: {} }, error: null }),
    },
    rpc: jest.fn().mockResolvedValue({ data: 'INV-202602-0001', error: null }),
  },
}));

// Mock auth for protected routes and profile
jest.mock('@/api/auth', () => ({
  auth: {
    me: jest.fn().mockResolvedValue({
      id: 'test-user',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'staff',
      staff_role: 'marketing_manager',
    }),
    isAuthenticated: jest.fn().mockResolvedValue(true),
    updateMe: jest.fn().mockResolvedValue({}),
  },
}));

// Mock db: list/filter/get return empty arrays or null so pages don't throw
jest.mock('@/api/db', () => {
  const mockList = jest.fn().mockResolvedValue([]);
  const mockFilter = jest.fn().mockResolvedValue([]);
  const mockGet = jest.fn().mockResolvedValue(null);
  const mockCreate = jest.fn().mockImplementation((data) => Promise.resolve({ id: '1', ...data }));
  const mockUpdate = jest.fn().mockImplementation((id, data) => Promise.resolve({ id, ...data }));
  const mockDelete = jest.fn().mockResolvedValue(true);
  const entityMock = () => ({
    list: mockList,
    filter: mockFilter,
    get: mockGet,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
  });
  return {
    db: {
      profiles: entityMock(),
      customers: entityMock(),
      shipments: entityMock(),
      shoppingOrders: entityMock(),
      tasks: entityMock(),
      expenses: entityMock(),
      campaigns: entityMock(),
      feedback: entityMock(),
      inventoryItems: entityMock(),
      stockMovements: entityMock(),
      notifications: entityMock(),
      vendors: entityMock(),
      vendorOrders: entityMock(),
      vendorPayments: entityMock(),
      servicePricing: entityMock(),
      surcharges: entityMock(),
      customSegments: entityMock(),
      scheduledReports: entityMock(),
      purchaseOrders: entityMock(),
      goodsReceipts: entityMock(),
      vendorContracts: entityMock(),
      approvalRules: entityMock(),
      approvalHistory: entityMock(),
      auditLogs: { list: mockList, filter: mockFilter, get: mockGet },
      vendorInvitations: entityMock(),
      customerInvoices: entityMock(),
      vendorPayouts: entityMock(),
      companySettings: entityMock(),
      notificationTemplates: entityMock(),
    },
  };
});


import ClientPortal from '@/pages/ClientPortal';
import DocumentGenerator from '@/components/documents/DocumentGenerator';

describe('UI Visualization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChain.then.mockImplementation((fn) => fn({ data: [], error: null }));
  });



  describe('Client brochure page', () => {
    test('renders company profile content without client-side ordering UI', async () => {
      render(
        <MemoryRouter>
          <ClientPortal />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /ထိုင်းမှ မြန်မာသို့/i })).toBeInTheDocument();
      });
      expect(screen.getByText(/KTM က ဘာတွေ လုပ်ပေးလဲ/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Facebook ဖြင့်မေးမြန်းရန်/i })).toBeInTheDocument();
    });
  });

  describe('DocumentGenerator', () => {
    test('renders document types and generate actions', () => {
      const shipment = {
        tracking_number: 'TRK-001',
        customer_name: 'Test Customer',
        delivery_address: 'Yangon',
        items_description: 'Sample items',
        weight_kg: 5,
        price_per_kg: 95,
        total_amount: 500,
      };

      render(<DocumentGenerator shipment={shipment} />);

      expect(screen.getByText(/Shipping Documents/i)).toBeInTheDocument();
      expect(screen.getByText(/Commercial Invoice/i)).toBeInTheDocument();
      expect(screen.getByText(/Packing List/i)).toBeInTheDocument();
      expect(screen.getByText(/Air Waybill/i)).toBeInTheDocument();
      expect(screen.getByText(/Customs Declaration/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Generate All/i })).toBeInTheDocument();
    });
  });
});
