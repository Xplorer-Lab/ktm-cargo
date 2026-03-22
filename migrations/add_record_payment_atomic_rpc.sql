-- ============================================================================
-- Atomic payment recording RPC
--
-- Replaces the client-side read-then-write in recordPayment() with a
-- DB-side function that uses SELECT ... FOR UPDATE to prevent race conditions
-- where concurrent payments corrupt balance_due.
-- ============================================================================

CREATE OR REPLACE FUNCTION record_payment_atomic(
  p_invoice_id        uuid,
  p_amount            numeric,
  p_payment_date      date,
  p_payment_method    text DEFAULT 'bank_transfer',
  p_payment_reference text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice       customer_invoices%ROWTYPE;
  v_new_amount    numeric;
  v_new_balance   numeric;
  v_new_status    text;
BEGIN
  -- Lock the row to prevent concurrent payment mutations
  SELECT * INTO v_invoice
  FROM customer_invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invoice not found');
  END IF;

  -- Validate amount
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  -- Validate invoice status
  IF v_invoice.status = 'paid' THEN
    RETURN json_build_object('success', false, 'error', 'Invoice already paid');
  END IF;

  IF v_invoice.status = 'void' THEN
    RETURN json_build_object('success', false, 'error', 'Invoice is void');
  END IF;

  IF v_invoice.status NOT IN ('issued', 'sent', 'partially_paid') THEN
    RETURN json_build_object('success', false, 'error', 'Invoice cannot accept payments in its current status');
  END IF;

  -- Validate amount does not exceed balance (with ±0.01 tolerance for float rounding)
  IF p_amount > COALESCE(v_invoice.balance_due, v_invoice.total_amount) + 0.01 THEN
    RETURN json_build_object('success', false, 'error', 'Payment amount exceeds balance');
  END IF;

  -- Compute new values
  v_new_amount  := COALESCE(v_invoice.amount_paid, 0) + p_amount;
  v_new_balance := GREATEST(0, COALESCE(v_invoice.total_amount, 0) - v_new_amount);
  v_new_status  := CASE WHEN v_new_balance <= 0.01 THEN 'paid' ELSE 'partially_paid' END;

  -- Write atomically
  UPDATE customer_invoices SET
    amount_paid        = v_new_amount,
    balance_due        = CASE WHEN v_new_balance <= 0.01 THEN 0 ELSE v_new_balance END,
    status             = v_new_status,
    payment_date       = COALESCE(p_payment_date, CURRENT_DATE),
    payment_method     = COALESCE(p_payment_method, 'bank_transfer'),
    payment_reference  = COALESCE(p_payment_reference, '')
  WHERE id = p_invoice_id;

  RETURN json_build_object(
    'success',      true,
    'status',       v_new_status,
    'amount_paid',  v_new_amount,
    'balance_due',  CASE WHEN v_new_balance <= 0.01 THEN 0 ELSE v_new_balance END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION record_payment_atomic(uuid, numeric, date, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION record_payment_atomic(uuid, numeric, date, text, text) TO service_role;
