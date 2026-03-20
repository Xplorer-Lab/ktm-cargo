#!/usr/bin/env node

/**
 * Comprehensive UI/UX Front-End Audit
 * Scans for bugs, errors, and issues in React components, event handlers, and user interactions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const issues = {
  critical: [],
  high: [],
  medium: [],
  low: [],
};

const stats = {
  componentsScanned: 0,
  eventHandlersFound: 0,
  issuesFound: 0,
};

// Patterns to check for
const patterns = {
  // Missing error handling in event handlers
  missingErrorHandling: {
    regex:
      /(onClick|onSubmit|onChange|onBlur|onFocus|onKeyDown|onKeyUp|onMouseEnter|onMouseLeave)\s*=\s*\{?\s*(async\s+)?\([^)]*\)\s*=>\s*\{[^}]*\}(?!\s*catch)/g,
    severity: 'high',
    description: 'Event handler without error handling',
  },

  // Empty catch blocks
  emptyCatch: {
    regex: /catch\s*\([^)]*\)\s*\{\s*\}/g,
    severity: 'high',
    description: 'Empty catch block - errors are silently ignored',
  },

  // Missing loading states
  missingLoadingState: {
    regex:
      /(mutate|mutateAsync|execute|refetch)\([^)]*\)(?![\s\S]*?(isLoading|isPending|isFetching|loading|pending))/g,
    severity: 'medium',
    description: 'Async operation without loading state check',
  },

  // Direct state updates in event handlers (potential race conditions)
  directStateUpdate: {
    regex:
      /(onClick|onSubmit|onChange).*?setState\([^)]*\)(?![\s\S]*?useCallback|[\s\S]*?useMemo)/g,
    severity: 'medium',
    description: 'Direct state update in event handler without memoization',
  },

  // Missing null/undefined checks
  missingNullCheck: {
    regex: /(onClick|onSubmit|onChange).*?\.(id|name|value|data)\s*(?!\?)/g,
    severity: 'medium',
    description: 'Potential null/undefined access in event handler',
  },

  // Unhandled promise rejections
  unhandledPromise: {
    regex: /(onClick|onSubmit|onChange).*?await\s+\w+\([^)]*\)(?![\s\S]*?catch)/g,
    severity: 'high',
    description: 'Unhandled promise rejection in event handler',
  },

  // Missing cleanup in useEffect
  missingCleanup: {
    regex:
      /useEffect\s*\([^)]*\)\s*=>\s*\{[^}]*setTimeout|setInterval|addEventListener|subscribe(?![\s\S]*?return\s+\(\)\s*=>)/g,
    severity: 'high',
    description: 'useEffect with side effects but no cleanup function',
  },

  // Inline functions in JSX (performance issue)
  inlineFunction: {
    regex: /(onClick|onSubmit|onChange|onBlur|onFocus)\s*=\s*\{[^}]*=>[^}]*\}/g,
    severity: 'low',
    description: 'Inline function in JSX - should use useCallback',
  },

  // Missing disabled state for async operations
  missingDisabled: {
    regex: /(mutate|mutateAsync|execute).*?disabled\s*=\s*\{false\}/g,
    severity: 'medium',
    description: 'Button not disabled during async operation',
  },

  // Missing form validation
  missingValidation: {
    regex:
      /onSubmit\s*=\s*\{[^}]*handleSubmit(?![\s\S]*?validation|[\s\S]*?schema|[\s\S]*?validate)/g,
    severity: 'high',
    description: 'Form submission without validation',
  },

  // Direct DOM manipulation
  directDOM: {
    regex: /(document\.|window\.|getElementById|querySelector|innerHTML|innerText)\s*=/g,
    severity: 'high',
    description: 'Direct DOM manipulation - should use React state',
  },

  // Missing key props in lists
  missingKey: {
    regex: /\.map\s*\([^)]*\)\s*=>\s*\(<[^>]+(?!\s+key=)/g,
    severity: 'medium',
    description: 'List items without key prop',
  },

  // State updates based on previous state without functional update
  unsafeStateUpdate: {
    regex: /setState\s*\([^)]*\s+\+\s+[^)]*\)|setState\s*\([^)]*\s+\|\|\s+[^)]*\)/g,
    severity: 'medium',
    description: 'State update that might use stale state',
  },

  // Missing error boundaries for critical components
  missingErrorBoundary: {
    regex: /(dangerouslySetInnerHTML|eval\(|new Function)/g,
    severity: 'critical',
    description: 'Dangerous code without error boundary',
  },

  // Missing accessibility attributes
  missingA11y: {
    regex: /<button(?![\s\S]*?aria-|[\s\S]*?type=)/g,
    severity: 'low',
    description: 'Button missing accessibility attributes',
  },

  // Console.log in production code
  consoleLog: {
    regex: /console\.(log|warn|error|debug)\(/g,
    severity: 'low',
    description: 'Console logging in production code',
  },

  // Missing loading indicators
  missingLoadingIndicator: {
    regex: /(isLoading|isPending|isFetching)\s*&&\s*[^&]*\?/g,
    severity: 'medium',
    description: 'Loading state exists but no loading indicator found',
  },
};

function getAllFiles(dirPath, extensions = ['.jsx', '.js', '.tsx', '.ts'], arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      // Skip node_modules and build directories
      if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(file)) {
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

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(process.cwd(), filePath);
  const lines = content.split('\n');

  const fileIssues = [];
  let eventHandlers = 0;

  // Count event handlers
  const eventHandlerPattern =
    /(onClick|onSubmit|onChange|onBlur|onFocus|onKeyDown|onKeyUp|onMouseEnter|onMouseLeave|onDoubleClick|onDrag|onDrop)\s*=/g;
  const matches = content.match(eventHandlerPattern);
  if (matches) {
    eventHandlers += matches.length;
  }

  // Check each pattern
  Object.entries(patterns).forEach(([patternName, pattern]) => {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags || 'g');
    const matches = [...content.matchAll(regex)];

    matches.forEach((match) => {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const lineContent = lines[lineNumber - 1]?.trim() || '';

      // Skip if it's in a comment
      if (lineContent.startsWith('//') || lineContent.includes('/*')) {
        return;
      }

      fileIssues.push({
        pattern: patternName,
        severity: pattern.severity,
        description: pattern.description,
        line: lineNumber,
        code: lineContent.substring(0, 100),
        file: relativePath,
      });
    });
  });

  // Additional checks
  checkSpecificIssues(content, lines, relativePath, fileIssues);

  return { fileIssues, eventHandlers };
}

function checkSpecificIssues(content, lines, filePath, fileIssues) {
  // Check for useState without initial value
  const useStatePattern = /useState\s*\(\s*\)/g;
  const useStateMatches = [...content.matchAll(useStatePattern)];
  useStateMatches.forEach((match) => {
    const lineNumber = content.substring(0, match.index).split('\n').length;
    fileIssues.push({
      pattern: 'useStateWithoutInit',
      severity: 'medium',
      description: 'useState without initial value',
      line: lineNumber,
      code: lines[lineNumber - 1]?.trim() || '',
      file: filePath,
    });
  });

  // Check for useEffect dependencies
  const useEffectPattern = /useEffect\s*\([^,]*,\s*\[\s*\]\)/g;
  const useEffectMatches = [...content.matchAll(useEffectPattern)];
  useEffectMatches.forEach((match) => {
    const lineNumber = content.substring(0, match.index).split('\n').length;
    // Check if it has dependencies that should be included
    const beforeMatch = content.substring(0, match.index);
    const afterMatch = content.substring(match.index);
    const functionBody = afterMatch.match(/\{[\s\S]*?\}/)?.[0] || '';

    // Check for common dependencies that might be missing
    const hasState = /setState|useState/.test(functionBody);
    const hasProps = /props\.|\.props/.test(functionBody);

    if (hasState || hasProps) {
      fileIssues.push({
        pattern: 'useEffectMissingDeps',
        severity: 'high',
        description: 'useEffect with empty dependency array but uses state/props',
        line: lineNumber,
        code: lines[lineNumber - 1]?.trim() || '',
        file: filePath,
      });
    }
  });

  // Check for missing error handling in mutations
  const mutationPattern = /(useMutation|useQuery).*?onError\s*:\s*undefined/g;
  const mutationMatches = [...content.matchAll(mutationPattern)];
  mutationMatches.forEach((match) => {
    const lineNumber = content.substring(0, match.index).split('\n').length;
    fileIssues.push({
      pattern: 'mutationWithoutErrorHandler',
      severity: 'high',
      description: 'Mutation/Query without error handler',
      line: lineNumber,
      code: lines[lineNumber - 1]?.trim() || '',
      file: filePath,
    });
  });

  // Check for potential memory leaks (event listeners)
  const eventListenerPattern = /addEventListener\s*\([^)]*\)(?![\s\S]*?removeEventListener)/g;
  const listenerMatches = [...content.matchAll(eventListenerPattern)];
  listenerMatches.forEach((match) => {
    const lineNumber = content.substring(0, match.index).split('\n').length;
    fileIssues.push({
      pattern: 'eventListenerLeak',
      severity: 'high',
      description: 'Event listener added but not removed (potential memory leak)',
      line: lineNumber,
      code: lines[lineNumber - 1]?.trim() || '',
      file: filePath,
    });
  });

  // Check for missing form reset
  const formSubmitPattern = /onSubmit.*?handleSubmit(?![\s\S]*?reset\(\)|[\s\S]*?\.reset\(\))/g;
  const formMatches = [...content.matchAll(formSubmitPattern)];
  formMatches.forEach((match) => {
    const lineNumber = content.substring(0, match.index).split('\n').length;
    // Only flag if it's a create operation
    if (content.includes('create') || content.includes('Create')) {
      fileIssues.push({
        pattern: 'formWithoutReset',
        severity: 'low',
        description: 'Form submission without reset after success',
        line: lineNumber,
        code: lines[lineNumber - 1]?.trim() || '',
        file: filePath,
      });
    }
  });

  // Check for race conditions in async operations
  const asyncStateUpdatePattern =
    /await\s+\w+\([^)]*\)[\s\S]*?setState\([^)]*\)(?![\s\S]*?isMounted|[\s\S]*?abort)/g;
  const asyncMatches = [...content.matchAll(asyncStateUpdatePattern)];
  asyncMatches.forEach((match) => {
    const lineNumber = content.substring(0, match.index).split('\n').length;
    fileIssues.push({
      pattern: 'asyncRaceCondition',
      severity: 'high',
      description: 'Potential race condition: state update after async operation without cleanup',
      line: lineNumber,
      code: lines[lineNumber - 1]?.trim() || '',
      file: filePath,
    });
  });
}

function generateReport() {
  const srcPath = path.join(process.cwd(), 'src');
  const files = getAllFiles(srcPath);

  console.log(`\n🔍 Scanning ${files.length} files for UI/UX issues...\n`);

  files.forEach((file) => {
    try {
      const { fileIssues, eventHandlers } = analyzeFile(file);
      stats.componentsScanned++;
      stats.eventHandlersFound += eventHandlers;

      fileIssues.forEach((issue) => {
        stats.issuesFound++;
        issues[issue.severity].push(issue);
      });
    } catch (error) {
      console.error(`Error analyzing ${file}:`, error.message);
    }
  });

  // Generate report
  const report = {
    summary: {
      totalFiles: files.length,
      componentsScanned: stats.componentsScanned,
      eventHandlersFound: stats.eventHandlersFound,
      totalIssues: stats.issuesFound,
      critical: issues.critical.length,
      high: issues.high.length,
      medium: issues.medium.length,
      low: issues.low.length,
    },
    issues: {
      critical: issues.critical,
      high: issues.high,
      medium: issues.medium,
      low: issues.low,
    },
    timestamp: new Date().toISOString(),
  };

  // Save JSON report
  fs.writeFileSync('UI_UX_AUDIT_REPORT.json', JSON.stringify(report, null, 2));

  // Generate markdown report
  generateMarkdownReport(report);

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 UI/UX AUDIT SUMMARY');
  console.log('='.repeat(80));
  console.log(`Files Scanned: ${report.summary.totalFiles}`);
  console.log(`Components Analyzed: ${report.summary.componentsScanned}`);
  console.log(`Event Handlers Found: ${report.summary.eventHandlersFound}`);
  console.log(`\nTotal Issues Found: ${report.summary.totalIssues}`);
  console.log(`  🔴 Critical: ${report.summary.critical}`);
  console.log(`  🟠 High: ${report.summary.high}`);
  console.log(`  🟡 Medium: ${report.summary.medium}`);
  console.log(`  🔵 Low: ${report.summary.low}`);
  console.log('\n📄 Reports generated:');
  console.log('  - UI_UX_AUDIT_REPORT.json');
  console.log('  - UI_UX_AUDIT_REPORT.md');
  console.log('\n');
}

function generateMarkdownReport(report) {
  let md = `# UI/UX Front-End Audit Report

**Date:** ${new Date(report.timestamp).toLocaleString()}  
**Status:** ⚠️ **Issues Found**

---

## Executive Summary

Comprehensive audit of UI/UX front-end functions, events, and user interactions.

### Statistics

- **Files Scanned:** ${report.summary.totalFiles}
- **Components Analyzed:** ${report.summary.componentsScanned}
- **Event Handlers Found:** ${report.summary.eventHandlersFound}
- **Total Issues:** ${report.summary.totalIssues}
  - 🔴 **Critical:** ${report.summary.critical}
  - 🟠 **High:** ${report.summary.high}
  - 🟡 **Medium:** ${report.summary.medium}
  - 🔵 **Low:** ${report.summary.low}

---

## 🔴 Critical Issues (${report.summary.critical})

`;

  if (report.issues.critical.length === 0) {
    md += '✅ **No critical issues found.**\n\n';
  } else {
    report.issues.critical.forEach((issue, idx) => {
      md += `### ${idx + 1}. ${issue.description}\n\n`;
      md += `**File:** \`${issue.file}\`  \n`;
      md += `**Line:** ${issue.line}  \n`;
      md += `**Pattern:** ${issue.pattern}  \n\n`;
      md += `\`\`\`javascript\n${issue.code}\n\`\`\`\n\n`;
      md += '---\n\n';
    });
  }

  md += `## 🟠 High Priority Issues (${report.summary.high})\n\n`;

  if (report.issues.high.length === 0) {
    md += '✅ **No high priority issues found.**\n\n';
  } else {
    // Group by pattern
    const grouped = {};
    report.issues.high.forEach((issue) => {
      if (!grouped[issue.pattern]) {
        grouped[issue.pattern] = [];
      }
      grouped[issue.pattern].push(issue);
    });

    Object.entries(grouped).forEach(([pattern, issues]) => {
      md += `### ${pattern} (${issues.length} occurrences)\n\n`;
      md += `**Description:** ${issues[0].description}\n\n`;
      md += `**Files Affected:**\n\n`;
      issues.slice(0, 10).forEach((issue) => {
        md += `- \`${issue.file}:${issue.line}\` - ${issue.code.substring(0, 60)}...\n`;
      });
      if (issues.length > 10) {
        md += `\n*...and ${issues.length - 10} more*\n`;
      }
      md += '\n---\n\n';
    });
  }

  md += `## 🟡 Medium Priority Issues (${report.summary.medium})\n\n`;

  if (report.issues.medium.length > 0) {
    const grouped = {};
    report.issues.medium.forEach((issue) => {
      if (!grouped[issue.pattern]) {
        grouped[issue.pattern] = [];
      }
      grouped[issue.pattern].push(issue);
    });

    Object.entries(grouped).forEach(([pattern, issues]) => {
      md += `### ${pattern} (${issues.length} occurrences)\n\n`;
      md += `**Description:** ${issues[0].description}\n\n`;
      md += `**Sample Files:**\n\n`;
      issues.slice(0, 5).forEach((issue) => {
        md += `- \`${issue.file}:${issue.line}\`\n`;
      });
      if (issues.length > 5) {
        md += `\n*...and ${issues.length - 5} more*\n`;
      }
      md += '\n---\n\n';
    });
  }

  md += `## 🔵 Low Priority Issues (${report.summary.low})\n\n`;

  if (report.issues.low.length > 0) {
    const grouped = {};
    report.issues.low.forEach((issue) => {
      if (!grouped[issue.pattern]) {
        grouped[issue.pattern] = [];
      }
      grouped[issue.pattern].push(issue);
    });

    md += `**Total:** ${report.issues.low.length} issues across ${Object.keys(grouped).length} patterns\n\n`;
    md += `**Patterns:** ${Object.keys(grouped).join(', ')}\n\n`;
  }

  md += `## 📋 Recommendations

### Immediate Actions (Critical & High)

1. **Fix Critical Issues First**
   - Address dangerous code patterns
   - Add error boundaries where needed
   - Fix memory leaks

2. **Add Error Handling**
   - Wrap all async event handlers in try-catch
   - Add error handlers to all mutations/queries
   - Remove empty catch blocks

3. **Fix Race Conditions**
   - Add cleanup functions to useEffect
   - Use abort controllers for async operations
   - Check component mount status before state updates

### Short-term (Medium Priority)

4. **Improve Loading States**
   - Add loading indicators for all async operations
   - Disable buttons during operations
   - Show skeleton loaders

5. **Add Form Validation**
   - Validate all forms before submission
   - Show validation errors clearly
   - Prevent double submissions

6. **Performance Optimizations**
   - Use useCallback for event handlers
   - Memoize expensive computations
   - Optimize re-renders

### Long-term (Low Priority)

7. **Accessibility Improvements**
   - Add ARIA labels
   - Improve keyboard navigation
   - Add focus management

8. **Code Quality**
   - Remove console.logs
   - Add proper TypeScript types
   - Improve error messages

---

**Last Updated:** ${new Date(report.timestamp).toLocaleString()}
`;

  fs.writeFileSync('UI_UX_AUDIT_REPORT.md', md);
}

// Run audit
generateReport();
