-- H-1: Sequential vendor bill numbers
-- generateBillNumber() in procurement/InvoiceService.jsx used Math.random()
-- (BILL-YYYYMM-XXXX with 4-digit random suffix = 10,000 range, collision-prone).
-- This RPC uses a DB sequence per year-month to guarantee uniqueness.
CREATE SEQUENCE IF NOT EXISTS bill_number_seq START 1;

CREATE OR REPLACE FUNCTION next_bill_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year_month TEXT;
  v_seq        BIGINT;
BEGIN
  v_year_month := TO_CHAR(NOW(), 'YYYYMM');
  v_seq        := NEXTVAL('bill_number_seq');
  RETURN 'BILL-' || v_year_month || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$;
