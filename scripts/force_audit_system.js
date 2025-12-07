import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
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
  database: { status: 'pending', issues: [], tables: {} },
  security: { status: 'pending', issues: [], critical: 0, high: 0, medium: 0, low: 0 },
  codeQuality: { status: 'pending', issues: [], warnings: [] },
  dependencies: { status: 'pending', vulnerabilities: [], outdated: [] },
  performance: { status: 'pending', issues: [] },
  architecture: { status: 'pending', issues: [] },
};

// Database Tables
const TABLES = [
  'profiles',
  'vendors',
  'customers',
  'inventory_items',
  'company_settings',
  'purchase_orders',
  'shipments',
  'shopping_orders',
  'invoices',
  'customer_invoices',
  'tasks',
  'expenses',
  'campaigns',
  'feedback',
  'stock_movements',
  'notifications',
  'vendor_orders',
  'vendor_payments',
  'service_pricing',
  'surcharges',
  'custom_segments',
  'scheduled_reports',
  'goods_receipts',
  'vendor_contracts',
  'approval_rules',
  'approval_history',
  'audit_logs',
  'vendor_invitations',
  'vendor_payouts',
  'notification_templates',
];

async function auditDatabase() {
  console.log('\n🔍 Auditing Database...\n');
  const issues = [];
  let tablesFound = 0;
  let tablesMissing = 0;

  for (const table of TABLES) {
    try {
      const { count, error, data } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
          AUDIT_REPORT.database.tables[table] = { status: 'missing', error: 'Table not found' };
          tablesMissing++;
          issues.push(`Table '${table}' does not exist`);
        } else {
          AUDIT_REPORT.database.tables[table] = { status: 'error', error: error.message };
          issues.push(`Table '${table}': ${error.message}`);
        }
      } else {
        const columns = data && data[0] ? Object.keys(data[0]) : [];
        const hasId = columns.includes('id');
        const hasCreatedAt = columns.includes('created_at');
        const hasCreatedDate = columns.includes('created_date');
        const warnings = [];

        if (!hasId) warnings.push('No id column');
        if (hasCreatedAt && hasCreatedDate) warnings.push('Both created_at and created_date exist');
        if (!hasCreatedAt && !hasCreatedDate) warnings.push('No timestamp column');

        AUDIT_REPORT.database.tables[table] = {
          status: 'ok',
          count: count || 0,
          columns: columns.length,
          warnings: warnings.length > 0 ? warnings : null,
        };
        tablesFound++;

        if (warnings.length > 0) {
          issues.push(`Table '${table}': ${warnings.join(', ')}`);
        }
      }
    } catch (err) {
      AUDIT_REPORT.database.tables[table] = { status: 'exception', error: err.message };
      issues.push(`Table '${table}': ${err.message}`);
    }
  }

  AUDIT_REPORT.database.issues = issues;
  AUDIT_REPORT.database.status = issues.length === 0 ? 'pass' : 'fail';
  AUDIT_REPORT.database.summary = {
    total: TABLES.length,
    found: tablesFound,
    missing: tablesMissing,
    issues: issues.length,
  };

  console.log(`✅ Database Audit Complete: ${tablesFound}/${TABLES.length} tables found, ${issues.length} issues`);
}

