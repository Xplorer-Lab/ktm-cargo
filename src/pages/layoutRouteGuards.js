const LAYOUT_BYPASS_EXACT_PATHS = new Set(['/', '/Feedback', '/StaffLogin']);
const LAYOUT_BYPASS_PREFIXES = ['/ClientPortal', '/VendorRegistration'];

export function shouldBypassAppLayout(pathname = '') {
  const normalizedPathname =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  if (LAYOUT_BYPASS_EXACT_PATHS.has(normalizedPathname)) {
    return true;
  }

  return LAYOUT_BYPASS_PREFIXES.some((prefix) => normalizedPathname.startsWith(prefix));
}
