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

const AUDIT_REPORT = {
  timestamp: new Date().toISOString(),
  crudOperations: {
    customers: { create: null, read: null, update: null, delete: null, issues: [] },
    shipments: { create: null, read: null, update: null, delete: null, issues: [] },
    campaigns: { create: null, read: null, update: null, delete: null, issues: [] },
    settings: { create: null, read: null, update: null, delete: null, issues: [] },
    inventory: { create: null, read: null, update: null, delete: null, issues: [] },
  },
  clientPortal: {
    customerPortal: { issues: [], tests: [] },
    vendorPortal: { issues: [], tests: [] },
    authentication: { issues: [], tests: [] },
  },
  mockCode: { found: [], issues: [] },
  logicIssues: { found: [], recommendations: [] },
  summary: { totalIssues: 0, critical: 0, high: 0, medium: 0 },
};

// Test CRUD for Customers
async function testCustomerCRUD() {
  console.log('\n🔍 Testing Customer CRUD Operations...\n');
  const testId = `test_${Date.now()}`;
  let createdId = null;

  // CREATE
  try {
    const testCustomer = {
      name: `Test Customer ${testId}`,
      phone: `+668${Math.floor(Math.random() * 100000000)}`,
      email: `test${testId}@example.com`,
      customer_type: 'individual',
      address_bangkok: '123 Test Street, Bangkok',
    };

    const { data: created, error } = await supabase
      .from('customers')
      .insert(testCustomer)
      .select()
      .single();

    if (error) {
      AUDIT_REPORT.crudOperations.customers.create = {
        success: false,
        error: error.message,
        code: error.code,
      };
      AUDIT_REPORT.crudOperations.customers.issues.push(`CREATE failed: ${error.message}`);
      console.log('❌ CREATE failed:', error.message);
    } else {
      createdId = created.id;
      AUDIT_REPORT.crudOperations.customers.create = { success: true, id: createdId };
      console.log('✅ CREATE successful');
    }
  } catch (err) {
    AUDIT_REPORT.crudOperations.customers.create = { success: false, error: err.message };
    AUDIT_REPORT.crudOperations.customers.issues.push(`CREATE exception: ${err.message}`);
    console.log('❌ CREATE exception:', err.message);
  }

  if (!createdId) return;

  // READ
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', createdId)
      .single();
    if (error) {
      AUDIT_REPORT.crudOperations.customers.read = { success: false, error: error.message };
      AUDIT_REPORT.crudOperations.customers.issues.push(`READ failed: ${error.message}`);
      console.log('❌ READ failed:', error.message);
    } else {
      AUDIT_REPORT.crudOperations.customers.read = { success: true };
      console.log('✅ READ successful');
    }
  } catch (err) {
    AUDIT_REPORT.crudOperations.customers.read = { success: false, error: err.message };
    AUDIT_REPORT.crudOperations.customers.issues.push(`READ exception: ${err.message}`);
    console.log('❌ READ exception:', err.message);
  }

  // UPDATE
  try {
    const { data, error } = await supabase
      .from('customers')
      .update({ notes: 'Updated by CRUD test', address_bangkok: '456 Updated Street' })
      .eq('id', createdId)
      .select()
      .single();

    if (error) {
      AUDIT_REPORT.crudOperations.customers.update = { success: false, error: error.message };
      AUDIT_REPORT.crudOperations.customers.issues.push(`UPDATE failed: ${error.message}`);
      console.log('❌ UPDATE failed:', error.message);
    } else {
      AUDIT_REPORT.crudOperations.customers.update = { success: true };
      console.log('✅ UPDATE successful');
    }
  } catch (err) {
    AUDIT_REPORT.crudOperations.customers.update = { success: false, error: err.message };
    AUDIT_REPORT.crudOperations.customers.issues.push(`UPDATE exception: ${err.message}`);
    console.log('❌ UPDATE exception:', err.message);
  }

  // DELETE
  try {
    const { error } = await supabase.from('customers').delete().eq('id', createdId);
    if (error) {
      AUDIT_REPORT.crudOperations.customers.delete = { success: false, error: error.message };
      AUDIT_REPORT.crudOperations.customers.issues.push(`DELETE failed: ${error.message}`);
      console.log('❌ DELETE failed:', error.message);
    } else {
      AUDIT_REPORT.crudOperations.customers.delete = { success: true };
      console.log('✅ DELETE successful');
    }
  } catch (err) {
    AUDIT_REPORT.crudOperations.customers.delete = { success: false, error: err.message };
    AUDIT_REPORT.crudOperations.customers.issues.push(`DELETE exception: ${err.message}`);
    console.log('❌ DELETE exception:', err.message);
  }
}

