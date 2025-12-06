import { sendMessengerNotification } from '@/api/integrations';
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  parseISO,
  isWithinInterval,
} from 'date-fns';

// Apply date range filter
function getDateRange(rangeType) {
  const today = new Date();
  switch (rangeType) {
    case '7d':
      return { from: subDays(today, 7), to: today };
    case '30d':
      return { from: subDays(today, 30), to: today };
    case '90d':
      return { from: subDays(today, 90), to: today };
    case 'this_month':
      return { from: startOfMonth(today), to: endOfMonth(today) };
    case 'last_month':
      return { from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) };
    default:
      return null;
  }
}

// Apply filters to data
function applyFilters(data, filters, dateField = 'created_date') {
  if (!filters || filters.length === 0) return data;

  return data.filter((item) => {
    return filters.every((filter) => {
      if (filter.field === 'date_range' && filter.value) {
        const range = getDateRange(filter.value);
        if (!range || !item[dateField]) return true;
        const itemDate = parseISO(item[dateField]);
        return isWithinInterval(itemDate, range);
      }

      if (!filter.value) return true;
      const itemValue = item[filter.field];
      return itemValue === filter.value;
    });
  });
}

// Sort data
function sortData(data, sortBy, sortOrder) {
  if (!sortBy) return data;

  return [...data].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    // Handle numeric values
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    }

    // Handle dates
    if (sortBy.includes('date')) {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    }

    // Handle strings
    aVal = String(aVal || '').toLowerCase();
    bVal = String(bVal || '').toLowerCase();
    return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });
}

// Generate CSV content
export function generateCSV(data, columns) {
  const headers = columns.map((c) => c.replace(/_/g, ' ').toUpperCase());
  const rows = data.map((item) =>
    columns.map((col) => {
      const val = item[col];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
      return val;
    })
  );

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

// Generate PDF content (HTML for printing)
export function generatePDFHTML(data, columns, title) {
  const headers = columns.map((c) => c.replace(/_/g, ' '));

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #1e40af; margin-bottom: 10px; }
        .meta { color: #64748b; margin-bottom: 20px; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f1f5f9; text-align: left; padding: 10px; border: 1px solid #e2e8f0; font-size: 11px; text-transform: uppercase; }
        td { padding: 8px 10px; border: 1px solid #e2e8f0; font-size: 12px; }
        tr:nth-child(even) { background: #f8fafc; }
        .footer { margin-top: 20px; font-size: 10px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="meta">Generated on ${format(new Date(), 'PPpp')} | ${data.length} records</div>
      <table>
        <thead>
          <tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${data
      .map(
        (item) => `
            <tr>${columns.map((col) => `<td>${item[col] ?? ''}</td>`).join('')}</tr>
          `
      )
      .join('')}
        </tbody>
      </table>
      <div class="footer">BKK-YGN Cargo & Shopping Services</div>
    </body>
    </html>
  `;
}

// Download file
export function downloadFile(content, filename, type = 'text/csv') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Open PDF in new window for printing
export function openPDFPrint(htmlContent) {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
}

// Main export function
export async function exportReport(report, allData) {
  const {
    report_type,
    columns: columnsStr,
    filters: filtersStr,
    sort_by,
    sort_order,
    format: exportFormat,
    name,
  } = report;

  let columns = [];
  let filters = [];

  try {
    columns = JSON.parse(columnsStr);
  } catch (e) {
    columns = [];
  }
  try {
    filters = JSON.parse(filtersStr);
  } catch (e) {
    filters = [];
  }

  if (columns.length === 0) {
    columns = Object.keys(allData[0] || {}).slice(0, 5);
  }

  // Apply filters and sorting
  let data = applyFilters(allData, filters);
  data = sortData(data, sort_by, sort_order);

  const timestamp = format(new Date(), 'yyyy-MM-dd');

  if (exportFormat === 'pdf') {
    const html = generatePDFHTML(data, columns, name || `${report_type} Report`);
    openPDFPrint(html);
  } else {
    const csv = generateCSV(data, columns);
    downloadFile(csv, `${name || report_type}_${timestamp}.csv`);
  }

  return data.length;
}

// Send report via email
export async function sendReportEmail(report, data, recipients) {
  const columns = JSON.parse(report.columns || '[]');
  const title = report.name || `${report.report_type} Report`;

  // Generate simple HTML table for email
  const tableHTML = `
    <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;">
      <thead>
        <tr style="background:#f1f5f9;">
          ${columns.map((c) => `<th style="padding:10px;border:1px solid #e2e8f0;text-align:left;">${c.replace(/_/g, ' ')}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data
      .slice(0, 50)
      .map(
        (item, i) => `
          <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'};">
            ${columns.map((col) => `<td style="padding:8px;border:1px solid #e2e8f0;">${item[col] ?? ''}</td>`).join('')}
          </tr>
        `
      )
      .join('')}
      </tbody>
    </table>
    ${data.length > 50 ? `<p style="color:#64748b;font-size:12px;">Showing first 50 of ${data.length} records.</p>` : ''}
  `;

  const emailBody = `
    <div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#3b82f6,#1e40af);padding:20px;border-radius:8px 8px 0 0;">
        <h1 style="color:white;margin:0;">${title}</h1>
        <p style="color:rgba(255,255,255,0.9);margin-top:5px;">Generated on ${format(new Date(), 'PPpp')}</p>
      </div>
      <div style="padding:20px;background:#fff;">
        ${tableHTML}
      </div>
      <div style="background:#f1f5f9;padding:15px;text-align:center;border-radius:0 0 8px 8px;">
        <p style="color:#64748b;margin:0;font-size:12px;">BKK-YGN Cargo & Shopping Services</p>
      </div>
    </div>
  `;

  const recipientList = recipients
    .split(',')
    .map((e) => e.trim())
    .filter((e) => e);

  for (const recipient of recipientList) {
    await sendMessengerNotification({
      to: recipient,
      message: `[Report] ${title} - ${format(new Date(), 'MMM d, yyyy')}\n\nReport generated and ready for view. (HTML content omitted for Messenger)`,
      platform: 'Telegram'
    });
  }

  return recipientList.length;
}