async function auditSecurity() {
  console.log('\n🔒 Auditing Security...\n');
  const issues = [];
  let critical = 0;
  let high = 0;
  let medium = 0;
  let low = 0;

  // Check for XSS vulnerabilities
  try {
    const srcPath = path.join(__dirname, 'src');
    const files = getAllFiles(srcPath, ['.jsx', '.js', '.ts', '.tsx']);

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(__dirname, file);

      // Check for dangerouslySetInnerHTML without sanitization
      if (content.includes('dangerouslySetInnerHTML')) {
        if (!content.includes('DOMPurify') && !content.includes('sanitize')) {
          issues.push({
            severity: 'critical',
            file: relativePath,
            issue: 'dangerouslySetInnerHTML used without sanitization',
            line: findLineNumber(content, 'dangerouslySetInnerHTML'),
          });
          critical++;
        }
      }

      // Check for eval()
      if (content.includes('eval(') && !content.includes('// SAFE')) {
        issues.push({
          severity: 'critical',
          file: relativePath,
          issue: 'eval() usage detected - potential code injection',
          line: findLineNumber(content, 'eval('),
        });
        critical++;
      }

      // Check for innerHTML without sanitization
      if (content.includes('.innerHTML') && !content.includes('DOMPurify') && !content.includes('sanitize')) {
        const context = getContext(content, '.innerHTML');
        if (!context.includes('sanitize') && !context.includes('DOMPurify')) {
          issues.push({
            severity: 'high',
            file: relativePath,
            issue: 'innerHTML assignment without sanitization',
            line: findLineNumber(content, '.innerHTML'),
          });
          high++;
        }
      }

      // Check for document.write
      if (content.includes('document.write') && !relativePath.includes('documentPrinter')) {
        issues.push({
          severity: 'medium',
          file: relativePath,
          issue: 'document.write() usage - consider safer alternatives',
          line: findLineNumber(content, 'document.write'),
        });
        medium++;
      }

      // Check for hardcoded secrets
      const secretPatterns = [
        /password\s*[:=]\s*['"][^'"]+['"]/i,
        /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
        /secret\s*[:=]\s*['"][^'"]+['"]/i,
      ];

      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          issues.push({
            severity: 'high',
            file: relativePath,
            issue: 'Potential hardcoded secret detected',
            line: findLineNumber(content, pattern),
          });
          high++;
        }
      }

      // Check for mock admin bypass
      if (content.includes('mock') && content.includes('admin') && content.includes('role')) {
        if (content.includes('MOCK ADMIN') || (content.includes('mock-admin') && !content.includes('// REMOVED'))) {
          issues.push({
            severity: 'critical',
            file: relativePath,
            issue: 'Potential mock admin bypass detected',
            line: findLineNumber(content, 'mock'),
          });
          critical++;
        }
      }
    }
  } catch (err) {
    issues.push({
      severity: 'medium',
      file: 'audit_script',
      issue: `Security audit error: ${err.message}`,
    });
    medium++;
  }

  AUDIT_REPORT.security.issues = issues;
  AUDIT_REPORT.security.critical = critical;
  AUDIT_REPORT.security.high = high;
  AUDIT_REPORT.security.medium = medium;
  AUDIT_REPORT.security.low = low;
  AUDIT_REPORT.security.status = critical > 0 ? 'fail' : high > 0 ? 'warning' : 'pass';

  console.log(`✅ Security Audit Complete: ${critical} critical, ${high} high, ${medium} medium issues`);
}

async function auditCodeQuality() {
  console.log('\n📝 Auditing Code Quality...\n');
  const issues = [];
  const warnings = [];

  try {
    const srcPath = path.join(__dirname, 'src');
    const files = getAllFiles(srcPath, ['.jsx', '.js', '.ts', '.tsx']);

    // Count console statements
    let consoleCount = 0;
    const consoleFiles = new Set();

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(__dirname, file);
      const consoleMatches = content.match(/console\.(log|warn|error|info|debug)/g);

      if (consoleMatches) {
        consoleCount += consoleMatches.length;
        consoleFiles.add(relativePath);
      }

      // Check for empty catch blocks
      if (content.includes('catch') && content.includes('catch ()') || content.includes('catch (e) {}') || content.includes('catch (err) {}')) {
        const emptyCatchPattern = /catch\s*\([^)]*\)\s*\{\s*\}/;
        if (emptyCatchPattern.test(content)) {
          warnings.push({
            file: relativePath,
            issue: 'Empty catch block detected',
            line: findLineNumber(content, 'catch'),
          });
        }
      }

      // Check for large files
      const lines = content.split('\n').length;
      if (lines > 500) {
        warnings.push({
          file: relativePath,
          issue: `Large file: ${lines} lines (consider splitting)`,
        });
      }

      // Check for missing error boundaries
      if (relativePath.includes('pages/') && !content.includes('ErrorBoundary')) {
        // This is just informational
      }
    }

    if (consoleCount > 0) {
      warnings.push({
        file: 'multiple',
        issue: `${consoleCount} console statements found across ${consoleFiles.size} files`,
      });
    }

    // Check for unused imports (basic check)
    // This would require a more sophisticated parser

  } catch (err) {
    issues.push({
      file: 'audit_script',
      issue: `Code quality audit error: ${err.message}`,
    });
  }

  AUDIT_REPORT.codeQuality.issues = issues;
  AUDIT_REPORT.codeQuality.warnings = warnings;
  AUDIT_REPORT.codeQuality.status = issues.length === 0 ? 'pass' : 'warning';

  console.log(`✅ Code Quality Audit Complete: ${issues.length} issues, ${warnings.length} warnings`);
}