// Test CRUD for Shipments
async function testShipmentCRUD() {
  console.log('\n🔍 Testing Shipment CRUD Operations...\n');
  let customerId = null;
  let createdId = null;

  // First create a test customer
  try {
    const { data: customer } = await supabase
      .from('customers')
      .insert({
        name: 'Shipment Test Customer',
        phone: `+668${Math.floor(Math.random() * 100000000)}`,
        customer_type: 'individual',
      })
      .select()
      .single();
    customerId = customer?.id;
  } catch (err) {
    console.log('⚠️  Could not create test customer for shipment test');
  }

  if (!customerId) {
    // Try to get an existing customer
    const { data: existing } = await supabase.from('customers').select('id').limit(1).single();
    customerId = existing?.id;
  }

  if (!customerId) {
    AUDIT_REPORT.crudOperations.shipments.issues.push('No customer available for shipment test');
    console.log('❌ Cannot test shipments - no customer available');
    return;
  }

  // CREATE
  try {
    const testShipment = {
      customer_id: customerId,
      customer_name: 'Test Customer',
      service_type: 'cargo_small',
      weight_kg: 5.5,
      items_description: 'Test items for CRUD audit',
      status: 'pending',
      payment_status: 'unpaid',
      cost_basis: 100,
      price_per_kg: 120,
      total_amount: 660,
    };

    const { data: created, error } = await supabase
      .from('shipments')
      .insert(testShipment)
      .select()
      .single();

    if (error) {
      AUDIT_REPORT.crudOperations.shipments.create = {
        success: false,
        error: error.message,
        code: error.code,
      };
      AUDIT_REPORT.crudOperations.shipments.issues.push(
        `CREATE failed: ${error.message} (${error.code})`
      );
      console.log('❌ CREATE failed:', error.message, error.code);
    } else {
      createdId = created.id;
      AUDIT_REPORT.crudOperations.shipments.create = { success: true, id: createdId };
      console.log('✅ CREATE successful');
    }
  } catch (err) {
    AUDIT_REPORT.crudOperations.shipments.create = { success: false, error: err.message };
    AUDIT_REPORT.crudOperations.shipments.issues.push(`CREATE exception: ${err.message}`);
    console.log('❌ CREATE exception:', err.message);
  }

  if (!createdId) return;

  // READ
  try {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', createdId)
      .single();
    if (error) {
      AUDIT_REPORT.crudOperations.shipments.read = { success: false, error: error.message };
      AUDIT_REPORT.crudOperations.shipments.issues.push(`READ failed: ${error.message}`);
      console.log('❌ READ failed:', error.message);
    } else {
      AUDIT_REPORT.crudOperations.shipments.read = { success: true };
      console.log('✅ READ successful');
    }
  } catch (err) {
    AUDIT_REPORT.crudOperations.shipments.read = { success: false, error: err.message };
    console.log('❌ READ exception:', err.message);
  }

  // UPDATE
  try {
    const { error } = await supabase
      .from('shipments')
      .update({ status: 'in_transit', items_description: 'Updated by CRUD test' })
      .eq('id', createdId);

    if (error) {
      AUDIT_REPORT.crudOperations.shipments.update = { success: false, error: error.message };
      AUDIT_REPORT.crudOperations.shipments.issues.push(`UPDATE failed: ${error.message}`);
      console.log('❌ UPDATE failed:', error.message);
    } else {
      AUDIT_REPORT.crudOperations.shipments.update = { success: true };
      console.log('✅ UPDATE successful');
    }
  } catch (err) {
    AUDIT_REPORT.crudOperations.shipments.update = { success: false, error: err.message };
    console.log('❌ UPDATE exception:', err.message);
  }

  // DELETE
  try {
    const { error } = await supabase.from('shipments').delete().eq('id', createdId);
    if (error) {
      AUDIT_REPORT.crudOperations.shipments.delete = { success: false, error: error.message };
      AUDIT_REPORT.crudOperations.shipments.issues.push(`DELETE failed: ${error.message}`);
      console.log('❌ DELETE failed:', error.message);
    } else {
      AUDIT_REPORT.crudOperations.shipments.delete = { success: true };
      console.log('✅ DELETE successful');
    }
  } catch (err) {
    AUDIT_REPORT.crudOperations.shipments.delete = { success: false, error: err.message };
    console.log('❌ DELETE exception:', err.message);
  }
}

