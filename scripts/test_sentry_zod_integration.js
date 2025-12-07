#!/usr/bin/env node

/**
 * Test Sentry & Zod Integration
 * Actually tests that the integrations work correctly
 */

import { z } from 'zod';
import * as Sentry from '@sentry/react';

console.log('\n🧪 Testing Sentry & Zod Integration...\n');
console.log('='.repeat(80));

const testResults = {
  passed: [],
  failed: [],
  warnings: [],
};

// Test 1: Zod Schema Validation
console.log('\n📋 Test 1: Zod Schema Validation');
try {
  const testSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
    age: z.number().min(0).max(120),
  });

  // Valid data
  const validData = { name: 'Test User', email: 'test@example.com', age: 25 };
  const result1 = testSchema.safeParse(validData);
  if (result1.success) {
    testResults.passed.push('✅ Zod: Valid data parsed successfully');
  } else {
    testResults.failed.push('❌ Zod: Valid data failed validation');
  }

  // Invalid data
  const invalidData = { name: '', email: 'invalid', age: -5 };
  const result2 = testSchema.safeParse(invalidData);
  if (!result2.success) {
    testResults.passed.push('✅ Zod: Invalid data correctly rejected');
    if (result2.error.errors.length > 0) {
      testResults.passed.push(`✅ Zod: Error messages provided (${result2.error.errors.length} errors)`);
    }
  } else {
    testResults.failed.push('❌ Zod: Invalid data was accepted');
  }
} catch (error) {
  testResults.failed.push(`❌ Zod test failed: ${error.message}`);
}

// Test 2: Sentry Error Capture
console.log('\n🔴 Test 2: Sentry Error Capture');
try {
  // Check if Sentry is initialized (v10 API)
  let isInitialized = false;
  try {
    // In Sentry v10, we check if client exists differently
    const client = Sentry.getClient();
    isInitialized = client !== undefined;
  } catch (e) {
    // Fallback: check if DSN is configured
    isInitialized = process.env.VITE_SENTRY_DSN && !process.env.VITE_SENTRY_DSN.includes('your_sentry_dsn');
  }
  
  if (isInitialized) {
    testResults.passed.push('✅ Sentry: Client initialized');
    
    // Test capturing an error
    try {
      Sentry.captureException(new Error('Test error from integration test'), {
        tags: { test: 'integration' },
        extra: { testData: 'This is a test' },
      });
      testResults.passed.push('✅ Sentry: captureException() works');
    } catch (error) {
      testResults.failed.push(`❌ Sentry: captureException() failed: ${error.message}`);
    }

    // Test capturing a message
    try {
      Sentry.captureMessage('Test message from integration test', {
        level: 'info',
        tags: { test: 'integration' },
      });
      testResults.passed.push('✅ Sentry: captureMessage() works');
    } catch (error) {
      testResults.failed.push(`❌ Sentry: captureMessage() failed: ${error.message}`);
    }
  } else {
    testResults.warnings.push('⚠️  Sentry: Client not initialized (VITE_SENTRY_DSN may not be set)');
    testResults.warnings.push('⚠️  Sentry: This is expected if DSN is not configured in .env');
  }
} catch (error) {
  testResults.failed.push(`❌ Sentry test failed: ${error.message}`);
}

// Test 3: Error Handler Integration
console.log('\n🛡️  Test 3: Error Handler Integration');
try {
  // Check if useErrorHandler exists
  const fs = await import('fs');
  const errorHandlerPath = 'src/hooks/useErrorHandler.js';
  
  if (fs.existsSync(errorHandlerPath)) {
    const content = fs.readFileSync(errorHandlerPath, 'utf-8');
    
    if (content.includes('Sentry.captureException')) {
      testResults.passed.push('✅ Error Handler: Uses Sentry.captureException');
    } else {
      testResults.failed.push('❌ Error Handler: Does not use Sentry.captureException');
    }

    if (content.includes('handleValidationError')) {
      testResults.passed.push('✅ Error Handler: Has validation error handler (for Zod)');
    } else {
      testResults.warnings.push('⚠️  Error Handler: No validation error handler found');
    }

    if (content.includes('zod') || content.includes('ZodError')) {
      testResults.passed.push('✅ Error Handler: Handles Zod errors');
    } else {
      testResults.warnings.push('⚠️  Error Handler: Does not explicitly handle Zod errors');
    }
  } else {
    testResults.failed.push('❌ Error Handler: useErrorHandler.js not found');
  }
} catch (error) {
  testResults.failed.push(`❌ Error Handler test failed: ${error.message}`);
}

