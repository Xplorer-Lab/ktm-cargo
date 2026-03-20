import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Import RBAC logic (simulated since we can't import React components directly)
const ROLES = {
  MANAGING_DIRECTOR: 'managing_director',
  FINANCE_LEAD: 'finance_lead',
  MARKETING_MANAGER: 'marketing_manager',
};

const PERMISSIONS = {
  view_dashboard: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD, ROLES.MARKETING_MANAGER],
  view_shipments: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD, ROLES.MARKETING_MANAGER],
  manage_shipments: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD],
  view_shopping_orders: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD, ROLES.MARKETING_MANAGER],
  manage_shopping_orders: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD],
  view_customers: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD, ROLES.MARKETING_MANAGER],
  manage_customers: [ROLES.MANAGING_DIRECTOR, ROLES.MARKETING_MANAGER],
  view_campaigns: [ROLES.MANAGING_DIRECTOR, ROLES.MARKETING_MANAGER],
  manage_campaigns: [ROLES.MANAGING_DIRECTOR, ROLES.MARKETING_MANAGER],
  view_feedback: [ROLES.MANAGING_DIRECTOR, ROLES.MARKETING_MANAGER],
  view_inventory: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD],
  manage_inventory: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD],
  view_procurement: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD],
  manage_procurement: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD],
  approve_purchase_orders: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD],
  view_vendors: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD],
  manage_vendors: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD],
  view_tasks: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD, ROLES.MARKETING_MANAGER],
  manage_tasks: [ROLES.MANAGING_DIRECTOR],
  view_reports: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD, ROLES.MARKETING_MANAGER],
  export_reports: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD],
  view_settings: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD, ROLES.MARKETING_MANAGER],
  manage_settings: [ROLES.MANAGING_DIRECTOR],
  manage_pricing: [ROLES.MANAGING_DIRECTOR, ROLES.FINANCE_LEAD],
  invite_staff: [ROLES.MANAGING_DIRECTOR],
};

const NAV_PERMISSIONS = {
  Dashboard: 'view_dashboard',
  Shipments: 'view_shipments',
  ShipmentDocuments: 'view_shipments',
  ShoppingOrders: 'view_shopping_orders',
  Customers: 'view_customers',
  CustomerSegments: 'view_campaigns',
  FeedbackAnalytics: 'view_feedback',
  Inventory: 'view_inventory',
  Procurement: 'view_procurement',
  Vendors: 'view_vendors',
  Tasks: 'view_tasks',
  Reports: 'view_reports',
  PriceCalculator: 'view_dashboard',
  Settings: 'view_settings',
};

// Simulate hasPermission function
function hasPermission(user, permission) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const staffRole = user.staff_role || ROLES.MARKETING_MANAGER;
  const allowedRoles = PERMISSIONS[permission] || [];
  return allowedRoles.includes(staffRole);
}

// Simulate canAccessPage function
function canAccessPage(user, pageName) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const requiredPermission = NAV_PERMISSIONS[pageName];
  if (!requiredPermission) return true;
  return hasPermission(user, requiredPermission);
}

const AUDIT_REPORT = {
  timestamp: new Date().toISOString(),
  roleDefinitions: { issues: [], tests: [] },
  permissionChecks: { issues: [], tests: [] },
  logicErrors: { found: [], critical: [] },
  inconsistencies: { found: [] },
  codeAnalysis: { issues: [] },
  recommendations: [],
  summary: { totalIssues: 0, critical: 0, high: 0, medium: 0 },
};

// Test Role Definitions
async function testRoleDefinitions() {
  console.log('\n🔍 Testing Role Definitions...\n');

  // Check if all roles in PERMISSIONS are defined in ROLES
  const allRolesInPermissions = new Set();
  Object.values(PERMISSIONS).forEach((roles) => {
    roles.forEach((role) => allRolesInPermissions.add(role));
  });

  const definedRoles = new Set(Object.values(ROLES));
  const undefinedRoles = Array.from(allRolesInPermissions).filter((r) => !definedRoles.has(r));

  if (undefinedRoles.length > 0) {
    AUDIT_REPORT.roleDefinitions.issues.push({
      severity: 'critical',
      issue: `Undefined roles used in permissions: ${undefinedRoles.join(', ')}`,
    });
    console.log(`❌ Undefined roles: ${undefinedRoles.join(', ')}`);
  } else {
    console.log('✅ All roles in permissions are defined');
  }

  // Check database for actual roles
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('role, staff_role')
      .limit(100);

    if (!error && profiles) {
      const dbRoles = new Set();
      const dbStaffRoles = new Set();
      profiles.forEach((p) => {
        if (p.role) dbRoles.add(p.role);
        if (p.staff_role) dbStaffRoles.add(p.staff_role);
      });

      AUDIT_REPORT.roleDefinitions.tests.push({
        test: 'Database roles found',
        roles: Array.from(dbRoles),
        staffRoles: Array.from(dbStaffRoles),
      });

      // Check for roles in DB that aren't in ROLES definition
      const unknownStaffRoles = Array.from(dbStaffRoles).filter(
        (r) => !Object.values(ROLES).includes(r) && r !== null
      );
      if (unknownStaffRoles.length > 0) {
        AUDIT_REPORT.roleDefinitions.issues.push({
          severity: 'medium',
          issue: `Unknown staff_roles in database: ${unknownStaffRoles.join(', ')}`,
        });
      }
    }
  } catch (err) {
    AUDIT_REPORT.roleDefinitions.issues.push({
      severity: 'medium',
      issue: `Could not check database roles: ${err.message}`,
    });
  }
}

