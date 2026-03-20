#!/usr/bin/env node

/**
 * Deep Frontend Stability Audit
 *
 * Audits:
 * 1. Missing Error Handling (async operations, event handlers)
 * 2. Missing Form Validation (forms without react-hook-form + zod)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

// Patterns to identify async operations without error handling
const ASYNC_PATTERNS = [
  {
    pattern: /onClick\s*=\s*\{?\s*async\s*\([^)]*\)\s*=>\s*\{[^}]*await[^}]*\}/g,
    name: 'Async onClick handler',
  },
  {
    pattern: /onClick\s*=\s*\{?\s*\([^)]*\)\s*=>\s*\{[^}]*await[^}]*\}/g,
    name: 'onClick with await',
  },
  {
    pattern: /onSubmit\s*=\s*\{?\s*async\s*\([^)]*\)\s*=>\s*\{[^}]*await[^}]*\}/g,
    name: 'Async onSubmit handler',
  },
  {
    pattern: /handleSubmit\s*=\s*async\s*\([^)]*\)\s*=>\s*\{[^}]*await[^}]*\}/g,
    name: 'Async handleSubmit',
  },
  {
    pattern: /handleClick\s*=\s*async\s*\([^)]*\)\s*=>\s*\{[^}]*await[^}]*\}/g,
    name: 'Async handleClick',
  },
  {
    pattern: /handleDelete\s*=\s*async\s*\([^)]*\)\s*=>\s*\{[^}]*await[^}]*\}/g,
    name: 'Async handleDelete',
  },
  {
    pattern: /handleUpdate\s*=\s*async\s*\([^)]*\)\s*=>\s*\{[^}]*await[^}]*\}/g,
    name: 'Async handleUpdate',
  },
  {
    pattern: /handleCreate\s*=\s*async\s*\([^)]*\)\s*=>\s*\{[^}]*await[^}]*\}/g,
    name: 'Async handleCreate',
  },
  {
    pattern: /handleSave\s*=\s*async\s*\([^)]*\)\s*=>\s*\{[^}]*await[^}]*\}/g,
    name: 'Async handleSave',
  },
  {
    pattern: /const\s+\w+\s*=\s*async\s*\([^)]*\)\s*=>\s*\{[^}]*await[^}]*\}/g,
    name: 'Async arrow function',
  },
];

// Patterns to identify mutation calls without error handling
const MUTATION_PATTERNS = [
  { pattern: /\.mutate\([^)]*\)/g, name: 'React Query mutate' },
  { pattern: /\.mutateAsync\([^)]*\)/g, name: 'React Query mutateAsync' },
  { pattern: /useMutation\([^)]*\)/g, name: 'useMutation hook' },
];

// Patterns to identify forms
const FORM_PATTERNS = [
  { pattern: /<form[^>]*>/gi, name: 'HTML form element' },
  { pattern: /onSubmit\s*=\s*\{/g, name: 'onSubmit handler' },
  { pattern: /handleSubmit\s*=/g, name: 'handleSubmit function' },
  { pattern: /Form\s*from\s*['"]@\/components\/ui\/form['"]/g, name: 'shadcn Form component' },
];

// Validation patterns (indicating validation is present)
const VALIDATION_INDICATORS = [
  /useForm\s*\(/g,
  /react-hook-form/g,
  /zodResolver/g,
  /@hookform\/resolvers/g,
  /\.register\s*\(/g,
  /formState\.errors/g,
  /\.parse\s*\(/g,
  /schema\.parse/g,
  /z\.object/g,
];

// Error handling indicators
const ERROR_HANDLING_INDICATORS = [
  /try\s*\{/g,
  /catch\s*\(/g,
  /\.catch\s*\(/g,
  /useErrorHandler/g,
  /handleError/g,
  /safeHandler/g,
  /useSafeEventHandler/g,
  /onError\s*:/g,
];

function getAllJsxFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.git')) {
      getAllJsxFiles(filePath, fileList);
    } else if (file.endsWith('.jsx') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function findAsyncOperations(content, filePath) {
  const issues = [];
  const lines = content.split('\n');

  // Check for async operations
  ASYNC_PATTERNS.forEach(({ pattern, name }) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const line = lines[lineNumber - 1]?.trim() || '';

      // Check if error handling exists in the surrounding context
      const contextStart = Math.max(0, match.index - 500);
      const contextEnd = Math.min(content.length, match.index + match[0].length + 500);
      const context = content.substring(contextStart, contextEnd);

      const hasErrorHandling = ERROR_HANDLING_INDICATORS.some((indicator) =>
        indicator.test(context)
      );

      if (!hasErrorHandling) {
        issues.push({
          type: 'missing_error_handling',
          pattern: name,
          line: lineNumber,
          code: line.substring(0, 100),
          file: path.relative(PROJECT_ROOT, filePath),
        });
      }
    }
  });

  // Check for mutations without error handling
  MUTATION_PATTERNS.forEach(({ pattern, name }) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const line = lines[lineNumber - 1]?.trim() || '';

      // Check surrounding context for error handling
      const contextStart = Math.max(0, match.index - 300);
      const contextEnd = Math.min(content.length, match.index + match[0].length + 300);
      const context = content.substring(contextStart, contextEnd);

      const hasErrorHandling = ERROR_HANDLING_INDICATORS.some((indicator) =>
        indicator.test(context)
      );

      if (!hasErrorHandling) {
        issues.push({
          type: 'missing_error_handling',
          pattern: name,
          line: lineNumber,
          code: line.substring(0, 100),
          file: path.relative(PROJECT_ROOT, filePath),
        });
      }
    }
  });

  return issues;
}

function findFormsWithoutValidation(content, filePath) {
  const issues = [];
  const lines = content.split('\n');

  // Check if file contains forms
  const hasForm = FORM_PATTERNS.some(({ pattern }) => pattern.test(content));

  if (!hasForm) {
    return issues;
  }

  // Check if validation is present
  const hasValidation = VALIDATION_INDICATORS.some((indicator) => indicator.test(content));

  if (!hasValidation) {
    // Find form-related lines
    FORM_PATTERNS.forEach(({ pattern, name }) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const line = lines[lineNumber - 1]?.trim() || '';

        issues.push({
          type: 'missing_form_validation',
          pattern: name,
          line: lineNumber,
          code: line.substring(0, 100),
          file: path.relative(PROJECT_ROOT, filePath),
        });
      }
    });
  }

  return issues;
}

function auditFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const errorHandlingIssues = findAsyncOperations(content, filePath);
    const validationIssues = findFormsWithoutValidation(content, filePath);

    return {
      file: path.relative(PROJECT_ROOT, filePath),
      errorHandling: errorHandlingIssues,
      validation: validationIssues,
    };
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

function main() {
  console.log('🔍 Starting Deep Frontend Stability Audit...\n');

  const jsxFiles = getAllJsxFiles(SRC_DIR);
  console.log(`Found ${jsxFiles.length} JSX/TSX files to audit\n`);

  const results = [];
  let totalErrorHandlingIssues = 0;
  let totalValidationIssues = 0;

  jsxFiles.forEach((file) => {
    const result = auditFile(file);
    if (result) {
      if (result.errorHandling.length > 0 || result.validation.length > 0) {
        results.push(result);
        totalErrorHandlingIssues += result.errorHandling.length;
        totalValidationIssues += result.validation.length;
      }
    }
  });

  // Group issues by file
  const errorHandlingByFile = {};
  const validationByFile = {};

  results.forEach((result) => {
    if (result.errorHandling.length > 0) {
      errorHandlingByFile[result.file] = result.errorHandling;
    }
    if (result.validation.length > 0) {
      validationByFile[result.file] = result.validation;
    }
  });

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFilesAudited: jsxFiles.length,
      filesWithIssues: results.length,
      totalErrorHandlingIssues,
      totalValidationIssues,
      errorHandlingFiles: Object.keys(errorHandlingByFile).length,
      validationFiles: Object.keys(validationByFile).length,
    },
    errorHandling: {
      total: totalErrorHandlingIssues,
      byFile: errorHandlingByFile,
    },
    formValidation: {
      total: totalValidationIssues,
      byFile: validationByFile,
    },
  };

  // Save JSON report
  const reportPath = path.join(PROJECT_ROOT, 'docs', 'FRONTEND_STABILITY_AUDIT.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`✅ JSON report saved to: ${reportPath}\n`);

  // Generate markdown report
  let markdown = `# Frontend Stability Audit Report\n\n`;
  markdown += `**Date:** ${new Date().toLocaleString()}\n\n`;
  markdown += `## Executive Summary\n\n`;
  markdown += `- **Total Files Audited:** ${jsxFiles.length}\n`;
  markdown += `- **Files with Issues:** ${results.length}\n`;
  markdown += `- **Missing Error Handling:** ${totalErrorHandlingIssues} occurrences across ${Object.keys(errorHandlingByFile).length} files\n`;
  markdown += `- **Missing Form Validation:** ${totalValidationIssues} occurrences across ${Object.keys(validationByFile).length} files\n\n`;

  markdown += `---\n\n`;
  markdown += `## 1. Missing Error Handling (${totalErrorHandlingIssues} Occurrences)\n\n`;

  if (totalErrorHandlingIssues === 0) {
    markdown += `✅ **No issues found!** All async operations have proper error handling.\n\n`;
  } else {
    markdown += `### Files Requiring Error Handling\n\n`;

    Object.entries(errorHandlingByFile)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([file, issues]) => {
        markdown += `#### ${file} (${issues.length} issues)\n\n`;
        issues.forEach((issue, idx) => {
          markdown += `${idx + 1}. **Line ${issue.line}:** ${issue.pattern}\n`;
          markdown += `   \`\`\`jsx\n   ${issue.code}\n   \`\`\`\n\n`;
        });
      });
  }

  markdown += `---\n\n`;
  markdown += `## 2. Missing Form Validation (${totalValidationIssues} Occurrences)\n\n`;

  if (totalValidationIssues === 0) {
    markdown += `✅ **No issues found!** All forms have proper validation.\n\n`;
  } else {
    markdown += `### Forms Requiring Validation\n\n`;

    Object.entries(validationByFile)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([file, issues]) => {
        markdown += `#### ${file} (${issues.length} issues)\n\n`;
        const uniquePatterns = [...new Set(issues.map((i) => i.pattern))];
        markdown += `**Patterns Found:** ${uniquePatterns.join(', ')}\n\n`;
        markdown += `**Recommendation:** Implement React Hook Form with Zod validation\n\n`;
      });
  }

  markdown += `---\n\n`;
  markdown += `## Recommended Fix Patterns\n\n`;
  markdown += `### Error Handling Pattern\n\n`;
  markdown += `\`\`\`javascript\n`;
  markdown += `import { useErrorHandler } from '@/hooks/useErrorHandler';\n\n`;
  markdown += `const { handleError } = useErrorHandler();\n\n`;
  markdown += `onClick={async () => {\n`;
  markdown += `  try {\n`;
  markdown += `    await someAsyncOperation();\n`;
  markdown += `  } catch (error) {\n`;
  markdown += `    handleError(error, 'Failed to perform operation', {\n`;
  markdown += `      component: 'ComponentName',\n`;
  markdown += `      action: 'operationName',\n`;
  markdown += `    });\n`;
  markdown += `  }\n`;
  markdown += `}}\n`;
  markdown += `\`\`\`\n\n`;

  markdown += `### Form Validation Pattern\n\n`;
  markdown += `\`\`\`javascript\n`;
  markdown += `import { useForm } from 'react-hook-form';\n`;
  markdown += `import { zodResolver } from '@hookform/resolvers/zod';\n`;
  markdown += `import { schema } from '@/lib/schemas';\n\n`;
  markdown += `const form = useForm({\n`;
  markdown += `  resolver: zodResolver(schema),\n`;
  markdown += `  defaultValues: { /* ... */ },\n`;
  markdown += `});\n\n`;
  markdown += `const onSubmit = async (data) => {\n`;
  markdown += `  try {\n`;
  markdown += `    await submitForm(data);\n`;
  markdown += `  } catch (error) {\n`;
  markdown += `    handleError(error, 'Failed to submit form');\n`;
  markdown += `  }\n`;
  markdown += `};\n\n`;
  markdown += `<form onSubmit={form.handleSubmit(onSubmit)}>\n`;
  markdown += `  {/* form fields */}\n`;
  markdown += `</form>\n`;
  markdown += `\`\`\`\n\n`;

  const markdownPath = path.join(PROJECT_ROOT, 'docs', 'FRONTEND_STABILITY_AUDIT.md');
  fs.writeFileSync(markdownPath, markdown);
  console.log(`✅ Markdown report saved to: ${markdownPath}\n`);

  // Console summary
  console.log('📊 Audit Summary:');
  console.log(`   Missing Error Handling: ${totalErrorHandlingIssues} occurrences`);
  console.log(`   Missing Form Validation: ${totalValidationIssues} occurrences`);
  console.log(`   Files with Error Handling Issues: ${Object.keys(errorHandlingByFile).length}`);
  console.log(`   Files with Validation Issues: ${Object.keys(validationByFile).length}`);
  console.log('\n✅ Audit complete!');
}

main();
