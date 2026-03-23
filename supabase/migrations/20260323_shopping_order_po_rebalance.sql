-- ============================================================================
-- Migration: Shopping Order PO Rebalance RPC
-- Fixes P0: Non-atomic client-side PO weight updates for shopping orders.
-- All three operations (dealloc old PO, alloc new PO, update order) run in
-- a single DB transaction — no partial corruption on mid-flight failure.
-- ============================================================================

CREATE OR REPLACE FUNCTION update_shopping_order_with_po_rebalance(
  p_order_id       UUID,
  p_updates        JSONB,
  p_previous_po_id UUID    DEFAULT NULL,
  p_next_po_id     UUID    DEFAULT NULL,
  p_previous_weight NUMERIC DEFAULT 0,
  p_next_weight    NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_allocated  NUMERIC;
  v_po_total        NUMERIC;
  v_order_row       shopping_orders%ROWTYPE;
BEGIN
  -- 1. Dealloc weight from previous PO
  IF p_previous_po_id IS NOT NULL AND p_previous_weight > 0 THEN
    UPDATE purchase_orders
    SET
      allocated_weight_kg = GREATEST(0, allocated_weight_kg - p_previous_weight),
      remaining_weight_kg = CASE
        WHEN total_weight_kg > 0
          THEN GREATEST(0, total_weight_kg - GREATEST(0, allocated_weight_kg - p_previous_weight))
        ELSE remaining_weight_kg + p_previous_weight
      END,
      updated_at = NOW()
    WHERE id = p_previous_po_id;
  END IF;

  -- 2. Alloc weight to next PO (capacity check with row lock)
  IF p_next_po_id IS NOT NULL AND p_next_weight > 0 THEN
    SELECT allocated_weight_kg, total_weight_kg
      INTO v_next_allocated, v_po_total
      FROM purchase_orders
      WHERE id = p_next_po_id
      FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Purchase order % not found', p_next_po_id;
    END IF;

    IF v_po_total > 0 AND (v_next_allocated + p_next_weight) > v_po_total THEN
      RAISE EXCEPTION 'PO capacity exceeded: %.2f kg requested, %.2f kg available',
        p_next_weight, (v_po_total - v_next_allocated);
    END IF;

    UPDATE purchase_orders
    SET
      allocated_weight_kg = allocated_weight_kg + p_next_weight,
      remaining_weight_kg = CASE
        WHEN total_weight_kg > 0
          THEN GREATEST(0, total_weight_kg - (allocated_weight_kg + p_next_weight))
        ELSE GREATEST(0, remaining_weight_kg - p_next_weight)
      END,
      updated_at = NOW()
    WHERE id = p_next_po_id;
  END IF;

  -- 3. Update shopping order (all fields via COALESCE — only supplied keys change)
  UPDATE shopping_orders SET
    status                 = COALESCE(p_updates->>'status',                           status::TEXT)::shopping_order_status,
    vendor_po_id           = CASE WHEN p_updates ? 'vendor_po_id'
                                  THEN (p_updates->>'vendor_po_id')::UUID
                                  ELSE vendor_po_id END,
    actual_weight          = COALESCE((p_updates->>'actual_weight')::NUMERIC,          actual_weight),
    estimated_weight       = COALESCE((p_updates->>'estimated_weight')::NUMERIC,       estimated_weight),
    actual_product_cost    = COALESCE((p_updates->>'actual_product_cost')::NUMERIC,    actual_product_cost),
    estimated_product_cost = COALESCE((p_updates->>'estimated_product_cost')::NUMERIC, estimated_product_cost),
    shipping_cost          = COALESCE((p_updates->>'shipping_cost')::NUMERIC,          shipping_cost),
    vendor_cost            = COALESCE((p_updates->>'vendor_cost')::NUMERIC,            vendor_cost),
    vendor_cost_per_kg     = COALESCE((p_updates->>'vendor_cost_per_kg')::NUMERIC,     vendor_cost_per_kg),
    commission_amount      = COALESCE((p_updates->>'commission_amount')::NUMERIC,      commission_amount),
    total_amount           = COALESCE((p_updates->>'total_amount')::NUMERIC,           total_amount),
    notes                  = COALESCE(p_updates->>'notes',                             notes),
    updated_at             = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_order_row;

  IF v_order_row.id IS NULL THEN
    RAISE EXCEPTION 'Shopping order % not found', p_order_id;
  END IF;

  RETURN to_jsonb(v_order_row);
END;
$$;

COMMENT ON FUNCTION update_shopping_order_with_po_rebalance IS
  'Atomically rebalances PO weight allocations and updates a shopping order in one transaction.';
