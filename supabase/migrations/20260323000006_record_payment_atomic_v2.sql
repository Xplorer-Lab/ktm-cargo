-- v2: persist payment_date + payment_method to dedicated columns
CREATE OR REPLACE FUNCTION record_payment_atomic(
  p_invoice_id        UUID,
  p_amount            NUMERIC,
  p_payment_date      DATE    DEFAULT CURRENT_DATE,
  p_payment_method    TEXT    DEFAULT 'bank_transfer',
  p_payment_reference TEXT    DEFAULT NULL
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

  IF v_invoice.status NOT IN ('issued', 'sent', 'partially_paid') THEN
    RAISE EXCEPTION 'Invoice % cannot accept payment in status "%"',
      p_invoice_id, v_invoice.status;
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  IF p_amount > COALESCE(v_invoice.balance_due, 0) THEN
    RAISE EXCEPTION 'Payment amount (%) exceeds balance due (%)',
      p_amount, v_invoice.balance_due;
  END IF;

  v_new_amount_paid := ROUND(
    (COALESCE(v_invoice.amount_paid, 0) + p_amount)::NUMERIC, 2
  );
  v_new_balance_due := ROUND(
    GREATEST(0, COALESCE(v_invoice.balance_due, 0) - p_amount)::NUMERIC, 2
  );
  v_new_status := CASE WHEN v_new_balance_due = 0 THEN 'paid' ELSE 'partially_paid' END;

  v_note := format(
    'PAYMENT (%s) via %s on %s%s',
    p_amount,
    p_payment_method,
    p_payment_date,
    CASE WHEN p_payment_reference IS NOT NULL
         THEN ' ref:' || p_payment_reference
         ELSE '' END
  );

  UPDATE customer_invoices
  SET
    amount_paid    = v_new_amount_paid,
    balance_due    = v_new_balance_due,
    status         = v_new_status,
    payment_date   = p_payment_date,
    payment_method = p_payment_method,
    notes          = CASE
                       WHEN notes IS NULL OR notes = '' THEN v_note
                       ELSE notes || chr(10) || v_note
                     END,
    updated_at     = NOW()
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
