# Implementation Guide - Zod, Sentry & Supabase Storage

**Date:** December 6, 2025  
**Status:** ✅ **Improvements Implemented**

---

## 📋 Questions Answered

### 1. What is `generateImage` used for?

**Answer:** `generateImage` is **NOT currently used anywhere** in the codebase.

**Status:** 
- ⚠️ Function exists but is never called
- 📝 Documented as unused/planned feature
- ✅ Can be safely removed if not needed

**Potential Use Cases (if implemented):**
- AI-generated product images for shopping orders
- Marketing material generation
- Automated document graphics
- Brand asset generation

**Recommendation:**
- If you don't need AI image generation, **remove it** to reduce code complexity
- If you do need it, integrate with:
  - OpenAI DALL-E API
  - Stable Diffusion API
  - Other image generation services

**Action Taken:**
- ✅ Documented as unused
- ✅ Added warning if called
- ✅ Can be removed if not needed

---

### 2. Supabase Integration for Logo Uploading ✅

**Status:** ✅ **FULLY IMPLEMENTED**

**What Was Fixed:**
1. ✅ Enhanced `uploadFile` function with:
   - Proper error handling with Sentry
   - File type validation (images only for logos)
   - File size validation (10MB max, 5MB for logos)
   - Support for folder organization
   - Backward compatibility (`file_url` property)

2. ✅ Created dedicated `uploadLogo` function:
   - Uploads to `logos/company` bucket
   - Validates image types only
   - 5MB size limit

3. ✅ Fixed `CompanyBranding.jsx`:
   - Uses `uploadLogo` function
   - Proper error handling
   - File validation before upload
   - User-friendly error messages

**Implementation:**

```javascript
// Use in CompanyBranding.jsx
import { uploadLogo } from '@/api/integrations/storage';

const handleLogoUpload = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validation happens in uploadLogo
  const { url } = await uploadLogo(file);
  setForm((prev) => ({ ...prev, logo_url: url }));
};
```

**Supabase Storage Setup Required:**

1. **Create Storage Buckets:**
   ```sql
   -- In Supabase Dashboard > Storage
   -- Create buckets:
   - 'logos' (public, for company logos)
   - 'uploads' (public, for general files)
   - 'documents' (private, for contracts/documents)
   ```

2. **Set Bucket Policies:**
   ```sql
   -- Allow authenticated users to upload logos
   CREATE POLICY "Users can upload logos"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'logos');

   -- Allow public read access to logos
   CREATE POLICY "Public can read logos"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'logos');
   ```

**Files Changed:**
- ✅ `src/api/integrations/storage.js` - Enhanced with validation & Sentry
- ✅ `src/components/settings/CompanyBranding.jsx` - Fixed to use uploadLogo
- ✅ `src/components/procurement/ContractManager.jsx` - Fixed upload interface

---

### 3. Improve Zod & Sentry for Every Situation ✅

**Status:** ✅ **COMPREHENSIVE IMPROVEMENTS IMPLEMENTED**

---

## ✅ Zod Schema Improvements

### New Schemas Added

1. **Purchase Order Schema** (`purchaseOrderSchema`)
2. **Invoice Schema** (`invoiceSchema`)
3. **Customer Invoice Schema** (`customerInvoiceSchema`)
4. **Task Schema** (`taskSchema`)
5. **Feedback Schema** (`feedbackSchema`)
6. **Notification Schema** (`notificationSchema`)
7. **Inventory Item Schema** (`inventoryItemSchema`)
8. **Stock Movement Schema** (`stockMovementSchema`)
9. **Company Settings Schema** (`companySettingsSchema`)
10. **Vendor Contract Schema** (`vendorContractSchema`)
11. **Approval Rule Schema** (`approvalRuleSchema`)
12. **Audit Log Schema** (`auditLogSchema`)

### Validation Helpers Added

```javascript
// Email validation
validateEmail(email)

// Phone validation
validatePhone(phone)

// URL validation
validateUrl(url)
```

