# Frontend Stability Audit Report

**Date:** 12/7/2025, 4:25:49 PM

## Executive Summary

- **Total Files Audited:** 158
- **Files with Issues:** 26
- **Missing Error Handling:** 89 occurrences across 24 files
- **Missing Form Validation:** 13 occurrences across 6 files

---

## 1. Missing Error Handling (89 Occurrences)

### Files Requiring Error Handling

#### src/pages/Procurement.jsx (12 issues)

1. **Line 846:** React Query mutate
   ```jsx
   onAdd={(data) => createContractMutation.mutate(data)}
   ```

2. **Line 847:** React Query mutate
   ```jsx
   onUpdate={(id, data) => updateContractMutation.mutate({ id, data })}
   ```

3. **Line 848:** React Query mutate
   ```jsx
   onDelete={(id) => deleteContractMutation.mutate(id)}
   ```

4. **Line 858:** React Query mutate
   ```jsx
   onCreatePayment={(data) => createPaymentMutation.mutate(data)}
   ```

5. **Line 868:** React Query mutate
   ```jsx
   onMarkPaid={(id) => markInvoicePaidMutation.mutate(id)}
   ```

6. **Line 884:** React Query mutate
   ```jsx
   onAdd={(data) => createRuleMutation.mutate(data)}
   ```

7. **Line 885:** React Query mutate
   ```jsx
   onUpdate={(id, data) => updateRuleMutation.mutate({ id, data })}
   ```

8. **Line 886:** React Query mutate
   ```jsx
   onDelete={(id) => deleteRuleMutation.mutate(id)}
   ```

9. **Line 984:** React Query mutate
   ```jsx
   onSubmit={(data) => createReceiptMutation.mutate(data)}
   ```

10. **Line 1036:** React Query mutate
   ```jsx
   deletePOMutation.mutate(deleteConfirm.po?.id);
   ```

11. **Line 161:** useMutation hook
   ```jsx
   const createPOMutation = useMutation({
   ```

12. **Line 343:** useMutation hook
   ```jsx
   const deleteRuleMutation = useMutation({
   ```

#### src/pages/Reports.jsx (7 issues)

1. **Line 274:** React Query mutate
   ```jsx
   createReportMutation.mutate(data);
   ```

2. **Line 1535:** React Query mutate
   ```jsx
   onDelete={(id) => deleteReportMutation.mutate(id)}
   ```

3. **Line 1650:** React Query mutate
   ```jsx
   createExpenseMutation.mutate(expenseForm);
   ```

4. **Line 176:** useMutation hook
   ```jsx
   const createExpenseMutation = useMutation({
   ```

5. **Line 191:** useMutation hook
   ```jsx
   const createReportMutation = useMutation({
   ```

6. **Line 200:** useMutation hook
   ```jsx
   const updateReportMutation = useMutation({
   ```

7. **Line 210:** useMutation hook
   ```jsx
   const deleteReportMutation = useMutation({
   ```

#### src/pages/Tasks.jsx (7 issues)

1. **Line 150:** React Query mutate
   ```jsx
   updateMutation.mutate({ id: editingTask.id, data: form });
   ```

2. **Line 152:** React Query mutate
   ```jsx
   createMutation.mutate(form);
   ```

3. **Line 193:** React Query mutate
   ```jsx
   updateMutation.mutate({ id: task.id, data: { ...task, status: newStatus } });
   ```

4. **Line 642:** React Query mutate
   ```jsx
   onDelete={(id) => deleteMutation.mutate(id)}
   ```

5. **Line 675:** React Query mutate
   ```jsx
   onDelete={(id) => deleteMutation.mutate(id)}
   ```

6. **Line 138:** useMutation hook
   ```jsx
   const updateMutation = useMutation({
   ```

7. **Line 183:** useMutation hook
   ```jsx
   const deleteMutation = useMutation({
   ```

#### src/components/settings/NotificationTemplateManager.jsx (6 issues)

1. **Line 189:** React Query mutate
   ```jsx
   updateMutation.mutate({ id: editingTemplate.id, data: formData });
   ```

2. **Line 191:** React Query mutate
   ```jsx
   createMutation.mutate(formData);
   ```

3. **Line 197:** React Query mutate
   ```jsx
   deleteMutation.mutate(templateToDelete.id);
   ```

4. **Line 119:** useMutation hook
   ```jsx
   const createMutation = useMutation({
   ```

5. **Line 129:** useMutation hook
   ```jsx
   const updateMutation = useMutation({
   ```

6. **Line 139:** useMutation hook
   ```jsx
   const deleteMutation = useMutation({
   ```

#### src/components/settings/PricingManager.jsx (6 issues)

1. **Line 215:** React Query mutate
   ```jsx
   deletePricingMutation.mutate(pricingToDelete.id);
   ```

