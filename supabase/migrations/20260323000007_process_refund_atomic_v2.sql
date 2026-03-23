-- v2: add status guard — only 'paid'/'partially_paid' invoices are refundable
CREATE OR REPLACE FUNCTION process_refund_atomic(
  p_invoice_id    UUID,
  p_refund_amount NUMERIC,
  p_reason        TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice         customer_invoices%ROWTYPE;
  v_new_amount_paid NUMERIC;
  v_new_balance_due NUMERIC;
  v_new_status      TEXT;
  v_note            TEXT;
BEGIN
  PERFORM _assert_staff_caller();

  SELECT * INTO v_invoice
  FROM customer_invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice % not found', p_invoice_id;
  END IF;

  IF v_invoice.status NOT IN ('paid', 'partially_paid') THEN
    RAISE EXCEPTION 'Invoice % cannot be refunded in status "%"',
      p_invoice_id, v_invoice.status;
  END IF;

  IF p_refund_amount <= 0 THEN
    RAISE EXCEPTION 'Refund amount must be greater than zero';
  END IF;

  IF p_refund_amount > COALESCE(v_invoice.amount_paid, 0) THEN
    RAISE EXCEPTION 'Refund amount (%) exceeds amount paid (%)',
      p_refund_amount, v_invoice.amount_paid;
  END IF;

  v_new_amount_paid := ROUND(
    GREATEST(0, COALESCE(v_invoice.amount_paid, 0) - p_refund_amount)::NUMERIC, 2
  );
  v_new_balance_due := CASE
    WHEN v_new_amount_paid = 0 THEN 0
    ELSE ROUND(
      GREATEST(0, COALESCE(v_invoice.total_amount, 0) - v_new_amount_paid)::NUMERIC, 2
    )
  END;
  v_new_status := CASE WHEN v_new_amount_paid = 0 THEN 'refunded' ELSE 'partially_paid' END;

  v_note := CASE
    WHEN p_reason != ''
    THEN format('REFUND (%s): %s', p_refund_amount, p_reason)
    ELSE format('REFUND (%s) on %s', p_refund_amount, CURRENT_DATE)
  END;

  UPDATE customer_invoices
  SET
    amount_paid = v_new_amount_paid,
    balance_due = v_new_balance_due,
    status      = v_new_status,
    notes       = CASE
                    WHEN notes IS NULL OR notes = '' THEN v_note
                    ELSE notes || chr(10) || v_note
                  END,
    updated_at  = NOW()
  WHERE id = p_invoice_id;

  RETURN jsonb_build_object(
    'success',     true,
    'status',      v_new_status,
    'amount_paid', v_new_amount_paid,
    'balance_due', v_new_balance_due
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error',   SQLERRM
  );
END;
$$;
