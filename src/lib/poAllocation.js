const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toNonNegative = (value) => Math.max(0, toNumber(value));

export function getShipmentAllocationWeight(shipment = {}) {
  return toNonNegative(shipment.weight_kg);
}

export function getShoppingOrderAllocationWeight(order = {}) {
  const actualWeight = toNonNegative(order.actual_weight);
  if (actualWeight > 0) return actualWeight;
  return toNonNegative(order.estimated_weight);
}

export function getPOAllocationSnapshot(po = {}) {
  const totalWeight = toNonNegative(po.total_weight_kg);
  const allocatedWeight = toNonNegative(po.allocated_weight_kg);
  const remainingWeight =
    totalWeight > 0
      ? Math.max(0, totalWeight - allocatedWeight)
      : toNonNegative(po.remaining_weight_kg);

  return {
    total_weight_kg: totalWeight,
    allocated_weight_kg: allocatedWeight,
    remaining_weight_kg: remainingWeight,
  };
}

export function buildPOAllocationPatch(po, nextAllocatedWeight) {
  const current = getPOAllocationSnapshot(po);
  const allocatedWeight = toNonNegative(nextAllocatedWeight);

  return {
    allocated_weight_kg: allocatedWeight,
    remaining_weight_kg:
      current.total_weight_kg > 0
        ? Math.max(0, current.total_weight_kg - allocatedWeight)
        : current.remaining_weight_kg,
  };
}

function buildPOOperation(po, nextAllocatedWeight) {
  if (!po?.id) return null;

  const previousPatch = getPOAllocationSnapshot(po);
  const nextPatch = buildPOAllocationPatch(po, nextAllocatedWeight);

  const WEIGHT_TOLERANCE = 0.01;
  if (
    Math.abs(previousPatch.allocated_weight_kg - nextPatch.allocated_weight_kg) <
      WEIGHT_TOLERANCE &&
    Math.abs(previousPatch.remaining_weight_kg - nextPatch.remaining_weight_kg) < WEIGHT_TOLERANCE
  ) {
    return null;
  }

  return {
    poId: po.id,
    poNumber: po.po_number || null,
    totalWeightKg: previousPatch.total_weight_kg,
    previousPatch: {
      allocated_weight_kg: previousPatch.allocated_weight_kg,
      remaining_weight_kg: previousPatch.remaining_weight_kg,
    },
    nextPatch,
  };
}

export function buildPORebalanceOperations({
  previousPo = null,
  nextPo = null,
  previousWeight = 0,
  nextWeight = 0,
} = {}) {
  const operations = [];
  const prevWeight = toNonNegative(previousWeight);
  const newWeight = toNonNegative(nextWeight);

  if (previousPo?.id && nextPo?.id && previousPo.id === nextPo.id) {
    const current = getPOAllocationSnapshot(previousPo);
    const operation = buildPOOperation(
      previousPo,
      current.allocated_weight_kg - prevWeight + newWeight
    );
    if (operation) operations.push(operation);
    return operations;
  }

  if (previousPo?.id) {
    const current = getPOAllocationSnapshot(previousPo);
    const operation = buildPOOperation(previousPo, current.allocated_weight_kg - prevWeight);
    if (operation) operations.push(operation);
  }

  if (nextPo?.id) {
    const current = getPOAllocationSnapshot(nextPo);
    const operation = buildPOOperation(nextPo, current.allocated_weight_kg + newWeight);
    if (operation) operations.push(operation);
  }

  return operations;
}

export async function applyPORebalanceOperations(updatePO, operations = []) {
  for (const operation of operations) {
    await updatePO(operation.poId, operation.nextPatch);
  }
}

export async function rollbackPORebalanceOperations(updatePO, operations = []) {
  for (const operation of [...operations].reverse()) {
    await updatePO(operation.poId, operation.previousPatch);
  }
}

export function assertPORebalanceCapacity(operations = []) {
  for (const operation of operations) {
    if (!operation) continue;
    if (toNonNegative(operation.totalWeightKg) <= 0) continue;

    if (
      toNonNegative(operation.nextPatch?.allocated_weight_kg) >
      toNonNegative(operation.totalWeightKg)
    ) {
      const poLabel = operation.poNumber || operation.poId;
      throw new Error(`Shipment exceeds available purchase order capacity for ${poLabel}`);
    }
  }
}

export function canAllocateToPO(po, requestedWeight, currentLinkedWeight = 0) {
  const snapshot = getPOAllocationSnapshot(po);
  if (snapshot.total_weight_kg <= 0) return true;

  const availableWeight = snapshot.remaining_weight_kg + toNonNegative(currentLinkedWeight);
  return toNonNegative(requestedWeight) <= availableWeight;
}