async function auditDependencies() {
  console.log('\n📦 Auditing Dependencies...\n');
  const vulnerabilities = [];
  const outdated = [];

  try {
    // Run npm audit
    try {
      const auditOutput = execSync('npm audit --json', { cwd: __dirname, encoding: 'utf8', stdio: 'pipe' });
      const auditData = JSON.parse(auditOutput);
      if (auditData.vulnerabilities) {
        Object.entries(auditData.vulnerabilities).forEach(([name, vuln]) => {
          vulnerabilities.push({
            package: name,
            severity: vuln.severity || 'unknown',
            title: vuln.title || 'Unknown vulnerability',
          });
        });
      }
    } catch (err) {
      // npm audit may fail if there are vulnerabilities, parse stderr
      try {
        const auditOutput = err.stderr?.toString() || err.stdout?.toString() || '{}';
        const auditData = JSON.parse(auditOutput);
        if (auditData.vulnerabilities) {
          Object.entries(auditData.vulnerabilities).forEach(([name, vuln]) => {
            vulnerabilities.push({
              package: name,
              severity: vuln.severity || 'unknown',
              title: vuln.title || 'Unknown vulnerability',
            });
          });
        }
      } catch (parseErr) {
        vulnerabilities.push({
          package: 'unknown',
          severity: 'unknown',
          title: `Could not parse npm audit output: ${err.message}`,
        });
      }
    }

    // Check for outdated packages
    try {
      const outdatedOutput = execSync('npm outdated --json', { cwd: __dirname, encoding: 'utf8', stdio: 'pipe' });
      const outdatedData = JSON.parse(outdatedOutput);
      Object.entries(outdatedData).forEach(([name, info]) => {
        outdated.push({
          package: name,
          current: info.current,
          wanted: info.wanted,
          latest: info.latest,
        });
      });
    } catch (err) {
      // npm outdated returns non-zero if packages are outdated
      try {
        const outdatedOutput = err.stdout?.toString() || '{}';
        const outdatedData = JSON.parse(outdatedOutput);
        Object.entries(outdatedData).forEach(([name, info]) => {
          outdated.push({
            package: name,
            current: info.current,
            wanted: info.wanted,
            latest: info.latest,
          });
        });
      } catch (parseErr) {
        // Ignore parse errors
      }
    }
  } catch (err) {
    vulnerabilities.push({
      package: 'audit_script',
      severity: 'low',
      title: `Dependency audit error: ${err.message}`,
    });
  }

  AUDIT_REPORT.dependencies.vulnerabilities = vulnerabilities;
  AUDIT_REPORT.dependencies.outdated = outdated;
  AUDIT_REPORT.dependencies.status =
    vulnerabilities.filter((v) => v.severity === 'critical' || v.severity === 'high').length > 0
      ? 'fail'
      : vulnerabilities.length > 0
        ? 'warning'
        : 'pass';

  console.log(`✅ Dependencies Audit Complete: ${vulnerabilities.length} vulnerabilities, ${outdated.length} outdated packages`);
}

async function auditPerformance() {
  console.log('\n⚡ Auditing Performance...\n');
  const issues = [];

  try {
    const srcPath = path.join(__dirname, 'src');
    const files = getAllFiles(srcPath, ['.jsx', '.js']);

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(__dirname, file);

      // Check for select('*')
      if (content.includes("select('*')") || content.includes('select("*")')) {
        issues.push({
          file: relativePath,
          issue: "Using select('*') - should specify columns",
          severity: 'medium',
        });
      }

      // Check for aggressive polling
      if (content.includes('refetchInterval') && content.includes('refetchInterval: 5000')) {
        issues.push({
          file: relativePath,
          issue: 'Aggressive polling (5s interval) - consider WebSockets',
          severity: 'medium',
        });
      }

      // Check for missing memoization in large components
      if (relativePath.includes('pages/') && content.length > 10000) {
        if (!content.includes('useMemo') && !content.includes('useCallback')) {
          issues.push({
            file: relativePath,
            issue: 'Large component without memoization',
            severity: 'low',
          });
        }
      }
    }
  } catch (err) {
    issues.push({
      file: 'audit_script',
      issue: `Performance audit error: ${err.message}`,
    });
  }

  AUDIT_REPORT.performance.issues = issues;
  AUDIT_REPORT.performance.status = issues.filter((i) => i.severity === 'high').length > 0 ? 'warning' : 'pass';

  console.log(`✅ Performance Audit Complete: ${issues.length} issues found`);
}