### Usage Pattern

```javascript
import { purchaseOrderSchema } from '@/lib/schemas';
import { useErrorHandler } from '@/hooks/useErrorHandler';

const createMutation = useMutation({
  mutationFn: async (data) => {
    const { handleValidationError } = useErrorHandler();
    
    try {
      // Validate before creating
      const validatedData = purchaseOrderSchema.parse(data);
      return await db.purchaseOrders.create(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        handleValidationError(error, 'Purchase Order');
        throw error;
      }
      throw error;
    }
  },
});
```

---

## ✅ Sentry Integration Improvements

### Enhanced Error Handler

**File:** `src/hooks/useErrorHandler.js`

**Features:**
- ✅ Comprehensive Sentry context
- ✅ User-friendly error messages
- ✅ Validation error handling
- ✅ Permission error handling
- ✅ Network error detection
- ✅ Development vs Production logging

**Usage:**

```javascript
import { useErrorHandler } from '@/hooks/useErrorHandler';

const { handleError, handleValidationError, handlePermissionError } = useErrorHandler();

// General errors
handleError(error, 'Failed to save', {
  component: 'CustomerForm',
  action: 'create',
  user: currentUser,
  data: formData,
});

// Validation errors
handleValidationError(zodError, 'Customer');

// Permission errors
handlePermissionError(error, 'delete customers');
```

### Database Layer Sentry Integration

**File:** `src/api/db.js`

**Features:**
- ✅ All CRUD operations capture errors in Sentry
- ✅ Context includes table name, operation, and data
- ✅ Proper error propagation

### Storage Layer Sentry Integration

**File:** `src/api/integrations/storage.js`

**Features:**
- ✅ File upload errors captured
- ✅ Validation errors tracked
- ✅ File metadata included in context

---

## 📋 Implementation Checklist

### Immediate Actions

- [x] ✅ Document `generateImage` as unused
- [x] ✅ Fix Supabase logo upload integration
- [x] ✅ Add comprehensive Zod schemas
- [x] ✅ Enhance Sentry integration
- [x] ✅ Improve error handling

### Next Steps (Apply Validation)

1. **Add Validation to All Create Operations** (14 files)

**Files to Update:**
- `src/components/audit/AuditService.jsx`
- `src/components/feedback/FeedbackRequestService.jsx`
- `src/components/invoices/InvoiceGenerationService.jsx`
- `src/components/notifications/NotificationService.jsx`
- `src/components/notifications/ShippingNotificationService.jsx`
- `src/components/procurement/ApprovalWorkflowService.jsx`
- `src/components/procurement/InvoiceService.jsx`
- `src/components/procurement/VendorOnboarding.jsx`
- `src/components/shopping/ShoppingInvoiceService.jsx`
- `src/components/vendors/VendorPaymentService.jsx`
- `src/pages/ClientPortal.jsx`
- `src/pages/Feedback.jsx`
- `src/pages/Procurement.jsx` (for POs)
- `src/pages/Inventory.jsx` (for inventory items)

**Pattern to Apply:**

```javascript
import { purchaseOrderSchema } from '@/lib/schemas';
import { useErrorHandler } from '@/hooks/useErrorHandler';

const createMutation = useMutation({
  mutationFn: async (data) => {
    const { handleValidationError } = useErrorHandler();
    
    try {
      // Validate with Zod
      const validatedData = purchaseOrderSchema.parse(data);
      
      // Check permissions if needed
      if (!hasPermission(user, 'manage_procurement')) {
        throw new Error('Permission denied');
      }
      
      // Create with validated data
      return await db.purchaseOrders.create(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        handleValidationError(error, 'Purchase Order');
      } else {
        handleError(error, 'Failed to create purchase order', {
          component: 'PurchaseOrderForm',
          action: 'create',
        });
      }
      throw error;
    }
  },
});
```

---

## 🎯 Best Practices

