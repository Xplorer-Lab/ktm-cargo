-- Delete shipment + release PO weight atomically.
-- Called by src/api/shipmentAllocationRpc.js :: deleteShipmentWithPoRebalance()
CREATE OR REPLACE FUNCTION delete_shipment_with_po_rebalance(
  p_shipment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shipment shipments%ROWTYPE;
  v_po       purchase_orders%ROWTYPE;
  v_weight   NUMERIC;
BEGIN
  PERFORM _assert_staff_caller();

  SELECT * INTO v_shipment
  FROM shipments
  WHERE id = p_shipment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shipment % not found', p_shipment_id;
  END IF;

  v_weight := GREATEST(0, COALESCE(v_shipment.weight_kg, 0));

  -- Release weight from PO
  IF v_shipment.vendor_po_id IS NOT NULL AND v_weight > 0 THEN
    UPDATE purchase_orders
    SET
      allocated_weight_kg = GREATEST(0, allocated_weight_kg - v_weight),
      remaining_weight_kg = CASE
        WHEN total_weight_kg > 0
          THEN GREATEST(0, total_weight_kg - GREATEST(0, allocated_weight_kg - v_weight))
        ELSE remaining_weight_kg + v_weight
      END,
      updated_at = NOW()
    WHERE id = v_shipment.vendor_po_id
    RETURNING * INTO v_po;
  END IF;

  DELETE FROM shipments WHERE id = p_shipment_id;

  RETURN jsonb_build_object(
    'shipment',        to_jsonb(v_shipment),
    'purchase_orders', CASE WHEN v_po.id IS NOT NULL
                            THEN jsonb_build_array(to_jsonb(v_po))
                            ELSE '[]'::JSONB END
  );
END;
$$;

COMMENT ON FUNCTION delete_shipment_with_po_rebalance IS
  'Atomically deletes a shipment and releases its weight from the linked PO. Staff/admin only.';
