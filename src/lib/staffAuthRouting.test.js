import {
  STAFF_HOME_PATH,
  buildStaffLoginPath,
  buildStaffNext,
  getStaffDestinationFromSearch,
  sanitizeStaffNext,
} from './staffAuthRouting';

describe('staff auth routing helpers', () => {
  it('keeps safe staff destinations and rejects unknown paths', () => {
    expect(sanitizeStaffNext('/Shipments')).toBe('/Shipments');
    expect(sanitizeStaffNext('/Shipments?tab=incoming')).toBe('/Shipments?tab=incoming');
    expect(sanitizeStaffNext('/UnknownPage')).toBe(STAFF_HOME_PATH);
    expect(sanitizeStaffNext('https://malicious.example')).toBe(STAFF_HOME_PATH);
  });

  it('builds login redirect paths with next destination and preserves e2e fixture', () => {
    expect(buildStaffLoginPath('/Shipments')).toBe('/StaffLogin?next=%2FShipments');
    expect(buildStaffLoginPath('/Shipments', '?__e2e=staff-login')).toBe(
      '/StaffLogin?next=%2FShipments&__e2e=staff-login'
    );
  });

  it('normalizes requested staff pages and reads them back from search params', () => {
    expect(buildStaffNext('/Shipments', '?tab=incoming&__e2e=workflow-staff')).toBe(
      '/Shipments?tab=incoming'
    );
    expect(getStaffDestinationFromSearch('?next=%2FInvoices')).toBe('/Invoices');
    expect(getStaffDestinationFromSearch('?next=%2Fnot-real')).toBe(STAFF_HOME_PATH);
  });
});
