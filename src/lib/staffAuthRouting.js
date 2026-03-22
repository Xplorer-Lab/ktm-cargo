import { appendE2EFixture } from '@/lib/e2e';
import { normalize } from 'path';

export const STAFF_HOME_PATH = '/Operations';
export const STAFF_LOGIN_PATH = '/StaffLogin';

const ALLOWED_STAFF_PATHS = new Set([
  '/Operations',
  '/Dashboard',
  '/Shipments',
  '/Customers',
  '/ShoppingOrders',
  '/Tasks',
  '/Reports',
  '/CustomerSegments',
  '/ShipmentDocuments',
  '/FeedbackQueue',
  '/FeedbackAnalytics',
  '/Inventory',
  '/Vendors',
  '/Settings',
  '/Procurement',
  '/Invoices',
  '/operation',
  '/shipment',
  '/invoice',
]);

export function sanitizeStaffNext(rawNext = '') {
  if (!rawNext) return STAFF_HOME_PATH;

  let decodedValue = rawNext;
  try {
    decodedValue = decodeURIComponent(rawNext);
  } catch {
    decodedValue = rawNext;
  }

  if (!decodedValue.startsWith('/') || decodedValue.startsWith('//')) {
    return STAFF_HOME_PATH;
  }

  const [rawPathname, rawQuery = ''] = decodedValue.split('?');

  // FIXED: Normalize path to prevent traversal attacks (P0)
  const normalizedPath = normalize(rawPathname);
  if (!ALLOWED_STAFF_PATHS.has(normalizedPath)) {
    return STAFF_HOME_PATH;
  }

  return rawQuery ? `${normalizedPath}?${rawQuery}` : normalizedPath;
}

export function buildStaffNext(pathname = STAFF_HOME_PATH, search = '') {
  const params = new URLSearchParams(search);
  params.delete('__e2e');

  const nextQuery = params.toString();
  const nextPath = nextQuery ? `${pathname}?${nextQuery}` : pathname;

  return sanitizeStaffNext(nextPath);
}

export function buildStaffLoginPath(nextPath = STAFF_HOME_PATH, search = '') {
  const safeNext = sanitizeStaffNext(nextPath);
  const path =
    safeNext === STAFF_HOME_PATH
      ? STAFF_LOGIN_PATH
      : `${STAFF_LOGIN_PATH}?next=${encodeURIComponent(safeNext)}`;

  return appendE2EFixture(path, search);
}

export function getStaffDestinationFromSearch(search = '') {
  const params = new URLSearchParams(search);
  return sanitizeStaffNext(params.get('next') || STAFF_HOME_PATH);
}