// Test Permission Logic
async function testPermissionLogic() {
  console.log('\n🔍 Testing Permission Logic...\n');

  // Test cases
  const testCases = [
    {
      name: 'Admin has all permissions',
      user: { role: 'admin' },
      permission: 'manage_settings',
      expected: true,
    },
    {
      name: 'Null user has no permissions',
      user: null,
      permission: 'view_dashboard',
      expected: false,
    },
    {
      name: 'Managing Director can manage settings',
      user: { role: 'staff', staff_role: 'managing_director' },
      permission: 'manage_settings',
      expected: true,
    },
    {
      name: 'Marketing Manager cannot manage settings',
      user: { role: 'staff', staff_role: 'marketing_manager' },
      permission: 'manage_settings',
      expected: false,
    },
    {
      name: 'Marketing Manager can view campaigns',
      user: { role: 'staff', staff_role: 'marketing_manager' },
      permission: 'view_campaigns',
      expected: true,
    },
    {
      name: 'Finance Lead cannot view campaigns',
      user: { role: 'staff', staff_role: 'finance_lead' },
      permission: 'view_campaigns',
      expected: false,
    },
    {
      name: 'User without staff_role defaults to marketing_manager',
      user: { role: 'staff' },
      permission: 'view_campaigns',
      expected: true, // Should default to marketing_manager
    },
    {
      name: 'Invalid permission returns false',
      user: { role: 'staff', staff_role: 'managing_director' },
      permission: 'invalid_permission',
      expected: false,
    },
  ];

  testCases.forEach((testCase) => {
    const result = hasPermission(testCase.user, testCase.permission);
    const passed = result === testCase.expected;

    if (!passed) {
      AUDIT_REPORT.permissionChecks.issues.push({
        severity: 'high',
        test: testCase.name,
        expected: testCase.expected,
        actual: result,
        user: testCase.user,
        permission: testCase.permission,
      });
      console.log(`❌ ${testCase.name}: Expected ${testCase.expected}, got ${result}`);
    } else {
      AUDIT_REPORT.permissionChecks.tests.push({
        test: testCase.name,
        passed: true,
      });
      console.log(`✅ ${testCase.name}`);
    }
  });
}

// Find Logic Errors
async function findLogicErrors() {
  console.log('\n🔍 Finding Logic Errors...\n');

  // Check 1: Admin bypass - is it too permissive?
  const adminUser = { role: 'admin' };
  const sensitivePermission = 'invite_staff';
  if (hasPermission(adminUser, sensitivePermission)) {
    AUDIT_REPORT.logicErrors.found.push({
      severity: 'info',
      issue: 'Admin role bypasses all permission checks (expected behavior)',
      location: 'hasPermission function',
    });
  }

  // Check 2: Default role fallback
  const userWithoutRole = { role: 'staff' };
  const defaultPermission = 'view_campaigns';
  const hasDefaultAccess = hasPermission(userWithoutRole, defaultPermission);
  if (hasDefaultAccess) {
    AUDIT_REPORT.logicErrors.found.push({
      severity: 'high',
      issue: 'Users without staff_role default to marketing_manager - may grant unintended access',
      location: 'hasPermission function line 102',
      recommendation: 'Consider requiring explicit staff_role assignment',
    });
    console.log('⚠️  Default role fallback may be too permissive');
  }

  // Check 3: Missing permission in NAV_PERMISSIONS
  const pagesWithoutPermission = ['Invoices', 'ClientPortal'];
  pagesWithoutPermission.forEach((page) => {
    if (!NAV_PERMISSIONS[page]) {
      AUDIT_REPORT.logicErrors.found.push({
        severity: 'medium',
        issue: `Page "${page}" not in NAV_PERMISSIONS - will default to allowing access`,
        location: 'canAccessPage function',
        recommendation: 'Add explicit permission check for this page',
      });
    }
  });

  // Check 4: Permission inconsistencies
  // If you can manage, you should be able to view
  Object.keys(PERMISSIONS).forEach((perm) => {
    if (perm.startsWith('manage_')) {
      const viewPerm = perm.replace('manage_', 'view_');
      if (PERMISSIONS[viewPerm]) {
        const manageRoles = PERMISSIONS[perm];
        const viewRoles = PERMISSIONS[viewPerm];
        const missingView = manageRoles.filter((r) => !viewRoles.includes(r));
        if (missingView.length > 0) {
          AUDIT_REPORT.inconsistencies.found.push({
            severity: 'high',
            issue: `${perm} allows roles that cannot ${viewPerm}: ${missingView.join(', ')}`,
            permission: perm,
            roles: missingView,
          });
          console.log(`⚠️  Inconsistency: ${perm} vs ${viewPerm}`);
        }
      }
    }
  });
}

