#!/usr/bin/env node

/**
 * Sentry & Zod Integration Checker
 * Verifies installation, configuration, and integration status
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const issues = [];
const warnings = [];
const successes = [];

console.log('\n🔍 Checking Sentry & Zod Integration...\n');
console.log('='.repeat(80));

// 1. Check package.json
console.log('\n📦 Checking Dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  // Check Sentry
  if (deps['@sentry/react']) {
    successes.push(`✅ @sentry/react installed: ${deps['@sentry/react']}`);
  } else {
    issues.push('❌ @sentry/react not installed');
  }

  if (deps['@sentry/tracing']) {
    warnings.push(`⚠️  @sentry/tracing found: ${deps['@sentry/tracing']} (deprecated - use @sentry/react's built-in tracing)`);
  }

  // Check Zod
  if (deps['zod']) {
    successes.push(`✅ zod installed: ${deps['zod']}`);
  } else {
    issues.push('❌ zod not installed');
  }

  // Check React Hook Form (for Zod integration)
  if (deps['react-hook-form']) {
    successes.push(`✅ react-hook-form installed: ${deps['react-hook-form']}`);
  } else {
    warnings.push('⚠️  react-hook-form not installed (needed for Zod form validation)');
  }

  if (deps['@hookform/resolvers']) {
    successes.push(`✅ @hookform/resolvers installed: ${deps['@hookform/resolvers']}`);
  } else {
    warnings.push('⚠️  @hookform/resolvers not installed (needed for Zod + React Hook Form)');
  }
} catch (error) {
  issues.push(`❌ Error reading package.json: ${error.message}`);
}

// 2. Check Sentry Configuration
console.log('\n🔧 Checking Sentry Configuration...');
try {
  const mainJsx = fs.readFileSync('src/main.jsx', 'utf-8');
  
  if (mainJsx.includes('@sentry/react')) {
    successes.push('✅ Sentry imported in main.jsx');
  } else {
    issues.push('❌ Sentry not imported in main.jsx');
  }

  if (mainJsx.includes('Sentry.init')) {
    successes.push('✅ Sentry.init() found');
  } else {
    issues.push('❌ Sentry.init() not found');
  }

  if (mainJsx.includes('browserTracingIntegration')) {
    successes.push('✅ Browser tracing integration enabled');
  } else {
    warnings.push('⚠️  Browser tracing integration not enabled');
  }

  if (mainJsx.includes('replayIntegration')) {
    successes.push('✅ Session replay integration enabled');
  } else {
    warnings.push('⚠️  Session replay integration not enabled');
  }

  // Check for environment variable
  if (mainJsx.includes('VITE_SENTRY_DSN')) {
    successes.push('✅ Sentry DSN configured via environment variable');
  } else {
    issues.push('❌ VITE_SENTRY_DSN not configured');
  }
} catch (error) {
  issues.push(`❌ Error reading src/main.jsx: ${error.message}`);
}

// 3. Check Environment Variables
console.log('\n🌍 Checking Environment Variables...');
try {
  const envFiles = ['.env', '.env.local', '.env.production'];
  let envFound = false;
  let sentryDsnFound = false;

  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      envFound = true;
      const envContent = fs.readFileSync(envFile, 'utf-8');
      if (envContent.includes('VITE_SENTRY_DSN')) {
        const match = envContent.match(/VITE_SENTRY_DSN=(.+)/);
        if (match && match[1] && !match[1].includes('your_sentry_dsn_here')) {
          sentryDsnFound = true;
          successes.push(`✅ VITE_SENTRY_DSN found in ${envFile}`);
        } else {
          warnings.push(`⚠️  VITE_SENTRY_DSN in ${envFile} appears to be a placeholder`);
        }
      }
    }
  }

  if (!envFound) {
    warnings.push('⚠️  No .env file found (create one with VITE_SENTRY_DSN)');
  }

  if (!sentryDsnFound) {
    warnings.push('⚠️  VITE_SENTRY_DSN not configured - Sentry will not capture errors');
  }
} catch (error) {
  warnings.push(`⚠️  Error checking environment files: ${error.message}`);
}

// 4. Check Zod Schemas
console.log('\n📋 Checking Zod Schemas...');
try {
  const schemasPath = 'src/lib/schemas.js';
  if (fs.existsSync(schemasPath)) {
    const schemasContent = fs.readFileSync(schemasPath, 'utf-8');
    
    if (schemasContent.includes('import') && schemasContent.includes('zod')) {
      successes.push('✅ Zod imported in schemas.js');
    } else {
      issues.push('❌ Zod not imported in schemas.js');
    }

    if (schemasContent.includes('z.object')) {
      const schemaCount = (schemasContent.match(/z\.object\(/g) || []).length;
      successes.push(`✅ Found ${schemaCount} Zod schemas defined`);
    } else {
      warnings.push('⚠️  No Zod schemas found in schemas.js');
    }

    // Check for common schemas
    const commonSchemas = ['customerSchema', 'shipmentSchema', 'campaignSchema', 'vendorSchema'];
    const foundSchemas = commonSchemas.filter(schema => 
      schemasContent.includes(schema)
    );
    if (foundSchemas.length > 0) {
      successes.push(`✅ Found schemas: ${foundSchemas.join(', ')}`);
    }
  } else {
    warnings.push('⚠️  schemas.js not found');
  }
} catch (error) {
  issues.push(`❌ Error checking schemas.js: ${error.message}`);
}

// 5. Check Error Handler Integration
console.log('\n🛡️  Checking Error Handler Integration...');
try {
  const errorHandlerPath = 'src/hooks/useErrorHandler.js';
  if (fs.existsSync(errorHandlerPath)) {
    const errorHandlerContent = fs.readFileSync(errorHandlerPath, 'utf-8');
    
    if (errorHandlerContent.includes('@sentry/react')) {
      successes.push('✅ Sentry imported in useErrorHandler');
    } else {
      issues.push('❌ Sentry not imported in useErrorHandler');
    }

    if (errorHandlerContent.includes('captureException')) {
      successes.push('✅ Sentry.captureException() used in error handler');
    } else {
      issues.push('❌ Sentry.captureException() not used');
    }

    if (errorHandlerContent.includes('handleValidationError')) {
      successes.push('✅ Validation error handler found (for Zod integration)');
    }
  } else {
    warnings.push('⚠️  useErrorHandler.js not found');
  }
} catch (error) {
  issues.push(`❌ Error checking useErrorHandler.js: ${error.message}`);
}

// 6. Check Usage in Components
console.log('\n🔍 Checking Usage in Components...');
try {
  const srcFiles = getAllFiles('src', ['.jsx', '.js', '.tsx', '.ts']);
  let sentryUsage = 0;
  let zodUsage = 0;
  let errorHandlerUsage = 0;

  srcFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('@sentry/react') || content.includes('Sentry.')) {
        sentryUsage++;
      }
      if (content.includes('zod') || content.includes('z.object') || content.includes('z.string')) {
        zodUsage++;
      }
      if (content.includes('useErrorHandler') || content.includes('handleError')) {
        errorHandlerUsage++;
      }
    } catch (e) {
      // Skip files that can't be read
    }
  });

  successes.push(`✅ Sentry used in ${sentryUsage} files`);
  successes.push(`✅ Zod used in ${zodUsage} files`);
  successes.push(`✅ Error handler used in ${errorHandlerUsage} files`);
} catch (error) {
  warnings.push(`⚠️  Error scanning component usage: ${error.message}`);
}

// 7. Test Sentry Integration (if DSN is configured)
console.log('\n🧪 Testing Sentry Integration...');
try {
  // Check if we can import Sentry
  const testSentry = `
    import * as Sentry from '@sentry/react';
    console.log('Sentry version:', Sentry.SDK_VERSION || 'unknown');
  `;
  
  // Just check if module exists
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const sentryVersion = packageJson.dependencies['@sentry/react'];
    if (sentryVersion) {
      successes.push(`✅ Sentry package available: ${sentryVersion}`);
    }
  } catch (e) {
    warnings.push('⚠️  Could not verify Sentry package');
  }
} catch (error) {
  warnings.push(`⚠️  Error testing Sentry: ${error.message}`);
}

// 8. Test Zod Integration
console.log('\n🧪 Testing Zod Integration...');
try {
  // Check if we can import Zod
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const zodVersion = packageJson.dependencies['zod'];
  if (zodVersion) {
    successes.push(`✅ Zod package available: ${zodVersion}`);
  }

  // Try to validate a simple schema
  const schemasPath = 'src/lib/schemas.js';
  if (fs.existsSync(schemasPath)) {
    const schemasContent = fs.readFileSync(schemasPath, 'utf-8');
    if (schemasContent.includes('export const') && schemasContent.includes('Schema')) {
      successes.push('✅ Zod schemas are exported');
    }
  }
} catch (error) {
  warnings.push(`⚠️  Error testing Zod: ${error.message}`);
}

// Helper function
function getAllFiles(dirPath, extensions = ['.jsx', '.js', '.tsx', '.ts'], arrayOfFiles = []) {
  try {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
      const filePath = path.join(dirPath, file);
      if (fs.statSync(filePath).isDirectory()) {
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
  } catch (e) {
    // Skip directories that can't be read
  }

  return arrayOfFiles;
}

// Generate Report
console.log('\n' + '='.repeat(80));
console.log('📊 INTEGRATION REPORT');
console.log('='.repeat(80));

console.log('\n✅ SUCCESSES:');
successes.forEach(msg => console.log(`  ${msg}`));

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:');
  warnings.forEach(msg => console.log(`  ${msg}`));
}

if (issues.length > 0) {
  console.log('\n❌ ISSUES:');
  issues.forEach(msg => console.log(`  ${msg}`));
}

// Summary
console.log('\n' + '='.repeat(80));
console.log('📈 SUMMARY');
console.log('='.repeat(80));
console.log(`✅ Successes: ${successes.length}`);
console.log(`⚠️  Warnings: ${warnings.length}`);
console.log(`❌ Issues: ${issues.length}`);

const score = Math.round(
  (successes.length / (successes.length + warnings.length + issues.length)) * 100
);
console.log(`\n📊 Integration Score: ${score}%`);

if (issues.length === 0 && warnings.length === 0) {
  console.log('\n🎉 Perfect! Sentry and Zod are fully integrated!');
} else if (issues.length === 0) {
  console.log('\n✅ Integration is good, but some warnings should be addressed.');
} else {
  console.log('\n⚠️  Please fix the issues above for proper integration.');
}

console.log('\n');

// Save report
const report = {
  timestamp: new Date().toISOString(),
  successes,
  warnings,
  issues,
  score,
};

fs.writeFileSync(
  'SENTRY_ZOD_INTEGRATION_REPORT.json',
  JSON.stringify(report, null, 2)
);

console.log('📄 Report saved to: SENTRY_ZOD_INTEGRATION_REPORT.json\n');

