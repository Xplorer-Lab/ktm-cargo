import { db } from '@/api/db';
import { auth } from '@/api/auth';
import { sendMessengerNotification } from '@/api/integrations';
import { AuditActions } from '@/components/audit/AuditService';

/**
 * Automated PO Approval Workflow Service
 * Routes POs to correct approvers based on rules
 */

export async function evaluatePOForApproval(purchaseOrder, rules, vendors) {
  const amount = purchaseOrder.total_amount || 0;
  const vendor = vendors.find((v) => v.id === purchaseOrder.vendor_id);
  const vendorType = vendor?.vendor_type || 'supplier';

  // Sort rules by priority
  const activeRules = rules
    .filter((r) => r.is_active)
    .sort((a, b) => (a.priority || 1) - (b.priority || 1));

  // Find matching rules
  const matchingRules = [];

  for (const rule of activeRules) {
    let matches = false;

    if (rule.rule_type === 'auto_approve' && rule.auto_approve) {
      // Auto-approve if amount is within threshold
      if (amount <= (rule.max_amount || Infinity) && amount >= (rule.min_amount || 0)) {
        matches = true;
      }
    } else if (rule.rule_type === 'amount_threshold') {
      // Check amount thresholds
      const minOk = amount >= (rule.min_amount || 0);
      const maxOk = !rule.max_amount || amount <= rule.max_amount;
      if (minOk && maxOk) {
        matches = true;
      }
    } else if (rule.rule_type === 'vendor_tier') {
      // Check vendor type
      const allowedTypes = (rule.vendor_types || '').split(',').map((t) => t.trim().toLowerCase());
      if (allowedTypes.includes(vendorType.toLowerCase())) {
        matches = true;
      }
    }

    if (matches) {
      matchingRules.push(rule);
    }
  }

  return matchingRules;
}

export async function submitPOForApproval(purchaseOrder, rules, vendors) {
  const matchingRules = await evaluatePOForApproval(purchaseOrder, rules, vendors);

  // Check for auto-approve rules first
  const autoApproveRule = matchingRules.find((r) => r.auto_approve);

  if (autoApproveRule) {
    // Auto-approve the PO
    await db.purchaseOrders.update(purchaseOrder.id, {
      status: 'approved',
      approved_date: new Date().toISOString().split('T')[0],
      approved_by: 'System (Auto-Approved)',
    });

    // Record history
    await db.approvalHistory.create({
      po_id: purchaseOrder.id,
      po_number: purchaseOrder.po_number,
      action: 'auto_approved',
      approval_level: 1,
      approver_email: 'system',
      approver_name: 'System',
      rule_applied: autoApproveRule.name,
      amount: purchaseOrder.total_amount,
      comments: `Auto-approved by rule: ${autoApproveRule.name}`,
    });

    // Audit log
    AuditActions.poApproved(purchaseOrder, 'Auto-approved by rule: ' + autoApproveRule.name);

    return { status: 'auto_approved', rule: autoApproveRule };
  }

  // Find the first-level approver
  const level1Rules = matchingRules.filter((r) => r.approval_level === 1);
  const approverRule = level1Rules[0] || matchingRules[0];

  if (approverRule && approverRule.approver_email) {
    // Update PO status and send for approval
    await db.purchaseOrders.update(purchaseOrder.id, {
      status: 'pending_approval',
    });

    // Record submission
    await db.approvalHistory.create({
      po_id: purchaseOrder.id,
      po_number: purchaseOrder.po_number,
      action: 'submitted',
      approval_level: approverRule.approval_level || 1,
      approver_email: approverRule.approver_email,
      approver_name: approverRule.approver_name,
      rule_applied: approverRule.name,
      amount: purchaseOrder.total_amount,
      comments: `Routed to ${approverRule.approver_name} for approval`,
    });

    // Create notification
    await db.notifications.create({
      type: 'system',
      title: 'PO Pending Approval',
      message: `Purchase Order ${purchaseOrder.po_number} for ฿${purchaseOrder.total_amount?.toLocaleString()} requires your approval.`,
      priority: purchaseOrder.total_amount > 50000 ? 'high' : 'medium',
      reference_type: 'task',
      reference_id: purchaseOrder.id,
      recipient_email: approverRule.approver_email,
      status: 'unread',
    });

    // Send email notification
    try {
      await sendMessengerNotification({
        to: approverRule.approver_email,
        message: `[Approval Required] PO ${purchaseOrder.po_number} - ฿${purchaseOrder.total_amount?.toLocaleString()}\n\nA new purchase order requires your approval.\nVendor: ${purchaseOrder.vendor_name}\nRule: ${approverRule.name}\n\nPlease log in to review.`,
        platform: 'Telegram',
      });
    } catch (_e) {
      console.error('Failed to send approval email:', _e);
    }

    // Audit log
    AuditActions.poSubmitted(purchaseOrder, approverRule.approver_name);

    return { status: 'pending_approval', approver: approverRule, allRules: matchingRules };
  }

  // No matching rules, set to pending approval without specific approver
  await db.purchaseOrders.update(purchaseOrder.id, {
    status: 'pending_approval',
  });

  return { status: 'pending_approval', approver: null, allRules: [] };
}