async function auditArchitecture() {
  console.log('\n🏗️  Auditing Architecture...\n');
  const issues = [];

  try {
    const srcPath = path.join(__dirname, 'src');
    const files = getAllFiles(srcPath, ['.jsx', '.js']);

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(__dirname, file);

      // Check for mock code in production
      if (content.includes('MOCK') && content.includes('async') && !content.includes('// TEST ONLY')) {
        if (relativePath.includes('api/') || relativePath.includes('components/')) {
          issues.push({
            file: relativePath,
            issue: 'Mock code detected in production files',
            severity: 'high',
          });
        }
      }

      // Check for direct Supabase calls (should use abstraction)
      if (content.includes('supabase.from(') && !relativePath.includes('supabaseClient')) {
        // This is informational - direct calls are OK in some cases
      }
    }
  } catch (err) {
    issues.push({
      file: 'audit_script',
      issue: `Architecture audit error: ${err.message}`,
    });
  }

  AUDIT_REPORT.architecture.issues = issues;
  AUDIT_REPORT.architecture.status = issues.filter((i) => i.severity === 'high').length > 0 ? 'warning' : 'pass';

  console.log(`✅ Architecture Audit Complete: ${issues.length} issues found`);
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

function findLineNumber(content, pattern) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (typeof pattern === 'string' ? lines[i].includes(pattern) : pattern.test(lines[i])) {
      return i + 1;
    }
  }
  return null;
}

function getContext(content, pattern, contextLines = 5) {
  const lineNum = findLineNumber(content, pattern);
  if (!lineNum) return '';
  const lines = content.split('\n');
  const start = Math.max(0, lineNum - contextLines - 1);
  const end = Math.min(lines.length, lineNum + contextLines);
  return lines.slice(start, end).join('\n');
}