2. **Line 221:** React Query mutate
   ```jsx
   deleteSurchargeMutation.mutate(surchargeToDelete.id);
   ```

3. **Line 547:** React Query mutate
   ```jsx
   updatePricingMutation.mutate({ id: editingPricing.id, data });
   ```

4. **Line 549:** React Query mutate
   ```jsx
   createPricingMutation.mutate(data);
   ```

5. **Line 583:** React Query mutate
   ```jsx
   updateSurchargeMutation.mutate({ id: editingSurcharge.id, data });
   ```

6. **Line 585:** React Query mutate
   ```jsx
   createSurchargeMutation.mutate(data);
   ```

#### src/pages/CustomerSegments.jsx (6 issues)

1. **Line 300:** React Query mutate
   ```jsx
   createSegmentMutation.mutate(data);
   ```

2. **Line 306:** React Query mutate
   ```jsx
   deleteCampaignMutation.mutate(campaignToDelete.id);
   ```

3. **Line 328:** React Query mutate
   ```jsx
   createCampaignMutation.mutate(campaignData);
   ```

4. **Line 332:** React Query mutate
   ```jsx
   updateCampaignMutation.mutate({
   ```

5. **Line 534:** React Query mutate
   ```jsx
   deleteSegmentMutation.mutate(segment.id);
   ```

6. **Line 98:** useMutation hook
   ```jsx
   const createCampaignMutation = useMutation({
   ```

#### src/pages/Inventory.jsx (6 issues)

1. **Line 223:** React Query mutate
   ```jsx
   deleteItemMutation.mutate(itemToDelete.id);
   ```

2. **Line 628:** React Query mutate
   ```jsx
   createItemMutation.mutate(form);
   ```

3. **Line 774:** React Query mutate
   ```jsx
   createMovementMutation.mutate({ ...movementForm, item_id: selectedItem.id });
   ```

4. **Line 99:** useMutation hook
   ```jsx
   const createItemMutation = useMutation({
   ```

5. **Line 108:** useMutation hook
   ```jsx
   const updateItemMutation = useMutation({
   ```

6. **Line 115:** useMutation hook
   ```jsx
   const deleteItemMutation = useMutation({
   ```

#### src/pages/ShoppingOrders.jsx (5 issues)

1. **Line 833:** Async onClick handler
   ```jsx
   onClick={async () => {
   ```

2. **Line 252:** React Query mutate
   ```jsx
   updateMutation.mutate(
   ```

3. **Line 271:** React Query mutate
   ```jsx
   createMutation.mutate(data);
   ```

4. **Line 288:** React Query mutate
   ```jsx
   updateMutation.mutate(
   ```

5. **Line 876:** React Query mutate
   ```jsx
   deleteMutation.mutate(deleteConfirm.order?.id);
   ```

#### src/pages/Vendors.jsx (5 issues)

1. **Line 294:** React Query mutate
   ```jsx
   updateVendorMutation.mutate({ id: editingVendor.id, data });
   ```

2. **Line 296:** React Query mutate
   ```jsx
   createVendorMutation.mutate(data);
   ```

3. **Line 302:** React Query mutate
   ```jsx
   deleteVendorMutation.mutate(vendorToDelete.id);
   ```

4. **Line 307:** React Query mutate
   ```jsx
   updateOrderMutation.mutate({
   ```

5. **Line 804:** React Query mutate
   ```jsx
   onSubmit={(data) => createOrderMutation.mutate(data)}
   ```

#### src/components/portal/ClientNotificationBell.jsx (4 issues)

1. **Line 96:** React Query mutate
   ```jsx
   onClick={() => markAllReadMutation.mutate()}
   ```

2. **Line 128:** React Query mutate
   ```jsx
   onClick={() => markReadMutation.mutate(notif.id)}
   ```

3. **Line 54:** useMutation hook
   ```jsx
   const markReadMutation = useMutation({
   ```

4. **Line 62:** useMutation hook
   ```jsx
   const markAllReadMutation = useMutation({
   ```

#### src/pages/Customers.jsx (4 issues)

1. **Line 191:** React Query mutate
   ```jsx
   updateMutation.mutate({ id: editingCustomer.id, data: form });
   ```

2. **Line 193:** React Query mutate
   ```jsx
   createMutation.mutate(form);
   ```

3. **Line 214:** React Query mutate
   ```jsx
   deleteMutation.mutate(customerToDelete.id);
   ```

4. **Line 103:** useMutation hook
   ```jsx
   const createMutation = useMutation({
   ```

#### src/components/settings/StaffManagement.jsx (3 issues)

1. **Line 103:** React Query mutate
   ```jsx
   updateUserMutation.mutate({ id: userId, data: { staff_role: newRole } });
   ```

2. **Line 109:** React Query mutate
   ```jsx
   updateUserMutation.mutate({
   ```

