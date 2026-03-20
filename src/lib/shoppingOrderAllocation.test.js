import {
  buildShoppingOrderAllocationPlan,
  getShoppingOrderWeightKg,
} from './shoppingOrderAllocation';

describe('shoppingOrderAllocation helpers', () => {
  const purchaseOrders = [
    {
      id: 'po-1',
      total_weight_kg: 10,
      allocated_weight_kg: 4,
      remaining_weight_kg: 6,
    },
    {
      id: 'po-2',
      total_weight_kg: 8,
      allocated_weight_kg: 2,
      remaining_weight_kg: 6,
    },
  ];

  it('prefers actual weight over estimated weight', () => {
    expect(getShoppingOrderWeightKg({ actual_weight: 1.5, estimated_weight: 2 })).toBe(1.5);
    expect(getShoppingOrderWeightKg({ actual_weight: 0, estimated_weight: 2 })).toBe(2);
    expect(getShoppingOrderWeightKg({ estimated_weight: '3.2' })).toBe(3.2);
  });

  it('builds an allocation step when creating a linked order', () => {
    const plan = buildShoppingOrderAllocationPlan({
      purchaseOrders,
      previousOrder: null,
      nextOrder: { vendor_po_id: 'po-1', estimated_weight: 2.5 },
    });

    expect(plan).toEqual([
      {
        poId: 'po-1',
        previousState: { allocated_weight_kg: 4, remaining_weight_kg: 6 },
        nextState: { allocated_weight_kg: 6.5, remaining_weight_kg: 3.5 },
      },
    ]);
  });

  it('rebalances both purchase orders when an order moves to another PO', () => {
    const plan = buildShoppingOrderAllocationPlan({
      purchaseOrders,
      previousOrder: { vendor_po_id: 'po-1', actual_weight: 1.5 },
      nextOrder: { vendor_po_id: 'po-2', actual_weight: 2 },
    });

    expect(plan).toEqual([
      {
        poId: 'po-1',
        previousState: { allocated_weight_kg: 4, remaining_weight_kg: 6 },
        nextState: { allocated_weight_kg: 2.5, remaining_weight_kg: 7.5 },
      },
      {
        poId: 'po-2',
        previousState: { allocated_weight_kg: 2, remaining_weight_kg: 6 },
        nextState: { allocated_weight_kg: 4, remaining_weight_kg: 4 },
      },
    ]);
  });

  it('rolls allocation back when deleting a linked order', () => {
    const plan = buildShoppingOrderAllocationPlan({
      purchaseOrders,
      previousOrder: { vendor_po_id: 'po-1', estimated_weight: 2.5 },
      nextOrder: null,
    });

    expect(plan).toEqual([
      {
        poId: 'po-1',
        previousState: { allocated_weight_kg: 4, remaining_weight_kg: 6 },
        nextState: { allocated_weight_kg: 1.5, remaining_weight_kg: 8.5 },
      },
    ]);
  });
});
