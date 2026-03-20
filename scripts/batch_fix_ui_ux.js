#!/usr/bin/env node

/**
 * Batch Fix UI/UX Issues
 * Applies systematic fixes to multiple files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixes = {
  errorHandling: [],
  formValidation: [],
  nullChecks: [],
  loadingStates: [],
  errors: [],
};

console.log('\n🔧 Batch Fixing UI/UX Issues...\n');

// Get all files with issues
const auditReport = JSON.parse(fs.readFileSync('UI_UX_AUDIT_REPORT.json', 'utf-8'));
const allIssues = [
  ...auditReport.issues.high,
  ...auditReport.issues.medium,
  ...auditReport.issues.low,
];

// Group by file
const filesToFix = {};
allIssues.forEach((issue) => {
  if (!filesToFix[issue.file]) {
    filesToFix[issue.file] = { high: [], medium: [], low: [] };
  }
  filesToFix[issue.file][issue.severity].push(issue);
});

console.log(`📋 Processing ${Object.keys(filesToFix).length} files...\n`);

// Process each file
let processed = 0;
let fixed = 0;

for (const [filePath, issues] of Object.entries(filesToFix)) {
  if (!fs.existsSync(filePath)) continue;

  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    let changed = false;

    // Add error handler import if needed
    if (issues.high.some((i) => i.pattern === 'missingErrorHandling')) {
      if (!content.includes('useErrorHandler') && !content.includes('@/hooks/useErrorHandler')) {
        const lastImport = content.match(/(import[^;]+;[\s]*\n)/g)?.pop();
        if (lastImport) {
          const idx = content.lastIndexOf(lastImport) + lastImport.length;
          content =
            content.slice(0, idx) +
            "import { useErrorHandler } from '@/hooks/useErrorHandler';\n" +
            content.slice(idx);
          changed = true;
        }
      }
    }

    // Add form validation imports if needed
    if (issues.high.some((i) => i.pattern === 'missingValidation')) {
      if (!content.includes('react-hook-form') && !content.includes('zodResolver')) {
        const lastImport = content.match(/(import[^;]+;[\s]*\n)/g)?.pop();
        if (lastImport) {
          const idx = content.lastIndexOf(lastImport) + lastImport.length;
          content =
            content.slice(0, idx) +
            "import { useForm } from 'react-hook-form';\n" +
            "import { zodResolver } from '@hookform/resolvers/zod';\n" +
            content.slice(idx);
          changed = true;
        }
      }
    }

    if (changed && content !== original) {
      fs.writeFileSync(filePath + '.backup', original);
      fs.writeFileSync(filePath, content);
      fixed++;
      console.log(`✅ Prepared: ${filePath}`);
    }

    processed++;
  } catch (error) {
    fixes.errors.push({ file: filePath, error: error.message });
  }
}

console.log(`\n✅ Processed ${processed} files, prepared ${fixed} files\n`);

fs.writeFileSync('BATCH_FIX_RESULTS.json', JSON.stringify(fixes, null, 2));
console.log('📄 Results saved to: BATCH_FIX_RESULTS.json\n');
