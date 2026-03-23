-- Create shipment + rebalance PO weight atomically.
-- Called by src/api/shipmentAllocationRpc.js :: createShipmentWithPoRebalance()
CREATE OR REPLACE FUNCTION create_shipment_with_po_rebalance(
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shipment    shipments%ROWTYPE;
  v_po          purchase_orders%ROWTYPE;
  v_po_id       UUID;
  v_weight      NUMERIC;
BEGIN
  PERFORM _assert_staff_caller();

  v_po_id  := (p_payload->>'vendor_po_id')::UUID;
  v_weight := GREATEST(0, COALESCE((p_payload->>'weight_kg')::NUMERIC, 0));

  -- Lock PO row first (prevents concurrent over-allocation)
  IF v_po_id IS NOT NULL AND v_weight > 0 THEN
    SELECT * INTO v_po
    FROM purchase_orders
    WHERE id = v_po_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Purchase order % not found', v_po_id;
    END IF;

    IF v_po.total_weight_kg > 0
       AND (v_po.allocated_weight_kg + v_weight) > v_po.total_weight_kg THEN
      RAISE EXCEPTION 'PO capacity exceeded: %.2f kg requested, %.2f kg available',
        v_weight, (v_po.total_weight_kg - v_po.allocated_weight_kg);
    END IF;
  END IF;

  -- Insert shipment using JSONB → row mapping; id defaults to gen_random_uuid()
  INSERT INTO shipments
  SELECT *
  FROM jsonb_populate_record(
    null::shipments,
    jsonb_build_object('id', COALESCE(p_payload->>'id', gen_random_uuid()::TEXT))
      || p_payload
      || jsonb_build_object(
           'created_at', NOW(),
           'updated_at', NOW()
         )
  )
  RETURNING * INTO v_shipment;

  -- Update PO weight
  IF v_po_id IS NOT NULL AND v_weight > 0 THEN
    UPDATE purchase_orders
    SET
      allocated_weight_kg = allocated_weight_kg + v_weight,
      remaining_weight_kg = CASE
        WHEN total_weight_kg > 0
          THEN GREATEST(0, total_weight_kg - (allocated_weight_kg + v_weight))
        ELSE GREATEST(0, remaining_weight_kg - v_weight)
      END,
      updated_at = NOW()
    WHERE id = v_po_id
    RETURNING * INTO v_po;
  END IF;

  RETURN jsonb_build_object(
    'shipment',        to_jsonb(v_shipment),
    'purchase_orders', CASE WHEN v_po.id IS NOT NULL
                            THEN jsonb_build_array(to_jsonb(v_po))
                            ELSE '[]'::JSONB END
  );
END;
$$;

COMMENT ON FUNCTION create_shipment_with_po_rebalance IS
  'Atomically inserts a shipment and allocates weight against the linked PO. Staff/admin only.';
