/**
 * P2 #11: Route snapshot protection.
 *
 * Asserts the complete set of routes defined in src/pages/index.jsx.
 * If a route is added, removed, or changed this test will fail, requiring
 * explicit review of the route map before the change is accepted.
 *
 * This uses a static assertion (not Jest snapshots) so the expected list
 * is always visible and reviewable in the test file itself.
 */

import fs from 'fs';
import path from 'path';

const indexPath = path.resolve(process.cwd(), 'src', 'pages', 'index.jsx');

/**
 * Extracts route paths from the JSX route definitions.
 * Matches patterns like: path="/Dashboard" and path="*"
 */
function extractRoutePaths(source) {
  const routeRegex = /<Route\s[^>]*path=["']([^"']+)["']/g;
  const routes = [];
  let match;
  while ((match = routeRegex.exec(source)) !== null) {
    routes.push(match[1]);
  }
  return routes.sort();
}

// The canonical route map. Update this list when intentionally adding/removing routes.
const EXPECTED_ROUTES = [
  '/',
  '*',
  '/ClientPortal',
  '/CustomerSegments',
  '/Customers',
  '/Dashboard',
  '/Feedback',
  '/FeedbackAnalytics',
  '/Inventory',
  '/Invoices',
  '/Operations',
  '/PriceCalculator',
  '/Procurement',
  '/Reports',
  '/Settings',
  '/ShipmentDocuments',
  '/Shipments',
  '/ShoppingOrders',
  '/Tasks',
  '/VendorRegistration',
  '/Vendors',
].sort();

describe('Route snapshot protection', () => {
  it('route map matches expected canonical routes', () => {
    const source = fs.readFileSync(indexPath, 'utf-8');
    const actual = extractRoutePaths(source);

    expect(actual).toEqual(EXPECTED_ROUTES);
  });

  it('has exactly 21 routes (4 public + 16 protected + 1 catch-all)', () => {
    const source = fs.readFileSync(indexPath, 'utf-8');
    const actual = extractRoutePaths(source);

    expect(actual).toHaveLength(21);
  });

  it('public routes are not wrapped in ProtectedRoute', () => {
    const source = fs.readFileSync(indexPath, 'utf-8');

    // These routes should appear without ProtectedRoute wrapper
    const publicRoutes = ['/', '/ClientPortal', '/VendorRegistration', '/PriceCalculator'];

    for (const route of publicRoutes) {
      // Match the Route definition and verify it does NOT contain ProtectedRoute
      // For public routes: <Route path="/ClientPortal" element={<ClientPortal />} />
      const routeBlockRegex = new RegExp(
        `<Route\\s+path=["']${route.replace('/', '\\/')}["']\\s+element=\\{([^}]+)\\}`
      );
      const match = source.match(routeBlockRegex);
      if (match) {
        expect(match[1]).not.toContain('ProtectedRoute');
      }
    }
  });

  it('catch-all route exists for 404 handling', () => {
    const source = fs.readFileSync(indexPath, 'utf-8');
    const routes = extractRoutePaths(source);

    expect(routes).toContain('*');
  });
});
