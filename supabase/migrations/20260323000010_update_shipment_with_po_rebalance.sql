-- Update shipment + rebalance PO weight atomically.
-- Called by src/api/shipmentAllocationRpc.js :: updateShipmentWithPoRebalance()
CREATE OR REPLACE FUNCTION update_shipment_with_po_rebalance(
  p_shipment_id UUID,
  p_updates     JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing    shipments%ROWTYPE;
  v_shipment    shipments%ROWTYPE;
  v_prev_po_id  UUID;
  v_next_po_id  UUID;
  v_prev_weight NUMERIC;
  v_next_weight NUMERIC;
  v_po          purchase_orders%ROWTYPE;
  v_pos         JSONB := '[]'::JSONB;
BEGIN
  PERFORM _assert_staff_caller();

  SELECT * INTO v_existing
  FROM shipments
  WHERE id = p_shipment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shipment % not found', p_shipment_id;
  END IF;

  v_prev_po_id  := v_existing.vendor_po_id;
  v_prev_weight := GREATEST(0, COALESCE(v_existing.weight_kg, 0));
  v_next_po_id  := COALESCE((p_updates->>'vendor_po_id')::UUID, v_existing.vendor_po_id);
  v_next_weight := GREATEST(0, COALESCE((p_updates->>'weight_kg')::NUMERIC, v_existing.weight_kg, 0));

  -- Rebalance PO weight
  IF v_prev_po_id IS NOT NULL AND v_next_po_id IS NOT NULL
     AND v_prev_po_id = v_next_po_id THEN
    -- Same PO: apply delta
    IF v_next_weight <> v_prev_weight THEN
      UPDATE purchase_orders
      SET
        allocated_weight_kg = GREATEST(0, allocated_weight_kg + (v_next_weight - v_prev_weight)),
        remaining_weight_kg = CASE
          WHEN total_weight_kg > 0
            THEN GREATEST(0, total_weight_kg - GREATEST(0, allocated_weight_kg + (v_next_weight - v_prev_weight)))
          ELSE GREATEST(0, remaining_weight_kg - (v_next_weight - v_prev_weight))
        END,
        updated_at = NOW()
      WHERE id = v_prev_po_id
      RETURNING * INTO v_po;
      v_pos := jsonb_build_array(to_jsonb(v_po));
    END IF;
  ELSE
    -- PO changed: release from old, allocate to new
    IF v_prev_po_id IS NOT NULL AND v_prev_weight > 0 THEN
      UPDATE purchase_orders
      SET
        allocated_weight_kg = GREATEST(0, allocated_weight_kg - v_prev_weight),
        remaining_weight_kg = CASE
          WHEN total_weight_kg > 0
            THEN GREATEST(0, total_weight_kg - GREATEST(0, allocated_weight_kg - v_prev_weight))
          ELSE remaining_weight_kg + v_prev_weight
        END,
        updated_at = NOW()
      WHERE id = v_prev_po_id
      RETURNING * INTO v_po;
      IF v_po.id IS NOT NULL THEN
        v_pos := v_pos || jsonb_build_array(to_jsonb(v_po));
      END IF;
    END IF;

    IF v_next_po_id IS NOT NULL AND v_next_weight > 0 THEN
      UPDATE purchase_orders
      SET
        allocated_weight_kg = allocated_weight_kg + v_next_weight,
        remaining_weight_kg = CASE
          WHEN total_weight_kg > 0
            THEN GREATEST(0, total_weight_kg - (allocated_weight_kg + v_next_weight))
          ELSE GREATEST(0, remaining_weight_kg - v_next_weight)
        END,
        updated_at = NOW()
      WHERE id = v_next_po_id
      RETURNING * INTO v_po;
      IF v_po.id IS NOT NULL THEN
        v_pos := v_pos || jsonb_build_array(to_jsonb(v_po));
      END IF;
    END IF;
  END IF;

  -- Update shipment columns from p_updates JSONB
  UPDATE shipments
  SET
    customer_id        = COALESCE((p_updates->>'customer_id')::UUID,       customer_id),
    customer_name      = COALESCE(p_updates->>'customer_name',             customer_name),
    customer_phone     = COALESCE(p_updates->>'customer_phone',            customer_phone),
    service_type       = COALESCE(p_updates->>'service_type',              service_type),
    weight_kg          = COALESCE((p_updates->>'weight_kg')::NUMERIC,      weight_kg),
    items_description  = COALESCE(p_updates->>'items_description',         items_description),
    tracking_number    = COALESCE(p_updates->>'tracking_number',           tracking_number),
    price_per_kg       = COALESCE((p_updates->>'price_per_kg')::NUMERIC,   price_per_kg),
    cost_basis         = COALESCE((p_updates->>'cost_basis')::NUMERIC,     cost_basis),
    total_amount       = COALESCE((p_updates->>'total_amount')::NUMERIC,   total_amount),
    profit             = COALESCE((p_updates->>'profit')::NUMERIC,         profit),
    insurance_amount   = COALESCE((p_updates->>'insurance_amount')::NUMERIC, insurance_amount),
    status             = COALESCE((p_updates->>'status')::TEXT,            status::TEXT)::shipment_status,
    payment_status     = COALESCE((p_updates->>'payment_status')::TEXT,    payment_status::TEXT)::payment_status,
    estimated_delivery = COALESCE(p_updates->>'estimated_delivery',        estimated_delivery),
    pickup_address     = COALESCE(p_updates->>'pickup_address',            pickup_address),
    delivery_address   = COALESCE(p_updates->>'delivery_address',          delivery_address),
    insurance_opted    = COALESCE((p_updates->>'insurance_opted')::BOOLEAN, insurance_opted),
    packaging_fee      = COALESCE((p_updates->>'packaging_fee')::NUMERIC,  packaging_fee),
    notes              = COALESCE(p_updates->>'notes',                     notes),
    vendor_po_id       = CASE WHEN p_updates ? 'vendor_po_id'
                              THEN (p_updates->>'vendor_po_id')::UUID
                              ELSE vendor_po_id END,
    vendor_id          = COALESCE((p_updates->>'vendor_id')::UUID,         vendor_id),
    vendor_name        = COALESCE(p_updates->>'vendor_name',               vendor_name),
    vendor_po_number   = COALESCE(p_updates->>'vendor_po_number',          vendor_po_number),
    vendor_cost_per_kg = COALESCE((p_updates->>'vendor_cost_per_kg')::NUMERIC, vendor_cost_per_kg),
    vendor_total_cost  = COALESCE((p_updates->>'vendor_total_cost')::NUMERIC,  vendor_total_cost),
    margin_percentage  = COALESCE((p_updates->>'margin_percentage')::NUMERIC,  margin_percentage),
    origin             = COALESCE(p_updates->>'origin',                    origin),
    destination        = COALESCE(p_updates->>'destination',               destination),
    updated_at         = NOW()
  WHERE id = p_shipment_id
  RETURNING * INTO v_shipment;

  RETURN jsonb_build_object(
    'shipment',        to_jsonb(v_shipment),
    'purchase_orders', v_pos
  );
END;
$$;

COMMENT ON FUNCTION update_shipment_with_po_rebalance IS
  'Atomically updates a shipment and rebalances PO weight allocation. Staff/admin only.';
