import { useCallback } from 'react';

export function useExportCSV() {
  const exportToCSV = useCallback((type, { filteredShipments, dailyRevenue, filteredExpenses, customers, campaigns, servicePricing }) => {
    let data, filename, headers;

    switch (type) {
      case 'shipments':
        headers = ['Tracking', 'Customer', 'Service', 'Weight', 'Amount', 'Status', 'Date'];
        data = (filteredShipments || []).map((s) => [
          s.tracking_number,
          s.customer_name,
          s.service_type,
          s.weight_kg,
          s.total_amount,
          s.status,
          s.created_date,
        ]);
        filename = 'shipments_report.csv';
        break;
      case 'revenue':
        headers = ['Date', 'Total Revenue', 'Shipments', 'Shopping'];
        data = (dailyRevenue || []).map((d) => [d.date, d.revenue, d.shipments, d.shopping]);
        filename = 'revenue_report.csv';
        break;
      case 'expenses':
        headers = ['Title', 'Category', 'Amount', 'Date'];
        data = (filteredExpenses || []).map((e) => [e.title, e.category, e.amount, e.date]);
        filename = 'expenses_report.csv';
        break;
      case 'customers':
        headers = ['Name,Phone,Email,Type,Total Spent,Shipments'];
        data = customers.map((c) =>
          `${c.name},${c.phone},${c.email || ''},${c.customer_type || ''},${c.total_spent || 0},${c.total_shipments || 0}`
        );
        filename = 'customers.csv';
        break;
      case 'campaigns':
        headers = ['Name,Type,Segment,Sent,Conversions,Status'];
        data = campaigns.map((c) =>
          `${c.name},${c.campaign_type || ''},${c.target_segment || ''},${c.sent_count || 0},${c.conversion_count || 0},${c.status || ''}`
        );
        filename = 'campaigns.csv';
        break;
      case 'pricing':
        headers = ['Service Type,Display Name,Cost/kg,Price/kg,Min Weight,Max Weight,Active'];
        data = servicePricing.map((p) =>
          `${p.service_type},${p.display_name || ''},${p.cost_per_kg || 0},${p.price_per_kg || 0},${p.min_weight || 0},${p.max_weight || ''},${p.is_active}`
        );
        filename = 'pricing.csv';
        break;
      default:
        return;
    }

    const csvContent = [headers.join(','), ...data.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  }, []);

  const exportQuickCSV = useCallback((type, exportData) => {
    const { customers, campaigns, servicePricing } = exportData;
    switch (type) {
      case 'customers': {
        const csv = ['Name,Phone,Email,Type,Total Spent,Shipments'];
        customers.forEach((c) =>
          csv.push(
            `${c.name},${c.phone},${c.email || ''},${c.customer_type || ''},${c.total_spent || 0},${c.total_shipments || 0}`
          )
        );
        const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'customers.csv';
        a.click();
        break;
      }
      case 'campaigns': {
        const csv = ['Name,Type,Segment,Sent,Conversions,Status'];
        campaigns.forEach((c) =>
          csv.push(
            `${c.name},${c.campaign_type || ''},${c.target_segment || ''},${c.sent_count || 0},${c.conversion_count || 0},${c.status || ''}`
          )
        );
        const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'campaigns.csv';
        a.click();
        break;
      }
      case 'pricing': {
        const csv = [
          'Service Type,Display Name,Cost/kg,Price/kg,Min Weight,Max Weight,Active',
        ];
        servicePricing.forEach((p) =>
          csv.push(
            `${p.service_type},${p.display_name || ''},${p.cost_per_kg || 0},${p.price_per_kg || 0},${p.min_weight || 0},${p.max_weight || ''},${p.is_active}`
          )
        );
        const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'pricing.csv';
        a.click();
        break;
      }
    }
  }, []);

  return { exportToCSV, exportQuickCSV };
}