export async function approvePO(purchaseOrder, approverEmail, approverName, comments = '') {
  const user = await auth.me();

  // Get current approval level from history
  const history = await db.approvalHistory.filter({ po_id: purchaseOrder.id });
  const currentLevel = Math.max(...history.map((h) => h.approval_level || 1), 0);

  // Get rules to check if more approvals needed
  const rules = await db.approvalRules.filter({ is_active: true });
  const vendors = await db.vendors.list();
  const matchingRules = await evaluatePOForApproval(purchaseOrder, rules, vendors);

  const nextLevelRules = matchingRules.filter((r) => (r.approval_level || 1) > currentLevel);

  // Record approval
  await db.approvalHistory.create({
    po_id: purchaseOrder.id,
    po_number: purchaseOrder.po_number,
    action: 'approved',
    approval_level: currentLevel + 1,
    approver_email: approverEmail || user.email,
    approver_name: approverName || user.full_name,
    amount: purchaseOrder.total_amount,
    comments,
  });

  if (nextLevelRules.length > 0) {
    // Escalate to next level
    const nextApprover = nextLevelRules[0];

    await db.approvalHistory.create({
      po_id: purchaseOrder.id,
      po_number: purchaseOrder.po_number,
      action: 'escalated',
      approval_level: nextApprover.approval_level,
      approver_email: nextApprover.approver_email,
      approver_name: nextApprover.approver_name,
      rule_applied: nextApprover.name,
      amount: purchaseOrder.total_amount,
      comments: `Escalated to Level ${nextApprover.approval_level}`,
    });

    // Notify next approver
    await db.notifications.create({
      type: 'system',
      title: 'PO Escalated for Approval',
      message: `PO ${purchaseOrder.po_number} has been escalated and requires your approval.`,
      priority: 'high',
      reference_type: 'task',
      reference_id: purchaseOrder.id,
      recipient_email: nextApprover.approver_email,
      status: 'unread',
    });

    return { status: 'escalated', nextApprover };
  }

  // Final approval
  await db.purchaseOrders.update(purchaseOrder.id, {
    status: 'approved',
    approved_date: new Date().toISOString().split('T')[0],
    approved_by: approverName || user.full_name,
  });

  // Audit log
  AuditActions.poApproved(purchaseOrder, comments);

  return { status: 'approved' };
}

export async function rejectPO(purchaseOrder, rejecterEmail, rejecterName, comments = '') {
  await db.approvalHistory.create({
    po_id: purchaseOrder.id,
    po_number: purchaseOrder.po_number,
    action: 'rejected',
    approver_email: rejecterEmail,
    approver_name: rejecterName,
    amount: purchaseOrder.total_amount,
    comments,
  });

  await db.purchaseOrders.update(purchaseOrder.id, {
    status: 'cancelled',
  });

  // Audit log
  AuditActions.poRejected(purchaseOrder, comments);

  return { status: 'rejected' };
}

export async function getApprovalHistory(poId) {
  return await db.approvalHistory.filter({ po_id: poId }, '-created_date');
}

export async function getPendingApprovals(approverEmail) {
  const allPOs = await db.purchaseOrders.filter({ status: 'pending_approval' });
  const allHistory = await db.approvalHistory.list();

  // Filter POs that are pending this approver
  return allPOs.filter((po) => {
    const poHistory = allHistory.filter((h) => h.po_id === po.id);
    const latestSubmission = poHistory
      .filter((h) => ['submitted', 'escalated'].includes(h.action))
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

    return latestSubmission?.approver_email === approverEmail;
  });
}
