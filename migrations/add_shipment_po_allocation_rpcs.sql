-- ============================================================================
-- Shipment + Purchase Order Allocation RPCs
-- Adds transactional database-side write paths for shipment create/update/delete
-- ============================================================================

BEGIN;

-- Normalize blank UUID-ish shipment payload fields before casting with
-- jsonb_populate_record().
CREATE OR REPLACE FUNCTION public.normalize_shipment_rpc_payload(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_payload JSONB := COALESCE(p_payload, '{}'::jsonb);
  v_uuid_field TEXT;
BEGIN
  FOREACH v_uuid_field IN ARRAY ARRAY['customer_id', 'vendor_po_id', 'vendor_id', 'journey_id']
  LOOP
    IF v_payload ? v_uuid_field AND NULLIF(BTRIM(v_payload ->> v_uuid_field), '') IS NULL THEN
      v_payload := jsonb_set(v_payload, ARRAY[v_uuid_field], 'null'::jsonb, true);
    END IF;
  END LOOP;

  RETURN v_payload;
END;
$$;

-- Lock the affected purchase orders in a deterministic order to reduce
-- deadlock risk when shipment updates move weight between two POs.
CREATE OR REPLACE FUNCTION public.lock_purchase_orders_for_rebalance(
  p_previous_po_id UUID DEFAULT NULL,
  p_next_po_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM 1
  FROM public.purchase_orders
  WHERE id = ANY(array_remove(ARRAY[p_previous_po_id, p_next_po_id]::UUID[], NULL))
  ORDER BY id
  FOR UPDATE;
END;
$$;

-- Apply a single PO allocation delta using already-authoritative rows.
CREATE OR REPLACE FUNCTION public.apply_purchase_order_allocation_delta(
  p_po_id UUID,
  p_delta NUMERIC
)
RETURNS public.purchase_orders
LANGUAGE plpgsql
AS $$
DECLARE
  v_po public.purchase_orders%ROWTYPE;
  v_total NUMERIC := 0;
  v_allocated NUMERIC := 0;
  v_next_allocated NUMERIC := 0;
  v_next_remaining NUMERIC := 0;
BEGIN
  IF p_po_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO v_po
  FROM public.purchase_orders
  WHERE id = p_po_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Linked purchase order not found: %', p_po_id;
  END IF;

  v_total := GREATEST(COALESCE(v_po.total_weight_kg, 0), 0);
  v_allocated := GREATEST(COALESCE(v_po.allocated_weight_kg, 0), 0);
  v_next_allocated := GREATEST(0, v_allocated + COALESCE(p_delta, 0));

  IF v_total > 0 AND v_next_allocated > v_total THEN
    RAISE EXCEPTION 'Shipment exceeds available purchase order capacity for %',
      COALESCE(v_po.po_number, v_po.id::TEXT);
  END IF;

  v_next_remaining := CASE
    WHEN v_total > 0 THEN GREATEST(0, v_total - v_next_allocated)
    ELSE COALESCE(v_po.remaining_weight_kg, 0)
  END;

  UPDATE public.purchase_orders
  SET
    allocated_weight_kg = v_next_allocated,
    remaining_weight_kg = v_next_remaining
  WHERE id = p_po_id
  RETURNING *
  INTO v_po;

  RETURN v_po;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_shipment_with_po_rebalance(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_payload JSONB := public.normalize_shipment_rpc_payload(p_payload);
  v_candidate public.shipments%ROWTYPE;
  v_shipment public.shipments%ROWTYPE;
  v_next_po_id UUID;
  v_weight NUMERIC := 0;
  v_affected_pos JSONB := '[]'::jsonb;
BEGIN
  v_candidate := jsonb_populate_record(NULL::public.shipments, v_payload);
  v_next_po_id := v_candidate.vendor_po_id;
  v_weight := GREATEST(COALESCE(v_candidate.weight_kg, 0), 0);

  IF COALESCE(BTRIM(v_candidate.customer_name), '') = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;

  IF COALESCE(BTRIM(v_candidate.service_type), '') = '' THEN
    RAISE EXCEPTION 'Service type is required';
  END IF;

  IF COALESCE(BTRIM(v_candidate.items_description), '') = '' THEN
    RAISE EXCEPTION 'Description is required';
  END IF;

  IF v_weight <= 0 THEN
    RAISE EXCEPTION 'Shipment weight must be greater than zero';
  END IF;

  PERFORM public.lock_purchase_orders_for_rebalance(NULL, v_next_po_id);

  INSERT INTO public.shipments (
    customer_id,
    customer_name,
    customer_phone,
    service_type,
    weight_kg,
    items_description,
    tracking_number,
    price_per_kg,
    cost_basis,
    total_amount,
    profit,
    insurance_amount,
    status,
    payment_status,
    estimated_delivery,
    pickup_address,
    delivery_address,
    insurance_opted,
    packaging_fee,
    notes,
    vendor_po_id,
    vendor_id,
    vendor_name,
    vendor_po_number,
    vendor_cost_per_kg,
    vendor_total_cost,
    origin,
    destination,
    journey_id
  )
  VALUES (
    v_candidate.customer_id,
    v_candidate.customer_name,
    v_candidate.customer_phone,
    v_candidate.service_type,
    v_candidate.weight_kg,
    v_candidate.items_description,
    v_candidate.tracking_number,
    v_candidate.price_per_kg,
    v_candidate.cost_basis,
    v_candidate.total_amount,
    v_candidate.profit,
    v_candidate.insurance_amount,
    COALESCE(v_candidate.status, 'pending'),
    COALESCE(v_candidate.payment_status, 'unpaid'),
    v_candidate.estimated_delivery,
    v_candidate.pickup_address,
    v_candidate.delivery_address,
    COALESCE(v_candidate.insurance_opted, false),
    COALESCE(v_candidate.packaging_fee, 0),
    v_candidate.notes,
    v_candidate.vendor_po_id,
    v_candidate.vendor_id,
    v_candidate.vendor_name,
    v_candidate.vendor_po_number,
    v_candidate.vendor_cost_per_kg,
    v_candidate.vendor_total_cost,
    COALESCE(v_candidate.origin, 'Bangkok'),
    COALESCE(v_candidate.destination, 'Yangon'),
    v_candidate.journey_id
  )
  RETURNING *
  INTO v_shipment;

  IF v_next_po_id IS NOT NULL AND v_weight > 0 THEN
    PERFORM public.apply_purchase_order_allocation_delta(v_next_po_id, v_weight);
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(po)), '[]'::jsonb)
  INTO v_affected_pos
  FROM (
    SELECT *
    FROM public.purchase_orders
    WHERE id = ANY(array_remove(ARRAY[v_next_po_id]::UUID[], NULL))
  ) po;

  RETURN jsonb_build_object(
    'shipment', to_jsonb(v_shipment),
    'purchase_orders', v_affected_pos
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_shipment_with_po_rebalance(
  p_shipment_id UUID,
  p_updates JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_updates JSONB := public.normalize_shipment_rpc_payload(p_updates);
  v_existing public.shipments%ROWTYPE;
  v_candidate public.shipments%ROWTYPE;
  v_updated public.shipments%ROWTYPE;
  v_previous_po_id UUID;
  v_next_po_id UUID;
  v_previous_weight NUMERIC := 0;
  v_next_weight NUMERIC := 0;
  v_affected_pos JSONB := '[]'::jsonb;
BEGIN
  SELECT *
  INTO v_existing
  FROM public.shipments
  WHERE id = p_shipment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shipment not found: %', p_shipment_id;
  END IF;

  v_candidate := jsonb_populate_record(v_existing, v_updates);

  v_previous_po_id := v_existing.vendor_po_id;
  v_next_po_id := v_candidate.vendor_po_id;
  v_previous_weight := GREATEST(COALESCE(v_existing.weight_kg, 0), 0);
  v_next_weight := GREATEST(COALESCE(v_candidate.weight_kg, 0), 0);

  IF COALESCE(BTRIM(v_candidate.customer_name), '') = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;

  IF COALESCE(BTRIM(v_candidate.service_type), '') = '' THEN
    RAISE EXCEPTION 'Service type is required';
  END IF;

  IF COALESCE(BTRIM(v_candidate.items_description), '') = '' THEN
    RAISE EXCEPTION 'Description is required';
  END IF;

  IF v_next_weight <= 0 THEN
    RAISE EXCEPTION 'Shipment weight must be greater than zero';
  END IF;

  PERFORM public.lock_purchase_orders_for_rebalance(v_previous_po_id, v_next_po_id);

  IF v_previous_po_id IS NOT NULL AND v_next_po_id IS NOT NULL AND v_previous_po_id = v_next_po_id THEN
    PERFORM public.apply_purchase_order_allocation_delta(v_previous_po_id, v_next_weight - v_previous_weight);
  ELSE
    IF v_previous_po_id IS NOT NULL AND v_previous_weight > 0 THEN
      PERFORM public.apply_purchase_order_allocation_delta(v_previous_po_id, -v_previous_weight);
    END IF;

    IF v_next_po_id IS NOT NULL AND v_next_weight > 0 THEN
      PERFORM public.apply_purchase_order_allocation_delta(v_next_po_id, v_next_weight);
    END IF;
  END IF;

  UPDATE public.shipments
  SET
    customer_id = v_candidate.customer_id,
    customer_name = v_candidate.customer_name,
    customer_phone = v_candidate.customer_phone,
    service_type = v_candidate.service_type,
    weight_kg = v_candidate.weight_kg,
    items_description = v_candidate.items_description,
    tracking_number = v_candidate.tracking_number,
    price_per_kg = v_candidate.price_per_kg,
    cost_basis = v_candidate.cost_basis,
    total_amount = v_candidate.total_amount,
    profit = v_candidate.profit,
    insurance_amount = v_candidate.insurance_amount,
    status = COALESCE(v_candidate.status, 'pending'),
    payment_status = COALESCE(v_candidate.payment_status, 'unpaid'),
    estimated_delivery = v_candidate.estimated_delivery,
    pickup_address = v_candidate.pickup_address,
    delivery_address = v_candidate.delivery_address,
    insurance_opted = COALESCE(v_candidate.insurance_opted, false),
    packaging_fee = COALESCE(v_candidate.packaging_fee, 0),
    notes = v_candidate.notes,
    vendor_po_id = v_candidate.vendor_po_id,
    vendor_id = v_candidate.vendor_id,
    vendor_name = v_candidate.vendor_name,
    vendor_po_number = v_candidate.vendor_po_number,
    vendor_cost_per_kg = v_candidate.vendor_cost_per_kg,
    vendor_total_cost = v_candidate.vendor_total_cost,
    origin = COALESCE(v_candidate.origin, 'Bangkok'),
    destination = COALESCE(v_candidate.destination, 'Yangon'),
    journey_id = v_candidate.journey_id
  WHERE id = p_shipment_id
  RETURNING *
  INTO v_updated;

  SELECT COALESCE(jsonb_agg(to_jsonb(po)), '[]'::jsonb)
  INTO v_affected_pos
  FROM (
    SELECT DISTINCT *
    FROM public.purchase_orders
    WHERE id = ANY(array_remove(ARRAY[v_previous_po_id, v_next_po_id]::UUID[], NULL))
  ) po;

  RETURN jsonb_build_object(
    'shipment', to_jsonb(v_updated),
    'purchase_orders', v_affected_pos
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_shipment_with_po_rebalance(p_shipment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing public.shipments%ROWTYPE;
  v_deleted public.shipments%ROWTYPE;
  v_previous_po_id UUID;
  v_previous_weight NUMERIC := 0;
  v_affected_pos JSONB := '[]'::jsonb;
BEGIN
  SELECT *
  INTO v_existing
  FROM public.shipments
  WHERE id = p_shipment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shipment not found: %', p_shipment_id;
  END IF;

  v_previous_po_id := v_existing.vendor_po_id;
  v_previous_weight := GREATEST(COALESCE(v_existing.weight_kg, 0), 0);

  PERFORM public.lock_purchase_orders_for_rebalance(v_previous_po_id, NULL);

  IF v_previous_po_id IS NOT NULL AND v_previous_weight > 0 THEN
    PERFORM public.apply_purchase_order_allocation_delta(v_previous_po_id, -v_previous_weight);
  END IF;

  DELETE FROM public.shipments
  WHERE id = p_shipment_id
  RETURNING *
  INTO v_deleted;

  SELECT COALESCE(jsonb_agg(to_jsonb(po)), '[]'::jsonb)
  INTO v_affected_pos
  FROM (
    SELECT *
    FROM public.purchase_orders
    WHERE id = ANY(array_remove(ARRAY[v_previous_po_id]::UUID[], NULL))
  ) po;

  RETURN jsonb_build_object(
    'shipment', to_jsonb(v_deleted),
    'purchase_orders', v_affected_pos
  );
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_shipment_rpc_payload(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lock_purchase_orders_for_rebalance(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_purchase_order_allocation_delta(UUID, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_shipment_with_po_rebalance(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_shipment_with_po_rebalance(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_shipment_with_po_rebalance(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.normalize_shipment_rpc_payload(JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.lock_purchase_orders_for_rebalance(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_purchase_order_allocation_delta(UUID, NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_shipment_with_po_rebalance(JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_shipment_with_po_rebalance(UUID, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_shipment_with_po_rebalance(UUID) TO authenticated, service_role;

COMMENT ON FUNCTION public.create_shipment_with_po_rebalance(JSONB)
IS 'Atomically creates a shipment and rebalances its linked purchase order allocation.';

COMMENT ON FUNCTION public.update_shipment_with_po_rebalance(UUID, JSONB)
IS 'Atomically updates a shipment and rebalances linked purchase order allocations.';

COMMENT ON FUNCTION public.delete_shipment_with_po_rebalance(UUID)
IS 'Atomically deletes a shipment and releases linked purchase order allocation.';

COMMIT;