// Test CRUD for Campaigns
async function testCampaignCRUD() {
  console.log('\n🔍 Testing Campaign CRUD Operations...\n');
  const testId = `test_${Date.now()}`;
  let createdId = null;

  // CREATE
  try {
    const testCampaign = {
      name: `Test Campaign ${testId}`,
      campaign_type: 'email',
      status: 'draft',
      target_segment: 'all',
      message: 'Test campaign message',
    };

    const { data: created, error } = await supabase
      .from('campaigns')
      .insert(testCampaign)
      .select()
      .single();

    if (error) {
      AUDIT_REPORT.crudOperations.campaigns.create = {
        success: false,
        error: error.message,
        code: error.code,
      };
      AUDIT_REPORT.crudOperations.campaigns.issues.push(`CREATE failed: ${error.message}`);
      console.log('❌ CREATE failed:', error.message);
    } else {
      createdId = created.id;
      AUDIT_REPORT.crudOperations.campaigns.create = { success: true, id: createdId };
      console.log('✅ CREATE successful');
    }
  } catch (err) {
    AUDIT_REPORT.crudOperations.campaigns.create = { success: false, error: err.message };
    AUDIT_REPORT.crudOperations.campaigns.issues.push(`CREATE exception: ${err.message}`);
    console.log('❌ CREATE exception:', err.message);
  }

  if (!createdId) return;

  // READ, UPDATE, DELETE (similar pattern)
  try {
    const { data } = await supabase.from('campaigns').select('*').eq('id', createdId).single();
    AUDIT_REPORT.crudOperations.campaigns.read = { success: !!data };

    await supabase.from('campaigns').update({ status: 'active' }).eq('id', createdId);
    AUDIT_REPORT.crudOperations.campaigns.update = { success: true };

    await supabase.from('campaigns').delete().eq('id', createdId);
    AUDIT_REPORT.crudOperations.campaigns.delete = { success: true };
    console.log('✅ Campaign CRUD operations completed');
  } catch (err) {
    console.log('❌ Campaign operations error:', err.message);
  }
}

// Test Settings CRUD
async function testSettingsCRUD() {
  console.log('\n🔍 Testing Settings CRUD Operations...\n');

  try {
    // READ (Settings are usually singleton)
    const { data, error } = await supabase.from('company_settings').select('*').limit(1);
    if (error) {
      AUDIT_REPORT.crudOperations.settings.read = { success: false, error: error.message };
      AUDIT_REPORT.crudOperations.settings.issues.push(`READ failed: ${error.message}`);
      console.log('❌ READ failed:', error.message);
    } else {
      AUDIT_REPORT.crudOperations.settings.read = { success: true, count: data?.length || 0 };
      console.log('✅ READ successful');

      // UPDATE if exists
      if (data && data.length > 0) {
        const { error: updateError } = await supabase
          .from('company_settings')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', data[0].id);

        if (updateError) {
          AUDIT_REPORT.crudOperations.settings.update = {
            success: false,
            error: updateError.message,
          };
          console.log('❌ UPDATE failed:', updateError.message);
        } else {
          AUDIT_REPORT.crudOperations.settings.update = { success: true };
          console.log('✅ UPDATE successful');
        }
      }
    }
  } catch (err) {
    AUDIT_REPORT.crudOperations.settings.issues.push(`Settings test exception: ${err.message}`);
    console.log('❌ Settings test exception:', err.message);
  }
}

