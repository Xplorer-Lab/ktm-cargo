import { shouldBypassAppLayout } from './layoutRouteGuards';

describe('shouldBypassAppLayout', () => {
  it('bypasses layout for exact public pages', () => {
    expect(shouldBypassAppLayout('/')).toBe(true);
    expect(shouldBypassAppLayout('/Feedback')).toBe(true);
    expect(shouldBypassAppLayout('/StaffLogin')).toBe(true);
  });

  it('bypasses layout for public portal prefixes', () => {
    expect(shouldBypassAppLayout('/ClientPortal')).toBe(true);
    expect(shouldBypassAppLayout('/ClientPortal?tab=track')).toBe(true);
    expect(shouldBypassAppLayout('/VendorRegistration')).toBe(true);
    expect(shouldBypassAppLayout('/VendorRegistration?token=abc')).toBe(true);
  });

  it('does not bypass layout for internal routes', () => {
    expect(shouldBypassAppLayout('/Dashboard')).toBe(false);
    expect(shouldBypassAppLayout('/Procurement')).toBe(false);
    expect(shouldBypassAppLayout('/Invoices')).toBe(false);
  });
});