### 1. Always Validate Before Database Operations

```javascript
// ✅ Good
const validatedData = schema.parse(data);
await db.entity.create(validatedData);

// ❌ Bad
await db.entity.create(data); // No validation
```

### 2. Use Enhanced Error Handler

```javascript
// ✅ Good
const { handleError } = useErrorHandler();
handleError(error, 'User-friendly message', {
  component: 'ComponentName',
  action: 'actionName',
  data: relevantData,
});

// ❌ Bad
console.error(error);
toast.error('Error occurred');
```

### 3. Check Permissions Before Sensitive Operations

```javascript
// ✅ Good
if (!hasPermission(user, 'manage_entity')) {
  handlePermissionError(new Error('Denied'), 'delete entity');
  return;
}
await db.entity.delete(id);

// ❌ Bad
await db.entity.delete(id); // No permission check
```

### 4. Use Proper Supabase Storage Functions

```javascript
// ✅ Good - For logos
import { uploadLogo } from '@/api/integrations/storage';
const { url } = await uploadLogo(file);

// ✅ Good - For documents
import { uploadFile } from '@/api/integrations/storage';
const { url } = await uploadFile(file, 'documents', 'contracts');
```

---

## 🔧 Supabase Storage Setup

### Required Buckets

1. **logos** (public)
   - Purpose: Company logos
   - Path: `logos/company/`
   - Max size: 5MB
   - Allowed types: image/jpeg, image/png, image/gif, image/webp

2. **uploads** (public)
   - Purpose: General file uploads
   - Path: `uploads/`
   - Max size: 10MB
   - Allowed types: All

3. **documents** (private)
   - Purpose: Contracts, invoices, sensitive documents
   - Path: `documents/contracts/`, `documents/invoices/`
   - Max size: 10MB
   - Allowed types: pdf, doc, docx, images

### Storage Policies (SQL)

```sql
-- Logos: Public read, authenticated write
CREATE POLICY "Public can read logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');

CREATE POLICY "Authenticated can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos');

-- Documents: Authenticated only
CREATE POLICY "Authenticated can manage documents"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'documents');
```

---

## 📊 Sentry Configuration

### Environment Variables Required

```env
VITE_SENTRY_DSN=your_sentry_dsn_here
VITE_LOGROCKET_APP_ID=your_logrocket_app_id_here
```

### Sentry Features Enabled

- ✅ Error tracking
- ✅ Performance monitoring
- ✅ Session replay
- ✅ Browser tracing
- ✅ LogRocket integration

### Sentry Context Tags

All errors are tagged with:
- `component` - Component/service name
- `operation` - CRUD operation (create, update, delete)
- `table` - Database table name
- `action` - User action

---

## 🧪 Testing

### Test Logo Upload

1. Go to Settings > Company Branding
2. Click "Upload Logo"
3. Select an image file
4. Verify:
   - ✅ File validation (type, size)
   - ✅ Upload to Supabase
   - ✅ URL saved to database
   - ✅ Logo displays correctly

### Test Validation

1. Try creating entity without required fields
2. Verify:
   - ✅ Zod validation catches errors
   - ✅ User-friendly error message shown
   - ✅ Error logged to Sentry

### Test Sentry

1. Trigger an error
2. Check Sentry dashboard:
   - ✅ Error captured
   - ✅ Context included
   - ✅ User information attached
   - ✅ Stack trace available

---

## ✅ Summary

### Completed

1. ✅ **generateImage** - Documented as unused
2. ✅ **Supabase Logo Upload** - Fully implemented with validation
3. ✅ **Zod Schemas** - 12 new schemas added
4. ✅ **Sentry Integration** - Enhanced throughout codebase
5. ✅ **Error Handling** - Comprehensive error handler created

### Next Steps

1. Apply validation to 14 files (use patterns above)
2. Set up Supabase storage buckets
3. Configure Sentry DSN
4. Test all implementations

---

**Last Updated:** December 6, 2025

