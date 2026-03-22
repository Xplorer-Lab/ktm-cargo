/**
 * Role-Based Access Control (RBAC) Configuration
 */

export const ROLES = {
  MANAGING_DIRECTOR: 'managing_director',
  FINANCE_LEAD: 'finance_lead',
  MARKETING_MANAGER: 'marketing_manager',
};

export const ROLE_LABELS = {
  managing_director: 'Managing Director',
  finance_lead: 'Finance Lead',
  marketing_manager: 'Marketing Manager',
};

export const ROLE_COLORS = {
  managing_director: 'bg-purple-100 text-purple-800',
  finance_lead: 'bg-emerald-100 text-emerald-800',
  marketing_manager: 'bg-blue-100 text-blue-800',
};

// Define permissions for each module/feature
export const PERMISSIONS = {
  // Operations
  view_operations: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD, ROLES.MARKETING_MANAGER],

  // Shipments
  view_shipments: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD, ROLES.MARKETING_MANAGER],
  manage_shipments: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD],

  // Shopping Orders
  view_shopping_orders: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD, ROLES.MARKETING_MANAGER],
  manage_shopping_orders: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD],

  // Customers
  view_customers: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD, ROLES.MARKETING_MANAGER],
  manage_customers: [ROLES.MANAGING_DIRECTOR, ROLES.MARKETING_MANAGER],

  // Segments & Campaigns
  view_campaigns: [ROLES.MANAGING_DIRECTOR, ROLES.MARKETING_MANAGER],
  manage_campaigns: [ROLES.MANAGING_DIRECTOR, ROLES.MARKETING_MANAGER],

  // Feedback
  view_feedback: [ROLES.MANAGING_DIRECTOR, ROLES.MARKETING_MANAGER],

  // Inventory
  view_inventory: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD],
  manage_inventory: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD],

  // Procurement
  view_procurement: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD],
  manage_procurement: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD],
  approve_purchase_orders: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD],

  // Vendors
  view_vendors: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD],
  manage_vendors: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD],

  // Tasks
  view_tasks: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD, ROLES.MARKETING_MANAGER],
  manage_tasks: [ROLES.MANAGING_DIRECTOR],

  // Reports
  view_reports: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD, ROLES.MARKETING_MANAGER],
  export_reports: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD],

  // Settings
  view_settings: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD, ROLES.MARKETING_MANAGER],
  manage_settings: [ROLES.MANAGING_DIRECTOR],
  manage_pricing: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD],
  invite_staff: [ROLES.MANAGING_DIRECTOR],
};

// Navigation items with required permissions
export const NAV_PERMISSIONS = {
  Operations: 'view_operations',
  Dashboard: 'view_operations',
  Shipments: 'view_shipments',
  ShipmentDocuments: 'view_shipments',
  ShoppingOrders: 'view_shopping_orders',
  Invoices: 'view_reports', // Invoices require reports view permission
  Customers: 'view_customers',
  CustomerSegments: 'view_campaigns',
  FeedbackAnalytics: 'view_feedback',
  FeedbackQueue: 'view_feedback',
  Inventory: 'view_inventory',
  Procurement: 'view_procurement',
  Vendors: 'view_vendors',
  Tasks: 'view_tasks',
  Reports: 'view_reports',
  ClientPortal: null, // Public page - no permission required
  Settings: 'view_settings',
};

/**
 * Check if user has permission
 */
export function hasPermission(user, permission) {
  if (!user) return false;

  // Admin role always has full access
  if (user.role === 'admin') return true;

  // Require explicit staff_role - do not default (security best practice)
  // If staff_role is missing, deny access to prevent unintended permissions
  if (!user.staff_role) {
    console.warn('User missing staff_role - denying permission:', permission);
    return false;
  }

  const allowedRoles = PERMISSIONS[permission] || [];

  return allowedRoles.includes(user.staff_role);
}

/**
 * Check if user can access a page
 */
export function canAccessPage(user, pageName) {
  if (!user) return false;
  if (user.role === 'admin') return true;

  const requiredPermission = NAV_PERMISSIONS[pageName];
  if (!requiredPermission) return true;

  return hasPermission(user, requiredPermission);
}

/**
 * Get user's effective role label
 */
export function getUserRoleLabel(user) {
  if (!user) return '';
  if (user.role === 'admin') return 'Managing Director';
  return ROLE_LABELS[user.staff_role] || 'Staff';
}