3. **Line 120:** React Query mutate
   ```jsx
   deleteUserMutation.mutate(userToDelete.id);
   ```

#### src/components/documents/DocumentGenerator.jsx (2 issues)

1. **Line 28:** Async arrow function
   ```jsx
   const handleGenerate = async (docType) => {
   ```

2. **Line 37:** Async arrow function
   ```jsx
   const handleGenerateAll = async () => {
   ```

#### src/components/portal/CustomerNewOrder.jsx (2 issues)

1. **Line 215:** React Query mutate
   ```jsx
   createMutation.mutate(form);
   ```

2. **Line 132:** useMutation hook
   ```jsx
   const createMutation = useMutation({
   ```

#### src/components/portal/VendorOrders.jsx (2 issues)

1. **Line 86:** React Query mutate
   ```jsx
   updateOrderMutation.mutate({ orderId: selectedOrder.id, status: 'sent' });
   ```

2. **Line 62:** useMutation hook
   ```jsx
   const updateOrderMutation = useMutation({
   ```

#### src/components/procurement/VendorOnboarding.jsx (2 issues)

1. **Line 61:** Async handleSubmit
   ```jsx
   const handleSubmit = async () => {
   ```

2. **Line 61:** Async arrow function
   ```jsx
   const handleSubmit = async () => {
   ```

#### src/pages/Feedback.jsx (2 issues)

1. **Line 65:** React Query mutate
   ```jsx
   submitMutation.mutate({
   ```

2. **Line 46:** useMutation hook
   ```jsx
   const submitMutation = useMutation({
   ```

#### src/pages/Shipments.jsx (2 issues)

1. **Line 181:** React Query mutate
   ```jsx
   createMutation.mutate(data);
   ```

2. **Line 193:** React Query mutate
   ```jsx
   deleteMutation.mutate(shipmentToDelete.id);
   ```

#### src/components/customers/CampaignForm.jsx (1 issues)

1. **Line 189:** Async arrow function
   ```jsx
   const onFormSubmit = async (data) => {
   ```

#### src/components/notifications/NotificationBell.jsx (1 issues)

1. **Line 196:** React Query mutate
   ```jsx
   onClick={() => dismissMutation.mutate(notification.id)}
   ```

#### src/components/portal/CustomerProfile.jsx (1 issues)

1. **Line 30:** useMutation hook
   ```jsx
   const updateMutation = useMutation({
   ```

#### src/components/portal/CustomerSupport.jsx (1 issues)

1. **Line 147:** React Query mutate
   ```jsx
   createTicketMutation.mutate();
   ```

#### src/components/settings/CompanyBranding.jsx (1 issues)

1. **Line 59:** useMutation hook
   ```jsx
   const saveMutation = useMutation({
   ```

#### src/pages/Settings.jsx (1 issues)

1. **Line 170:** React Query mutate
   ```jsx
   updateProfileMutation.mutate({ business_settings: businessSettings });
   ```

---

## 2. Missing Form Validation (13 Occurrences)

### Forms Requiring Validation

#### src/pages/ClientPortal.jsx (3 issues)

**Patterns Found:** HTML form element, onSubmit handler

**Recommendation:** Implement React Hook Form with Zod validation

#### src/pages/Inventory.jsx (3 issues)

**Patterns Found:** HTML form element, onSubmit handler

**Recommendation:** Implement React Hook Form with Zod validation

#### src/components/settings/NotificationTemplateManager.jsx (2 issues)

**Patterns Found:** onSubmit handler, handleSubmit function

**Recommendation:** Implement React Hook Form with Zod validation

#### src/components/ui/form.jsx (2 issues)

**Patterns Found:** HTML form element

**Recommendation:** Implement React Hook Form with Zod validation

#### src/pages/Reports.jsx (2 issues)

**Patterns Found:** onSubmit handler

**Recommendation:** Implement React Hook Form with Zod validation

#### src/pages/Procurement.jsx (1 issues)

**Patterns Found:** onSubmit handler

**Recommendation:** Implement React Hook Form with Zod validation

---

## Recommended Fix Patterns

### Error Handling Pattern

```javascript
import { useErrorHandler } from '@/hooks/useErrorHandler';

const { handleError } = useErrorHandler();

onClick={async () => {
  try {
    await someAsyncOperation();
  } catch (error) {
    handleError(error, 'Failed to perform operation', {
      component: 'ComponentName',
      action: 'operationName',
    });
  }
}}
```

### Form Validation Pattern

```javascript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { schema } from '@/lib/schemas';

const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { /* ... */ },
});

const onSubmit = async (data) => {
  try {
    await submitForm(data);
  } catch (error) {
    handleError(error, 'Failed to submit form');
  }
};

<form onSubmit={form.handleSubmit(onSubmit)}>
  {/* form fields */}
</form>
```

