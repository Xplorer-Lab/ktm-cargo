import {
  applyPORebalanceOperations,
  assertPORebalanceCapacity,
  buildPORebalanceOperations,
  canAllocateToPO,
  getPOAllocationSnapshot,
  getShipmentAllocationWeight,
  getShoppingOrderAllocationWeight,
  rollbackPORebalanceOperations,
} from './poAllocation';

describe('poAllocation helpers', () => {
  const basePO = {
    id: 'po-1',
    total_weight_kg: 10,
    allocated_weight_kg: 6,
    remaining_weight_kg: 4,
  };

  it('derives allocation weights for shopping orders and shipments', () => {
    expect(getShoppingOrderAllocationWeight({ actual_weight: 2.5, estimated_weight: 3 })).toBe(2.5);
    expect(getShoppingOrderAllocationWeight({ actual_weight: 0, estimated_weight: 3 })).toBe(3);
    expect(getShipmentAllocationWeight({ weight_kg: '4.2' })).toBe(4.2);
  });

  it('normalizes PO allocation snapshot from total and allocated weight', () => {
    expect(getPOAllocationSnapshot(basePO)).toEqual({
      total_weight_kg: 10,
      allocated_weight_kg: 6,
      remaining_weight_kg: 4,
    });
  });

  it('builds rebalance operations when moving weight between purchase orders', () => {
    const nextPO = {
      id: 'po-2',
      total_weight_kg: 8,
      allocated_weight_kg: 1,
      remaining_weight_kg: 7,
    };

    expect(
      buildPORebalanceOperations({
        previousPo: basePO,
        nextPo: nextPO,
        previousWeight: 2,
        nextWeight: 3,
      })
    ).toMatchObject([
      {
        poId: 'po-1',
        previousPatch: { allocated_weight_kg: 6, remaining_weight_kg: 4 },
        nextPatch: { allocated_weight_kg: 4, remaining_weight_kg: 6 },
      },
      {
        poId: 'po-2',
        previousPatch: { allocated_weight_kg: 1, remaining_weight_kg: 7 },
        nextPatch: { allocated_weight_kg: 4, remaining_weight_kg: 4 },
      },
    ]);
  });

  it('builds allocation-only operations when only the destination PO is present', () => {
    const nextPO = {
      id: 'po-2',
      total_weight_kg: 8,
      allocated_weight_kg: 1,
      remaining_weight_kg: 7,
    };

    expect(
      buildPORebalanceOperations({
        nextPo: nextPO,
        nextWeight: 3,
      })
    ).toMatchObject([
      {
        poId: 'po-2',
        previousPatch: { allocated_weight_kg: 1, remaining_weight_kg: 7 },
        nextPatch: { allocated_weight_kg: 4, remaining_weight_kg: 4 },
      },
    ]);
  });

  it('builds deallocation-only operations when only the source PO is present', () => {
    expect(
      buildPORebalanceOperations({
        previousPo: basePO,
        previousWeight: 2,
      })
    ).toMatchObject([
      {
        poId: 'po-1',
        previousPatch: { allocated_weight_kg: 6, remaining_weight_kg: 4 },
        nextPatch: { allocated_weight_kg: 4, remaining_weight_kg: 6 },
      },
    ]);
  });

  it('returns no operations when the rebalance is a no-op', () => {
    expect(
      buildPORebalanceOperations({
        previousPo: basePO,
        nextPo: basePO,
        previousWeight: 2,
        nextWeight: 2,
      })
    ).toEqual([]);
  });

  it('allows current linked weight to count toward available capacity', () => {
    expect(canAllocateToPO(basePO, 6, 2)).toBe(true);
    expect(canAllocateToPO(basePO, 7, 2)).toBe(false);
  });

  it('throws when an operation would exceed purchase order capacity', () => {
    expect(() =>
      assertPORebalanceCapacity([
        {
          poId: 'po-1',
          poNumber: 'PO-001',
          totalWeightKg: 10,
          nextPatch: { allocated_weight_kg: 11, remaining_weight_kg: 0 },
        },
      ])
    ).toThrow('Shipment exceeds available purchase order capacity for PO-001');
  });

  it('allows unbounded purchase orders through the capacity assertion', () => {
    expect(() =>
      assertPORebalanceCapacity([
        {
          poId: 'po-open',
          poNumber: null,
          totalWeightKg: 0,
          nextPatch: { allocated_weight_kg: 50, remaining_weight_kg: 0 },
        },
      ])
    ).not.toThrow();
  });

  it('applies and rolls back rebalance operations in order', async () => {
    const updatePO = jest.fn().mockResolvedValue(undefined);
    const operations = buildPORebalanceOperations({
      previousPo: basePO,
      previousWeight: 2,
    });

    await applyPORebalanceOperations(updatePO, operations);
    await rollbackPORebalanceOperations(updatePO, operations);

    expect(updatePO).toHaveBeenNthCalledWith(1, 'po-1', {
      allocated_weight_kg: 4,
      remaining_weight_kg: 6,
    });
    expect(updatePO).toHaveBeenNthCalledWith(2, 'po-1', {
      allocated_weight_kg: 6,
      remaining_weight_kg: 4,
    });
  });
});