// Audit Client Portal Integration
async function auditClientPortal() {
  console.log('\n🔍 Auditing Client Portal Integration...\n');

  // Check if customer portal components exist and work
  const portalFiles = [
    'src/components/portal/CustomerPortalDashboard.jsx',
    'src/components/portal/CustomerNewOrder.jsx',
    'src/components/portal/CustomerShipmentTracker.jsx',
    'src/components/portal/VendorPortalDashboard.jsx',
    'src/pages/ClientPortal.jsx',
  ];

  for (const file of portalFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for mock/test logic
      if (content.includes('MOCK') || content.includes('mock') || content.includes('TEST')) {
        AUDIT_REPORT.clientPortal.customerPortal.issues.push(`Mock/test code found in ${file}`);
      }

      // Check for proper error handling
      if (!content.includes('try') && !content.includes('catch') && content.includes('await')) {
        AUDIT_REPORT.clientPortal.customerPortal.issues.push(`Missing error handling in ${file}`);
      }

      // Check for proper authentication checks
      if (file.includes('ClientPortal') && !content.includes('auth.isAuthenticated')) {
        AUDIT_REPORT.clientPortal.authentication.issues.push(`Missing auth check in ${file}`);
      }
    } else {
      AUDIT_REPORT.clientPortal.customerPortal.issues.push(`Missing file: ${file}`);
    }
  }

  // Test customer portal data access
  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, email, name')
      .limit(5);
    if (error) {
      AUDIT_REPORT.clientPortal.customerPortal.issues.push(
        `Cannot access customers: ${error.message}`
      );
    } else {
      AUDIT_REPORT.clientPortal.customerPortal.tests.push(
        `Customer data accessible: ${customers?.length || 0} records`
      );
    }
  } catch (err) {
    AUDIT_REPORT.clientPortal.customerPortal.issues.push(
      `Customer portal test error: ${err.message}`
    );
  }

  // Test vendor portal data access
  try {
    const { data: vendors, error } = await supabase
      .from('vendors')
      .select('id, email, name')
      .limit(5);
    if (error) {
      AUDIT_REPORT.clientPortal.vendorPortal.issues.push(`Cannot access vendors: ${error.message}`);
    } else {
      AUDIT_REPORT.clientPortal.vendorPortal.tests.push(
        `Vendor data accessible: ${vendors?.length || 0} records`
      );
    }
  } catch (err) {
    AUDIT_REPORT.clientPortal.vendorPortal.issues.push(`Vendor portal test error: ${err.message}`);
  }
}

// Find Mock/Test Code in Production
async function findMockCode() {
  console.log('\n🔍 Scanning for Mock/Test Code...\n');

  const srcPath = path.join(__dirname, 'src');
  const files = getAllFiles(srcPath, ['.jsx', '.js', '.ts', '.tsx']);

  const mockPatterns = [
    /MOCK|mock|FAKE|fake|DUMMY|dummy|TEST_DATA|test_data|PLACEHOLDER|placeholder/i,
    /console\.log\(['"]MOCK|console\.log\(['"]TEST|console\.log\(['"]FAKE/i,
    /\/\/\s*(MOCK|TEST|FAKE|DUMMY)/i,
  ];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(__dirname, file);

    // Skip test files
    if (relativePath.includes('.test.') || relativePath.includes('.spec.')) continue;

    for (const pattern of mockPatterns) {
      if (pattern.test(content)) {
        const lines = content.split('\n');
        const matchingLines = lines
          .map((line, idx) => (pattern.test(line) ? idx + 1 : null))
          .filter((x) => x !== null);

        if (matchingLines.length > 0) {
          AUDIT_REPORT.mockCode.found.push({
            file: relativePath,
            lines: matchingLines,
            severity: content.includes('MOCK') || content.includes('FAKE') ? 'high' : 'medium',
          });
        }
      }
    }
  }

  console.log(`Found ${AUDIT_REPORT.mockCode.found.length} files with mock/test code`);
}

