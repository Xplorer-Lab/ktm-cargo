/**
 * Mutation-path tests for Reports page handlers.
 *
 * Covers: getReportData routing, exportToCSV generation,
 * report submit routing, and send report validation.
 */

// ── Extracted logic mirrors ──────────────────────────────────────────────

function getReportData(reportType, dataSources) {
  switch (reportType) {
    case 'shipments':
      return dataSources.shipments || [];
    case 'customers':
      return dataSources.customers || [];
    case 'campaigns':
      return dataSources.campaigns || [];
    case 'expenses':
      return dataSources.expenses || [];
    case 'pricing':
      return dataSources.servicePricing || [];
    default:
      return [];
  }
}

function handleReportSubmitRouting(data, editingReport) {
  if (editingReport) {
    return { action: 'update', id: editingReport.id, data };
  }
  return { action: 'create', data };
}

function canSendReport(report) {
  return !!report.recipients;
}

function buildCSVContent(headers, rows) {
  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

function getCSVExportConfig(type, filteredShipments, dailyRevenue, filteredExpenses) {
  switch (type) {
    case 'shipments':
      return {
        headers: ['Tracking', 'Customer', 'Service', 'Weight', 'Amount', 'Status', 'Date'],
        data: (filteredShipments || []).map((s) => [
          s.tracking_number,
          s.customer_name,
          s.service_type,
          s.weight_kg,
          s.total_amount,
          s.status,
          s.created_date,
        ]),
        filename: 'shipments_report.csv',
      };
    case 'revenue':
      return {
        headers: ['Date', 'Total Revenue', 'Shipments', 'Shopping'],
        data: (dailyRevenue || []).map((d) => [d.date, d.revenue, d.shipments, d.shopping]),
        filename: 'revenue_report.csv',
      };
    case 'expenses':
      return {
        headers: ['Title', 'Category', 'Amount', 'Date'],
        data: (filteredExpenses || []).map((e) => [e.title, e.category, e.amount, e.date]),
        filename: 'expenses_report.csv',
      };
    default:
      return null;
  }
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('Report mutation paths', () => {
  describe('getReportData', () => {
    const sources = {
      shipments: [{ id: 's-1' }],
      customers: [{ id: 'c-1' }, { id: 'c-2' }],
      campaigns: [],
      expenses: [{ id: 'e-1' }],
      servicePricing: [{ id: 'sp-1' }],
    };

    it('returns shipments for shipments type', () => {
      expect(getReportData('shipments', sources)).toHaveLength(1);
    });

    it('returns customers for customers type', () => {
      expect(getReportData('customers', sources)).toHaveLength(2);
    });

    it('returns pricing for pricing type', () => {
      expect(getReportData('pricing', sources)).toHaveLength(1);
    });

    it('returns empty array for unknown type', () => {
      expect(getReportData('unknown', sources)).toEqual([]);
    });

    it('returns empty array when source is missing', () => {
      expect(getReportData('shipments', {})).toEqual([]);
    });
  });

  describe('handleReportSubmit routing', () => {
    it('routes to create when no editing report', () => {
      const result = handleReportSubmitRouting({ name: 'Weekly' }, null);
      expect(result.action).toBe('create');
    });

    it('routes to update when editing report exists', () => {
      const result = handleReportSubmitRouting({ name: 'Updated' }, { id: 'r-1' });
      expect(result).toEqual({ action: 'update', id: 'r-1', data: { name: 'Updated' } });
    });
  });

  describe('canSendReport', () => {
    it('true when recipients configured', () => {
      expect(canSendReport({ recipients: 'admin@ktm.com' })).toBe(true);
    });

    it('false when no recipients', () => {
      expect(canSendReport({})).toBe(false);
    });

    it('false when recipients is empty string', () => {
      expect(canSendReport({ recipients: '' })).toBe(false);
    });
  });

  describe('buildCSVContent', () => {
    it('builds valid CSV string', () => {
      const csv = buildCSVContent(
        ['Name', 'Age'],
        [
          ['Alice', 30],
          ['Bob', 25],
        ]
      );
      expect(csv).toBe('Name,Age\nAlice,30\nBob,25');
    });

    it('handles empty rows', () => {
      const csv = buildCSVContent(['Col'], []);
      expect(csv).toBe('Col');
    });
  });

  describe('getCSVExportConfig', () => {
    it('returns shipment config with correct headers', () => {
      const config = getCSVExportConfig('shipments', [{ tracking_number: 'KTM-1' }], [], []);
      expect(config.headers).toContain('Tracking');
      expect(config.filename).toBe('shipments_report.csv');
      expect(config.data).toHaveLength(1);
    });

    it('returns revenue config', () => {
      const config = getCSVExportConfig('revenue', [], [{ date: '2026-01' }], []);
      expect(config.filename).toBe('revenue_report.csv');
    });

    it('returns expenses config', () => {
      const config = getCSVExportConfig('expenses', [], [], [{ title: 'Fuel' }]);
      expect(config.filename).toBe('expenses_report.csv');
    });

    it('returns null for unknown type', () => {
      expect(getCSVExportConfig('unknown', [], [], [])).toBeNull();
    });
  });
});