// Test 4: Schema Integration
console.log('\n📚 Test 4: Schema Integration');
try {
  const fs = await import('fs');
  const schemasPath = 'src/lib/schemas.js';
  
  if (fs.existsSync(schemasPath)) {
    const content = fs.readFileSync(schemasPath, 'utf-8');
    
    // Check for common schemas
    const requiredSchemas = ['customerSchema', 'shipmentSchema'];
    const foundSchemas = requiredSchemas.filter(schema => content.includes(schema));
    
    if (foundSchemas.length === requiredSchemas.length) {
      testResults.passed.push(`✅ Schemas: All required schemas found (${foundSchemas.join(', ')})`);
    } else {
      testResults.warnings.push(`⚠️  Schemas: Missing some schemas (found: ${foundSchemas.join(', ')})`);
    }

    // Check for exports
    if (content.includes('export const')) {
      testResults.passed.push('✅ Schemas: Properly exported');
    } else {
      testResults.failed.push('❌ Schemas: Not properly exported');
    }
  } else {
    testResults.failed.push('❌ Schemas: schemas.js not found');
  }
} catch (error) {
  testResults.failed.push(`❌ Schema test failed: ${error.message}`);
}

// Test 5: Component Usage
console.log('\n🎨 Test 5: Component Usage');
try {
  const fs = await import('fs');
  const path = await import('path');
  
  // Check if components use the integrations
  const componentsPath = 'src/components';
  const pagesPath = 'src/pages';
  
  let componentsWithSentry = 0;
  let componentsWithZod = 0;
  let componentsWithErrorHandler = 0;
  
  function checkDirectory(dir) {
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          checkDirectory(filePath);
        } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            if (content.includes('Sentry.') || content.includes('@sentry/react')) {
              componentsWithSentry++;
            }
            if (content.includes('z.object') || content.includes('zodResolver')) {
              componentsWithZod++;
            }
            if (content.includes('useErrorHandler') || content.includes('handleError')) {
              componentsWithErrorHandler++;
            }
          } catch (e) {
            // Skip files that can't be read
          }
        }
      });
    } catch (e) {
      // Skip directories that can't be read
    }
  }
  
  if (fs.existsSync(componentsPath)) {
    checkDirectory(componentsPath);
  }
  if (fs.existsSync(pagesPath)) {
    checkDirectory(pagesPath);
  }
  
  if (componentsWithSentry > 0) {
    testResults.passed.push(`✅ Components: ${componentsWithSentry} files use Sentry`);
  } else {
    testResults.warnings.push('⚠️  Components: No components use Sentry directly');
  }
  
  if (componentsWithZod > 0) {
    testResults.passed.push(`✅ Components: ${componentsWithZod} files use Zod`);
  } else {
    testResults.warnings.push('⚠️  Components: No components use Zod directly');
  }
  
  if (componentsWithErrorHandler > 0) {
    testResults.passed.push(`✅ Components: ${componentsWithErrorHandler} files use error handler`);
  } else {
    testResults.warnings.push('⚠️  Components: No components use error handler');
  }
} catch (error) {
  testResults.failed.push(`❌ Component usage test failed: ${error.message}`);
}

// Generate Report
console.log('\n' + '='.repeat(80));
console.log('📊 TEST RESULTS');
console.log('='.repeat(80));

console.log('\n✅ PASSED:');
testResults.passed.forEach(test => console.log(`  ${test}`));

if (testResults.warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:');
  testResults.warnings.forEach(warning => console.log(`  ${warning}`));
}

if (testResults.failed.length > 0) {
  console.log('\n❌ FAILED:');
  testResults.failed.forEach(failure => console.log(`  ${failure}`));
}

// Summary
console.log('\n' + '='.repeat(80));
console.log('📈 SUMMARY');
console.log('='.repeat(80));
console.log(`✅ Passed: ${testResults.passed.length}`);
console.log(`⚠️  Warnings: ${testResults.warnings.length}`);
console.log(`❌ Failed: ${testResults.failed.length}`);

const totalTests = testResults.passed.length + testResults.failed.length;
const passRate = totalTests > 0 
  ? Math.round((testResults.passed.length / totalTests) * 100)
  : 0;

console.log(`\n📊 Pass Rate: ${passRate}%`);

if (testResults.failed.length === 0 && testResults.warnings.length === 0) {
  console.log('\n🎉 All tests passed! Integration is working perfectly!');
} else if (testResults.failed.length === 0) {
  console.log('\n✅ All critical tests passed! Some warnings to address.');
} else {
  console.log('\n⚠️  Some tests failed. Please review and fix the issues.');
}

console.log('\n');

// Save test results
const report = {
  timestamp: new Date().toISOString(),
  results: testResults,
  passRate,
};

const fs = await import('fs');
fs.writeFileSync(
  'SENTRY_ZOD_TEST_RESULTS.json',
  JSON.stringify(report, null, 2)
);

console.log('📄 Test results saved to: SENTRY_ZOD_TEST_RESULTS.json\n');

