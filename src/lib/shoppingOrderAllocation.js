function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getShoppingOrderWeightKg(order) {
  if (!order) return 0;

  const actualWeight = toNumber(order.actual_weight);
  if (actualWeight > 0) return actualWeight;

  return toNumber(order.estimated_weight);
}

function clonePO(po) {
  return {
    ...po,
    allocated_weight_kg: toNumber(po?.allocated_weight_kg),
    remaining_weight_kg: toNumber(po?.remaining_weight_kg),
    total_weight_kg: toNumber(po?.total_weight_kg),
  };
}

export function buildShoppingOrderAllocationPlan({
  purchaseOrders = [],
  previousOrder,
  nextOrder,
}) {
  const oldPoId = previousOrder?.vendor_po_id || '';
  const newPoId = nextOrder?.vendor_po_id || '';
  const oldWeight = oldPoId ? getShoppingOrderWeightKg(previousOrder) : 0;
  const newWeight = newPoId ? getShoppingOrderWeightKg(nextOrder) : 0;

  if (!oldPoId && !newPoId) return [];

  const stateById = new Map(
    purchaseOrders.filter((po) => po?.id).map((po) => [po.id, clonePO(po)])
  );
  const stepById = new Map();

  const applyWeightChange = (poId, previousWeight, nextWeight) => {
    if (!poId || !stateById.has(poId)) return;

    const poState = stateById.get(poId);
    const previousState = stepById.get(poId)?.previousState || {
      allocated_weight_kg: poState.allocated_weight_kg,
      remaining_weight_kg: poState.remaining_weight_kg,
    };

    const nextAllocated = Math.max(
      0,
      toNumber(poState.allocated_weight_kg) - toNumber(previousWeight) + toNumber(nextWeight)
    );
    const nextRemaining = Math.max(0, toNumber(poState.total_weight_kg) - nextAllocated);

    const nextState = {
      allocated_weight_kg: nextAllocated,
      remaining_weight_kg: nextRemaining,
    };

    stepById.set(poId, {
      poId,
      previousState,
      nextState,
    });

    stateById.set(poId, {
      ...poState,
      ...nextState,
    });
  };

  if (oldPoId === newPoId) {
    applyWeightChange(oldPoId, oldWeight, newWeight);
  } else {
    applyWeightChange(oldPoId, oldWeight, 0);
    applyWeightChange(newPoId, 0, newWeight);
  }

  return Array.from(stepById.values()).filter(
    (step) =>
      step.previousState.allocated_weight_kg !== step.nextState.allocated_weight_kg ||
      step.previousState.remaining_weight_kg !== step.nextState.remaining_weight_kg
  );
}