async function generateReport() {
  console.log('\n📊 Generating Comprehensive Audit Report...\n');

  const reportPath = path.join(__dirname, 'FORCE_AUDIT_REPORT.md');
  let report = `# Force Audit Report - ${new Date().toISOString()}\n\n`;
  report += `**Generated:** ${AUDIT_REPORT.timestamp}\n\n`;
  report += `## Executive Summary\n\n`;

  // Overall status
  const overallStatus =
    AUDIT_REPORT.security.status === 'fail' ||
    AUDIT_REPORT.database.status === 'fail' ||
    AUDIT_REPORT.dependencies.status === 'fail'
      ? '❌ FAIL'
      : AUDIT_REPORT.security.status === 'warning' ||
          AUDIT_REPORT.database.status === 'warning' ||
          AUDIT_REPORT.dependencies.status === 'warning'
        ? '⚠️  WARNING'
        : '✅ PASS';

  report += `**Overall Status:** ${overallStatus}\n\n`;

  // Database
  report += `### Database: ${AUDIT_REPORT.database.status === 'pass' ? '✅' : '❌'} ${AUDIT_REPORT.database.status.toUpperCase()}\n`;
  report += `- Tables Found: ${AUDIT_REPORT.database.summary?.found || 0}/${AUDIT_REPORT.database.summary?.total || 0}\n`;
  report += `- Issues: ${AUDIT_REPORT.database.issues.length}\n\n`;

  // Security
  report += `### Security: ${AUDIT_REPORT.security.status === 'pass' ? '✅' : '❌'} ${AUDIT_REPORT.security.status.toUpperCase()}\n`;
  report += `- Critical: ${AUDIT_REPORT.security.critical}\n`;
  report += `- High: ${AUDIT_REPORT.security.high}\n`;
  report += `- Medium: ${AUDIT_REPORT.security.medium}\n`;
  report += `- Low: ${AUDIT_REPORT.security.low}\n\n`;

  // Dependencies
  report += `### Dependencies: ${AUDIT_REPORT.dependencies.status === 'pass' ? '✅' : '❌'} ${AUDIT_REPORT.dependencies.status.toUpperCase()}\n`;
  report += `- Vulnerabilities: ${AUDIT_REPORT.dependencies.vulnerabilities.length}\n`;
  report += `- Outdated: ${AUDIT_REPORT.dependencies.outdated.length}\n\n`;

  // Detailed sections
  report += `## Detailed Findings\n\n`;

  // Database details
  if (AUDIT_REPORT.database.issues.length > 0) {
    report += `### Database Issues\n\n`;
    AUDIT_REPORT.database.issues.forEach((issue, i) => {
      report += `${i + 1}. ${issue}\n`;
    });
    report += `\n`;
  }

  // Security details
  if (AUDIT_REPORT.security.issues.length > 0) {
    report += `### Security Issues\n\n`;
    AUDIT_REPORT.security.issues.forEach((issue, i) => {
      report += `${i + 1}. **[${issue.severity.toUpperCase()}]** ${issue.file}${issue.line ? `:${issue.line}` : ''}\n`;
      report += `   - ${issue.issue}\n\n`;
    });
  }

  // Dependencies details
  if (AUDIT_REPORT.dependencies.vulnerabilities.length > 0) {
    report += `### Dependency Vulnerabilities\n\n`;
    AUDIT_REPORT.dependencies.vulnerabilities.slice(0, 20).forEach((vuln, i) => {
      report += `${i + 1}. **[${vuln.severity}]** ${vuln.package}\n`;
      report += `   - ${vuln.title}\n\n`;
    });
    if (AUDIT_REPORT.dependencies.vulnerabilities.length > 20) {
      report += `... and ${AUDIT_REPORT.dependencies.vulnerabilities.length - 20} more\n\n`;
    }
  }

  // Code Quality
  if (AUDIT_REPORT.codeQuality.warnings.length > 0) {
    report += `### Code Quality Warnings\n\n`;
    AUDIT_REPORT.codeQuality.warnings.slice(0, 10).forEach((warning, i) => {
      report += `${i + 1}. ${warning.file}: ${warning.issue}\n`;
    });
    report += `\n`;
  }

  // Performance
  if (AUDIT_REPORT.performance.issues.length > 0) {
    report += `### Performance Issues\n\n`;
    AUDIT_REPORT.performance.issues.slice(0, 10).forEach((issue, i) => {
      report += `${i + 1}. [${issue.severity}] ${issue.file}: ${issue.issue}\n`;
    });
    report += `\n`;
  }

  // Architecture
  if (AUDIT_REPORT.architecture.issues.length > 0) {
    report += `### Architecture Issues\n\n`;
    AUDIT_REPORT.architecture.issues.forEach((issue, i) => {
      report += `${i + 1}. [${issue.severity}] ${issue.file}: ${issue.issue}\n`;
    });
    report += `\n`;
  }

  report += `## Recommendations\n\n`;
  report += `1. Address all Critical and High severity security issues immediately\n`;
  report += `2. Fix missing database tables\n`;
  report += `3. Update vulnerable dependencies\n`;
  report += `4. Review and fix code quality warnings\n`;
  report += `5. Optimize performance issues\n\n`;

  fs.writeFileSync(reportPath, report);
  console.log(`✅ Report generated: ${reportPath}`);

  // Also output JSON for programmatic access
  const jsonPath = path.join(__dirname, 'FORCE_AUDIT_REPORT.json');
  fs.writeFileSync(jsonPath, JSON.stringify(AUDIT_REPORT, null, 2));
  console.log(`✅ JSON report generated: ${jsonPath}`);
}

// Main execution
async function main() {
  console.log('🚀 Starting Force Audit of Entire System...\n');
  console.log('='.repeat(80));

  try {
    await auditDatabase();
    await auditSecurity();
    await auditCodeQuality();
    await auditDependencies();
    await auditPerformance();
    await auditArchitecture();
    await generateReport();

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Force Audit Complete!\n');
    console.log(`📄 Full report: FORCE_AUDIT_REPORT.md`);
    console.log(`📄 JSON report: FORCE_AUDIT_REPORT.json\n`);
  } catch (err) {
    console.error('\n❌ Audit failed:', err);
    process.exit(1);
  }
}

main();