// Analyze Code Usage
async function analyzeCodeUsage() {
  console.log('\n🔍 Analyzing Code Usage...\n');

  const srcPath = path.join(__dirname, 'src');
  const files = getAllFiles(srcPath, ['.jsx', '.js', '.ts', '.tsx']);

  const issues = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(__dirname, file);

    // Check for direct role checks instead of hasPermission
    if (
      (content.includes("user.role === 'admin'") || content.includes('user.staff_role === ')) &&
      !content.includes('hasPermission') &&
      !file.includes('RolePermissions')
    ) {
      issues.push({
        file: relativePath,
        issue: 'Direct role check instead of using hasPermission()',
        severity: 'medium',
        recommendation: 'Use hasPermission() for consistent permission checks',
      });
    }

    // Check for missing permission checks on sensitive operations
    const sensitiveOps = [
      'db.customers.create',
      'db.customers.delete',
      'db.shipments.delete',
      'db.campaigns.delete',
      'invite_staff',
      'manage_settings',
    ];
    sensitiveOps.forEach((op) => {
      if (
        content.includes(op) &&
        !content.includes('hasPermission') &&
        !content.includes('role ===')
      ) {
        issues.push({
          file: relativePath,
          issue: `Sensitive operation "${op}" without permission check`,
          severity: 'high',
        });
      }
    });

    // Check for inconsistent permission patterns
    if (content.includes('hasPermission') && content.includes("user.role === 'admin'")) {
      issues.push({
        file: relativePath,
        issue: 'Mixed permission checks (hasPermission + direct role check)',
        severity: 'low',
        recommendation: 'Use hasPermission() consistently',
      });
    }
  }

  AUDIT_REPORT.codeAnalysis.issues = issues;
  console.log(`Found ${issues.length} code usage issues`);
}

// Helper functions
function getAllFiles(dirPath, extensions, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!filePath.includes('node_modules') && !filePath.includes('.git')) {
        arrayOfFiles = getAllFiles(filePath, extensions, arrayOfFiles);
      }
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        arrayOfFiles.push(filePath);
      }
    }
  });

  return arrayOfFiles;
}