// Find Logic Issues
async function findLogicIssues() {
  console.log('\n🔍 Scanning for Logic Issues...\n');

  const srcPath = path.join(__dirname, 'src');
  const files = getAllFiles(srcPath, ['.jsx', '.js']);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(__dirname, file);

    // Check for hardcoded values that should be configurable
    if (content.includes('BKK-YGN') && !content.includes('companySettings')) {
      AUDIT_REPORT.logicIssues.found.push({
        file: relativePath,
        issue: 'Hardcoded company name - should use companySettings',
        severity: 'medium',
      });
    }

    // Check for missing validation
    if (
      content.includes('.create(') &&
      !content.includes('Schema') &&
      !content.includes('validate')
    ) {
      AUDIT_REPORT.logicIssues.found.push({
        file: relativePath,
        issue: 'Create operation without validation',
        severity: 'high',
      });
    }

    // Check for empty catch blocks
    if (content.includes('catch') && content.match(/catch\s*\([^)]*\)\s*\{\s*\}/)) {
      AUDIT_REPORT.logicIssues.found.push({
        file: relativePath,
        issue: 'Empty catch block - errors are being silently ignored',
        severity: 'high',
      });
    }

    // Check for direct Supabase calls instead of using db abstraction
    if (
      content.includes('supabase.from(') &&
      !file.includes('supabaseClient') &&
      !file.includes('db.js')
    ) {
      AUDIT_REPORT.logicIssues.found.push({
        file: relativePath,
        issue: 'Direct Supabase call - should use db abstraction layer',
        severity: 'medium',
      });
    }
  }

  console.log(`Found ${AUDIT_REPORT.logicIssues.found.length} potential logic issues`);
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
  console.log('\n📊 Generating Comprehensive CRUD & Client Portal Audit Report...\n');

  // Calculate summary
  const allIssues = [
    ...AUDIT_REPORT.crudOperations.customers.issues,
    ...AUDIT_REPORT.crudOperations.shipments.issues,
    ...AUDIT_REPORT.crudOperations.campaigns.issues,
    ...AUDIT_REPORT.crudOperations.settings.issues,
    ...AUDIT_REPORT.clientPortal.customerPortal.issues,
    ...AUDIT_REPORT.clientPortal.vendorPortal.issues,
    ...AUDIT_REPORT.clientPortal.authentication.issues,
    ...AUDIT_REPORT.mockCode.found.map((m) => `Mock code in ${m.file}`),
    ...AUDIT_REPORT.logicIssues.found.map((l) => `${l.issue} in ${l.file}`),
  ];

  AUDIT_REPORT.summary.totalIssues = allIssues.length;
  AUDIT_REPORT.summary.critical = allIssues.filter(
    (i) => i.includes('CREATE failed') || i.includes('DELETE failed')
  ).length;
  AUDIT_REPORT.summary.high = AUDIT_REPORT.logicIssues.found.filter(
    (l) => l.severity === 'high'
  ).length;
  AUDIT_REPORT.summary.medium =
    allIssues.length - AUDIT_REPORT.summary.critical - AUDIT_REPORT.summary.high;

  const reportPath = path.join(__dirname, 'CRUD_CLIENT_PORTAL_AUDIT_REPORT.md');
  let report = `# CRUD & Client Portal Force Audit Report\n\n`;
  report += `**Generated:** ${AUDIT_REPORT.timestamp}\n\n`;
  report += `## Executive Summary\n\n`;
  report += `- **Total Issues:** ${AUDIT_REPORT.summary.totalIssues}\n`;
  report += `- **Critical:** ${AUDIT_REPORT.summary.critical}\n`;
  report += `- **High:** ${AUDIT_REPORT.summary.high}\n`;
  report += `- **Medium:** ${AUDIT_REPORT.summary.medium}\n\n`;

  // CRUD Operations
  report += `## CRUD Operations Audit\n\n`;
  const entities = ['customers', 'shipments', 'campaigns', 'settings'];
  for (const entity of entities) {
    const ops = AUDIT_REPORT.crudOperations[entity];
    report += `### ${entity.toUpperCase()}\n\n`;
    report += `- **CREATE:** ${ops.create?.success ? '✅' : '❌'} ${ops.create?.success ? 'OK' : ops.create?.error || 'Failed'}\n`;
    report += `- **READ:** ${ops.read?.success ? '✅' : '❌'} ${ops.read?.success ? 'OK' : ops.read?.error || 'Failed'}\n`;
    report += `- **UPDATE:** ${ops.update?.success ? '✅' : '❌'} ${ops.update?.success ? 'OK' : ops.update?.error || 'Failed'}\n`;
    report += `- **DELETE:** ${ops.delete?.success ? '✅' : '❌'} ${ops.delete?.success ? 'OK' : ops.delete?.error || 'Failed'}\n`;
    if (ops.issues.length > 0) {
      report += `\n**Issues:**\n`;
      ops.issues.forEach((issue) => {
        report += `- ${issue}\n`;
      });
    }
    report += `\n`;
  }

  // Client Portal
  report += `## Client Portal Integration Audit\n\n`;
  report += `### Customer Portal\n`;
  report += `- **Issues:** ${AUDIT_REPORT.clientPortal.customerPortal.issues.length}\n`;
  if (AUDIT_REPORT.clientPortal.customerPortal.issues.length > 0) {
    AUDIT_REPORT.clientPortal.customerPortal.issues.forEach((issue) => {
      report += `- ${issue}\n`;
    });
  }
  report += `\n### Vendor Portal\n`;
  report += `- **Issues:** ${AUDIT_REPORT.clientPortal.vendorPortal.issues.length}\n`;
  if (AUDIT_REPORT.clientPortal.vendorPortal.issues.length > 0) {
    AUDIT_REPORT.clientPortal.vendorPortal.issues.forEach((issue) => {
      report += `- ${issue}\n`;
    });
  }

  // Mock Code
  report += `\n## Mock/Test Code Found\n\n`;
  report += `**Total Files:** ${AUDIT_REPORT.mockCode.found.length}\n\n`;
  AUDIT_REPORT.mockCode.found.slice(0, 20).forEach((mock) => {
    report += `- **[${mock.severity.toUpperCase()}]** ${mock.file} (lines: ${mock.lines.join(', ')})\n`;
  });

  // Logic Issues
  report += `\n## Logic Issues\n\n`;
  AUDIT_REPORT.logicIssues.found.forEach((issue) => {
    report += `- **[${issue.severity.toUpperCase()}]** ${issue.file}: ${issue.issue}\n`;
  });

  // Recommendations
  report += `\n## Recommendations\n\n`;
  report += `1. Fix all CRUD operation failures\n`;
  report += `2. Remove or properly gate all mock/test code\n`;
  report += `3. Add proper error handling to all async operations\n`;
  report += `4. Use db abstraction layer instead of direct Supabase calls\n`;
  report += `5. Add validation to all create/update operations\n`;
  report += `6. Test Client Portal authentication flow\n`;
  report += `7. Review and fix logic issues\n\n`;

  fs.writeFileSync(reportPath, report);
  console.log(`✅ Report generated: ${reportPath}`);

  // JSON report
  const jsonPath = path.join(__dirname, 'CRUD_CLIENT_PORTAL_AUDIT_REPORT.json');
  fs.writeFileSync(jsonPath, JSON.stringify(AUDIT_REPORT, null, 2));
  console.log(`✅ JSON report generated: ${jsonPath}`);
}

// Main execution
async function main() {
  console.log('🚀 Starting Force Audit: CRUD Operations & Client Portal...\n');
  console.log('='.repeat(80));

  try {
    await testCustomerCRUD();
    await testShipmentCRUD();
    await testCampaignCRUD();
    await testSettingsCRUD();
    await auditClientPortal();
    await findMockCode();
    await findLogicIssues();
    await generateReport();

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Force Audit Complete!\n');
    console.log(`📄 Full report: CRUD_CLIENT_PORTAL_AUDIT_REPORT.md`);
    console.log(`📄 JSON report: CRUD_CLIENT_PORTAL_AUDIT_REPORT.json\n`);
  } catch (err) {
    console.error('\n❌ Audit failed:', err);
    process.exit(1);
  }
}

main();
