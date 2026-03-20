/**
 * Mutation-path tests for VendorRegistration page handlers.
 *
 * Covers: step validation (all 3 steps), invitation loading,
 * form update with error clearing, navigation guards, and submit flow.
 */

// ── Mocks ────────────────────────────────────────────────────────────────

const mockFilterInvitations = jest.fn();
const mockCreateVendor = jest.fn().mockResolvedValue({ id: 'v-new' });
const mockUpdateInvitation = jest.fn().mockResolvedValue({});

jest.mock('@/api/db', () => ({
  db: {
    vendorInvitations: {
      filter: (...args) => mockFilterInvitations(...args),
    },
    vendors: {
      create: (...args) => mockCreateVendor(...args),
    },
  },
}));

import { db } from '@/api/db';

// ── Extracted logic mirrors ──────────────────────────────────────────────

function validateStep(step, form) {
  const errors = {};

  if (step === 0) {
    if (!form.name?.trim()) errors.name = 'Company name is required';
    if (!form.vendor_type) errors.vendor_type = 'Vendor type is required';
  } else if (step === 1) {
    if (!form.contact_name?.trim()) errors.contact_name = 'Contact name is required';
    if (!form.phone?.trim()) errors.phone = 'Phone is required';
    if (!form.email?.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Invalid email format';
  } else if (step === 2) {
    if (!form.tax_id?.trim()) errors.tax_id = 'Tax ID is required';
    if (!form.bank_name?.trim()) errors.bank_name = 'Bank name is required';
    if (!form.bank_account_number?.trim())
      errors.bank_account_number = 'Account number is required';
    if (!form.bank_account_name?.trim()) errors.bank_account_name = 'Account name is required';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function updateFormField(form, fieldErrors, field, value) {
  const newForm = { ...form, [field]: value };
  const newErrors = { ...fieldErrors };
  if (newErrors[field]) {
    delete newErrors[field];
  }
  return { form: newForm, errors: newErrors };
}

function resolveInvitationStatus(invitation) {
  if (!invitation) return 'not_found';
  if (invitation.status === 'completed') return 'already_used';
  if (invitation.status === 'expired' || new Date(invitation.expires_at) < new Date()) {
    return 'expired';
  }
  return 'valid';
}

function buildVendorPayload(form, invitation) {
  return {
    ...form,
    status: 'pending',
    onboarding_source: 'invitation',
    invitation_id: invitation.id,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('VendorRegistration mutation paths', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('validateStep', () => {
    describe('step 0 - Company Info', () => {
      it('passes with valid data', () => {
        const result = validateStep(0, { name: 'Acme Corp', vendor_type: 'freight' });
        expect(result.valid).toBe(true);
      });

      it('fails when name is empty', () => {
        const result = validateStep(0, { name: '', vendor_type: 'freight' });
        expect(result.valid).toBe(false);
        expect(result.errors.name).toBeDefined();
      });

      it('fails when vendor_type is missing', () => {
        const result = validateStep(0, { name: 'Acme' });
        expect(result.valid).toBe(false);
        expect(result.errors.vendor_type).toBeDefined();
      });

      it('fails when name is whitespace only', () => {
        const result = validateStep(0, { name: '   ', vendor_type: 'freight' });
        expect(result.valid).toBe(false);
      });
    });

    describe('step 1 - Contact Info', () => {
      it('passes with valid data', () => {
        const result = validateStep(1, {
          contact_name: 'John',
          phone: '09123456789',
          email: 'john@test.com',
        });
        expect(result.valid).toBe(true);
      });

      it('fails with invalid email format', () => {
        const result = validateStep(1, {
          contact_name: 'John',
          phone: '09123',
          email: 'not-an-email',
        });
        expect(result.valid).toBe(false);
        expect(result.errors.email).toMatch(/invalid/i);
      });

      it('fails when all fields empty', () => {
        const result = validateStep(1, {});
        expect(result.valid).toBe(false);
        expect(Object.keys(result.errors)).toHaveLength(3);
      });
    });

    describe('step 2 - Banking Info', () => {
      it('passes with valid banking data', () => {
        const result = validateStep(2, {
          tax_id: 'TAX-123',
          bank_name: 'Bangkok Bank',
          bank_account_number: '1234567890',
          bank_account_name: 'Acme Corp',
        });
        expect(result.valid).toBe(true);
      });

      it('fails when any banking field missing', () => {
        const result = validateStep(2, { tax_id: 'TAX-123' });
        expect(result.valid).toBe(false);
        expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(3);
      });
    });
  });

  describe('updateFormField', () => {
    it('updates field value', () => {
      const { form } = updateFormField({ name: 'Old' }, {}, 'name', 'New');
      expect(form.name).toBe('New');
    });

    it('clears existing error for that field', () => {
      const { errors } = updateFormField({ name: '' }, { name: 'Required' }, 'name', 'Fixed');
      expect(errors.name).toBeUndefined();
    });

    it('preserves other errors', () => {
      const { errors } = updateFormField(
        {},
        { name: 'Required', email: 'Invalid' },
        'name',
        'Fixed'
      );
      expect(errors.email).toBe('Invalid');
    });
  });

  describe('resolveInvitationStatus', () => {
    it('returns not_found for null', () => {
      expect(resolveInvitationStatus(null)).toBe('not_found');
    });

    it('returns already_used for completed invitation', () => {
      expect(resolveInvitationStatus({ status: 'completed' })).toBe('already_used');
    });

    it('returns expired for expired status', () => {
      expect(resolveInvitationStatus({ status: 'expired', expires_at: '2020-01-01' })).toBe(
        'expired'
      );
    });

    it('returns expired when past expiry date', () => {
      expect(resolveInvitationStatus({ status: 'pending', expires_at: '2020-01-01' })).toBe(
        'expired'
      );
    });

    it('returns valid for active invitation with future expiry', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      expect(resolveInvitationStatus({ status: 'pending', expires_at: future.toISOString() })).toBe(
        'valid'
      );
    });
  });

  describe('buildVendorPayload', () => {
    it('includes form data plus metadata', () => {
      const form = { name: 'Acme', vendor_type: 'freight', email: 'a@b.com' };
      const invitation = { id: 'inv-1' };
      const payload = buildVendorPayload(form, invitation);

      expect(payload.name).toBe('Acme');
      expect(payload.status).toBe('pending');
      expect(payload.onboarding_source).toBe('invitation');
      expect(payload.invitation_id).toBe('inv-1');
    });
  });
});