// Generate Report
async function generateReport() {
  console.log('\n📊 Generating RBAC Audit Report...\n');

  // Calculate summary
  const allIssues = [
    ...AUDIT_REPORT.roleDefinitions.issues,
    ...AUDIT_REPORT.permissionChecks.issues,
    ...AUDIT_REPORT.logicErrors.found,
    ...AUDIT_REPORT.inconsistencies.found,
    ...AUDIT_REPORT.codeAnalysis.issues,
  ];

  AUDIT_REPORT.summary.totalIssues = allIssues.length;
  AUDIT_REPORT.summary.critical = allIssues.filter((i) => i.severity === 'critical').length;
  AUDIT_REPORT.summary.high = allIssues.filter((i) => i.severity === 'high').length;
  AUDIT_REPORT.summary.medium = allIssues.filter((i) => i.severity === 'medium').length;

  // Generate recommendations
  if (AUDIT_REPORT.logicErrors.found.some((e) => e.issue.includes('default'))) {
    AUDIT_REPORT.recommendations.push({
      priority: 'high',
      recommendation:
        'Require explicit staff_role assignment - do not default to marketing_manager',
    });
  }

  if (AUDIT_REPORT.inconsistencies.found.length > 0) {
    AUDIT_REPORT.recommendations.push({
      priority: 'high',
      recommendation:
        'Fix permission inconsistencies - manage permissions should include view permissions',
    });
  }

  if (AUDIT_REPORT.codeAnalysis.issues.some((i) => i.severity === 'high')) {
    AUDIT_REPORT.recommendations.push({
      priority: 'high',
      recommendation: 'Add permission checks to all sensitive operations',
    });
  }

  const reportPath = path.join(__dirname, 'RBAC_AUDIT_REPORT.md');
  let report = `# RBAC System Force Audit Report\n\n`;
  report += `**Generated:** ${AUDIT_REPORT.timestamp}\n\n`;
  report += `## Executive Summary\n\n`;
  report += `- **Total Issues:** ${AUDIT_REPORT.summary.totalIssues}\n`;
  report += `- **Critical:** ${AUDIT_REPORT.summary.critical}\n`;
  report += `- **High:** ${AUDIT_REPORT.summary.high}\n`;
  report += `- **Medium:** ${AUDIT_REPORT.summary.medium}\n\n`;

  // Role Definitions
  report += `## Role Definitions\n\n`;
  if (AUDIT_REPORT.roleDefinitions.issues.length > 0) {
    AUDIT_REPORT.roleDefinitions.issues.forEach((issue) => {
      report += `- **[${issue.severity.toUpperCase()}]** ${issue.issue}\n`;
    });
  } else {
    report += `✅ No issues found\n\n`;
  }

  // Permission Checks
  report += `\n## Permission Logic Tests\n\n`;
  report += `**Tests Passed:** ${AUDIT_REPORT.permissionChecks.tests.length}\n`;
  report += `**Tests Failed:** ${AUDIT_REPORT.permissionChecks.issues.length}\n\n`;
  if (AUDIT_REPORT.permissionChecks.issues.length > 0) {
    AUDIT_REPORT.permissionChecks.issues.forEach((issue) => {
      report += `- **[${issue.severity.toUpperCase()}]** ${issue.test}\n`;
      report += `  - Expected: ${issue.expected}, Got: ${issue.actual}\n`;
    });
  }

  // Logic Errors
  report += `\n## Logic Errors\n\n`;
  AUDIT_REPORT.logicErrors.found.forEach((error) => {
    report += `- **[${error.severity.toUpperCase()}]** ${error.issue}\n`;
    if (error.recommendation) {
      report += `  - Recommendation: ${error.recommendation}\n`;
    }
  });

  // Inconsistencies
  report += `\n## Permission Inconsistencies\n\n`;
  AUDIT_REPORT.inconsistencies.found.forEach((inc) => {
    report += `- **[${inc.severity.toUpperCase()}]** ${inc.issue}\n`;
  });

  // Code Analysis
  report += `\n## Code Analysis Issues\n\n`;
  const highIssues = AUDIT_REPORT.codeAnalysis.issues.filter((i) => i.severity === 'high');
  const mediumIssues = AUDIT_REPORT.codeAnalysis.issues.filter((i) => i.severity === 'medium');
  if (highIssues.length > 0) {
    report += `### High Priority\n\n`;
    highIssues.forEach((issue) => {
      report += `- **${issue.file}**: ${issue.issue}\n`;
    });
  }
  if (mediumIssues.length > 0) {
    report += `### Medium Priority\n\n`;
    mediumIssues.slice(0, 10).forEach((issue) => {
      report += `- **${issue.file}**: ${issue.issue}\n`;
    });
  }

  // Recommendations
  report += `\n## Recommendations\n\n`;
  AUDIT_REPORT.recommendations.forEach((rec, idx) => {
    report += `${idx + 1}. **[${rec.priority.toUpperCase()}]** ${rec.recommendation}\n`;
  });

  fs.writeFileSync(reportPath, report);
  console.log(`✅ Report generated: ${reportPath}`);

  // JSON report
  const jsonPath = path.join(__dirname, 'RBAC_AUDIT_REPORT.json');
  fs.writeFileSync(jsonPath, JSON.stringify(AUDIT_REPORT, null, 2));
  console.log(`✅ JSON report generated: ${jsonPath}`);
}

// Main execution
async function main() {
  console.log('🚀 Starting Force Audit: RBAC System...\n');
  console.log('='.repeat(80));

  try {
    await testRoleDefinitions();
    await testPermissionLogic();
    await findLogicErrors();
    await analyzeCodeUsage();
    await generateReport();

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ RBAC Audit Complete!\n');
    console.log(`📄 Full report: RBAC_AUDIT_REPORT.md`);
    console.log(`📄 JSON report: RBAC_AUDIT_REPORT.json\n`);
  } catch (err) {
    console.error('\n❌ Audit failed:', err);
    process.exit(1);
  }
}

main();
